'use client';

import * as React from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { ScenarioForm } from '@/components/admin/chat/scenario-form';
import { adminChatApi, type ChatScenario, type CreateScenarioInput } from '@/lib/api/modules/admin-chat.api';

/** Tạo mới kich ban chatbot */
export default function NewScenarioPage() {
  const [scenarios, setScenarios] = React.useState<ChatScenario[]>([]);

  React.useEffect(() => {
    adminChatApi
      .listScenarios({ active: true })
      .then((res) => {
        const data = Array.isArray(res) ? res : (res?.data ?? []);
        setScenarios(data);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (data: CreateScenarioInput) => {
    return await adminChatApi.createScenario(data);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tạo kich ban moi"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Kich ban', href: '/admin/chat-scenarios' },
          { label: 'Tạo mới' },
        ]}
      />
      <ScenarioForm onSubmit={handleSubmit} scenarios={scenarios} />
    </div>
  );
}
