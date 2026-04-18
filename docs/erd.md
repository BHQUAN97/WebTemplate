# WebTemplate ERD

> Source of truth: `backend/src/modules/*/entities/*.entity.ts`. ERD la derived view, update cung commit khi sua entity. Ref: CROSS-0007

**Tong**: 47 entities, 24 modules
**Last sync**: 2026-04-18

> Quy uoc: Moi entity extend `BaseEntity` co san `id` (ULID, char(26)), `created_at`, `updated_at`, `deleted_at`. ERD chi liet ke 3-5 column dac trung. Cac FK la ULID rieng le (khong co JoinColumn DB-level constraint tru khi danh dau `FK`).

---

## Module: auth + users + tenants

```mermaid
erDiagram
    User ||--o{ RefreshToken : "issues"
    Tenant ||--o{ User : "owns (tenant_id)"
    Tenant }o--|| User : "owner_id"
    Tenant }o--o| Plan : "plan_id"

    User {
        char_26 id PK
        varchar email UK
        varchar password_hash
        enum role
        char_26 tenant_id FK
        varchar provider "google|facebook|null"
    }
    RefreshToken {
        char_26 id PK
        char_26 user_id FK
        varchar token_hash
        timestamp expires_at
        bool is_revoked
    }
    Tenant {
        char_26 id PK
        varchar slug UK
        varchar domain UK
        char_26 owner_id FK
        char_26 plan_id FK
    }
```

---

## Module: api-keys + webhooks

```mermaid
erDiagram
    Tenant ||--o{ ApiKey : "owns"
    Tenant ||--o{ Webhook : "owns"
    Webhook ||--o{ WebhookDelivery : "logs"

    ApiKey {
        char_26 id PK
        char_26 tenant_id FK
        varchar key_prefix
        varchar key_hash UK
        json scopes
        int rate_limit
    }
    Webhook {
        char_26 id PK
        char_26 tenant_id FK
        varchar url
        json events
        varchar secret
    }
    WebhookDelivery {
        char_26 id PK
        char_26 webhook_id FK
        varchar event
        bool success
        int attempt
    }
```

---

## Module: products + categories + inventory + reviews (E-commerce core)

```mermaid
erDiagram
    Product ||--o{ ProductVariant : "has variants"
    Category ||--o{ Category : "parent/children"
    Category ||--o{ Product : "category_id"
    Product ||--o{ Inventory : "stock"
    ProductVariant ||--o{ Inventory : "stock"
    Inventory ||--o{ InventoryMovement : "history"
    Product ||--o{ Review : "reviewed by"
    User ||--o{ Review : "writes"

    Product {
        char_26 id PK
        varchar slug UK
        varchar sku UK
        decimal price
        char_26 category_id FK
        char_26 tenant_id FK
    }
    ProductVariant {
        char_26 id PK
        char_26 product_id FK
        varchar sku UK
        decimal price
        json attributes
    }
    ProductAttribute {
        char_26 id PK
        varchar name
        json values
        varchar type "select|color|text"
    }
    Category {
        char_26 id PK
        varchar slug UK
        char_26 parent_id FK
        varchar type
    }
    Inventory {
        char_26 id PK
        char_26 product_id FK
        char_26 variant_id FK
        int quantity
        int reserved
    }
    InventoryMovement {
        char_26 id PK
        char_26 inventory_id FK
        int quantity_change
        enum type "in|out|adjustment|reserved|released"
    }
    Review {
        char_26 id PK
        char_26 product_id FK
        char_26 user_id FK
        tinyint rating
        bool is_approved
    }
```

---

## Module: cart + orders + payments + promotions

```mermaid
erDiagram
    User ||--o{ Cart : "owns"
    Cart ||--o{ CartItem : "contains"
    Product ||--o{ CartItem : "in cart"
    User ||--o{ Order : "places"
    Order ||--o{ OrderItem : "contains"
    Product ||--o{ OrderItem : "snapshot"
    Order ||--|| Payment : "paid by"
    Promotion ||--o{ PromotionUsage : "used"
    User ||--o{ PromotionUsage : "uses"
    Order ||--o{ PromotionUsage : "applies"

    Cart {
        char_26 id PK
        char_26 user_id FK
        varchar session_id
        enum status "active|merged|converted|abandoned"
    }
    CartItem {
        char_26 id PK
        char_26 cart_id FK
        char_26 product_id FK
        char_26 variant_id
        int quantity
        decimal price
    }
    Order {
        char_26 id PK
        varchar order_number UK
        char_26 user_id FK
        enum status
        decimal total
        json shipping_address
    }
    OrderItem {
        char_26 id PK
        char_26 order_id FK
        char_26 product_id FK
        varchar product_name "snapshot"
        decimal price
        int quantity
    }
    Payment {
        char_26 id PK
        char_26 order_id FK_UK
        varchar method "vnpay|momo|stripe|bank|cod"
        enum status
        decimal amount
    }
    Promotion {
        char_26 id PK
        varchar code UK
        enum type "percentage|fixed|free_shipping|bxgy"
        decimal value
        int usage_limit
        char_26 tenant_id FK
    }
    PromotionUsage {
        char_26 id PK
        char_26 promotion_id FK
        char_26 user_id FK
        char_26 order_id FK
        decimal discount_amount
    }
```

---

## Module: plans + subscriptions

```mermaid
erDiagram
    Plan ||--o{ Subscription : "subscribed by"
    Tenant ||--o{ Subscription : "has"
    Tenant ||--o{ Usage : "tracks metric"

    Plan {
        char_26 id PK
        varchar slug UK
        decimal price
        enum billing_cycle "monthly|yearly|lifetime|free"
        json features
        int trial_days
    }
    Subscription {
        char_26 id PK
        char_26 tenant_id FK
        char_26 plan_id FK
        enum status
        timestamp current_period_end
    }
    Usage {
        char_26 id PK
        char_26 tenant_id FK
        varchar metric
        bigint value
        timestamp period_start
        timestamp period_end
    }
```

