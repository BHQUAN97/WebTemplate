'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { saveAs } from 'file-saver';
import { Eye, EyeOff, Trash2, Upload, ShieldCheck, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/lib/stores/auth-store';
import {
  profileSchema,
  changePasswordSchema,
  type ProfileFormData,
  type ChangePasswordFormData,
} from '@/lib/validations';
import { usersApi } from '@/lib/api/modules/users.api';
import { authApi } from '@/lib/api/modules/auth.api';
import { apiClient } from '@/lib/api/client';
import { useHydration } from '@/lib/hooks';
import { toast } from '@/lib/hooks/use-toast';

/**
 * Trang ho so — edit profile, change password, 2FA, delete account
 */
export default function ProfilePage() {
  const hydrated = useHydration();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const logout = useAuthStore((s) => s.logout);

  const [profileMsg, setProfileMsg] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportMsg, setExportMsg] = useState('');

  // Avatar upload state — dung file input an thay vi mount lai ImageUpload
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarDeleting, setAvatarDeleting] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? '';

  // Lay auth token tu store / storage de gan Authorization header
  const getAuthHeaders = (): HeadersInit => {
    const headers: HeadersInit = {};
    if (typeof window !== 'undefined') {
      const token =
        useAuthStore.getState().token ||
        localStorage.getItem('access_token') ||
        sessionStorage.getItem('access_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const handleAvatarPick = () => avatarInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input ngay de user co the chon lai cung 1 file sau khi loi
    e.target.value = '';

    // Validate phia client (mirror BE: ~5MB, image only)
    if (!file.type.startsWith('image/')) {
      toast('Tep khong hop le', 'Vui long chon file anh', 'destructive');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('Tep qua lon', 'Anh khong duoc vuot qua 5MB', 'destructive');
      return;
    }

    setAvatarLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      // Dung apiClient.upload() de tan dung 401 refresh-token interceptor
      // va xu ly loi dong nhat voi cac API goi khac.
      const data = (await apiClient.upload<Record<string, unknown>>(
        '/users/me/avatar',
        fd,
      )) ?? {};
      const newUrl =
        (data as { avatar_url?: string; url?: string }).avatar_url ??
        (data as { url?: string }).url ??
        null;

      if (newUrl) {
        updateUser({ avatar_url: newUrl });
      } else {
        // Server khong tra URL — refetch profile de dong bo
        try {
          const me = await authApi.me();
          if (me) updateUser(me);
        } catch {
          // Khong critical
        }
      }
      toast('Da cap nhat anh dai dien', undefined, 'success');
    } catch (err) {
      toast(
        'Loi khi upload',
        (err as Error).message || 'Vui long thu lai',
        'destructive',
      );
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleAvatarRemove = async () => {
    if (!user?.avatar_url) return;
    setAvatarDeleting(true);
    try {
      const res = await fetch(`${apiBase}/api/users/me/avatar`, {
        method: 'DELETE',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `HTTP ${res.status}`);
      }
      updateUser({ avatar_url: null });
      toast('Da xoa anh dai dien', undefined, 'success');
    } catch (err) {
      toast(
        'Loi khi xoa anh',
        (err as Error).message || 'Vui long thu lai',
        'destructive',
      );
    } finally {
      setAvatarDeleting(false);
    }
  };

  // Profile form
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: {
      name: hydrated ? user?.name ?? '' : '',
      phone: hydrated ? user?.phone ?? '' : '',
    },
  });

  // Password form
  const passwordForm = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onProfileSubmit = async (data: ProfileFormData) => {
    setProfileMsg('');
    try {
      if (user) {
        await usersApi.updateUser(user.id, data);
        updateUser(data);
        setProfileMsg('Cap nhat ho so thanh cong!');
      }
    } catch (err: any) {
      setProfileMsg(err.message || 'Loi khi cap nhat ho so');
    }
  };

  const onPasswordSubmit = async (data: ChangePasswordFormData) => {
    setPasswordMsg('');
    setPasswordError('');
    try {
      await authApi.changePassword(data.currentPassword, data.newPassword);
      setPasswordMsg('Doi mat khau thanh cong!');
      passwordForm.reset();
    } catch (err: any) {
      setPasswordError(err.message || 'Mat khau hien tai khong dung');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      if (user) {
        await usersApi.deleteUser(user.id);
        logout();
      }
    } catch {
      // Ignore
    }
  };

  // GDPR — tai xuong toan bo du lieu ca nhan
  const handleExportData = async () => {
    if (!user) return;
    setExportLoading(true);
    setExportMsg('');
    try {
      const blob = await usersApi.exportUserData(user.id);
      const ext =
        blob.type.includes('zip') || blob.type === 'application/zip'
          ? 'zip'
          : 'json';
      saveAs(blob, `my-data-${user.id}-${Date.now()}.${ext}`);
      setExportMsg('Da tai du lieu cua ban');
    } catch (err) {
      setExportMsg((err as Error).message || 'Loi khi tai du lieu');
    } finally {
      setExportLoading(false);
    }
  };

  if (!hydrated) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ho so</h1>

      {/* Profile form */}
      <Card>
        <CardHeader>
          <CardTitle>Thong tin ca nhan</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={profileForm.handleSubmit(onProfileSubmit)}
            className="space-y-4"
          >
            {/* Avatar — upload / xoa */}
            <div className="flex items-center gap-4 flex-wrap">
              <Avatar className="w-16 h-16">
                {user?.avatar_url && (
                  <AvatarImage
                    src={user.avatar_url}
                    alt={user?.name ? `Anh dai dien cua ${user.name}` : 'Anh dai dien'}
                  />
                )}
                <AvatarFallback className="text-xl font-bold bg-blue-100 text-blue-600">
                  {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
                </AvatarFallback>
              </Avatar>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={handleAvatarPick}
                  disabled={avatarLoading || avatarDeleting}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  {avatarLoading ? 'Dang tai len...' : 'Doi anh'}
                </Button>

                {user?.avatar_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={handleAvatarRemove}
                    disabled={avatarLoading || avatarDeleting}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <X className="h-4 w-4 mr-1" />
                    {avatarDeleting ? 'Dang xoa...' : 'Xoa anh'}
                  </Button>
                )}

                {/* File input an — trigger qua button "Doi anh" */}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                  aria-label="Chon anh dai dien moi"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ho ten
                </label>
                <Input {...profileForm.register('name')} />
                {profileForm.formState.errors.name && (
                  <p className="text-red-500 text-xs mt-1">
                    {profileForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  So dien thoai
                </label>
                <Input {...profileForm.register('phone')} />
                {profileForm.formState.errors.phone && (
                  <p className="text-red-500 text-xs mt-1">
                    {profileForm.formState.errors.phone.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <Input value={user?.email ?? ''} disabled />
              <p className="text-xs text-gray-400 mt-1">
                Email khong the thay doi
              </p>
            </div>

            {profileMsg && (
              <div className="bg-green-50 text-green-600 text-sm rounded-lg p-3">
                {profileMsg}
              </div>
            )}

            <Button
              type="submit"
              disabled={profileForm.formState.isSubmitting}
            >
              {profileForm.formState.isSubmitting ? 'Dang luu...' : 'Luu thay doi'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader>
          <CardTitle>Doi mat khau</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mat khau hien tai
              </label>
              <div className="relative">
                <Input
                  {...passwordForm.register('currentPassword')}
                  type={showPasswords ? 'text' : 'password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-red-500 text-xs mt-1">
                  {passwordForm.formState.errors.currentPassword.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mat khau moi
                </label>
                <Input
                  {...passwordForm.register('newPassword')}
                  type={showPasswords ? 'text' : 'password'}
                />
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-red-500 text-xs mt-1">
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Xac nhan mat khau moi
                </label>
                <Input
                  {...passwordForm.register('confirmNewPassword')}
                  type={showPasswords ? 'text' : 'password'}
                />
                {passwordForm.formState.errors.confirmNewPassword && (
                  <p className="text-red-500 text-xs mt-1">
                    {passwordForm.formState.errors.confirmNewPassword.message}
                  </p>
                )}
              </div>
            </div>

            {passwordMsg && (
              <div className="bg-green-50 text-green-600 text-sm rounded-lg p-3">
                {passwordMsg}
              </div>
            )}
            {passwordError && (
              <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">
                {passwordError}
              </div>
            )}

            <Button
              type="submit"
              disabled={passwordForm.formState.isSubmitting}
            >
              Doi mat khau
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 2FA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Xac thuc 2 lop (2FA)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {user?.two_factor_enabled
                  ? 'Xac thuc 2 lop dang bat'
                  : 'Bat xac thuc 2 lop de bao ve tai khoan'}
              </p>
            </div>
            <Button
              variant={user?.two_factor_enabled ? 'destructive' : 'default'}
              size="sm"
            >
              {user?.two_factor_enabled ? 'Tat 2FA' : 'Bat 2FA'}
            </Button>
          </div>

          {!user?.two_factor_enabled && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg text-center">
              <div className="w-32 h-32 bg-gray-200 rounded-lg mx-auto mb-3 flex items-center justify-center text-gray-400 text-sm">
                QR Code
              </div>
              <p className="text-xs text-gray-500">
                Quet QR code nay bang ung dung xac thuc (Google Authenticator, Authy...)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* GDPR data export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Du lieu cua toi (GDPR)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">
            Tai xuong ban sao toan bo du lieu ca nhan cua ban (JSON/ZIP).
          </p>
          <Button
            variant="outline"
            onClick={handleExportData}
            disabled={exportLoading}
          >
            <Download className="h-4 w-4 mr-2" />
            {exportLoading ? 'Dang chuan bi...' : 'Tai du lieu cua toi'}
          </Button>
          {exportMsg && (
            <p className="text-sm text-gray-600">{exportMsg}</p>
          )}
        </CardContent>
      </Card>

      {/* Delete account */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Xoa tai khoan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Hanh dong nay khong the hoan tac. Tat ca du lieu se bi xoa vinh vien.
          </p>
          {deleteConfirm ? (
            <div className="flex gap-3">
              <Button variant="destructive" onClick={handleDeleteAccount}>
                Xac nhan xoa
              </Button>
              <Button variant="outline" onClick={() => setDeleteConfirm(false)}>
                Huy
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50"
              onClick={() => setDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Xoa tai khoan
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
