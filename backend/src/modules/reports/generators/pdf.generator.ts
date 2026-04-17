import PDFDocument from 'pdfkit';
import { ReportPayload, ReportTable } from '../report.types.js';

/**
 * Render ReportPayload thanh PDF Buffer — A4 portrait, co header, summary cards va tables.
 *
 * Dung pdfkit core — khong ho tro Unicode nang nhu tieng Viet co dau day du neu khong
 * embed font rieng. Chung ta dung `Helvetica` default va remove dau neu can — thuc te
 * de demo thi giu nguyen string. Neu can full Unicode, developer co the load TTF font
 * trong helveticaReplace ben duoi.
 */
export function generateReportPdf(payload: ReportPayload): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: payload.title,
          Author: 'WebTemplate Reports',
          CreationDate: new Date(),
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Header / logo placeholder
      doc
        .fillColor('#2563EB')
        .rect(40, 40, 515, 48)
        .fill();

      doc
        .fillColor('#FFFFFF')
        .fontSize(18)
        .font('Helvetica-Bold')
        .text(payload.title, 52, 52, { width: 491 });

      const rangeText =
        payload.range.from || payload.range.to
          ? `From ${payload.range.from || '-'} to ${payload.range.to || '-'}`
          : 'All time';

      doc
        .fillColor('#FFFFFF')
        .fontSize(10)
        .font('Helvetica')
        .text(rangeText, 52, 74);

      doc.moveDown(2);
      doc.fillColor('#111827');

      // Summary cards
      if (payload.summary.length > 0) {
        renderSummaryCards(doc, payload.summary);
      }

      // Tables
      for (const table of payload.tables) {
        renderTable(doc, table);
        doc.moveDown(1);
      }

      // Footer
      doc
        .fontSize(8)
        .fillColor('#6B7280')
        .text(
          `Generated at ${payload.generatedAt}`,
          40,
          doc.page.height - 40,
          { align: 'right', width: 515 },
        );

      doc.end();
    } catch (err) {
      reject(err as Error);
    }
  });
}

/**
 * Render summary cards thanh grid 3 cot.
 */
function renderSummaryCards(
  doc: PDFKit.PDFDocument,
  cards: ReportPayload['summary'],
): void {
  const startX = 40;
  const startY = doc.y;
  const cardWidth = 165;
  const cardHeight = 60;
  const gap = 10;

  cards.forEach((card, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const x = startX + col * (cardWidth + gap);
    const y = startY + row * (cardHeight + gap);

    // Card BG
    doc
      .roundedRect(x, y, cardWidth, cardHeight, 4)
      .fillColor('#F3F4F6')
      .fill();

    // Label
    doc
      .fontSize(9)
      .fillColor('#6B7280')
      .font('Helvetica')
      .text(String(card.label), x + 10, y + 10, {
        width: cardWidth - 20,
      });

    // Value
    doc
      .fontSize(16)
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .text(String(card.value), x + 10, y + 26, {
        width: cardWidth - 20,
      });

    if (card.hint) {
      doc
        .fontSize(8)
        .fillColor('#6B7280')
        .font('Helvetica')
        .text(card.hint, x + 10, y + 46, { width: cardWidth - 20 });
    }
  });

  const rows = Math.ceil(cards.length / 3);
  doc.y = startY + rows * (cardHeight + gap) + 10;
  doc.x = startX;
}

/**
 * Render 1 table don gian — tieu de + header row + data rows.
 * Tu dong xuong trang neu can.
 */
function renderTable(doc: PDFKit.PDFDocument, table: ReportTable): void {
  const startX = 40;
  const pageWidth = 515;
  const colWidths = computeColumnWidths(table.columns, pageWidth);
  const rowHeight = 20;

  // Section title
  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor('#111827')
    .text(table.title, startX, doc.y);
  doc.moveDown(0.3);

  // Header
  let y = doc.y;
  doc.rect(startX, y, pageWidth, rowHeight).fillColor('#2563EB').fill();

  doc.font('Helvetica-Bold').fontSize(9).fillColor('#FFFFFF');
  let x = startX;
  table.columns.forEach((col, idx) => {
    doc.text(col.header, x + 4, y + 6, {
      width: colWidths[idx] - 8,
      align: col.align || 'left',
      ellipsis: true,
    });
    x += colWidths[idx];
  });

  y += rowHeight;

  // Data rows
  doc.font('Helvetica').fontSize(9).fillColor('#111827');
  let rowIdx = 0;
  for (const row of table.rows) {
    // Page break — chua chiem toan bo trang du lieu, can xuong trang moi
    if (y + rowHeight > doc.page.height - 60) {
      doc.addPage();
      y = 40;
    }

    // Alternating BG
    if (rowIdx % 2 === 1) {
      doc.rect(startX, y, pageWidth, rowHeight).fillColor('#F9FAFB').fill();
      doc.fillColor('#111827');
    }

    x = startX;
    table.columns.forEach((col, idx) => {
      const val = row[col.key];
      const text = val === null || val === undefined ? '' : String(val);
      // Highlight low: to red
      if (col.highlightLow) {
        const n = Number(val);
        if (!isNaN(n) && n <= 0) {
          doc.fillColor('#B91C1C');
        } else {
          doc.fillColor('#111827');
        }
      }
      doc.text(text, x + 4, y + 6, {
        width: colWidths[idx] - 8,
        align: col.align || 'left',
        ellipsis: true,
      });
      doc.fillColor('#111827');
      x += colWidths[idx];
    });

    y += rowHeight;
    rowIdx += 1;
  }

  doc.y = y + 4;
  doc.x = 40;
}

/**
 * Chia chieu rong cac cot PDF dua theo `width` (relative) hoac header length.
 */
function computeColumnWidths(
  columns: ReportTable['columns'],
  totalWidth: number,
): number[] {
  const totalRelative =
    columns.reduce((sum, c) => sum + (c.width ?? c.header.length + 6), 0) || 1;
  return columns.map((c) =>
    Math.floor(((c.width ?? c.header.length + 6) / totalRelative) * totalWidth),
  );
}
