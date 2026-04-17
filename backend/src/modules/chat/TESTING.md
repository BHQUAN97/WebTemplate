# Chat module — runtime smoke test

Huong dan test nhanh toan bo chat system tren dev localhost.

## 1. Prerequisites

### Env vars (backend/.env)
Bat buoc:
```
DB_HOST=127.0.0.1
DB_PORT=6002
DB_USERNAME=webtemplate
DB_PASSWORD=devpass_4b97cc16
DB_DATABASE=webtemplate
REDIS_HOST=127.0.0.1
REDIS_PORT=6003

# Khi schema da duoc tao boi migration, phai tat sync de tranh
# Nest sync gay duplicate index/column:
TYPEORM_SYNC=false

# AI provider
AI_PROVIDER=mock          # mock | gemini | scenario-only
GEMINI_API_KEY=           # bo trong neu dung mock/scenario
```

> **Luu y**: neu `TYPEORM_SYNC=true` va DB da co schema, backend se crash boi
> `Duplicate key name 'IDX_75eba1c6b1a66b09f2a97e6927'` (Order entity co ca
> `@Column({unique:true})` lan `@Index(..., {unique:true})`).
> Giai phap: dung migration, TYPEORM_SYNC=false. Muon sync — fix entity truoc.

### Docker
```bash
docker compose up -d   # MySQL:6002, Redis:6003
```

## 2. Migration + seed

```bash
# Migration (root .env dang co DB_USER thay vi DB_USERNAME — migrate.sh fail.
# Chay truc tiep tu backend/):
cd backend
set -a && . ./.env && set +a
npx typeorm migration:run -d dist/config/database.config.js

# Neu schema co san (vd do sync truoc do) ma migration chua duoc record,
# insert migration marker bang tay roi run lai chi migration moi:
docker compose exec -T mysql mysql -uroot -p<rootpw> webtemplate -e "
  INSERT INTO migrations (timestamp, name) VALUES
    (1713312000000, 'AddAuthHardeningColumns1713312000000'),
    (1713398400000, 'AddWebhookNextRetryAt1713398400000');
"
```

Seed scenarios + schedules:
```bash
cd backend
set -a && . ./.env && set +a
node dist/database/seeds/chat-runner.js
# → 13 scenarios + 6 schedules
```

## 3. Start backend

```bash
cd backend
npm run build
node dist/main.js      # hoac npm run start:dev
# Mong doi:
#   [ChatGateway] Chat WS ready at /chat
#   [NestApplication] Nest application successfully started
```

## 4. REST smoke tests (da verify)

```bash
BASE=http://localhost:6001/api

# Start conversation (public) — HTTP 201
curl -X POST $BASE/chat/conversations \
  -H 'Content-Type: application/json' \
  -d '{"channel":"web","customerName":"Test User","initialMessage":"Xin chao"}'
# → { data: { id, customerSessionId, status: "open", mode: "ai", ... } }

CONV_ID=<id>
SESSION=<customerSessionId>

# Send message — HTTP 201
curl -X POST $BASE/chat/conversations/$CONV_ID/messages \
  -H "Content-Type: application/json" \
  -H "x-customer-session-id: $SESSION" \
  -d '{"content":"Shop co ban iPhone khong?"}'

# Get messages (user + ai reply) — HTTP 200
curl $BASE/chat/conversations/$CONV_ID/messages \
  -H "x-customer-session-id: $SESSION"
# → list messages, AI reply co metadata.provider (scenario | mock | gemini)

# Session mismatch — HTTP 403
curl $BASE/chat/conversations/$CONV_ID/messages \
  -H "x-customer-session-id: WRONG"
# → { "statusCode": 403, "message": "Customer session invalid or missing" }
```

## 5. Admin endpoints

```bash
# Admin phai ton tai trong DB (admin@webtemplate.com / Admin@123)
TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@webtemplate.com","password":"Admin@123"}' \
  | jq -r .data.accessToken)

curl "$BASE/admin/chat/conversations" -H "Authorization: Bearer $TOKEN"
# → HTTP 200, list conversations + pagination
```

## 6. WebSocket smoke test

```bash
# Sau khi co conv_id + session tu buoc 4
node scripts/ws-smoke-test.mjs <conv_id> <session_id>
# Expected: "[WS] PASS — customer handshake ok"
```

Script tai `scripts/ws-smoke-test.mjs` (su dung socket.io-client tu
frontend/node_modules). Co the dieu chinh URL/transports theo nhu cau.

## Known issues / edge cases

1. **BUG: Order entity duplicate unique constraint**
   `orders.order_number` duoc mark `@Column({ unique: true })` VA
   `@Index(['order_number'], { unique: true })` o class level — gay
   `ER_DUP_KEYNAME` khi Nest sync. Fix: xoa 1 trong 2 decorator.
   File: `src/modules/orders/entities/order.entity.ts` L26, L28.

2. **Config mismatch trong migrate script**
   Root `.env` dung `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
   TypeORM CLI datasource mong `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`.
   `./scripts/migrate.sh` load root .env nen connection fail voi `root@host`.
   Workaround: chay migration truc tiep trong `backend/` voi `backend/.env`.

3. **admin-seed entity loading issue**
   `dist/database/seeds/admin-seed.js` khong load relation `refreshTokens`,
   fail metadata build. Tam thoi insert admin bang SQL truc tiep hoac fix
   seed entity list.

4. **Scenario match over-eager — ĐÃ FIX**
   Truoc day: input `"Shop co ban iPhone khong?"` match `complaint` vi
   `includes()` substring — keyword `hỏng` normalize → `hong` match trong
   `khong`. Fix (v1.1.1): `matchTrigger` dung word-boundary regex
   `\b{keyword}\b` + helper `escapeRegExp` — xem
   `chat-scenarios.service.ts:122-142`. Verified: `"Shop co ban iPhone
   khong?"` khong match scenario nao nua.

