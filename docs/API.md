# API Documentation

Base URL: `http://localhost:6001/api`

All endpoints are prefixed with `/api`. Responses follow the format:

```json
{
  "data": { ... },
  "meta": { "timestamp": "2026-04-16T00:00:00Z" }
}
```

Error responses:

```json
{
  "statusCode": 400,
  "message": "Validation error description",
  "error": "Bad Request"
}
```

Authentication: Include `Authorization: Bearer <accessToken>` header for protected routes.

---

## Auth

### POST /auth/register
Register a new user account.

- **Auth**: No
- **Body**:
```json
{
  "name": "Nguyen Van A",
  "email": "user@example.com",
  "password": "StrongP@ss1",
  "phone": "0901234567"
}
```
- **Response** `201`:
```json
{
  "data": {
    "accessToken": "eyJhbG..."
  }
}
```
- Sets `refreshToken` httpOnly cookie.

### POST /auth/login
Authenticate and receive tokens.

- **Auth**: No
- **Body**:
```json
{
  "email": "user@example.com",
  "password": "StrongP@ss1"
}
```
- **Response** `200`:
```json
{
  "data": {
    "accessToken": "eyJhbG..."
  }
}
```

### POST /auth/refresh
Refresh the access token using refresh token cookie.

- **Auth**: No (uses cookie)
- **Body** (optional fallback):
```json
{
  "refreshToken": "eyJhbG..."
}
```
- **Response** `200`:
```json
{
  "data": {
    "accessToken": "eyJhbG..."
  }
}
```

### POST /auth/logout
Revoke refresh token and clear cookie.

- **Auth**: Yes
- **Response** `200`:
```json
{
  "data": {
    "message": "Logged out successfully"
  }
}
```

### POST /auth/change-password
Change password for authenticated user.

- **Auth**: Yes
- **Body**:
```json
{
  "currentPassword": "OldP@ss1",
  "newPassword": "NewP@ss2",
  "confirmPassword": "NewP@ss2"
}
```
- **Response** `200`:
```json
{
  "data": {
    "message": "Password changed successfully"
  }
}
```

### POST /auth/forgot-password
Request password reset email.

- **Auth**: No
- **Body**:
```json
{
  "email": "user@example.com"
}
```
- **Response** `200`:
```json
{
  "data": {
    "message": "If your email is registered, you will receive a reset link"
  }
}
```

### POST /auth/reset-password
Reset password with token from email.

