import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16 text-center bg-gray-50">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-violet-50">
        <span className="text-5xl" role="img" aria-label="Demo">🛍️</span>
      </div>
      <p className="mb-2 text-7xl font-black text-violet-600">404</p>
      <h1 className="mb-3 text-2xl font-bold text-gray-900 sm:text-3xl">Không tìm thấy trang</h1>
      <p className="mb-8 max-w-md text-sm text-gray-500 sm:text-base">
        Trang bạn đang tìm không tồn tại trong bản demo này. Hãy thử khám phá sản phẩm hoặc liên hệ!
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild className="bg-violet-600 hover:bg-violet-700 min-h-[44px] px-6">
          <Link href="/">Về Trang chủ</Link>
        </Button>
        <Button asChild variant="outline" className="border-violet-500 text-violet-600 hover:bg-violet-50 min-h-[44px] px-6">
          <Link href="/products">Xem sản phẩm</Link>
        </Button>
        <Button asChild variant="ghost" className="text-gray-500 min-h-[44px]">
          <Link href="/contact">Liên hệ</Link>
        </Button>
      </div>
    </div>
  );
}
