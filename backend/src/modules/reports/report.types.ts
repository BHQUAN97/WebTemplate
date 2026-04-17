/**
 * Shared types cho cac report. Moi generator (xlsx/pdf/csv) doc chung type nay.
 */

export interface ReportDateRange {
  from: string | null;
  to: string | null;
}

export interface ReportSummaryCard {
  label: string;
  value: string | number;
  hint?: string;
}

/** Row generic — key-value, value la primitive. */
export type ReportRow = Record<string, string | number | boolean | null>;

/** 1 bang trong report (title + columns + rows). */
export interface ReportTable {
  title: string;
  /**
   * Columns voi header va key. Key map voi field trong row.
   * width (optional, cho xlsx): char width. align cho pdf.
   */
  columns: Array<{
    key: string;
    header: string;
    width?: number;
    align?: 'left' | 'right' | 'center';
    /**
     * Flag danh dau cot ton kho — cho xlsx to mau do khi <=0 hoac duoi threshold.
     */
    highlightLow?: boolean;
  }>;
  rows: ReportRow[];
}

/** Cau truc 1 report hoan chinh — header + summary + tables. */
export interface ReportPayload {
  /** Tieu de hien thi tren PDF/XLSX. */
  title: string;
  /** Khoang thoi gian report (null = all). */
  range: ReportDateRange;
  /** Cards tong quan (don hang, doanh thu...). */
  summary: ReportSummaryCard[];
  /** Cac bang du lieu. */
  tables: ReportTable[];
  /** Thoi diem render. */
  generatedAt: string;
}

export type ReportType = 'sales' | 'products' | 'customers' | 'inventory';
