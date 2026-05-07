import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * 404 cho public route group — giu header/footer layout.
 */
export default function PublicNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12 text-center">
      <p className="mb-2 text-6xl font-bold text-blue-600 sm:text-7xl">404</p>
      <h1 className="mb-2 text-2xl font-semibold text-gray-900 sm:text-3xl">
        Không tìm thấy trang
      </h1>
      <p className="mb-6 max-w-md text-sm text-gray-600 sm:text-base">
        Nội dung ban tim khong ton tai. Hay quay ve Trang chủ hoac tim Sản phẩm
        khac.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link href="/">
          <Button>Ve Trang chủ</Button>
        </Link>
        <Link href="/products">
          <Button variant="outline">Xem Sản phẩm</Button>
        </Link>
      </div>
    </div>
  );
}
