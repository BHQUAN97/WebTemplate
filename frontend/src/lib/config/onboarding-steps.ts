import type { TourStep } from '@/components/shared/onboarding-tour';

/**
 * Tour intro dashboard cho user moi — 5 buoc
 */
export const dashboardTourSteps: TourStep[] = [
  {
    target: 'body',
    placement: 'center',
    title: 'Chao mung ban den voi trang quan ly!',
    content:
      'Day la trang tong quan tai khoan cua ban. Cung xem nhanh cac tinh nang chinh trong 5 buoc ngan.',
  },
  {
    target: '[aria-label*="command"], [aria-label*="Command"], [aria-label*="Tim"]',
    placement: 'bottom',
    title: 'Tim kiem nhanh',
    content:
      'Bam bieu tuong tim kiem hoac phim Ctrl+K de mo command palette — truy cap nhanh moi trang va san pham.',
  },
  {
    target: '[data-tour="notification-bell"], [aria-label*="notification"], [aria-label*="Thong bao"]',
    placement: 'bottom',
    title: 'Thong bao',
    content:
      'Chuong thong bao hien don hang moi, tin nhan va cap nhat quan trong. Bam vao de xem chi tiet.',
  },
  {
    target: '[aria-label*="theme"], [aria-label*="giao dien"], [aria-label*="Chuyen giao dien"]',
    placement: 'bottom',
    title: 'Doi giao dien',
    content:
      'Ban co the chuyen qua lai giua che do sang, toi hoac theo he thong tuy thich.',
  },
  {
    target: '[data-tour="profile-menu"], [aria-label*="profile"], [aria-label*="Tai khoan"]',
    placement: 'bottom',
    title: 'Menu tai khoan',
    content:
      'Truy cap ho so ca nhan, cai dat bao mat, va dang xuat o day. Chuc ban trai nghiem tuyet voi!',
  },
];

/**
 * Tour intro admin — 4 buoc
 */
export const adminTourSteps: TourStep[] = [
  {
    target: '[data-tour="admin-sidebar"], aside, nav[aria-label*="admin"]',
    placement: 'right',
    title: 'Thanh dieu huong admin',
    content:
      'Tat ca cac module quan ly (don hang, san pham, khach hang, cai dat...) nam o sidebar nay.',
  },
  {
    target: '[data-tour="admin-stats"], .grid:has(> [class*="stat"]), main .grid',
    placement: 'bottom',
    title: 'Thong ke tong quan',
    content:
      'Xem nhanh doanh thu, so don hang, khach hang va luot xem — so sanh voi ky truoc.',
  },
  {
    target: '[href*="/admin/products"], [data-tour="products-section"]',
    placement: 'right',
    title: 'Quan ly san pham',
    content:
      'Them moi, sua, xoa va quan ly ton kho san pham tai muc nay.',
  },
  {
    target: '[data-tour="quick-actions"], .print\\:hidden:last-child',
    placement: 'top',
    title: 'Thao tac nhanh',
    content:
      'Cac phim tat giup ban tao san pham, viet bai hoac xem bao cao chi voi 1 cu bam.',
  },
];

/**
 * Tour checkout — 3 buoc (optional)
 */
export const checkoutTourSteps: TourStep[] = [
  {
    target: '[data-tour="checkout-shipping"], form[name*="shipping"], [aria-label*="shipping"]',
    placement: 'right',
    title: 'Dia chi giao hang',
    content:
      'Nhap day du dia chi va so dien thoai de don hang duoc giao chinh xac.',
  },
  {
    target: '[data-tour="checkout-payment"], [aria-label*="payment"], [name*="payment"]',
    placement: 'top',
    title: 'Phuong thuc thanh toan',
    content:
      'Chon hinh thuc thanh toan phu hop — the, vi dien tu hoac COD. Giao dich duoc bao mat.',
  },
  {
    target: '[data-tour="checkout-confirm"], button[type="submit"]',
    placement: 'top',
    title: 'Xac nhan don hang',
    content:
      'Kiem tra lai thong tin va bam xac nhan de hoan tat. Ban se nhan email xac nhan ngay sau do.',
  },
];
