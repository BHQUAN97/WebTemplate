'use client';

import * as React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Search, MoreHorizontal, Loader2 } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from './pagination';

// --- Column definition ---
export interface ColumnDef<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render?: (row: T) => React.ReactNode;
}

// --- Action definition ---
export interface ActionDef<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: T) => void;
  variant?: 'default' | 'destructive';
  hidden?: (row: T) => boolean;
}

export interface BulkActionDef {
  label: string;
  icon?: React.ReactNode;
  onClick: (selectedIds: string[]) => void;
  variant?: 'default' | 'destructive';
}

// --- Props ---
export interface DataTableProps<T extends { id: string }> {
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  // Pagination
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  // Search
  search?: string;
  onSearch?: (search: string) => void;
  searchPlaceholder?: string;
  // Sort
  sort?: string;
  order?: 'ASC' | 'DESC';
  onSort?: (sort: string, order: 'ASC' | 'DESC') => void;
  // Actions
  actions?: ActionDef<T>[];
  bulkActions?: BulkActionDef[];
}

/**
 * Data table co the tai su dung — ho tro sort, pagination, search, bulk actions
 */
export function DataTable<T extends { id: string }>({
  columns,
  data,
  loading = false,
  page = 1,
  totalPages = 1,
  onPageChange,
  search,
  onSearch,
  searchPlaceholder = 'Tim kiem...',
  sort,
  order,
  onSort,
  actions,
  bulkActions,
}: DataTableProps<T>) {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  const allSelected = data.length > 0 && selectedIds.length === data.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : data.map((r) => r.id));
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleSort = (key: string) => {
    if (!onSort) return;
    if (sort === key) {
      onSort(key, order === 'ASC' ? 'DESC' : 'ASC');
    } else {
      onSort(key, 'ASC');
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sort !== columnKey) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-40" />;
    return order === 'ASC'
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  return (
    <div className="space-y-4">
      {/* Toolbar: search + bulk actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        {onSearch && (
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={searchPlaceholder}
              value={search || ''}
              onChange={(e) => onSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        )}
        {bulkActions && selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              Da chon {selectedIds.length} muc
            </span>
            {bulkActions.map((action, i) => (
              <Button
                key={i}
                variant={action.variant === 'destructive' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => {
                  action.onClick(selectedIds);
                  setSelectedIds([]);
                }}
              >
                {action.icon}
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border border-gray-200">
        <Table>
          <TableHeader>
            <TableRow>
              {bulkActions && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    ref={(el) => {
                      if (el) (el as unknown as HTMLInputElement).indeterminate = someSelected;
                    }}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
              )}
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.sortable && onSort ? (
                    <button
                      className="inline-flex items-center hover:text-gray-900"
                      onClick={() => handleSort(col.key)}
                    >
                      {col.header}
                      <SortIcon columnKey={col.key} />
                    </button>
                  ) : (
                    col.header
                  )}
                </TableHead>
              ))}
              {actions && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {bulkActions && (
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  )}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (bulkActions ? 1 : 0) + (actions ? 1 : 0)}
                  className="h-24 text-center text-gray-500"
                >
                  Khong co du lieu
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.id} data-state={selectedIds.includes(row.id) ? 'selected' : undefined}>
                  {bulkActions && (
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(row.id)}
                        onCheckedChange={() => toggleRow(row.id)}
                      />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {actions
                            .filter((a) => !a.hidden || !a.hidden(row))
                            .map((action, i) => (
                              <DropdownMenuItem
                                key={i}
                                onClick={() => action.onClick(row)}
                                className={action.variant === 'destructive' ? 'text-red-600' : ''}
                              >
                                {action.icon}
                                {action.label}
                              </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      )}

      {/* Pagination */}
      {onPageChange && totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
