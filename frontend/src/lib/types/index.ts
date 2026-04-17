// ============================================================
// Shared TypeScript types cho toan bo ung dung
// ============================================================

// --- API Response ---

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message: string;
  pagination?: PaginationMeta;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

// --- Enums ---

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  EDITOR = 'EDITOR',
  USER = 'USER',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  RETURNED = 'RETURNED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

export enum ArticleStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum ContactStatus {
  NEW = 'NEW',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

// --- User ---

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  is_email_verified: boolean;
  two_factor_enabled: boolean;
  created_at: string;
}

// --- Product ---

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  sku: string | null;
  price: number;
  compare_at_price: number | null;
  cost_price: number | null;
  quantity: number;
  is_active: boolean;
  is_featured: boolean;
  category_id: string | null;
  category?: Category;
  variants?: ProductVariant[];
  images?: MediaFile[];
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string | null;
  price: number;
  compare_at_price: number | null;
  quantity: number;
  attributes: Record<string, string>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// --- Category ---

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  position: number;
  is_active: boolean;
  children?: Category[];
  created_at: string;
  updated_at: string;
}

// --- Order ---

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  user?: User;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  shipping_fee: number;
  tax: number;
  total: number;
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_district: string;
  shipping_ward: string;
  note: string | null;
  items?: OrderItem[];
  payment?: Payment;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  sku: string | null;
  price: number;
  quantity: number;
  total: number;
  product?: Product;
}

// --- Payment ---

export interface Payment {
  id: string;
  order_id: string;
  method: string;
  status: PaymentStatus;
  amount: number;
  transaction_id: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

// --- CMS ---

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image: string | null;
  status: ArticleStatus;
  author_id: string;
  author?: User;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  content: string;
  meta_title: string | null;
  meta_description: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

// --- Review ---

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  user?: User;
  product?: Product;
  rating: number;
  title: string | null;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

// --- Promotion ---

export interface Promotion {
  id: string;
  name: string;
  code: string;
  description: string | null;
  discount_type: 'PERCENTAGE' | 'FIXED';
  discount_value: number;
  min_order_amount: number | null;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// --- Setting ---

export interface Setting {
  id: string;
  key: string;
  value: string;
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';
  group: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

// --- FAQ ---

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// --- Contact ---

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: ContactStatus;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
}

// --- Notification ---

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  content: string;
  type: string;
  is_read: boolean;
  data: Record<string, unknown> | null;
  created_at: string;
}

// --- SaaS ---

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  features: Record<string, unknown>;
  max_users: number;
  max_products: number;
  max_storage_mb: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  plan_id: string;
  plan?: Plan;
  owner_id: string;
  owner?: User;
  is_active: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// --- Media ---

export interface MediaFile {
  id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  url: string;
  folder: string | null;
  alt_text: string | null;
  uploaded_by: string;
  created_at: string;
}

// --- Logs ---

export interface AuditLog {
  id: string;
  user_id: string;
  user?: User;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export interface AccessLog {
  id: string;
  path: string;
  method: string;
  status_code: number;
  ip_address: string;
  user_agent: string;
  user_id: string | null;
  response_time: number;
  created_at: string;
}

export interface Changelog {
  id: string;
  version: string;
  title: string;
  description: string;
  type: 'FEATURE' | 'FIX' | 'IMPROVEMENT' | 'BREAKING';
  published_at: string | null;
  created_at: string;
}

// --- Form types ---

export interface LoginForm {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordForm {
  email: string;
}

// --- Dashboard ---

export interface DashboardStats {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  totalPageviews: number;
  recentOrders: Order[];
  topProducts: Array<{
    product: Product;
    totalSold: number;
    totalRevenue: number;
  }>;
}
