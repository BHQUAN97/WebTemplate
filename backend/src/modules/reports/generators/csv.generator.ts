import { ReportPayload } from '../report.types.js';

/**
 * Escape 1 gia tri cell cho CSV — boc quote neu co dau phay/quote/newline.
 */
function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Format 1 row thanh dong CSV.
 */
function rowToLine(values: unknown[]): string {
  return values.map(escapeCell).join(',');
}

/**
 * Render ReportPayload thanh CSV Buffer voi BOM UTF-8 de Excel mo tieng Viet OK.
 *
 * Neu report co nhieu bang se noi tiep nhau — moi bang cach bang dong blank.
 */
export function generateReportCsv(payload: ReportPayload): Buffer {
  const lines: string[] = [];

  // Header
  lines.push(rowToLine([payload.title]));
  if (payload.range.from || payload.range.to) {
    lines.push(
      rowToLine([
        `Tu ngay: ${payload.range.from || '-'}`,
        `Den ngay: ${payload.range.to || '-'}`,
      ]),
    );
  }
  lines.push(rowToLine([`Tao luc: ${payload.generatedAt}`]));
  lines.push('');

  // Summary
  if (payload.summary.length > 0) {
    lines.push(rowToLine(['TONG QUAN']));
    lines.push(rowToLine(['Chi so', 'Gia tri']));
    for (const card of payload.summary) {
      lines.push(rowToLine([card.label, card.value]));
    }
    lines.push('');
  }

  // Tables
  for (const table of payload.tables) {
    lines.push(rowToLine([table.title]));
    const headers = table.columns.map((c) => c.header);
    lines.push(rowToLine(headers));

    for (const row of table.rows) {
      const cells = table.columns.map((c) => row[c.key] ?? '');
      lines.push(rowToLine(cells));
    }
    lines.push('');
  }

  const csv = lines.join('\r\n');
  // BOM UTF-8 de Excel auto-detect encoding
  const bom = Buffer.from([0xef, 0xbb, 0xbf]);
  return Buffer.concat([bom, Buffer.from(csv, 'utf8')]);
}
