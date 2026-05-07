'use client';

import * as React from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { ScheduleForm } from '@/components/admin/chat/schedule-form';
import { adminChatApi, type CreateScheduleInput } from '@/lib/api/modules/admin-chat.api';

/** Tạo khung gio moi */
export default function NewSchedulePage() {
  const handleSubmit = async (data: CreateScheduleInput) => {
    return await adminChatApi.createSchedule(data);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Thêm khung gio"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Khung gio', href: '/admin/chat-schedules' },
          { label: 'Thêm moi' },
        ]}
      />
      <ScheduleForm onSubmit={handleSubmit} />
    </div>
  );
}
