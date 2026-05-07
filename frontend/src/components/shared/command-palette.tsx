'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  Home,
  Package,
  Newspaper,
  ShoppingCart,
  LayoutDashboard,
  User,
  Settings,
  Boxes,
  ClipboardList,
  Users,
  BarChart3,
  Moon,
  Sun,
  Monitor,
  LogOut,
  Search,
  Mail,
  GitBranch,
} from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { useAuthStore } from '@/lib/stores/auth-store';
import { UserRole } from '@/lib/types';

/**
 * CommandPalette — bang lenh global toggle bang Cmd+K / Ctrl+K.
 * Nhom lenh: Điều hướng, Admin (chi khi role ADMIN), Hành động, Liên hệ.
 * Nghe `window` event `open-command-palette` de cho components khac trigger mo.
 */
export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isAdmin = user?.role === UserRole.ADMIN;

  // Global keyboard shortcut: Cmd+K / Ctrl+K toggle palette
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, []);

  // Nghe custom event tu header button
  React.useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('open-command-palette', onOpen);
    return () => window.removeEventListener('open-command-palette', onOpen);
  }, []);

  // Helper — chay action roi dong palette
  const runCommand = React.useCallback((fn: () => void | Promise<void>) => {
    setOpen(false);
    // defer de dialog close xong truoc khi navigate tranh flicker
    setTimeout(() => {
      void fn();
    }, 0);
  }, []);

  // Copy email brand vao clipboard
  const copyEmail = React.useCallback(() => {
    const email = 'bombi19m6@gmail.com';
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(email);
    }
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Gõ lệnh hoặc tìm kiếm..." />
      <CommandList>
        <CommandEmpty>Không tìm thấy kết quả</CommandEmpty>

        <CommandGroup heading="Điều hướng">
          <CommandItem onSelect={() => runCommand(() => router.push('/'))}>
            <Home />
            <span>Trang chủ</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/products'))}>
            <Package />
            <span>Sản phẩm</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/blog'))}>
            <Newspaper />
            <span>Blog</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/cart'))}>
            <ShoppingCart />
            <span>Giỏ hàng</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/dashboard'))}>
            <LayoutDashboard />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/profile'))}>
            <User />
            <span>Profile</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/settings'))}>
            <Settings />
            <span>Settings</span>
          </CommandItem>
        </CommandGroup>

        {isAdmin && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Admin">
              <CommandItem
                onSelect={() => runCommand(() => router.push('/admin/products'))}
              >
                <Boxes />
                <span>Sản phẩm</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push('/admin/orders'))}
              >
                <ClipboardList />
                <span>Đơn hàng</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => router.push('/admin/users'))}>
                <Users />
                <span>Users</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push('/admin/reports'))}
              >
                <BarChart3 />
                <span>Reports</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Hành động">
          <CommandItem onSelect={() => runCommand(() => setTheme('light'))}>
            <Sun />
            <span>Giao diện sáng</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme('dark'))}>
            <Moon />
            <span>Giao diện tối</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme('system'))}>
            <Monitor />
            <span>Theo hệ thống</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/search'))}>
            <Search />
            <span>Tìm kiếm</span>
            <CommandShortcut>/</CommandShortcut>
          </CommandItem>
          {user && (
            <CommandItem
              onSelect={() =>
                runCommand(async () => {
                  await logout();
                  router.push('/login');
                })
              }
            >
              <LogOut />
              <span>Đăng xuất</span>
            </CommandItem>
          )}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Liên hệ">
          <CommandItem onSelect={() => runCommand(copyEmail)}>
            <Mail />
            <span>Copy email</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() => {
                if (typeof window !== 'undefined') {
                  window.open('https://github.com', '_blank', 'noopener,noreferrer');
                }
              })
            }
          >
            <GitBranch />
            <span>Mo GitHub</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
