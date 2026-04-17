import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import ExcelJS from 'exceljs';
import { ExportDataDto } from './dto/export-data.dto.js';
import { PdfOptionsDto } from './dto/export-pdf.dto.js';

/**
 * ExportService — generic export tu JSON data -> CSV / XLSX buffer.
 *
 * Khac voi ExportImportService (export theo entity tu DB),
 * service nay chi receive data da ready tu FE va format file.
 */
@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  /**
   * Resolve columns + headers de dung chung cho xlsx/csv.
   */
  private resolveColumns(dto: ExportDataDto): {
    keys: string[];
    labels: string[];
  } {
    if (!dto.data || dto.data.length === 0) {
      throw new BadRequestException('No data to export');
    }
    const keys =
      dto.columns && dto.columns.length > 0
        ? dto.columns
        : Object.keys(dto.data[0] ?? {});
    if (keys.length === 0) {
      throw new BadRequestException('Cannot detect columns');
    }
    const labels =
      dto.headers && dto.headers.length === keys.length ? dto.headers : keys;
    return { keys, labels };
  }

  /**
   * Build CSV buffer tu data — escape quotes + comma + newline theo RFC 4180,
   * them BOM de Excel mo dung UTF-8 Vietnamese.
   */
  toCsvBuffer(dto: ExportDataDto): Buffer {
    const { keys, labels } = this.resolveColumns(dto);

    // Chong CSV formula injection: cell bat dau bang =, +, -, @, tab, CR se bi
    // Excel coi nhu cong thuc / DDE. Prefix bang ' de vo hieu hoa.
    const neutralizeFormula = (s: string): string =>
      /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;

    const escape = (v: unknown): string => {
      if (v === null || v === undefined) return '';
      let s = typeof v === 'string' ? v : String(v);
      s = neutralizeFormula(s);
      if (/["\n\r,;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const lines: string[] = [];
    lines.push(labels.map(escape).join(','));
    for (const row of dto.data) {
      lines.push(keys.map((k) => escape(row[k])).join(','));
    }
    // BOM giup Excel nhan UTF-8
    const csv = '\uFEFF' + lines.join('\r\n');
    return Buffer.from(csv, 'utf-8');
  }

  /**
   * Build XLSX buffer — 1 worksheet, header bold, freeze row 1, auto-width.
   */
  async toXlsxBuffer(dto: ExportDataDto): Promise<Buffer> {
    const { keys, labels } = this.resolveColumns(dto);
    const wb = new ExcelJS.Workbook();
    wb.creator = 'WebTemplate';
    wb.created = new Date();

    const ws = wb.addWorksheet(dto.title?.slice(0, 30) || 'Export');
    ws.columns = keys.map((k, i) => ({
      header: labels[i] ?? k,
      key: k,
      width: Math.min(Math.max(labels[i]?.length ?? 10, 12), 40),
    }));

    // Header style
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2563EB' },
      };
    });

    // Data rows
    for (const row of dto.data) {
      const out: Record<string, unknown> = {};
      for (const k of keys) {
        const v = row[k];
        out[k] = v === null || v === undefined ? '' : (v as unknown);
      }
      ws.addRow(out);
    }

    ws.views = [{ state: 'frozen', ySplit: 1 }];

    const arrBuf = await wb.xlsx.writeBuffer();
    return Buffer.from(arrBuf as ArrayBuffer);
  }

  /**
   * Generate PDF tu HTML string qua puppeteer (headless Chromium).
   *
   * Strategy load browser:
   * 1. Try `puppeteer-core` + `@sparticuz/chromium` (lightweight, container-friendly)
   * 2. Fallback `puppeteer` full (co san Chromium download — dev local)
   * 3. Neu ca 2 deu fail → throw ServiceUnavailableException 503
   *
   * Lazy-load (dynamic import) de app boot khong crash khi package bi issue.
   */
  async generatePdf(
    html: string,
    options?: {
      format?: 'A4' | 'Letter';
      landscape?: boolean;
      marginTop?: string;
      marginBottom?: string;
      marginLeft?: string;
      marginRight?: string;
      printBackground?: boolean;
    } & PdfOptionsDto,
  ): Promise<Buffer> {
    if (!html || typeof html !== 'string') {
      throw new BadRequestException('HTML input required');
    }

    // Dynamic import — tranh crash boot neu package missing
    const { browser, usingCore } = await this.launchBrowser();

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: options?.format ?? 'A4',
        landscape: options?.landscape ?? false,
        printBackground: options?.printBackground ?? true,
        margin: {
          top: options?.marginTop ?? '1.5cm',
          bottom: options?.marginBottom ?? '1.5cm',
          left: options?.marginLeft ?? '1.5cm',
          right: options?.marginRight ?? '1.5cm',
        },
      });

      this.logger.log(
        `PDF generated (${usingCore ? 'puppeteer-core' : 'puppeteer'}): ${pdfBuffer.length} bytes`,
      );
      // page.pdf() co the tra Uint8Array — normalize sang Buffer
      return Buffer.isBuffer(pdfBuffer)
        ? pdfBuffer
        : Buffer.from(pdfBuffer as Uint8Array);
    } finally {
      try {
        await browser.close();
      } catch (err) {
        this.logger.warn(`browser.close() failed: ${(err as Error).message}`);
      }
    }
  }

  /**
   * Try puppeteer-core + @sparticuz/chromium truoc (nhe, prod-ready),
   * fallback puppeteer full neu khong launch duoc.
   */
  private async launchBrowser(): Promise<{
    browser: any;
    usingCore: boolean;
  }> {
    const launchArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ];

    // Try puppeteer-core + @sparticuz/chromium
    try {
      const [{ default: puppeteerCore }, { default: chromium }] =
        await Promise.all([
          import('puppeteer-core'),
          import('@sparticuz/chromium'),
        ]);

      const executablePath = await chromium.executablePath();
      const browser = await puppeteerCore.launch({
        args: [...chromium.args, ...launchArgs],
        executablePath,
        headless: true,
      });
      return { browser, usingCore: true };
    } catch (err) {
      this.logger.warn(
        `puppeteer-core launch failed, fallback to puppeteer full: ${(err as Error).message}`,
      );
    }

    // Fallback: puppeteer full (co Chromium built-in)
    try {
      const { default: puppeteer } = await import('puppeteer' as any);
      const browser = await puppeteer.launch({
        args: launchArgs,
        headless: true,
      });
      return { browser, usingCore: false };
    } catch (err) {
      this.logger.error(
        `PDF service unavailable — neither puppeteer-core+chromium nor puppeteer could launch: ${(err as Error).message}`,
      );
      throw new ServiceUnavailableException(
        'PDF service not configured. Install puppeteer or puppeteer-core + @sparticuz/chromium.',
      );
    }
  }
}
