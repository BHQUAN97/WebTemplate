import ExcelJS from 'exceljs';
import { ReportPayload, ReportTable } from '../report.types.js';

/**
 * Render 1 table vao worksheet — header bold, freeze dong dau, auto-width,
 * conditional format mau do cho cot `highlightLow` khi gia tri <= 0.
 */
function renderTable(ws: ExcelJS.Worksheet, table: ReportTable): void {
  // Row tieu de section
  const titleRow = ws.addRow([table.title]);
  titleRow.font = { bold: true, size: 13 };
  ws.mergeCells(titleRow.number, 1, titleRow.number, table.columns.length || 1);

  // Header row
  const headerRow = ws.addRow(table.columns.map((c) => c.header));
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' }, // Tailwind blue-600
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF93C5FD' } },
      left: { style: 'thin', color: { argb: 'FF93C5FD' } },
      bottom: { style: 'thin', color: { argb: 'FF93C5FD' } },
      right: { style: 'thin', color: { argb: 'FF93C5FD' } },
    };
  });

  // Data rows
  for (const row of table.rows) {
    const values = table.columns.map((c) => row[c.key] ?? '');
    const added = ws.addRow(values);

    // Alignment + highlight low stock
    table.columns.forEach((col, idx) => {
      const cell = added.getCell(idx + 1);
      if (col.align) {
        cell.alignment = { horizontal: col.align };
      }
      if (col.highlightLow) {
        const numVal = Number(row[col.key]);
        if (!isNaN(numVal) && numVal <= 0) {
          cell.font = { color: { argb: 'FFB91C1C' }, bold: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFEE2E2' }, // red-100
          };
        } else if (!isNaN(numVal) && numVal < 10) {
          cell.font = { color: { argb: 'FFB45309' } };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFEF3C7' }, // amber-100
          };
        }
      }
    });
  }

  // Set width cho cac cot
  table.columns.forEach((col, idx) => {
    const column = ws.getColumn(idx + 1);
    const width = col.width ?? Math.max(col.header.length + 4, 15);
    if (!column.width || column.width < width) {
      column.width = width;
    }
  });

  // Row trong sau bang
  ws.addRow([]);
}

/**
 * Render ReportPayload thanh XLSX Buffer.
 * - Sheet "Summary" chua header + summary cards.
 * - Moi ReportTable co the o cung sheet hoac sheet rieng — de don gian ta merge vao
 *   sheet chinh "Report" va freeze pane dong tieu de dau tien.
 */
export async function generateReportXlsx(
  payload: ReportPayload,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'WebTemplate Reports';
  wb.created = new Date();

  const ws = wb.addWorksheet('Report', {
    views: [{ state: 'frozen', ySplit: 1 }],
    properties: { defaultRowHeight: 18 },
  });

  // Tieu de chinh
  const titleCell = ws.addRow([payload.title]);
  titleCell.font = { bold: true, size: 16 };
  ws.mergeCells(titleCell.number, 1, titleCell.number, 6);

  // Meta
  const rangeText =
    payload.range.from || payload.range.to
      ? `Tu ${payload.range.from || '-'} den ${payload.range.to || '-'}`
      : 'Tat ca thoi gian';
  const metaRow = ws.addRow([rangeText, '', '', `Tao luc: ${payload.generatedAt}`]);
  metaRow.font = { italic: true, color: { argb: 'FF6B7280' } };
  ws.mergeCells(metaRow.number, 1, metaRow.number, 3);
  ws.mergeCells(metaRow.number, 4, metaRow.number, 6);
  ws.addRow([]);

  // Summary cards — render nhu 1 bang 2 cot
  if (payload.summary.length > 0) {
    renderTable(ws, {
      title: 'TONG QUAN',
      columns: [
        { key: 'label', header: 'Chi so', width: 32 },
        { key: 'value', header: 'Gia tri', width: 24, align: 'right' },
      ],
      rows: payload.summary.map((c) => ({
        label: c.label,
        value: c.value,
      })),
    });
  }

  for (const table of payload.tables) {
    renderTable(ws, table);
  }

  // ExcelJS.Buffer = uint8array-ish — ep ve Node Buffer
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf as ArrayBuffer);
}
