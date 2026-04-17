'use client';

// Tai su dung component 2FA setup tu admin settings
import { TwoFactorSetup } from '@/app/admin/settings/2fa/page';

export default function UserTwoFactorPage() {
  return (
    <TwoFactorSetup
      breadcrumbRoot={{ label: 'Trang ca nhan', href: '/dashboard' }}
      settingsHref="/settings"
    />
  );
}
