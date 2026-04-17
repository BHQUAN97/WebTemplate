'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { ScenarioForm } from '@/components/admin/chat/scenario-form';
import { FormSkeleton } from '@/components/shared/skeletons';
import { adminChatApi, type ChatScenario, type CreateScenarioInput } from '@/lib/api/modules/admin-chat.api';

/** Chinh sua kich ban chatbot */
export default function EditScenarioPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;

  const [scenario, setScenario] = React.useState<ChatScenario | null>(null);
  const [allScenarios, setAllScenarios] = React.useState<ChatScenario[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([adminChatApi.getScenario(id), adminChatApi.listScenarios({ active: true })])
      .then(([detail, listRes]) => {
        if (cancelled) return;
        setScenario(detail);
        const data = Array.isArray(listRes) ? listRes : (listRes?.data ?? []);
        setAllScenarios(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSubmit = async (data: CreateScenarioInput) => {
    if (!id) return null;
    return await adminChatApi.updateScenario(id, data);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chinh sua kich ban"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Kich ban', href: '/admin/chat-scenarios' },
          { label: scenario?.name ?? 'Chinh sua' },
        ]}
      />
      {loading ? (
        <FormSkeleton fields={8} />
      ) : scenario ? (
        <ScenarioForm initial={scenario} scenarios={allScenarios} onSubmit={handleSubmit} />
      ) : (
        <div className="flex items-center justify-center py-12 text-sm text-gray-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Khong tim thay kich ban
        </div>
      )}
    </div>
  );
}
