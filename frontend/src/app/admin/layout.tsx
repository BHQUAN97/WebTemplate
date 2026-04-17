'use client';

import { AdminSidebar } from '@/components/admin/sidebar';
import { AdminTopbar } from '@/components/admin/topbar';
import { useUIStore } from '@/lib/stores/ui.store';
import { cn } from '@/lib/utils';

/**
 * Admin layout — sidebar + topbar + content
 * Print-friendly: an sidebar/topbar khi in
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      <AdminTopbar />
      <main
        className={cn(
          'transition-all duration-300 pt-0 print:ml-0 print:pt-0',
          sidebarOpen ? 'ml-64' : 'ml-16',
        )}
      >
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          aside, header.print\\:hidden, .print\\:hidden {
            display: none !important;
          }
          main {
            margin-left: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
