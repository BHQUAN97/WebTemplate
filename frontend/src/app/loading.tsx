/**
 * Loading UI mac dinh — hien khi route segment dang stream.
 */
export default function Loading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 py-12">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"
        role="status"
        aria-label="Dang tai"
      />
      <p className="text-sm text-gray-500">Dang tai...</p>
    </div>
  );
}
