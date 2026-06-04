import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function PublicNotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-violet-50">
        <span className="text-4xl" role="img" aria-label="Không tìm thấy">🔍</span>
      </div>
      <p className="mb-2 text-6xl font-black text-violet-600 sm:text-7xl">404</p>
      <h1 className="mb-3 text-xl font-bold text-gray-900 sm:text-2xl">Không tìm thấy trang</h1>
      <p className="mb-8 max-w-md text-sm text-gray-500 sm:text-base">
        Trang bạn tìm kiếm không tồn tại trong bản demo. Hãy khám phá sản phẩm hoặc blog!
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild className="bg-violet-600 hover:bg-violet-700 min-h-[44px] px-6">
          <Link href="/products">Xem sản phẩm demo</Link>
        </Button>
        <Button asChild variant="outline" className="border-violet-500 text-violet-600 hover:bg-violet-50 min-h-[44px] px-6">
          <Link href="/">Về Trang chủ</Link>
        </Button>
        <Button asChild variant="ghost" className="text-gray-500 min-h-[44px]">
          <Link href="/blog">Blog</Link>
        </Button>
      </div>
    </div>
  );
}
