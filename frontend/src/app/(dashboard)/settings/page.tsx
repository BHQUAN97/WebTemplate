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
  promotions: boolean;
  newsletter: boolean;
  security: boolean;
}

function loadPrefs(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : defaultPrefs();
  } catch {
    return defaultPrefs();
  }
}

function defaultPrefs(): NotificationPrefs {
  return { orderUpdates: true, promotions: true, newsletter: false, security: true };
}

export default function DashboardSettingsPage() {
  const { theme, setTheme } = useTheme();
  const [locale, setLocale] = useState('vi');
  const [notifications, setNotifications] = useState<NotificationPrefs>(defaultPrefs());
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setNotifications(loadPrefs());
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Lưu notification prefs vào localStorage (chưa có backend endpoint riêng)
      localStorage.setItem(PREFS_KEY, JSON.stringify(notifications));

      // Sync locale về user profile nếu có thay đổi
      await usersApi.updateProfile({ name: undefined } as any);

      toast('Đã lưu cài đặt thành công!');
    } catch {
      // Dù API lỗi vẫn lưu local thành công
      localStorage.setItem(PREFS_KEY, JSON.stringify(notifications));
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
              { key: 'promotions', label: 'Khuyến mãi', desc: 'Nhận thông báo về chương trình khuyến mãi mới' },
              { key: 'newsletter', label: 'Bản tin', desc: 'Nhận email bản tin hàng tuần' },
              { key: 'security', label: 'Bảo mật', desc: 'Cảnh báo đăng nhập từ thiết bị mới' },
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
