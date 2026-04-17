/**
 * Format gia tien theo VND
 */
export function formatPrice(price: number, currency = "VND"): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    ...options,
  }).format(d);
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(d);
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/.0$/, "") + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/.0$/, "") + "K";
  return num.toString();
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function formatPercent(value: number): string {
  return (value >= 0 ? "+" : "") + value.toFixed(1) + "%";
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

/**
 * Format thoi gian tuong doi bang tieng Viet
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) return "Vua xong";
  if (diffMin < 60) return `${diffMin} phut truoc`;
  if (diffHour < 24) return `${diffHour} gio truoc`;
  if (diffDay < 7) return `${diffDay} ngay truoc`;
  if (diffWeek < 4) return `${diffWeek} tuan truoc`;
  if (diffMonth < 12) return `${diffMonth} thang truoc`;
  return `${diffYear} nam truoc`;
}

/**
 * Chuyen trang thai don hang sang tieng Viet
 */
export function formatOrderStatus(status: string): string {
  const map: Record<string, string> = {
    PENDING: "Cho xac nhan",
    CONFIRMED: "Da xac nhan",
    PROCESSING: "Dang xu ly",
    SHIPPED: "Dang giao hang",
    DELIVERED: "Da giao",
    CANCELLED: "Da huy",
    REFUNDED: "Da hoan tien",
    RETURNED: "Da tra hang",
  };
  return map[status] || status;
}

/**
 * Chuyen trang thai thanh toan sang tieng Viet
 */
export function formatPaymentStatus(status: string): string {
  const map: Record<string, string> = {
    PENDING: "Cho thanh toan",
    PROCESSING: "Dang xu ly",
    COMPLETED: "Da thanh toan",
    FAILED: "That bai",
    REFUNDED: "Da hoan tien",
    CANCELLED: "Da huy",
  };
  return map[status] || status;
}

/**
 * Tra ve Tailwind color class theo trang thai
 */
export function statusColor(status: string): string {
  const colorMap: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    CONFIRMED: "bg-blue-100 text-blue-800",
    PROCESSING: "bg-indigo-100 text-indigo-800",
    SHIPPED: "bg-purple-100 text-purple-800",
    DELIVERED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
    REFUNDED: "bg-orange-100 text-orange-800",
    RETURNED: "bg-gray-100 text-gray-800",
    COMPLETED: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
    DRAFT: "bg-gray-100 text-gray-800",
    PUBLISHED: "bg-green-100 text-green-800",
    ARCHIVED: "bg-yellow-100 text-yellow-800",
    NEW: "bg-blue-100 text-blue-800",
    IN_PROGRESS: "bg-yellow-100 text-yellow-800",
    RESOLVED: "bg-green-100 text-green-800",
    CLOSED: "bg-gray-100 text-gray-800",
    active: "bg-green-100 text-green-800",
    inactive: "bg-red-100 text-red-800",
  };
  return colorMap[status] || "bg-gray-100 text-gray-800";
}