'use client';

import { useEffect, useState } from 'react';
import { Save, MessageCircle, Phone, Mail, ArrowUp, LayoutGrid } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { FormField } from '@/components/shared/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useMutation } from '@/lib/hooks/use-api';
import { settingsApi } from '@/lib/api/modules/settings.api';
import type { ApiResponse, Setting } from '@/lib/types';
import { apiClient } from '@/lib/api/client';

// Danh sach module
const MODULES = [
  { key: 'auth', name: 'Xác thực (Auth)', description: 'Đăng nhập, đăng ký, JWT, 2FA' },
  { key: 'users', name: 'Người dùng', description: 'Quản lý tài khoản, vai trò' },
  { key: 'products', name: 'Sản phẩm', description: 'Quản lý sản phẩm, biến thể' },
  { key: 'categories', name: 'Danh mục', description: 'Phân loại sản phẩm, bài viết' },
  { key: 'inventory', name: 'Tồn kho', description: 'Quản lý kho hàng, số lượng' },
  { key: 'cart', name: 'Giỏ hàng', description: 'Giỏ hàng mua sắm' },
  { key: 'orders', name: 'Đơn hàng', description: 'Xử lý đơn hàng, trạng thái' },
  { key: 'payments', name: 'Thanh toán', description: 'Thanh toán online, COD' },
  { key: 'reviews', name: 'Đánh giá', description: 'Đánh giá sản phẩm, phê duyệt' },
  { key: 'promotions', name: 'Khuyến mãi', description: 'Mã giảm giá, ưu đãi' },
  { key: 'articles', name: 'Bài viết', description: 'Quản lý nội dung CMS' },
  { key: 'pages', name: 'Trang', description: 'Trang tĩnh, landing page' },
  { key: 'navigation', name: 'Menu', description: 'Menu điều hướng, footer' },
  { key: 'seo', name: 'SEO', description: 'Tối ưu hóa công cụ tìm kiếm' },
  { key: 'media', name: 'Media', description: 'Thư viện hình ảnh, file' },
  { key: 'notifications', name: 'Thông báo', description: 'Thông báo hệ thống, push' },
  { key: 'analytics', name: 'Phân tích', description: 'Thống kê, báo cáo' },
  { key: 'search', name: 'Tìm kiếm', description: 'Tìm kiếm nâng cao, full-text' },
  { key: 'export_import', name: 'Xuất/Nhập', description: 'Export/Import dữ liệu' },
  { key: 'i18n', name: 'Đa ngôn ngữ', description: 'Hỗ trợ nhiều ngôn ngữ' },
  { key: 'contacts', name: 'Liên hệ', description: 'Form liên hệ, phản hồi' },
  { key: 'faq', name: 'FAQ', description: 'Câu hỏi thường gặp' },
  { key: 'tenants', name: 'Multi-tenant', description: 'Quản lý nhiều cửa hàng' },
  { key: 'plans', name: 'Gói dịch vụ', description: 'SaaS plan, billing' },
  { key: 'api_keys', name: 'API Keys', description: 'Quản lý API key' },
  { key: 'webhooks', name: 'Webhooks', description: 'Webhook endpoint' },
  { key: 'email_templates', name: 'Email Template', description: 'Mau email tu dong' },
  { key: 'settings', name: 'Cài đặt', description: 'Cài đặt hệ thống' },
  { key: 'logs', name: 'Nhật ký', description: 'Log audit, access' },
  { key: 'changelog', name: 'Changelog', description: 'Lịch sử thay đổi' },
];