---

## Module: content (articles + pages + faq + categories + media)

```mermaid
erDiagram
    User ||--o{ Article : "authors"
    Category ||--o{ Article : "category_id"
    Category ||--o{ Faq : "category_id"
    Page ||--o{ Page : "parent/children"
    User ||--o{ Media : "uploads"

    Article {
        char_26 id PK
        varchar slug UK
        longtext content
        char_26 author_id FK
        char_26 category_id FK
        enum status
        timestamp published_at
    }
    Page {
        char_26 id PK
        varchar slug UK
        longtext content
        char_26 parent_id FK
        bool is_homepage
        enum status "draft|published"
    }
    Faq {
        char_26 id PK
        varchar question
        text answer
        char_26 category_id FK
        int sort_order
    }
    Media {
        char_26 id PK
        varchar storage_key UK
        varchar mime_type
        int size
        char_26 uploaded_by FK
        varchar folder
    }
```

---

## Module: navigation + settings + i18n + email-templates + feature-flags

```mermaid
erDiagram
    Navigation ||--o{ NavigationItem : "items"
    NavigationItem ||--o{ NavigationItem : "parent/children"
    Locale ||--o{ Translation : "translations"

    Navigation {
        char_26 id PK
        varchar name
        varchar location "header|footer|sidebar"
        char_26 tenant_id FK
    }
    NavigationItem {
        char_26 id PK
        char_26 navigation_id FK
        varchar label
        varchar url
        char_26 parent_id FK
        char_26 page_id
    }
    Setting {
        char_26 id PK
        varchar key UK
        text value
        enum type "string|number|boolean|json"
        varchar group
    }
    FeatureFlag {
        char_26 id PK
        varchar key UK
        bool enabled
        int rollout_percentage
        simple_array target_roles
    }
    Locale {
        char_26 id PK
        varchar code UK "vi|en|..."
        varchar name
        bool is_default
    }
    Translation {
        char_26 id PK
        varchar locale FK
        varchar namespace
        varchar key
        text value
    }
    EmailTemplate {
        char_26 id PK
        varchar name
        varchar subject
        longtext html_body
        char_26 tenant_id FK
    }
```

---

## Module: chat (conversations + messages + scenarios + schedules + tool calls)

```mermaid
erDiagram
    Conversation ||--o{ ChatMessage : "messages"
    Conversation ||--o{ ChatToolCall : "AI tool calls"
    User ||--o{ Conversation : "customer (customerId)"
    User ||--o{ Conversation : "agent (agentId)"
    ChatScenario ||--o{ ChatScenario : "followUp chain"

    Conversation {
        char_26 id PK
        enum channel "web|messenger|zalo|..."
        enum status
        enum mode "AI|HUMAN|HYBRID|OFFLINE"
        char_26 customerId FK
        char_26 agentId FK
        datetime lastMessageAt
    }
    ChatMessage {
        char_26 id PK
        char_26 conversationId FK
        enum role "USER|AI|AGENT|SYSTEM"
        enum type
        text content
        json attachments
    }
    ChatScenario {
        char_26 id PK
        enum triggerType "keyword|intent|event|cron"
        varchar triggerValue
        text response
        char_26 followUpScenarioId FK
        int matchCount
    }
    ChatSchedule {
        char_26 id PK
        int dayOfWeek
        varchar startTime "HH:mm"
        varchar endTime
        enum mode
        int priority
    }
    ChatToolCall {
        char_26 id PK
        char_26 conversationId FK
        varchar toolName
        text args
        varchar result "ok|denied|error|rate_limited"
        int durationMs
    }
```

---

## Module: notifications + contacts

```mermaid
erDiagram
    User ||--o{ Notification : "receives"
    User ||--o{ Contact : "assigned_to"

    Notification {
        char_26 id PK
        char_26 user_id FK
        varchar type "order_status|review_reply|promotion|system|welcome"
        varchar title
        bool is_read
        enum channel "in_app|email|push"
    }
    Contact {
        char_26 id PK
        varchar name
        varchar email
        varchar subject
        enum status
        char_26 assigned_to FK
        char_26 tenant_id FK
    }
```

---

## Module: logs + analytics (audit + access + page-views + events + changelog)

> 2 entity `audit_logs` ton tai (legacy `modules/logs` va moi `modules/audit-logs`) — cung table name, KHAC schema. Can resolve trong CROSS-0007 review.

```mermaid
erDiagram
    User ||--o{ AccessLog : "requests"
    User ||--o{ AuditLogV1 : "actions (logs/)"
    User ||--o{ AuditLogV2 : "actions (audit-logs/)"
    User ||--o{ Event : "tracked"
    User ||--o{ PageView : "viewed"

    AccessLog {
        char_26 id PK
        char_26 user_id FK
        varchar method
        varchar url
        int status_code
        int duration_ms
    }
    AuditLogV1 {
        char_26 id PK
        char_26 user_id FK
        varchar action
        varchar entity_type
        json old_values
        json new_values
    }
    AuditLogV2 {
        char_26 id PK
        char_26 user_id FK
        varchar action
        varchar resource_type
        text changes
    }
    Changelog {
        char_26 id PK
        varchar version
        varchar title
        enum type "feature|fix|improvement|breaking"
    }
    Event {
        char_26 id PK
        varchar name "product_view|add_to_cart|checkout|purchase|search"
        char_26 user_id FK
        varchar session_id
    }
    PageView {
        char_26 id PK
        varchar page_url
        char_26 user_id FK
        varchar session_id
        varchar device_type
    }
```
