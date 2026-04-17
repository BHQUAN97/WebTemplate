'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { ScheduleForm } from '@/components/admin/chat/schedule-form';
import { FormSkeleton } from '@/components/shared/skeletons';
import { adminChatApi, type ChatSchedule, type CreateScheduleInput } from '@/lib/api/modules/admin-chat.api';

/** Chinh sua khung gio */
export default function EditSchedulePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;

  const [schedule, setSchedule] = React.useState<ChatSchedule | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!id) return;
    let cancelled = false;
    adminChatApi
      .getSchedule(id)
      .then((res) => {
        if (!cancelled) setSchedule(res);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSubmit = async (data: CreateScheduleInput) => {
    if (!id) return null;
    return await adminChatApi.updateSchedule(id, data);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chinh sua khung gio"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Khung gio', href: '/admin/chat-schedules' },
          { label: schedule?.name ?? 'Chinh sua' },
        ]}
      />
      {loading ? (
        <FormSkeleton fields={7} />
      ) : schedule ? (
        <ScheduleForm initial={schedule} onSubmit={handleSubmit} />
      ) : (
        <div className="flex items-center justify-center py-12 text-sm text-gray-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Khong tim thay khung gio
        </div>
      )}
    </div>
  );
}
