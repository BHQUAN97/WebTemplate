/**
 * Export / Print utilities — client-side CSV, JSON, PDF/Excel download helpers.
 *
 * Tat ca function chay tren browser (cho file download qua Blob + anchor).
 * Cho cac format phuc tap (XLSX/PDF) hoac dataset lon, nen goi API backend
 * thay vi generate tai client.
 */

/**
 * Mime type mapping cho cac loai file pho bien.
 */
const MIME_BY_EXT: Record<string, string> = {
  csv: 'text/csv;charset=utf-8;',
  json: 'application/json;charset=utf-8;',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
  txt: 'text/plain;charset=utf-8;',
};

/**
 * Trigger download 1 blob/buffer/string duoi dang file.
 *
 * @param data    — Blob, ArrayBuffer, hoac raw string
 * @param filename — ten file (nen co extension)
 * @param mime    — mime type (optional, tu detect tu extension neu khong truyen)
 */
export function downloadFile(
  data: Blob | ArrayBuffer | string,
  filename: string,
  mime?: string,
): void {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const mimeType = mime ?? MIME_BY_EXT[ext] ?? 'application/octet-stream';

  let blob: Blob;
  if (data instanceof Blob) {
    blob = data;
  } else if (typeof data === 'string') {
    // Them BOM cho CSV de Excel mo dung tieng Viet
    const needsBom = ext === 'csv';
    const payload = needsBom ? '\uFEFF' + data : data;
    blob = new Blob([payload], { type: mimeType });
  } else {
    blob = new Blob([data], { type: mimeType });
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();

  // Clean up — delay nho de browser kich hoat download truoc
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Escape 1 gia tri cho CSV — quote neu chua ky tu dac biet (comma, quote, newline).
 */
function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str = typeof value === 'string' ? value : String(value);
  // Neu chua quote, comma, newline, hoac carriage return → quote + double up quote
  if (/["\n\r,;]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generate CSV tu array of objects va trigger download.
 *
 * @param data    — mang record (header lay tu keys hoac `columns`)
 * @param filename — ten file (tu them .csv neu thieu)
 * @param columns — optional danh sach cot de chon/sort. Neu khong truyen → lay tat ca key tu row dau
 */
export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string,
  columns?: string[],
): void {
  const fname = filename.endsWith('.csv') ? filename : `${filename}.csv`;

  if (!data || data.length === 0) {
    downloadFile('', fname, MIME_BY_EXT.csv);
    return;
  }

  const cols = columns && columns.length > 0 ? columns : Object.keys(data[0]);
  const header = cols.map(escapeCsvCell).join(',');
  const rows = data.map((row) =>
    cols.map((c) => escapeCsvCell(row[c])).join(','),
  );
  const csv = [header, ...rows].join('\r\n');

  downloadFile(csv, fname, MIME_BY_EXT.csv);
}

/**
 * Download du lieu ra file JSON pretty-printed.
 */
export function exportToJSON(data: unknown, filename: string): void {
  const fname = filename.endsWith('.json') ? filename : `${filename}.json`;
  const payload = JSON.stringify(data, null, 2);
  downloadFile(payload, fname, MIME_BY_EXT.json);
}

/**
 * In 1 element cu the qua window rieng — copy DOM + style, goi window.print().
 *
 * Neu khong tim thay element theo id → log warning va fallback window.print() toan trang.
 */
export function printElement(
  elementId: string,
  options?: { title?: string },
): void {
  const el = document.getElementById(elementId);
  if (!el) {
    // eslint-disable-next-line no-console
    console.warn(`[printElement] Khong tim thay #${elementId}, print toan trang.`);
    window.print();
    return;
  }

  const title = options?.title ?? document.title;
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) {
    // eslint-disable-next-line no-console
    console.warn('[printElement] Popup bi block, fallback print toan trang.');
    window.print();
    return;
  }

  // Gom tat ca style + link stylesheet tu doc hien tai
  const head = document.head.innerHTML;

  w.document.open();
  w.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${title.replace(/</g, '&lt;')}</title>
${head}
<style>
  @media print { @page { margin: 1.5cm; } }
  body { background: #fff; color: #000; padding: 1rem; }
  [data-no-print] { display: none !important; }
</style>
</head>
<body>
${el.outerHTML}
</body>
</html>`);
  w.document.close();

  // Wait for images/fonts, then print
  const doPrint = () => {
    try {
      w.focus();
      w.print();
    } finally {
      // Some browsers auto-close after print; in others we close manually
      setTimeout(() => {
        try {
          w.close();
        } catch {
          /* ignore */
        }
      }, 300);
    }
  };

  if (w.document.readyState === 'complete') {
    setTimeout(doPrint, 100);
  } else {
    w.addEventListener('load', () => setTimeout(doPrint, 100));
  }
}

/**
 * Format so tien kieu VN (dau cham ngan cach, khong co ky hieu don vi)
 * de de parse lai khi import CSV/XLSX.
 */
export function formatCurrencyForExport(value: number): string {
  const n = Number(value);
  if (!isFinite(n)) return '0';
  return Math.round(n).toLocaleString('vi-VN');
}

/**
 * Options cho PDF export (puppeteer).
 */
export interface ExportPdfOptions {
  format?: 'A4' | 'Letter';
  landscape?: boolean;
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
  printBackground?: boolean;
}

const API_URL_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
  'http://localhost:3000/api';

/**
 * Export 1 HTML string ra PDF qua BE puppeteer.
 *
 * Goi POST `${NEXT_PUBLIC_API_URL}/export/pdf` voi body { html, filename, options }.
 * Kem Bearer token (localStorage/sessionStorage) + credentials cookie.
 */
export async function exportHtmlToPdf(
  html: string,
  filename: string,
  options?: ExportPdfOptions,
): Promise<void> {
  const fname = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const url = `${API_URL_BASE}/export/pdf`;

  const blob = await fetchBlob(url, {
    method: 'POST',
    body: JSON.stringify({
      html,
      filename: fname,
      options,
    }),
  });
  downloadFile(blob, fname, MIME_BY_EXT.pdf);
}

/**
 * Build HTML table don gian tu data + columns (dung cho PDF export backup).
 *
 * @param data    — array record
 * @param columns — danh sach key. Neu khong truyen → Object.keys(row dau)
 * @param headers — labels (cung length voi columns). Neu khong → dung key
 * @param title   — optional heading
 */
export function buildHtmlTable(
  data: Record<string, unknown>[],
  columns?: string[],
  headers?: string[],
  title?: string,
): string {
  const cols =
    columns && columns.length > 0
      ? columns
      : data.length > 0
        ? Object.keys(data[0])
        : [];
  const labels = headers && headers.length === cols.length ? headers : cols;

  const escapeHtml = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    return String(v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const thead = labels.map((l) => `<th>${escapeHtml(l)}</th>`).join('');
  const tbody = data
    .map(
      (row) =>
        `<tr>${cols.map((c) => `<td>${escapeHtml(row[c])}</td>`).join('')}</tr>`,
    )
    .join('');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title || 'Export')}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111; padding: 16px; }
  h1 { font-size: 18px; margin: 0 0 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
  thead th { background: #2563eb; color: #fff; }
  tbody tr:nth-child(even) { background: #f8fafc; }
</style>
</head>
<body>
  ${title ? `<h1>${escapeHtml(title)}</h1>` : ''}
  <table>
    <thead><tr>${thead}</tr></thead>
    <tbody>${tbody}</tbody>
  </table>
</body>
</html>`;
}

/**
 * Fetch blob tu endpoint voi credentials + access_token, tra ve Blob.
 * Dung noi bo cho export-button khi goi BE /export/xlsx, /export/pdf.
 */
export async function fetchBlob(
  url: string,
  options: RequestInit = {},
): Promise<Blob> {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('access_token') ||
        sessionStorage.getItem('access_token')
      : null;
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `Request failed: ${res.status}`);
  }
  return res.blob();
}