/** Cài đặt Hệ thống */
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [moduleStates, setModuleStates] = useState<Record<string, boolean>>(
    Object.fromEntries(MODULES.map((m) => [m.key, true])),
  );

  // General settings
  const [siteName, setSiteName] = useState('');
  const [siteDescription, setSiteDescription] = useState('');
  const [currency, setCurrency] = useState('VND');
  const [timezone, setTimezone] = useState('Asia/Ho_Chi_Minh');

  // Email settings
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');

  // SEO settings
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [gaId, setGaId] = useState('');
  const [sitemapEnabled, setSitemapEnabled] = useState(true);

  // CTA settings — dieu khien floating buttons + bottom tab bar
  const [ctaZaloEnabled, setCtaZaloEnabled] = useState(false);
  const [ctaZaloPhone, setCtaZaloPhone] = useState('');
  const [ctaMessengerEnabled, setCtaMessengerEnabled] = useState(false);
  const [ctaMessengerUrl, setCtaMessengerUrl] = useState('');
  const [ctaPhoneEnabled, setCtaPhoneEnabled] = useState(false);
  const [ctaPhoneNumber, setCtaPhoneNumber] = useState('');
  const [ctaWhatsappEnabled, setCtaWhatsappEnabled] = useState(false);
  const [ctaWhatsappNumber, setCtaWhatsappNumber] = useState('');
  const [ctaEmailEnabled, setCtaEmailEnabled] = useState(false);
  const [ctaEmailAddress, setCtaEmailAddress] = useState('');
  const [ctaBackToTopEnabled, setCtaBackToTopEnabled] = useState(true);
  const [ctaBottomTabEnabled, setCtaBottomTabEnabled] = useState(true);
  const [ctaSaving, setCtaSaving] = useState(false);
  const [ctaMsg, setCtaMsg] = useState<string | null>(null);

  // Load CTA settings tu /settings/public (group=cta, public flags)
  useEffect(() => {
    apiClient
      .get<ApiResponse<Setting[]>>('/settings/public')
      .then((res) => {
        const map = new Map((res?.data ?? []).map((s) => [s.key, s.value]));
        const b = (k: string, d = false) => (map.has(k) ? map.get(k) === 'true' : d);
        const s = (k: string) => map.get(k) ?? '';
        setCtaZaloEnabled(b('cta.zalo_enabled'));
        setCtaZaloPhone(s('cta.zalo_phone'));
        setCtaMessengerEnabled(b('cta.messenger_enabled'));
        setCtaMessengerUrl(s('cta.messenger_url'));
        setCtaPhoneEnabled(b('cta.phone_enabled'));
        setCtaPhoneNumber(s('cta.phone_number'));
        setCtaWhatsappEnabled(b('cta.whatsapp_enabled'));
        setCtaWhatsappNumber(s('cta.whatsapp_number'));
        setCtaEmailEnabled(b('cta.email_enabled'));
        setCtaEmailAddress(s('cta.email_address'));
        setCtaBackToTopEnabled(b('cta.back_to_top_enabled', true));
        setCtaBottomTabEnabled(b('cta.bottom_tab_enabled', true));
      })
      .catch(() => {
        // Silent — dung defaults hien tai
      });
  }, []);

  const handleSaveCta = async () => {
    setCtaSaving(true);
    setCtaMsg(null);
    try {
      await settingsApi.bulkUpdate([
        { key: 'cta.zalo_enabled', value: String(ctaZaloEnabled) },
        { key: 'cta.zalo_phone', value: ctaZaloPhone.trim() },
        { key: 'cta.messenger_enabled', value: String(ctaMessengerEnabled) },
        { key: 'cta.messenger_url', value: ctaMessengerUrl.trim() },
        { key: 'cta.phone_enabled', value: String(ctaPhoneEnabled) },
        { key: 'cta.phone_number', value: ctaPhoneNumber.trim() },
        { key: 'cta.whatsapp_enabled', value: String(ctaWhatsappEnabled) },
        { key: 'cta.whatsapp_number', value: ctaWhatsappNumber.trim() },
        { key: 'cta.email_enabled', value: String(ctaEmailEnabled) },
        { key: 'cta.email_address', value: ctaEmailAddress.trim() },
        { key: 'cta.back_to_top_enabled', value: String(ctaBackToTopEnabled) },
        { key: 'cta.bottom_tab_enabled', value: String(ctaBottomTabEnabled) },
      ]);
      setCtaMsg('Da luu — refresh trang khach de thay thay doi');
    } catch (err) {
      setCtaMsg(`Loi: ${(err as Error).message}`);
    } finally {
      setCtaSaving(false);
    }
  };

  const saveMutation = useMutation('PUT', '/admin/settings');

  const handleSave = async () => {
    const settingsMap: Record<string, Record<string, unknown>> = {
      general: { site_name: siteName, site_description: siteDescription, currency, timezone },
      email: { smtp_host: smtpHost, smtp_port: smtpPort, smtp_user: smtpUser, smtp_pass: smtpPass },
      seo: { meta_title: metaTitle, meta_description: metaDescription, ga_id: gaId, sitemap_enabled: sitemapEnabled },
      modules: { modules: moduleStates },
    };
    await saveMutation.mutate(settingsMap[activeTab] ?? {});
  };

  const toggleModule = (key: string) => {
    setModuleStates((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cài đặt Hệ thống"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Cài đặt' },
        ]}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="general">Chung</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="payment">Thanh toán</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="cta">CTA</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general">
          <Card>
            <CardHeader><CardTitle>Cài đặt chung</CardTitle></CardHeader>
            <CardContent className="space-y-4 max-w-2xl">
              <FormField label="Ten website" required>
                <Input value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="VD: My Store" />
              </FormField>
              <FormField label="Mô tả website">
                <Textarea value={siteDescription} onChange={(e) => setSiteDescription(e.target.value)} rows={3} />
              </FormField>
              <FormField label="Logo">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-400">Click de tai len logo</p>
                  <Button variant="outline" size="sm" className="mt-2">Chon file</Button>
                </div>
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Tien te">
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VND">VND - Viet Nam Dong</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Mui gio">
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (UTC+7)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Asia/Tokyo (UTC+9)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
              <Button onClick={handleSave} disabled={saveMutation.loading}>
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.loading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>Cau hinh Email</CardTitle>
              <CardDescription>Cài đặt SMTP de gui email tu Hệ thống</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-2xl">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="SMTP Host">
                  <Input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" />
                </FormField>
                <FormField label="SMTP Port">
                  <Input value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} placeholder="587" />
                </FormField>
              </div>
              <FormField label="SMTP Username">
                <Input value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} placeholder="email@example.com" />
              </FormField>
              <FormField label="SMTP Password">
                <Input type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} />
              </FormField>
              <Button onClick={handleSave} disabled={saveMutation.loading}>
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.loading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment */}
        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle>Cong Thanh toán</CardTitle>
              <CardDescription>Cau hinh cac phuong thuc Thanh toán</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-w-2xl">
              {[
                { name: 'COD (Thanh toán khi nhan hang)', key: 'cod' },
                { name: 'VNPay', key: 'vnpay' },
                { name: 'MoMo', key: 'momo' },
                { name: 'ZaloPay', key: 'zalopay' },
                { name: 'Stripe', key: 'stripe' },
              ].map((gw) => (
                <div key={gw.key} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{gw.name}</p>
                    <p className="text-xs text-gray-500">Cau hinh API key va cai dat</p>
                  </div>
                  <Switch />
                </div>
              ))}
              <Button onClick={handleSave} disabled={saveMutation.loading}>
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.loading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO */}
        <TabsContent value="seo">
          <Card>
            <CardHeader><CardTitle>Cài đặt SEO</CardTitle></CardHeader>
            <CardContent className="space-y-4 max-w-2xl">
              <FormField label="Meta Title mac dinh" description="Tối đa 70 Ký tự">
                <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} maxLength={70} />
              </FormField>
              <FormField label="Meta Description mac dinh" description="Tối đa 160 Ký tự">
                <Textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} rows={3} maxLength={160} />
              </FormField>
              <FormField label="Google Analytics ID">
                <Input value={gaId} onChange={(e) => setGaId(e.target.value)} placeholder="G-XXXXXXXXXX" />
              </FormField>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Sitemap tu dong</p>
                  <p className="text-xs text-gray-500">Tu dong tao va cap nhat sitemap.xml</p>
                </div>
                <Switch checked={sitemapEnabled} onCheckedChange={setSitemapEnabled} />
              </div>
              <Button onClick={handleSave} disabled={saveMutation.loading}>
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.loading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CTA — Call-to-action */}
        <TabsContent value="cta">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" /> Nut Liên hệ noi (Floating CTA)
                </CardTitle>
                <CardDescription>
                  Cac nut noi goc duoi phai man hinh. Bo trong so/URL se tu an du co bat.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 max-w-2xl">
                {/* Zalo */}
                <div className="space-y-3 border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Zalo</p>
                      <p className="text-xs text-gray-500">Chat Zalo — phu hop khach Viet</p>
                    </div>
                    <Switch checked={ctaZaloEnabled} onCheckedChange={setCtaZaloEnabled} />
                  </div>
                  <FormField label="Số điện thoại Zalo" description="VD: 0901234567 hoac 84901234567">
                    <Input
                      type="tel"
                      inputMode="tel"
                      value={ctaZaloPhone}
                      onChange={(e) => setCtaZaloPhone(e.target.value)}
                      placeholder="0901234567"
                      disabled={!ctaZaloEnabled}
                    />
                  </FormField>
                </div>

                {/* Messenger */}
                <div className="space-y-3 border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Facebook Messenger</p>
                      <p className="text-xs text-gray-500">Nut chat voi fan page</p>
                    </div>
                    <Switch checked={ctaMessengerEnabled} onCheckedChange={setCtaMessengerEnabled} />
                  </div>
                  <FormField label="Link Messenger" description="Dạng https://m.me/your-page">
                    <Input
                      type="url"
                      inputMode="url"
                      value={ctaMessengerUrl}
                      onChange={(e) => setCtaMessengerUrl(e.target.value)}
                      placeholder="https://m.me/your-page"
                      disabled={!ctaMessengerEnabled}
                    />
                  </FormField>
                </div>

                {/* Hotline */}
                <div className="space-y-3 border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <Phone className="h-4 w-4" /> Goi dien (Hotline)
                      </p>
                      <p className="text-xs text-gray-500">Nut bam de goi truc tiep</p>
                    </div>
                    <Switch checked={ctaPhoneEnabled} onCheckedChange={setCtaPhoneEnabled} />
                  </div>
                  <FormField label="So hotline">
                    <Input
                      type="tel"
                      inputMode="tel"
                      value={ctaPhoneNumber}
                      onChange={(e) => setCtaPhoneNumber(e.target.value)}
                      placeholder="0900 123 456"
                      disabled={!ctaPhoneEnabled}
                    />
                  </FormField>
                </div>

                {/* WhatsApp */}
                <div className="space-y-3 border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">WhatsApp</p>
                      <p className="text-xs text-gray-500">Phu hop khach nuoc ngoai</p>
                    </div>
                    <Switch checked={ctaWhatsappEnabled} onCheckedChange={setCtaWhatsappEnabled} />
                  </div>
                  <FormField label="Số WhatsApp" description="Dạng quốc tế, vd: 84901234567">
                    <Input
                      type="tel"
                      inputMode="tel"
                      value={ctaWhatsappNumber}
                      onChange={(e) => setCtaWhatsappNumber(e.target.value)}
                      placeholder="84901234567"
                      disabled={!ctaWhatsappEnabled}
                    />
                  </FormField>
                </div>

                {/* Email */}
                <div className="space-y-3 border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4" /> Email
                      </p>
                      <p className="text-xs text-gray-500">Mo mail client khi nhan</p>
                    </div>
                    <Switch checked={ctaEmailEnabled} onCheckedChange={setCtaEmailEnabled} />
                  </div>
                  <FormField label="Địa chỉ email">
                    <Input
                      type="email"
                      inputMode="email"
                      value={ctaEmailAddress}
                      onChange={(e) => setCtaEmailAddress(e.target.value)}
                      placeholder="info@example.com"
                      disabled={!ctaEmailEnabled}
                    />
                  </FormField>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5" /> Điều hướng & tien ich
                </CardTitle>
                <CardDescription>
                  Cac tien ich UX chung cho trang Khách hàng.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-2xl">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      <ArrowUp className="h-4 w-4" /> Nut cuon len dau trang
                    </p>
                    <p className="text-xs text-gray-500">Hiện khi user đã cuộn qua 300px</p>
                  </div>
                  <Switch checked={ctaBackToTopEnabled} onCheckedChange={setCtaBackToTopEnabled} />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Bottom tab bar mobile</p>
                    <p className="text-xs text-gray-500">
                      Thanh Điều hướng duoi mobile: Home / Search / Cart / Account
                    </p>
                  </div>
                  <Switch checked={ctaBottomTabEnabled} onCheckedChange={setCtaBottomTabEnabled} />
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center gap-3">
              <Button onClick={handleSaveCta} disabled={ctaSaving}>
                <Save className="h-4 w-4 mr-2" />
                {ctaSaving ? 'Đang lưu...' : 'Lưu cài đặt CTA'}
              </Button>
              {ctaMsg && <span className="text-sm text-gray-600">{ctaMsg}</span>}
            </div>
          </div>
        </TabsContent>

        {/* Modules */}
        <TabsContent value="modules">
          <Card>
            <CardHeader>
              <CardTitle>Quản lý Modules</CardTitle>
              <CardDescription>Bật/tat cac module cua Hệ thống. Module bi tat se khong hoat dong.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {MODULES.map((mod) => (
                  <div key={mod.key} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="min-w-0 mr-3">
                      <p className="text-sm font-medium truncate">{mod.name}</p>
                      <p className="text-xs text-gray-500 truncate">{mod.description}</p>
                    </div>
                    <Switch
                      checked={moduleStates[mod.key] ?? true}
                      onCheckedChange={() => toggleModule(mod.key)}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <Button onClick={handleSave} disabled={saveMutation.loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {saveMutation.loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