5. **WS `conversation:subscribe` la agent-only**
   Customer auto-join room conversation via handshake — khong goi
   `conversation:subscribe`. Agent goi de join room va nhan `agent:joined`.

## Gemini smoke test results (2026-04-17)

### Env dung khi test
```
AI_PROVIDER=gemini
GEMINI_MODEL=gemini-flash-latest   # = Gemini 2.5 Flash (thinking=true)
AI_REQUEST_TIMEOUT_MS=30000        # Bumped tu 10s vi Gemini 2.5 thinking cham hon
AI_MAX_TOOL_ITERATIONS=3
```

SDK `@google/generative-ai@0.24.1` accept model string `gemini-flash-latest`
(SDK khong validate enum — passthrough).

### Model names ban khong con work
- `gemini-1.5-flash`, `gemini-1.5-flash-latest` → 404 Not Found (da deprecated)
- `gemini-2.0-flash`, `gemini-2.0-flash-lite` → 429 Quota exceeded (free tier
  project limit=0 tren key nay; chi model `gemini-flash-latest` co quota)

### Test 1 — tool-call via Gemini (search FAQ)
```
POST /chat/conversations/:id/messages {"content":"Khi nao shop co mo cua?"}
```
- Gemini goi tool `search_faq("giờ mở cửa")` → ERROR (DB table `faqs` khong
  co). Iteration 2 retry voi query "mở cửa" → cung ERROR.
- Iteration 3 gap 429 (exhausted free-tier RPM quota).
- **Ket luan**: tool-calling pipeline lam viec dung. Iteration >1 khong con
  bao `thought_signature missing` (da fix — xem duoi).

### Test 2 — Gemini compose final text sau tool call (get_shipping_policy)
```
POST /chat/conversations/:id/messages {"content":"Phi ship bao nhieu the?"}
```
- Scenario `pricing-question` (priority 90) match nhung < 100 nen fall-through
  sang Gemini.
- Gemini goi tool `get_shipping_policy()` → return data tinh (noi thanh /
  tinh le / free ship 500k).
- Iteration 2: Gemini nhan ket qua, compose final tieng Viet markdown:
  > "Dạ, phí giao hàng bên em được tính như sau ạ: - Nội thành (HCM/HN):
  > 20.000 - 35.000 VND. - Các tỉnh thành khác: 30.000 - 50.000 VND.
  > - Đặc biệt: Miễn phí vận chuyển cho đơn hàng từ **500.000 VND** trở
  > lên. Anh/chị đang ở khu vực nào để em kiểm tra thời gian nhận hàng
  > dự kiến cho mình ạ?"
- Metadata: `{model: "gemini-flash-latest", tokens: {total:1866, prompt:1603,
  completion:121}, provider: "gemini", toolCalls: [{name: "get_shipping_policy", result: {...}}]}`
- **Pass — end-to-end Gemini reply voi tool-call.**

### Test 3 — complaint false-positive khong lap lai (scenario word-boundary fix)
```
POST /chat/conversations/:id/messages {"content":"Shop co ban iPhone khong?"}
```
- **Khong** co `findMatching matched scenario=complaint` trong log
  (truoc day: match vi `hong` substring trong `khong`).
- Gemini thang tay goi tool `search_products("iPhone")` (khong match scenario).
- **Pass — scenario match logic da dung word-boundary.**

### Bug da fix trong buoi test
1. **Scenario substring false-positive** (`chat-scenarios.service.ts`)
   - `matchTrigger` doi tu `message.includes(kw)` → regex `\b{kw}\b`.
   - Them helper `escapeRegExp()` escape ky tu dac biet.
2. **Gemini 2.5 thought_signature missing** (`gemini.provider.ts`,
   `provider.types.ts`, `ai.service.ts`)
   - Gemini 2.5+ response tra `thoughtSignature` kem part `functionCall`.
     SDK 0.24.1 khong co typescript type nhung runtime co field.
   - Fix: capture `thoughtSignature` o provider, forward qua `ProviderChatResult`,
     AiService push vao `ProviderMessage` cua model turn, provider re-attach
     vao part `functionCall` dau tien khi build history cho iteration tiep.
   - Neu bo qua: Gemini 2.5 reply 400 `"Function call is missing a
     thought_signature in functionCall parts"` o iteration >1.
3. **Timeout 10s qua ngan cho Gemini 2.5 thinking mode**
   - Bumped `AI_REQUEST_TIMEOUT_MS` = 30000 trong `.env`.

### Caveats con lai
- **DB tables `products`, `promotions`, `faqs` chua co** → Gemini tool-call
  tra error, AI hoac loop max iterations hoac fallback canned message. Khi
  migrate products table va seed data, chat flow moi hoan thien.
- **Free-tier RPM quota**: `gemini-flash-latest` = Gemini 2.5 Flash free
  tier ~10 RPM. Test > 10 request trong 1 phut se 429. Production can upgrade
  plan hoac switch `gemini-2.0-flash` neu project duoc cap quota.
- **Provider `rate-limited` warning misleading**: regex `is429` match
  caption "rate" → neu 4xx khac co chu "rate" trong text (vd link
  `rate-limits`) se retry sai. Acceptable hien tai vi chi lang phi 3 retry.
