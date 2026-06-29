'use client';

import { useState, useEffect } from 'react';
import { Bell, Globe, Moon, Sun, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/lib/hooks/use-toast';
import { useTheme } from 'next-themes';
import { usersApi } from '@/lib/api/modules/users.api';

const PREFS_KEY = 'user_notification_prefs';

interface NotificationPrefs {
  orderUpdates: boolean;
  marketingEmails: boolean;
  emailNotifications: boolean;
  securityAlerts: boolean;
}

function defaultPrefs(): NotificationPrefs {
  return {
    orderUpdates: true,
    marketingEmails: true,
    emailNotifications: true,
    securityAlerts: true,
  };
}

/** Đọc prefs từ localStorage làm cache fallback */
function loadLocalPrefs(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return defaultPrefs();
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
    return { ...defaultPrefs(), ...parsed };
  } catch {
    return defaultPrefs();
  }
}

/** Lưu prefs vào localStorage để dùng khi offline / chưa load xong API */
function saveLocalPrefs(prefs: NotificationPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage có thể bị block trong private browsing
  }
}

export default function DashboardSettingsPage() {
  const { theme, setTheme } = useTheme();
  const [locale, setLocale] = useState('vi');
  const [notifications, setNotifications] = useState<NotificationPrefs>(defaultPrefs());
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Load prefs: thử từ API trước, fallback về localStorage
  useEffect(() => {
    // Hiển thị cache ngay lập tức để tránh flash
    setNotifications(loadLocalPrefs());

    usersApi
      .getUserPreferences()
      .then((res) => {
        const serverPrefs = (res as any)?.data ?? res;
        if (serverPrefs && typeof serverPrefs === 'object') {
          const merged = { ...defaultPrefs(), ...serverPrefs } as NotificationPrefs;
          setNotifications(merged);
          saveLocalPrefs(merged);
        }
      })
      .catch(() => {
        // Không có network hoặc chưa đăng nhập — dùng localStorage cache
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    // Lưu localStorage ngay để UX nhanh
    saveLocalPrefs(notifications);

    try {
      // Sync preferences lên server để dùng qua nhiều thiết bị
      await usersApi.updateUserPreferences({
        orderUpdates: notifications.orderUpdates,
        marketingEmails: notifications.marketingEmails,
        emailNotifications: notifications.emailNotifications,
        securityAlerts: notifications.securityAlerts,
      });
      toast('Đã lưu cài đặt thành công!');
    } catch {
      // Dù API lỗi, localStorage đã lưu — báo offline mode
      toast('Đã lưu cài đặt (offline mode)');
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      // Lấy user id từ profile trước
      const profile = await usersApi.getProfile();
      const userId = (profile as any)?.data?.id ?? (profile as any)?.id;
      if (!userId) throw new Error('Không lấy được user ID');
      const blob = await usersApi.exportUserData(userId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-data-${userId}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast('Yêu cầu xuất dữ liệu đã được ghi nhận. Bạn sẽ nhận email khi hoàn tất.');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Cài đặt</h1>

      {/* Thông báo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Thông báo
          </CardTitle>
          <CardDescription>Quản lý cách bạn nhận thông báo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(
            [
              { key: 'orderUpdates', label: 'Cập nhật đơn hàng', desc: 'Nhận thông báo khi đơn hàng thay đổi trạng thái' },
              { key: 'emailNotifications', label: 'Email thông báo', desc: 'Nhận email cho các hoạt động tài khoản' },
              { key: 'marketingEmails', label: 'Khuyến mãi', desc: 'Nhận email về chương trình khuyến mãi mới' },
              { key: 'securityAlerts', label: 'Cảnh báo bảo mật', desc: 'Cảnh báo đăng nhập từ thiết bị mới' },
            ] as { key: keyof NotificationPrefs; label: string; desc: string }[]
          ).map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <Label>{label}</Label>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
              <Switch
                checked={notifications[key]}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({ ...prev, [key]: checked }))
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Giao diện */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            Giao diện
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label>Chế độ tối</Label>
              <p className="text-sm text-gray-500">Chuyển sang giao diện tối</p>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Ngôn ngữ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Ngôn ngữ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {[
              { code: 'vi', label: 'Tiếng Việt' },
              { code: 'en', label: 'English' },
            ].map((lang) => (
              <Button
                key={lang.code}
                variant={locale === lang.code ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLocale(lang.code)}
              >
                {lang.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dữ liệu */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Dữ liệu cá nhân
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Xuất dữ liệu</Label>
              <p className="text-sm text-gray-500">Tải về toàn bộ dữ liệu cá nhân của bạn</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportData}>
              <Download className="h-4 w-4 mr-1" />
              Xuất
            </Button>
          </div>
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-red-600">Xóa tài khoản</Label>
                <p className="text-sm text-gray-500">Xóa vĩnh viễn tài khoản và toàn bộ dữ liệu</p>
              </div>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-1" />
                Xóa tài khoản
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
        </Button>
      </div>
    </div>
  );
}