- **Auth**: No
- **Body**:
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewP@ss2",
  "confirmPassword": "NewP@ss2"
}
```
- **Response** `200`:
```json
{
  "data": {
    "message": "Password reset successfully"
  }
}
```

---

## Users

### GET /users
List all users (admin only). Supports pagination and search.

- **Auth**: Yes (admin)
- **Query**: `?page=1&limit=20&search=nguyen&role=user`
- **Response** `200`:
```json
{
  "data": [
    {
      "id": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      "name": "Nguyen Van A",
      "email": "user@example.com",
      "role": "user",
      "is_active": true,
      "created_at": "2026-04-16T00:00:00Z"
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

### GET /users/me
Get current authenticated user profile.

- **Auth**: Yes
- **Response** `200`:
```json
{
  "data": {
    "id": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
    "name": "Nguyen Van A",
    "email": "user@example.com",
    "phone": "0901234567",
    "role": "user",
    "avatar_url": null,
    "is_active": true,
    "created_at": "2026-04-16T00:00:00Z"
  }
}
```

### PATCH /users/me
Update current user profile.

- **Auth**: Yes
- **Body**:
```json
{
  "name": "Nguyen Van B",
  "phone": "0909876543"
}
```

### POST /users
Create user (admin only).

- **Auth**: Yes (admin)
- **Body**:
```json
{
  "name": "New User",
  "email": "newuser@example.com",
  "password": "TempP@ss1",
  "role": "user"
}
```

### PATCH /users/:id
Update user by ID (admin only).

- **Auth**: Yes (admin)
- **Body**:
```json
{
  "role": "admin",
  "is_active": false
}
```

### DELETE /users/:id
Soft delete user (admin only).

- **Auth**: Yes (admin)
- **Response** `200`

---

## Products

### GET /products
List products with pagination, filtering, and sorting.

- **Auth**: No
- **Query**: `?page=1&limit=20&category=electronics&minPrice=100&maxPrice=500&sort=price:asc&search=phone`
- **Response** `200`:
```json
{
  "data": [
    {
      "id": "01ARZ...",
      "name": "Product Name",
      "slug": "product-name",
      "description": "Description...",
      "price": 299.99,
      "compare_price": 399.99,
      "sku": "PRD-001",
      "stock": 50,
      "is_featured": false,
      "category": { "id": "...", "name": "Electronics" },
      "images": ["https://cdn.example.com/img1.jpg"]
    }
  ],
  "meta": { "total": 100, "page": 1, "limit": 20 }
}
```

### GET /products/:id
Get product by ID.

- **Auth**: No

### GET /products/slug/:slug
Get product by URL slug.

- **Auth**: No

### GET /products/featured
Get featured products.

- **Auth**: No
- **Query**: `?limit=8`

### POST /products
Create product (admin only).

- **Auth**: Yes (admin)
- **Body**:
```json
{
  "name": "New Product",
  "description": "Product description",
  "price": 199.99,
  "compare_price": 249.99,
  "sku": "PRD-002",
  "stock": 100,
  "category_id": "01ARZ...",
  "is_featured": true,
  "images": ["https://cdn.example.com/img.jpg"],
  "variants": [
    { "name": "Size M", "sku": "PRD-002-M", "price": 199.99, "stock": 50 }
  ]
}
```

### PATCH /products/:id
Update product (admin only).

- **Auth**: Yes (admin)

### DELETE /products/:id
Soft delete product (admin only).

- **Auth**: Yes (admin)

---

## Categories

### GET /categories
List all categories.

- **Auth**: No

### GET /categories/tree
Get category tree (hierarchical).

- **Auth**: No
- **Response** `200`:
```json
{
  "data": [
    {
      "id": "01ARZ...",
      "name": "Electronics",
      "slug": "electronics",
      "children": [
        { "id": "...", "name": "Phones", "slug": "phones", "children": [] }
      ]
    }
  ]
}
```

### POST /categories
Create category (admin only).

- **Auth**: Yes (admin)
- **Body**:
```json
{
  "name": "New Category",
  "parent_id": null,
  "description": "Category description"
}
```

### PATCH /categories/:id
Update category (admin only).

- **Auth**: Yes (admin)

### PUT /categories/reorder
Reorder categories (admin only).

- **Auth**: Yes (admin)
- **Body**:
```json
{
  "items": [
    { "id": "01ARZ...", "position": 0 },
    { "id": "01BRZ...", "position": 1 }
  ]
}
```

---

## Orders

### GET /orders
List orders. Admin sees all, users see own orders.

- **Auth**: Yes
- **Query**: `?page=1&limit=20&status=pending`

### GET /orders/:id
Get order detail with items.

- **Auth**: Yes

### POST /orders
Create order from cart.

- **Auth**: Yes
- **Body**:
```json
{
  "shipping_address": {
    "name": "Nguyen Van A",
    "phone": "0901234567",
    "address": "123 Le Loi, Q1",
    "city": "Ho Chi Minh",
    "province": "HCM"
  },
  "payment_method": "cod",
  "note": "Giao buoi sang",
  "promotion_code": "SALE10"
}
```

### PATCH /orders/:id/status
Update order status (admin only).

- **Auth**: Yes (admin)
- **Body**:
```json
{
  "status": "confirmed",
  "note": "Da xac nhan don hang"
}
```

### POST /orders/:id/cancel
Cancel order (owner or admin).

- **Auth**: Yes
- **Body**:
```json
{
  "reason": "Doi y khong mua nua"
}
```

---

## Payments

### POST /payments
Process payment for order.

- **Auth**: Yes
- **Body**:
```json
{
  "order_id": "01ARZ...",
  "method": "vnpay",
  "return_url": "http://localhost:6000/payment/callback"
}
```

### POST /payments/callback
Payment gateway callback (webhook).

- **Auth**: No (verified by signature)

### POST /payments/:id/refund
Refund payment (admin only).

- **Auth**: Yes (admin)
- **Body**:
```json
{
  "amount": 199.99,
  "reason": "Tra hang"
}
```

---

## Cart

### GET /cart
Get current user's cart.

- **Auth**: Yes
- **Response** `200`:
```json
{
  "data": {
    "items": [
      {
        "id": "01ARZ...",
        "product": { "id": "...", "name": "Product", "price": 199.99 },
        "variant_id": null,
        "quantity": 2,
        "subtotal": 399.98
      }
    ],
    "total": 399.98,
    "item_count": 2
  }
}
```

### POST /cart/items
Add item to cart.

- **Auth**: Yes
- **Body**:
```json
{
  "product_id": "01ARZ...",
  "variant_id": null,
  "quantity": 1
}
```

### PATCH /cart/items/:id
Update cart item quantity.

- **Auth**: Yes
- **Body**:
```json
{
  "quantity": 3
}
```

### DELETE /cart/items/:id
Remove item from cart.

- **Auth**: Yes

### POST /cart/merge
Merge guest cart after login.

- **Auth**: Yes
- **Body**:
```json
{
  "guest_cart_id": "session-uuid"
}
```

---

## Reviews

### GET /reviews
List reviews for a product.

- **Auth**: No
- **Query**: `?product_id=01ARZ...&page=1&limit=10&sort=newest`

### POST /reviews
Submit product review.

- **Auth**: Yes
- **Body**:
```json
{
  "product_id": "01ARZ...",
  "rating": 5,
  "title": "San pham tot",
  "content": "Chat luong rat tot, giao hang nhanh"
}
```

### PATCH /reviews/:id/approve
Approve review (admin only).

- **Auth**: Yes (admin)

### PATCH /reviews/:id/reject
Reject review (admin only).

- **Auth**: Yes (admin)
- **Body**: `{ "reason": "Noi dung khong phu hop" }`

### POST /reviews/:id/reply
Reply to review (admin only).

- **Auth**: Yes (admin)
- **Body**: `{ "content": "Cam on ban da danh gia!" }`

---

## Promotions

### GET /promotions
List promotions (admin only).

- **Auth**: Yes (admin)

### GET /promotions/active
Get active promotions.

- **Auth**: No

### POST /promotions
Create promotion (admin only).

- **Auth**: Yes (admin)
- **Body**:
```json
{
  "code": "SALE10",
  "type": "percentage",
  "value": 10,
  "min_order": 200000,
  "max_discount": 50000,
  "starts_at": "2026-04-01T00:00:00Z",
  "ends_at": "2026-04-30T23:59:59Z",
  "usage_limit": 100
}
```

### POST /promotions/validate
Validate promotion code for cart.

- **Auth**: Yes
- **Body**: `{ "code": "SALE10", "cart_total": 500000 }`
- **Response**: `{ "data": { "valid": true, "discount": 50000 } }`

### DELETE /promotions/:id
Delete promotion (admin only).

- **Auth**: Yes (admin)

---

## Articles

### GET /articles
List articles (admin: all, public: published only).

- **Auth**: No (public), Yes (admin for drafts)
- **Query**: `?page=1&limit=10&status=published&category=news`

### GET /articles/published
List published articles.

- **Auth**: No

### GET /articles/slug/:slug
Get article by slug.

- **Auth**: No (if published)

### POST /articles
Create article (admin only).

- **Auth**: Yes (admin)
- **Body**:
```json
{
  "title": "Bai viet moi",
  "content": "<p>Noi dung bai viet...</p>",
  "excerpt": "Tom tat",
  "cover_image": "https://cdn.example.com/cover.jpg",
  "categories": ["news"],
  "tags": ["sale", "new"],
  "status": "draft"
}
```

### PATCH /articles/:id
Update article (admin only).

- **Auth**: Yes (admin)

### POST /articles/:id/publish
Publish article (admin only).

- **Auth**: Yes (admin)

### POST /articles/:id/unpublish
Unpublish article (admin only).

- **Auth**: Yes (admin)

---

## Pages

### GET /pages
List all pages (admin only).

- **Auth**: Yes (admin)

### GET /pages/slug/:slug
Get page by slug.

- **Auth**: No

### GET /pages/homepage
Get homepage configuration.

- **Auth**: No

### POST /pages
Create page (admin only).

- **Auth**: Yes (admin)
- **Body**:
```json
{
  "title": "About Us",
  "slug": "about-us",
  "content": "<h1>About</h1><p>...</p>",
  "is_published": true
}
```

### PATCH /pages/:id
Update page (admin only).

- **Auth**: Yes (admin)

---

## Navigation

### GET /navigation
List all navigation menus (admin only).

- **Auth**: Yes (admin)

### GET /navigation/location/:location
Get menu by location (header, footer, sidebar).

- **Auth**: No
- **Response** `200`:
```json
{
  "data": {
    "id": "01ARZ...",
    "name": "Main Menu",
    "location": "header",
    "items": [
      { "label": "Trang chu", "url": "/", "children": [] },
      { "label": "San pham", "url": "/products", "children": [
        { "label": "Dien thoai", "url": "/products?category=phones" }
      ]}
    ]
  }
}
```

### POST /navigation
Create navigation menu (admin only).

- **Auth**: Yes (admin)

### PATCH /navigation/:id
Update navigation menu (admin only).

- **Auth**: Yes (admin)

### PUT /navigation/:id/items
Update navigation items (admin only).

- **Auth**: Yes (admin)

---

## SEO

### GET /seo/sitemap.xml
Generate XML sitemap.

- **Auth**: No

### GET /seo/robots.txt
Serve robots.txt.

- **Auth**: No

### GET /seo/meta/:path
Get SEO meta for specific path.

- **Auth**: No
- **Response**: `{ "data": { "title": "...", "description": "...", "og_image": "..." } }`

---

## Media

### POST /media/upload
Upload file(s). Supports images, documents.

- **Auth**: Yes
- **Body**: `multipart/form-data` with `file` field
- **Query**: `?folder=products`
- **Response** `201`:
```json
{
  "data": {
    "id": "01ARZ...",
    "filename": "image.jpg",
    "url": "https://cdn.example.com/products/image.jpg",
    "size": 245760,
    "mime_type": "image/jpeg",
    "width": 800,
    "height": 600
  }
}
```

### GET /media
List uploaded files with pagination.

- **Auth**: Yes
- **Query**: `?page=1&limit=20&folder=products&mime_type=image`

### DELETE /media/:id
Delete uploaded file.

- **Auth**: Yes (admin)

### GET /media/folders
List available folders.

- **Auth**: Yes

---

## Notifications

### GET /notifications
List notifications for current user.

- **Auth**: Yes
- **Query**: `?page=1&limit=20&unread=true`

### GET /notifications/unread-count
Get unread notification count.

- **Auth**: Yes
- **Response**: `{ "data": { "count": 5 } }`

### PATCH /notifications/:id/read
Mark notification as read.

- **Auth**: Yes

### PATCH /notifications/read-all
Mark all notifications as read.

- **Auth**: Yes

---

## Analytics

### POST /analytics/pageview
Track page view (public or authenticated).

- **Auth**: No
- **Body**:
```json
{
  "path": "/products/iphone-15",
  "referrer": "https://google.com",
  "user_agent": "Mozilla/5.0...",
  "session_id": "uuid"
}
```

### POST /analytics/event
Track custom event.

- **Auth**: No
- **Body**:
```json
{
  "name": "add_to_cart",
  "properties": { "product_id": "01ARZ...", "value": 199.99 }
}
```

### GET /analytics/dashboard
Dashboard summary stats.

- **Auth**: Yes (admin)
- **Query**: `?from=2026-04-01&to=2026-04-16`
- **Response** `200`:
```json
{
  "data": {
    "total_revenue": 15000000,
    "total_orders": 150,
    "total_users": 500,
    "total_pageviews": 25000,
    "revenue_change": 12.5,
    "orders_change": 8.3
  }
}
```

### GET /analytics/pageviews
Page view analytics over time.

- **Auth**: Yes (admin)
- **Query**: `?from=2026-04-01&to=2026-04-16&interval=day`

### GET /analytics/top-pages
Most visited pages.

- **Auth**: Yes (admin)
- **Query**: `?limit=10&from=2026-04-01&to=2026-04-16`

### GET /analytics/devices
Device and browser breakdown.

- **Auth**: Yes (admin)

### GET /analytics/revenue
Revenue analytics over time.

- **Auth**: Yes (admin)
- **Query**: `?from=2026-04-01&to=2026-04-16&interval=day`

### GET /analytics/sources
Traffic sources breakdown.

- **Auth**: Yes (admin)

---

## Search

### GET /search
Full-text search across products, articles, pages, FAQ.

- **Auth**: No
- **Query**: `?q=iphone&type=products&page=1&limit=20`
- **Response** `200`:
```json
{
  "data": {
    "products": [ { "id": "...", "name": "iPhone 15", "slug": "iphone-15" } ],
    "articles": [],
    "pages": [],
    "total": 5
  }
}
```

---

## Settings

### GET /settings
Get all settings (admin only).

- **Auth**: Yes (admin)

### GET /settings/public
Get public settings (site name, logo, etc.).

- **Auth**: No

### PUT /settings
Update settings (admin only).

- **Auth**: Yes (admin)
- **Body**:
```json
{
  "site_name": "My Store",
  "site_description": "Best products online",
  "logo_url": "https://cdn.example.com/logo.png",
  "currency": "VND",
  "locale": "vi"
}
```

### PUT /settings/bulk
Bulk update settings (admin only).

- **Auth**: Yes (admin)
- **Body**:
```json
{
  "settings": [
    { "key": "site_name", "value": "My Store" },
    { "key": "currency", "value": "VND" }
  ]
}
```

---

## Logs

### GET /logs/audit
List audit logs (admin only).

- **Auth**: Yes (admin)
- **Query**: `?page=1&limit=50&action=create&entity=products&user_id=01ARZ...`

### GET /logs/access
List access logs (admin only).

- **Auth**: Yes (admin)
- **Query**: `?page=1&limit=50&from=2026-04-01`

### GET /logs/stats
Log statistics summary.

- **Auth**: Yes (admin)

### GET /logs/changelog
Entity change history.

- **Auth**: Yes (admin)
- **Query**: `?entity=products&entity_id=01ARZ...`

---

## Contacts

### POST /contacts
Submit contact form (public).

- **Auth**: No
- **Body**:
```json
{
  "name": "Nguyen Van A",
  "email": "user@example.com",
  "phone": "0901234567",
  "subject": "Hoi ve san pham",
  "message": "Toi muon biet them ve..."
}
```

### GET /contacts
List contact submissions (admin only).

- **Auth**: Yes (admin)
- **Query**: `?page=1&limit=20&status=unread`

### PATCH /contacts/:id
Update contact status (admin only).

- **Auth**: Yes (admin)
- **Body**: `{ "status": "replied", "note": "Da tra loi qua email" }`

### GET /contacts/stats
Contact form statistics.

- **Auth**: Yes (admin)

---

## FAQ

### GET /faq
List published FAQ items (public).

- **Auth**: No
- **Query**: `?category=shipping&search=giao+hang`

### POST /faq
Create FAQ item (admin only).

- **Auth**: Yes (admin)
- **Body**:
```json
{
  "question": "Thoi gian giao hang bao lau?",
  "answer": "Tu 2-5 ngay lam viec tuy khu vuc.",
  "category": "shipping",
  "is_published": true
}
```

### PATCH /faq/:id
Update FAQ item (admin only).

- **Auth**: Yes (admin)

### POST /faq/:id/vote
Vote FAQ helpfulness (public).

- **Auth**: No
- **Body**: `{ "helpful": true }`

### PUT /faq/reorder
Reorder FAQ items (admin only).

- **Auth**: Yes (admin)
- **Body**: `{ "items": [{ "id": "01ARZ...", "position": 0 }] }`

---

## Tenants

### GET /tenants
List all tenants (super admin only).

- **Auth**: Yes (admin)

### GET /tenants/my
Get current user's tenant.

- **Auth**: Yes

### POST /tenants
Create new tenant.

- **Auth**: Yes
- **Body**:
```json
{
  "name": "My Store",
  "slug": "my-store",
  "domain": "mystore.example.com"
}
```

### PATCH /tenants/:id
Update tenant (admin only).

- **Auth**: Yes (admin)

---

## Plans

### GET /plans
List available plans (public).

- **Auth**: No
- **Response** `200`:
```json
{
  "data": [
    {
      "id": "01ARZ...",
      "name": "Starter",
      "price": 0,
      "interval": "month",
      "features": {
        "max_products": 50,
        "max_orders": 100,
        "max_storage_mb": 500
      }
    }
  ]
}
```

### POST /plans
Create plan (admin only).

- **Auth**: Yes (admin)

### PATCH /plans/:id
Update plan (admin only).

- **Auth**: Yes (admin)

### DELETE /plans/:id
Delete plan (admin only).

- **Auth**: Yes (admin)

### POST /plans/:id/subscribe
Subscribe to plan.

- **Auth**: Yes

### POST /plans/cancel
Cancel current subscription.

- **Auth**: Yes

### GET /plans/usage
Get current plan usage.

- **Auth**: Yes
- **Response**: `{ "data": { "products_used": 25, "products_limit": 50, "storage_used_mb": 120 } }`

---

## API Keys

### POST /api-keys
Generate new API key.

- **Auth**: Yes
- **Body**:
```json
{
  "name": "My Integration",
  "scopes": ["products:read", "orders:read", "orders:write"],
  "expires_at": "2027-04-16T00:00:00Z"
}
```
- **Response** `201`:
```json
{
  "data": {
    "id": "01ARZ...",
    "key": "wt_live_xxxxxxxxxxxxxxxxxxxx",
    "name": "My Integration",
    "scopes": ["products:read", "orders:read", "orders:write"]
  }
}
```
- Note: The `key` value is only shown once at creation.

### GET /api-keys
List API keys (masked).

- **Auth**: Yes

### DELETE /api-keys/:id
Revoke API key.

- **Auth**: Yes

### GET /api-keys/scopes
List available scopes.

- **Auth**: Yes

---

## Webhooks

### GET /webhooks
List webhooks.

- **Auth**: Yes

### POST /webhooks
Create webhook.

- **Auth**: Yes
- **Body**:
```json
{
  "url": "https://example.com/webhook",
  "events": ["order.created", "order.updated", "payment.completed"],
  "secret": "my-webhook-secret"
}
```

### PATCH /webhooks/:id
Update webhook.

- **Auth**: Yes

### DELETE /webhooks/:id
Delete webhook.

- **Auth**: Yes

### GET /webhooks/:id/deliveries
List webhook delivery attempts.

- **Auth**: Yes

### POST /webhooks/:id/test
Send test webhook delivery.

- **Auth**: Yes

---

## Email Templates

### GET /email-templates
List email templates (admin only).

- **Auth**: Yes (admin)

### POST /email-templates
Create email template (admin only).

- **Auth**: Yes (admin)
- **Body**:
```json
{
  "name": "order-confirmation",
  "subject": "Don hang #{{orderNumber}} da duoc xac nhan",
  "html_body": "<h1>Cam on ban!</h1><p>Don hang {{orderNumber}}...</p>",
  "variables": ["orderNumber", "customerName", "items", "total"]
}
```

### PATCH /email-templates/:id
Update email template (admin only).

- **Auth**: Yes (admin)

### POST /email-templates/:id/preview
Preview rendered template with sample data.

- **Auth**: Yes (admin)
- **Body**: `{ "data": { "orderNumber": "ORD-001", "customerName": "Nguyen Van A" } }`

### POST /email-templates/:id/send
Send email using template.

- **Auth**: Yes (admin)
- **Body**: `{ "to": "user@example.com", "data": { "orderNumber": "ORD-001" } }`

### POST /email-templates/seed
Seed default email templates.

- **Auth**: Yes (admin)

---

## Export / Import

### POST /export
Export data to Excel/CSV.

- **Auth**: Yes (admin)
- **Body**:
```json
{
  "entity": "products",
  "format": "xlsx",
  "filters": { "category_id": "01ARZ..." }
}
```
- **Response**: File download

### POST /import
Import data from Excel/CSV.

- **Auth**: Yes (admin)
- **Body**: `multipart/form-data` with `file` field and `entity` field

---

## i18n

### GET /i18n/:locale
Get all translations for locale.

- **Auth**: No
- **Response**: `{ "data": { "common.save": "Luu", "common.cancel": "Huy" } }`

### GET /i18n
List all translation keys (admin only).

- **Auth**: Yes (admin)

### POST /i18n
Create translation key (admin only).

- **Auth**: Yes (admin)
- **Body**:
```json
{
  "key": "common.save",
  "translations": { "vi": "Luu", "en": "Save" }
}
```

### PATCH /i18n/:id
Update translation (admin only).

- **Auth**: Yes (admin)

### GET /i18n/locales
List available locales.

- **Auth**: No

### POST /i18n/export
Export translations.

- **Auth**: Yes (admin)
- **Body**: `{ "locale": "vi", "format": "json" }`

### POST /i18n/import
Import translations.

- **Auth**: Yes (admin)
- **Body**: `multipart/form-data` with `file` and `locale` fields
