'use client';

import { Download, FileSpreadsheet, FileText, FileType } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

export type ExportFormat = 'csv' | 'excel' | 'pdf';

interface ExportButtonProps {
  onExport: (format: ExportFormat) => void;
  label?: string;
  formats?: ExportFormat[];
  loading?: boolean;
}

const formatConfig: Record<ExportFormat, { label: string; icon: React.ReactNode }> = {
  csv: { label: 'CSV', icon: <FileText className="h-4 w-4 mr-2" /> },
  excel: { label: 'Excel', icon: <FileSpreadsheet className="h-4 w-4 mr-2" /> },
  pdf: { label: 'PDF', icon: <FileType className="h-4 w-4 mr-2" /> },
};

/**
 * Nut xuat du lieu — dropdown chon CSV/Excel/PDF
 */
export function ExportButton({
  onExport,
  label = 'Xuat',
  formats = ['csv', 'excel', 'pdf'],
  loading = false,
}: ExportButtonProps) {
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
          <DropdownMenuItem key={format} onClick={() => onExport(format)}>
            {formatConfig[format].icon}
            {formatConfig[format].label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
