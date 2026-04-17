'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, FileType } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/lib/hooks/use-toast';
import {
  buildHtmlTable,
  downloadFile,
  exportHtmlToPdf,
  exportToCSV,
  fetchBlob,
} from '@/lib/utils/export';

export type ExportFormat = 'csv' | 'excel' | 'pdf';

/**
 * Map ExportFormat (UI label) -> extension thuc te.
 */
const EXT_BY_FORMAT: Record<ExportFormat, 'csv' | 'xlsx' | 'pdf'> = {
  csv: 'csv',
  excel: 'xlsx',
  pdf: 'pdf',
};

interface ExportButtonProps {
  /**
   * Callback legacy — neu truyen, component se dung callback nay va bo qua
   * `data`/`endpoint` (backward compatible voi code cu).
   */
  onExport?: (format: ExportFormat) => void | Promise<void>;

  /**
   * Du lieu de export client-side (CSV). Neu truyen thi CSV generate tai FE.
   */
  data?: Record<string, unknown>[];

  /**
   * URL BE de post data len (cho XLSX/PDF). Neu khong truyen se fallback
   * `${NEXT_PUBLIC_API_URL}/export/{xlsx|pdf}`.
   */
  endpoint?: string;

  /** Ten file (khong can extension) */
  filename?: string;

  /** Danh sach cot (tuy chon) cho CSV header */
  columns?: string[];

  /** Labels tuong ung voi `columns` (cho PDF table header) */
  headers?: string[];

  /**
   * HTML pre-rendered cho PDF export. Neu truyen se dung HTML nay POST len BE.
   * Uu tien cao hon `targetId` va auto-build-from-data.
   */
  html?: string;

  /**
   * ID element tren DOM de trich outerHTML cho PDF export.
   * Dung khi muon in dep 1 vung render co san (ma khong can truyen HTML thu cong).
   */
  targetId?: string;

  /** Tieu de in tren PDF (khi auto-build tu data) */
  title?: string;

  label?: string;
  formats?: ExportFormat[];
  loading?: boolean;
}

const formatConfig: Record<
  ExportFormat,
  { label: string; icon: React.ReactNode }
> = {
  csv: {
    label: 'Xuat CSV',
    icon: <FileText className="h-4 w-4 mr-2" />,
  },
  excel: {
    label: 'Xuat Excel (.xlsx)',
    icon: <FileSpreadsheet className="h-4 w-4 mr-2" />,
  },
  pdf: {
    label: 'Xuat PDF',
    icon: <FileType className="h-4 w-4 mr-2" />,
  },
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
  'http://localhost:3000/api';

/**
 * Nut xuat du lieu — dropdown chon CSV/Excel/PDF.
 *
 * 3 mode:
 * 1. Legacy — truyen `onExport` callback, component chi render UI
 * 2. Data-mode — truyen `data`: CSV gen client-side, XLSX/PDF post data len BE
 * 3. Endpoint-mode — truyen `endpoint` + khong truyen data: component chi POST{} de BE tu query
 */
export function ExportButton({
  onExport,
  data,
  endpoint,
  filename = 'export',
  columns,
  headers,
  html,
  targetId,
  title,
  label = 'Xuat',
  formats = ['csv', 'excel', 'pdf'],
  loading: loadingProp = false,
}: ExportButtonProps) {
  const { toast } = useToast();
  const [internalLoading, setInternalLoading] = useState(false);
  const loading = loadingProp || internalLoading;

  /**
   * Resolve HTML source cho PDF export theo thu tu uu tien:
   * 1. prop `html` truyen san
   * 2. element DOM theo `targetId` (lay outerHTML)
   * 3. auto-build tu `data` + `columns` + `headers` (buildHtmlTable)
   * Tra null neu khong co gi de in.
   */
  const resolveHtmlForPdf = (): string | null => {
    if (html && html.length > 0) return html;
    if (targetId && typeof document !== 'undefined') {
      const el = document.getElementById(targetId);
      if (el) {
        // Wrap voi basic styles de PDF co kieu dang
        return `<!doctype html><html><head><meta charset="utf-8"/><style>
          body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111;padding:16px;}
          table{width:100%;border-collapse:collapse;}
          th,td{border:1px solid #ccc;padding:6px 8px;}
          thead th{background:#2563eb;color:#fff;}
        </style></head><body>${el.outerHTML}</body></html>`;
      }
    }
    if (data && data.length > 0) {
      return buildHtmlTable(data, columns, headers, title || filename);
    }
    return null;
  };

  // Default handler: auto-wire theo data/endpoint neu khong truyen onExport
  const defaultExport = async (format: ExportFormat) => {
    const ext = EXT_BY_FORMAT[format];
    const fname = `${filename}.${ext}`;

    try {
      setInternalLoading(true);

      if (format === 'csv' && data && data.length > 0) {
        // CSV — gen client-side
        exportToCSV(data, fname, columns);
        toast('Da xuat CSV', fname, 'success');
        return;
      }

      // PDF — uu tien dung HTML (html prop / targetId / auto-build)
      if (format === 'pdf') {
        const pdfHtml = resolveHtmlForPdf();
        if (pdfHtml) {
          await exportHtmlToPdf(pdfHtml, fname);
          toast('Da xuat PDF', fname, 'success');
          return;
        }
        // Neu khong co HTML lan data → goi endpoint raw (BE tu xu ly)
      }

      // XLSX/PDF (hoac CSV ma khong co data) — goi BE voi data raw
      const url =
        endpoint ||
        `${API_URL}/export/${ext === 'pdf' ? 'pdf' : ext}`;

      const body: Record<string, unknown> = {
        filename: fname,
      };
      if (data) body.data = data;
      if (columns) body.columns = columns;
      if (headers) body.headers = headers;

      const blob = await fetchBlob(url, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      downloadFile(blob, fname);
      toast('Da xuat file', fname, 'success');
    } catch (err) {
      const msg = (err as Error).message;
      if (format === 'pdf') {
        toast('Khong the xuat PDF', msg, 'destructive');
      } else {
        toast('Xuat file that bai', msg, 'destructive');
      }
    } finally {
      setInternalLoading(false);
    }
  };

  const handleSelect = (format: ExportFormat) => {
    if (onExport) {
      void onExport(format);
    } else {
      void defaultExport(format);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={loading}>
          <Download className="h-4 w-4 mr-2" />
          {loading ? 'Dang xuat...' : label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {formats.map((format) => (
          <DropdownMenuItem
            key={format}
            onClick={() => handleSelect(format)}
            disabled={loading}
          >
            {formatConfig[format].icon}
            {formatConfig[format].label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
