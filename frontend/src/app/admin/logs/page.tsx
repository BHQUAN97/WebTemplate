'use client';

import { useState } from 'react';
import { Shield, Globe, GitBranch } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type ColumnDef } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { useApi } from '@/lib/hooks/use-api';
import { usePagination } from '@/lib/hooks/use-pagination';
import { formatDateTime, formatDate } from '@/lib/utils/format';
import type { ApiResponse, AuditLog, AccessLog, Changelog } from '@/lib/types';

const CHANGELOG_TYPE_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  FEATURE: 'success',
  FIX: 'destructive',
  IMPROVEMENT: 'default',
  BREAKING: 'warning',
};

const CHANGELOG_TYPE_LABELS: Record<string, string> = {
  FEATURE: 'Tinh nang moi',
  FIX: 'Sua loi',
  IMPROVEMENT: 'Cai tien',
  BREAKING: 'Thay doi lon',
};

/** Nhat ky he thong */
export default function LogsPage() {
  const [activeTab, setActiveTab] = useState('audit');

  // Audit logs state
  const [auditSearch, setAuditSearch] = useState('');
  const [auditAction, setAuditAction] = useState('all');
  const [auditDateFrom, setAuditDateFrom] = useState('');
  const auditPagination = usePagination();

  // Access logs state
  const [accessSearch, setAccessSearch] = useState('');
  const accessPagination = usePagination();

  // Changelog
  const { data: changelogData, loading: changelogLoading } = useApi<ApiResponse<Changelog[]>>(
    activeTab === 'changelog' ? '/admin/changelog' : null,
  );

  // Audit logs API
  const { data: auditData, loading: auditLoading } = useApi<ApiResponse<AuditLog[]>>(
    activeTab === 'audit' ? '/admin/logs/audit' : null,
    {
      page: auditPagination.page,
      limit: auditPagination.limit,
      search: auditSearch || undefined,
      action: auditAction !== 'all' ? auditAction : undefined,
      date_from: auditDateFrom || undefined,
    },
  );

  // Access logs API
  const { data: accessData, loading: accessLoading } = useApi<ApiResponse<AccessLog[]>>(
    activeTab === 'access' ? '/admin/logs/access' : null,
    {
      page: accessPagination.page,
      limit: accessPagination.limit,
      search: accessSearch || undefined,
    },
  );

  const auditColumns: ColumnDef<AuditLog>[] = [
    {
      key: 'user',
      header: 'Nguoi dung',
      render: (row) => row.user?.name ?? row.user_id,
    },
    { key: 'action', header: 'Hanh dong', sortable: true },
    {
      key: 'entity',
      header: 'Doi tuong',
      render: (row) => `${row.entity_type} #${row.entity_id.slice(0, 8)}`,
    },
    {
      key: 'created_at',
      header: 'Thoi gian',
      sortable: true,
      render: (row) => formatDateTime(row.created_at),
    },
    { key: 'ip_address', header: 'IP' },
  ];

  const accessColumns: ColumnDef<AccessLog>[] = [
    { key: 'method', header: 'Method', render: (row) => (
      <Badge variant={row.method === 'GET' ? 'secondary' : row.method === 'POST' ? 'success' : row.method === 'DELETE' ? 'destructive' : 'default'}>
        {row.method}
      </Badge>
    )},
    { key: 'path', header: 'URL', render: (row) => <span className="font-mono text-xs">{row.path}</span> },
    {
      key: 'status_code',
      header: 'Status',
      render: (row) => (
        <span className={row.status_code >= 400 ? 'text-red-600 font-medium' : row.status_code >= 300 ? 'text-yellow-600' : 'text-green-600'}>
          {row.status_code}
        </span>
      ),
    },
    {
      key: 'response_time',
      header: 'Thoi gian (ms)',
      render: (row) => (
        <span className={row.response_time > 1000 ? 'text-red-600' : ''}>{row.response_time}ms</span>
      ),
    },
    { key: 'ip_address', header: 'IP' },
    {
      key: 'created_at',
      header: 'Thoi gian',
      sortable: true,
      render: (row) => formatDateTime(row.created_at),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nhat ky he thong"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Nhat ky' },
        ]}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="audit">
            <Shield className="h-4 w-4 mr-1" /> Audit Log
          </TabsTrigger>
          <TabsTrigger value="access">
            <Globe className="h-4 w-4 mr-1" /> Access Log
          </TabsTrigger>
          <TabsTrigger value="changelog">
            <GitBranch className="h-4 w-4 mr-1" /> Changelog
          </TabsTrigger>
        </TabsList>

        {/* Audit Logs */}
        <TabsContent value="audit" className="mt-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Select value={auditAction} onValueChange={setAuditAction}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Hanh dong" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tat ca</SelectItem>
                <SelectItem value="CREATE">Tao moi</SelectItem>
                <SelectItem value="UPDATE">Cap nhat</SelectItem>
                <SelectItem value="DELETE">Xoa</SelectItem>
                <SelectItem value="LOGIN">Dang nhap</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={auditDateFrom}
              onChange={(e) => setAuditDateFrom(e.target.value)}
              className="w-full sm:w-44"
            />
          </div>
          <DataTable
            columns={auditColumns}
            data={auditData?.data ?? []}
            loading={auditLoading}
            page={auditPagination.page}
            totalPages={auditData?.pagination?.totalPages ?? 1}
            onPageChange={auditPagination.setPage}
            search={auditSearch}
            onSearch={setAuditSearch}
            searchPlaceholder="Tim theo nguoi dung, hanh dong..."
          />
        </TabsContent>

        {/* Access Logs */}
        <TabsContent value="access" className="mt-4">
          <DataTable
            columns={accessColumns}
            data={accessData?.data ?? []}
            loading={accessLoading}
            page={accessPagination.page}
            totalPages={accessData?.pagination?.totalPages ?? 1}
            onPageChange={accessPagination.setPage}
            search={accessSearch}
            onSearch={setAccessSearch}
            searchPlaceholder="Tim theo URL, IP..."
          />
        </TabsContent>

        {/* Changelog */}
        <TabsContent value="changelog" className="mt-4">
          <div className="space-y-4">
            {changelogLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                      <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (changelogData?.data ?? []).length === 0 ? (
              <div className="text-center py-12 text-gray-500">Chua co thay doi nao</div>
            ) : (
              (changelogData?.data ?? []).map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-1 h-full bg-blue-500 rounded-full flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={CHANGELOG_TYPE_VARIANTS[entry.type] ?? 'secondary'}>
                            {CHANGELOG_TYPE_LABELS[entry.type] ?? entry.type}
                          </Badge>
                          <span className="text-sm font-mono text-gray-500">v{entry.version}</span>
                          <span className="text-xs text-gray-400">
                            {entry.published_at ? formatDate(entry.published_at) : formatDate(entry.created_at)}
                          </span>
                        </div>
                        <h3 className="font-medium text-sm">{entry.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{entry.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
