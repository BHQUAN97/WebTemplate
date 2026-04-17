# Chat AI Integration

AI-powered chatbot orchestrator for the Chat module. Default provider: **Google Gemini** (free tier) with native function calling.

## Setup

### 1. Get a Gemini API key

1. Go to https://aistudio.google.com/app/apikey
2. Create a new API key (free — no credit card)
3. Copy the key

### 2. Configure ENV vars

Add to `backend/.env`:

```env
# Provider: gemini | groq | ollama | mock
AI_PROVIDER=gemini

# Gemini — free tier: 15 req/min, 1500 req/day, 1M tokens/day
GEMINI_API_KEY=your-key-here
GEMINI_MODEL=gemini-1.5-flash

# Generation config
AI_MAX_TOKENS=1024
AI_TEMPERATURE=0.7
AI_REQUEST_TIMEOUT_MS=10000
AI_MAX_TOOL_ITERATIONS=3

# Branding — used in system prompt
AI_BRAND_NAME=MyShop
```

### 3. Dev without API key

Set `AI_PROVIDER=mock` — returns canned keyword-matched responses. No network calls, no cost.

## Providers

| Provider | Status | Notes |
|---|---|---|
| `gemini` | Implemented | Default. Function calling, retries on 429 |
| `mock`   | Implemented | Keyword rules, fallback when API fails |
| `groq`   | Reserved   | Not implemented (falls back to mock) |
| `ollama` | Reserved   | Not implemented (falls back to mock) |

If `AI_PROVIDER=gemini` but `GEMINI_API_KEY` is empty, the service falls back to `mock` with a warning.

## Function calling tools

AI can call these during a conversation (declared in `tools/tool-definitions.ts`):

- `search_products(query, limit)` — product name/description LIKE search
- `get_product_by_id(id)` — single product detail
- `search_orders(keyword, limit)` — detects email/phone/order_number
- `get_order_details(orderIdOrNumber, customerIdentifier?)` — with items
- `search_faq(query, limit)` — FAQ lookup
- `get_promotions()` — active promotions
- `get_shipping_policy()` — static VN shipping policy

All tool methods wrap in try/catch and return `{ error: string }` on failure so the AI can gracefully respond.

## Pipeline

`AiService.generateReply(conversationId)`:

1. Load conversation + last 20 messages
2. **Fast-path**: check scenarios (priority ≥ 100) — skip AI call if match
3. Build provider history + system prompt
4. Call provider with tools
5. Loop tool calls (max 3 iterations) — execute → feed back → repeat
6. Return text + metadata (model, tokens, tool calls)
7. On error: canned fallback message

## Rate limits (Gemini free tier)

- 15 requests / minute
- 1500 requests / day
- 1M tokens / day

Exponential backoff on 429 (1s → 2s → 4s, 3 retries). If all retries fail, falls back to canned message.

## Files

```
ai/
├── README.md              — this file
├── ai.service.ts          — orchestrator
├── prompts/
│   └── system-prompt.ts   — default Vietnamese prompt
├── providers/
│   ├── provider.types.ts  — IAiProvider interface
│   ├── gemini.provider.ts — Google SDK wrapper
│   └── mock.provider.ts   — canned responses
└── tools/
    ├── chat-tools.service.ts — repository query methods
    └── tool-definitions.ts   — Gemini FunctionDeclaration[]
```

## Known limitations / TODO

- ~~Gemini function calling in a single turn returns function_call parts; the current implementation pushes function-response messages back into history and relies on the SDK to interpret them on the next call.~~ **Fixed**: `GeminiProvider` now uses `model.startChat({ history }).sendMessage(parts)` per iteration. `AiService` pushes BOTH the `model` turn (with `functionCalls`) AND the `function` turn (with `functionResponse`) into `providerMessages` so the full protocol is preserved across iterations.
- ~~`searchOrders` currently matches via `JSON_EXTRACT` on `shipping_address`~~ **Fixed**: now detects ULID / order_number / email / phone and `INNER JOIN users` for email/phone lookups. Also returns `statusLabel` (VN) and `itemCount`.
- ~~Stock status in `searchProducts` is derived from `is_active` only.~~ **Fixed**: wired to `InventoryService` (optional inject). Resolves `available = quantity - reserved`, respects `track_inventory` and `allow_backorder`. Falls back to `is_active` when inventory record missing or lookup fails.
- Scenario keyword matching normalizes diacritics (NFD + strip combining marks) — user gõ "xin chao" khớp trigger "chào".
- Groq / Ollama providers are stubs (fall back to mock).
- **Future**: streaming replies (`generateReplyStream`) — would require gateway + FE wiring (chat:message-chunk event). Deferred.

## Manual test (curl)

Assuming backend running on port 6001, user logged in (has JWT cookie) or using agent token:

```bash
# 1. Send a user message — create conversation first if needed
curl -X POST http://localhost:6001/api/chat/conversations \
  -H "Cookie: access_token=<TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"customerName":"Test","customerEmail":"test@example.com"}'
# → returns { id: "01HX..." }

# 2. Post message; AI reply is auto-generated if provider configured
curl -X POST http://localhost:6001/api/chat/conversations/<CONV_ID>/messages \
  -H "Cookie: access_token=<TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"content":"Giá iPhone 15 bao nhiêu?","role":"user"}'

# 3. Fetch latest messages — expect AI reply + metadata.toolCalls entries
curl http://localhost:6001/api/chat/conversations/<CONV_ID>/messages \
  -H "Cookie: access_token=<TOKEN>"
```

Expected tool-call flow for product queries:
1. user message "Giá iPhone 15?"
2. AI calls `search_products({query: "iPhone 15"})`
3. Tool returns array with `stock`/`inStock` from inventory
4. AI composes reply: "iPhone 15 giá 25tr, còn X sản phẩm..."

Order lookup by email:
1. user message "Kiểm tra đơn hàng của tôi, email test@example.com"
2. AI calls `search_orders({keyword: "test@example.com"})`
3. Tool JOINs `users` table → returns orders with `statusLabel` "Đang giao", etc.
4. AI composes reply.

Scenario fast-path (no AI call needed):
- user message "xin chao" → normalized to "xin chao" → matches trigger "chào|hi|hello" (priority ≥ 100) → canned response returned directly.
