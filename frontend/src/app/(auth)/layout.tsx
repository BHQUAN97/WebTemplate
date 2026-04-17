import Link from 'next/link';

/**
 * Layout cho cac trang auth — centered form, minimal design
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Minimal header */}
      <div className="p-4">
        <Link href="/" className="text-xl font-bold text-blue-600">
          WebTemplate
        </Link>
      </div>

      {/* Centered content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
