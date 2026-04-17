'use client';

import { useState } from 'react';
import { Shield, ShieldCheck, ShieldOff, Copy, Download, RefreshCw, KeyRound } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { FormField } from '@/components/shared/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi, useMutation } from '@/lib/hooks/use-api';
import { useToast } from '@/lib/hooks/use-toast';
import type { ApiResponse } from '@/lib/types';
import type { TwoFactorStatus, TwoFactorSetupResponse, TwoFactorEnableResponse } from '@/lib/api/modules/two-factor.api';

/** 2FA Setup UI cho admin */
export default function TwoFactorPage() {
  return <TwoFactorSetup breadcrumbRoot={{ label: 'Dashboard', href: '/admin' }} settingsHref="/admin/settings" />;
}

export function TwoFactorSetup({
  breadcrumbRoot,
  settingsHref,
}: {
  breadcrumbRoot: { label: string; href: string };
  settingsHref: string;
}) {
  const { toast } = useToast();

  const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  // Disable flow
  const [disableOpen, setDisableOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableError, setDisableError] = useState('');

  // Regenerate backup codes flow
  const [regenOpen, setRegenOpen] = useState(false);
  const [regenPassword, setRegenPassword] = useState('');
  const [regenError, setRegenError] = useState('');

  const { data: status, loading, refetch } = useApi<ApiResponse<TwoFactorStatus>>('/auth/2fa/status');
  const is2faEnabled = status?.data?.enabled ?? false;

  const setupMutation = useMutation<unknown, TwoFactorSetupResponse>('POST', '/auth/2fa/setup');
  const enableMutation = useMutation<{ code: string }, TwoFactorEnableResponse>(
    'POST',
    '/auth/2fa/enable',
  );
  const disableMutation = useMutation<{ password: string }>('POST', '/auth/2fa/disable');
  const regenMutation = useMutation<{ password: string }, { backup_codes: string[] }>(
    'POST',
    '/auth/2fa/backup-codes/regenerate',
  );

  const handleStartSetup = async () => {
    const res = await setupMutation.mutate();
    if (res) {
      setSetupData(res);
      setVerifyCode('');
      setVerifyError('');
    }
  };

  const handleVerify = async () => {
    if (verifyCode.length !== 6) {
      setVerifyError('Ma xac thuc phai co 6 chu so');
      return;
    }
    const res = await enableMutation.mutate({ code: verifyCode });
    if (res?.backup_codes) {
      setBackupCodes(res.backup_codes);
      setSetupData(null);
      setVerifyCode('');
      refetch();
      toast('Da kich hoat 2FA', undefined, 'success');
    } else {
      setVerifyError('Ma khong dung hoac het han');
    }
  };

  const handleDisable = async () => {
    if (!disablePassword) {
      setDisableError('Vui long nhap mat khau');
      return;
    }
    const res = await disableMutation.mutate({ password: disablePassword });
    if (res !== null) {
      toast('Da tat 2FA', undefined, 'success');
      setDisableOpen(false);
      setDisablePassword('');
      setDisableError('');
      refetch();
    } else {
      setDisableError(disableMutation.error ?? 'That bai');
    }
  };

  const handleRegenerate = async () => {
    if (!regenPassword) {
      setRegenError('Vui long nhap mat khau');
      return;
    }
    const res = await regenMutation.mutate({ password: regenPassword });
    if (res?.backup_codes) {
      setBackupCodes(res.backup_codes);
      setRegenOpen(false);
      setRegenPassword('');
      setRegenError('');
      toast('Da tao backup codes moi', undefined, 'success');
    } else {
      setRegenError(regenMutation.error ?? 'That bai');
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast('Da copy', undefined, 'success');
    } catch {
      toast('Copy that bai', undefined, 'destructive');
    }
  };

  const downloadCodes = (codes: string[]) => {
    const content = `# Backup codes 2FA\n# Luu giu bi mat — moi ma chi dung duoc 1 lan\n\n${codes.join('\n')}\n`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `2fa-backup-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Xac thuc hai yeu to (2FA)"
        description="Tang cuong bao mat bang ma OTP tu ung dung Authenticator"
        breadcrumbs={[
          breadcrumbRoot,
          { label: 'Cai dat', href: settingsHref },
          { label: '2FA' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Trang thai */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {is2faEnabled ? (
                    <ShieldCheck className="h-8 w-8 text-green-600" />
                  ) : (
                    <Shield className="h-8 w-8 text-gray-400" />
                  )}
                  <div>
                    <CardTitle>Trang thai 2FA</CardTitle>
                    <CardDescription>
                      {is2faEnabled ? 'Dang bao ve tai khoan cua ban' : 'Chua kich hoat'}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={is2faEnabled ? 'success' : 'secondary'}>
                  {is2faEnabled ? 'Da bat' : 'Da tat'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {is2faEnabled ? (
                <>
                  {typeof status?.data?.backup_codes_remaining === 'number' && (
                    <p className="text-sm text-gray-600">
                      Backup codes con lai: <strong>{status.data.backup_codes_remaining}</strong>
                    </p>
                  )}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={() => setRegenOpen(true)}>
                      <RefreshCw className="h-4 w-4 mr-2" /> Tao lai backup codes
                    </Button>
                    <Button variant="destructive" onClick={() => setDisableOpen(true)}>
                      <ShieldOff className="h-4 w-4 mr-2" /> Tat 2FA
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600">
                    2FA yeu cau ma OTP 6 so tu ung dung Google Authenticator, Authy, 1Password...
                    moi khi dang nhap. Ke ca khi mat khau bi lo, ke tan cong khong the dang nhap ma khong co dien thoai cua ban.
                  </p>
                  {!setupData && (
                    <Button onClick={handleStartSetup} disabled={setupMutation.loading}>
                      <Shield className="h-4 w-4 mr-2" />
                      {setupMutation.loading ? 'Dang chuan bi...' : 'Bat 2FA'}
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Setup flow */}
          {setupData && !is2faEnabled && (
            <Card>
              <CardHeader>
                <CardTitle>Buoc 1 — Quet QR code</CardTitle>
                <CardDescription>
                  Mo ung dung Authenticator va quet ma QR ben duoi
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  <div className="p-3 bg-white border rounded-lg shrink-0">
                    {setupData.qr_code.startsWith('data:') ? (
                      <img src={setupData.qr_code} alt="2FA QR" className="h-48 w-48" />
                    ) : (
                      <div
                        className="h-48 w-48 flex items-center justify-center"
                        dangerouslySetInnerHTML={{ __html: setupData.qr_code }}
                      />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-xs text-gray-500">Hoac nhap tay secret:</p>
                    <div className="flex gap-2">
                      <Input
                        value={setupData.secret}
                        readOnly
                        className="font-mono text-xs"
                      />
                      <Button variant="outline" size="icon" onClick={() => copy(setupData.secret)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Sau khi quet, ung dung se hien ma OTP 6 so thay doi moi 30 giay
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="font-semibold mb-2">Buoc 2 — Nhap ma xac thuc</p>
                  <FormField label="Ma 6 chu so" error={verifyError} required>
                    <Input
                      value={verifyCode}
                      onChange={(e) => { setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setVerifyError(''); }}
                      placeholder="000000"
                      className="font-mono text-center text-lg tracking-widest"
                      maxLength={6}
                    />
                  </FormField>
                  <div className="flex gap-2 mt-3">
                    <Button onClick={handleVerify} disabled={enableMutation.loading || verifyCode.length !== 6}>
                      <KeyRound className="h-4 w-4 mr-2" />
                      {enableMutation.loading ? 'Dang xac minh...' : 'Xac minh va kich hoat'}
                    </Button>
                    <Button variant="ghost" onClick={() => { setSetupData(null); setVerifyCode(''); }}>
                      Huy
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Loi khuyen bao mat</CardTitle></CardHeader>
            <CardContent className="text-sm text-gray-600 space-y-2">
              <p>- Luu backup codes o noi an toan (password manager)</p>
              <p>- Khong chia se secret voi ai</p>
              <p>- Moi backup code chi dung duoc 1 lan</p>
              <p>- Neu mat dien thoai, dung backup code de dang nhap va tat 2FA</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog hien backup codes */}
      <Dialog open={!!backupCodes} onOpenChange={(o) => !o && setBackupCodes(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Backup codes</DialogTitle>
            <DialogDescription>
              Luu lai ngay bay gio — <strong>chi hien 1 lan.</strong> Moi code chi dung duoc 1 lan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
              Neu mat codes, ban phai tao lai (se invalidate codes cu).
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-sm bg-gray-50 p-3 rounded">
              {backupCodes?.map((c, i) => (
                <div key={i} className="px-2 py-1 bg-white rounded border text-center">
                  {c}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => backupCodes && copy(backupCodes.join('\n'))}
              >
                <Copy className="h-4 w-4 mr-2" /> Copy tat ca
              </Button>
              <Button
                className="flex-1"
                onClick={() => backupCodes && downloadCodes(backupCodes)}
              >
                <Download className="h-4 w-4 mr-2" /> Tai .txt
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBackupCodes(null)}>Da luu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog tat 2FA */}
      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tat 2FA</DialogTitle>
            <DialogDescription>Nhap mat khau hien tai de xac nhan</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <FormField label="Mat khau hien tai" error={disableError} required>
              <Input
                type="password"
                value={disablePassword}
                onChange={(e) => { setDisablePassword(e.target.value); setDisableError(''); }}
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDisableOpen(false); setDisablePassword(''); setDisableError(''); }}>Huy</Button>
            <Button variant="destructive" onClick={handleDisable} disabled={disableMutation.loading}>
              <ShieldOff className="h-4 w-4 mr-2" />
              {disableMutation.loading ? 'Dang tat...' : 'Tat 2FA'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog tao lai backup codes */}
      <Dialog open={regenOpen} onOpenChange={setRegenOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tao lai backup codes</DialogTitle>
            <DialogDescription>
              Codes cu se bi vo hieu. Nhap mat khau de xac nhan.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <FormField label="Mat khau hien tai" error={regenError} required>
              <Input
                type="password"
                value={regenPassword}
                onChange={(e) => { setRegenPassword(e.target.value); setRegenError(''); }}
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRegenOpen(false); setRegenPassword(''); setRegenError(''); }}>Huy</Button>
            <Button onClick={handleRegenerate} disabled={regenMutation.loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {regenMutation.loading ? 'Dang tao...' : 'Tao moi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
