import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * Trang 404 — hien thi khi khong tim thay route.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12 text-center">
      <p className="mb-2 text-6xl font-bold text-blue-600 sm:text-7xl">404</p>
      <h1 className="mb-2 text-2xl font-semibold text-gray-900 sm:text-3xl">
        Khong tim thay trang
      </h1>
      <p className="mb-6 max-w-md text-sm text-gray-600 sm:text-base">
        Trang ban tim kiem khong ton tai hoac da bi xoa.
      </p>
      <Link href="/">
        <Button>Ve trang chu</Button>
      </Link>
    </div>
  );
}
