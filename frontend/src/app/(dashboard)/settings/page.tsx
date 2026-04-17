'use client';

import { useState } from 'react';
import { Bell, Globe, Moon, Sun, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function DashboardSettingsPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [locale, setLocale] = useState('vi');
  const [notifications, setNotifications] = useState({
    orderUpdates: true,
    promotions: true,
    newsletter: false,
    security: true,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: save settings via API
      await new Promise(resolve => setTimeout(resolve, 500));
      alert('Da luu cai dat thanh cong!');
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = () => {
    // TODO: trigger data export via API
    alert('Yeu cau xuat du lieu da duoc gui. Ban se nhan email khi hoan tat.');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Cai dat</h1>

      {/* Thong bao */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Thong bao
          </CardTitle>
          <CardDescription>Quan ly cach ban nhan thong bao</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Cap nhat don hang</Label>
              <p className="text-sm text-gray-500">Nhan thong bao khi don hang thay doi trang thai</p>
            </div>
            <Switch
              checked={notifications.orderUpdates}
              onCheckedChange={(checked) =>
                setNotifications(prev => ({ ...prev, orderUpdates: checked }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Khuyen mai</Label>
              <p className="text-sm text-gray-500">Nhan thong bao ve chuong trinh khuyen mai moi</p>
            </div>
            <Switch
              checked={notifications.promotions}
              onCheckedChange={(checked) =>
                setNotifications(prev => ({ ...prev, promotions: checked }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Ban tin</Label>
              <p className="text-sm text-gray-500">Nhan email ban tin hang tuan</p>
            </div>
            <Switch
              checked={notifications.newsletter}
              onCheckedChange={(checked) =>
                setNotifications(prev => ({ ...prev, newsletter: checked }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Bao mat</Label>
              <p className="text-sm text-gray-500">Canh bao dang nhap tu thiet bi moi</p>
            </div>
            <Switch
              checked={notifications.security}
              onCheckedChange={(checked) =>
                setNotifications(prev => ({ ...prev, security: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Giao dien */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {theme === 'light' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            Giao dien
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label>Che do toi</Label>
              <p className="text-sm text-gray-500">Chuyen sang giao dien toi</p>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Ngon ngu */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Ngon ngu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {[
              { code: 'vi', label: 'Tieng Viet' },
              { code: 'en', label: 'English' },
            ].map(lang => (
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

      {/* Du lieu */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Du lieu ca nhan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Xuat du lieu</Label>
              <p className="text-sm text-gray-500">Tai ve toan bo du lieu ca nhan cua ban</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportData}>
              <Download className="h-4 w-4 mr-1" />
              Xuat
            </Button>
          </div>
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-red-600">Xoa tai khoan</Label>
                <p className="text-sm text-gray-500">Xoa vinh vien tai khoan va toan bo du lieu</p>
              </div>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-1" />
                Xoa tai khoan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Dang luu...' : 'Luu cai dat'}
        </Button>
      </div>
    </div>
  );
}
