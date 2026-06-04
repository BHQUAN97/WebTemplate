#!/usr/bin/env bash
# =============================================================
# new-client.sh — Clone domain template cho KH mới
#
# Usage:
#   ./scripts/new-client.sh \
#     --template restaurant \
#     --client pho-ngon \
#     --domain phonagon.vn \
#     --port-prefix 70
#
# Yêu cầu: gh CLI đã login, VPS_HOST/VPS_USER đã set trong env
# =============================================================

set -euo pipefail

# ─── Parse arguments ─────────────────────────────────────────
TEMPLATE=""
CLIENT_NAME=""
DOMAIN=""
PORT_PREFIX=""

while [[ "$#" -gt 0 ]]; do
  case $1 in
    --template)    TEMPLATE="$2"; shift ;;
    --client)      CLIENT_NAME="$2"; shift ;;
    --domain)      DOMAIN="$2"; shift ;;
    --port-prefix) PORT_PREFIX="$2"; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
  shift
done

# ─── Validate ────────────────────────────────────────────────
if [[ -z "$TEMPLATE" || -z "$CLIENT_NAME" || -z "$DOMAIN" || -z "$PORT_PREFIX" ]]; then
  echo "❌ Thiếu tham số. Ví dụ:"
  echo "   ./scripts/new-client.sh --template restaurant --client pho-ngon --domain phonagon.vn --port-prefix 70"
  exit 1
fi

TEMPLATES=("landing" "restaurant" "spa" "clinic" "gym" "realestate" "hotel")
if [[ ! " ${TEMPLATES[*]} " =~ " $TEMPLATE " ]]; then
  echo "❌ Template '$TEMPLATE' không hợp lệ. Chọn: ${TEMPLATES[*]}"
  exit 1
fi

if [[ ${#PORT_PREFIX} -ne 2 ]]; then
  echo "❌ port-prefix phải là 2 chữ số (ví dụ: 70, 71, 72)"
  exit 1
fi

# ─── Derived values ──────────────────────────────────────────
TEMPLATE_REPO_NAME="WebTemplate-$(echo "${TEMPLATE^}")"
DEVELOP_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
TEMPLATE_DIR="$DEVELOP_DIR/$TEMPLATE_REPO_NAME"
CLIENT_PASCAL="$(echo "$CLIENT_NAME" | sed 's/-\([a-z]\)/\U\1/g; s/^\([a-z]\)/\U\1/')"
CLIENT_DIR="$DEVELOP_DIR/KH-$CLIENT_PASCAL"
GITHUB_REPO="BHQUAN97/kh-$CLIENT_NAME"
DB_NAME="$(echo "$CLIENT_NAME" | tr '-' '_')_db"
PORT_FE="${PORT_PREFIX}00"
PORT_BE="${PORT_PREFIX}01"
PORT_DB="${PORT_PREFIX}02"
PORT_REDIS="${PORT_PREFIX}03"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║          NEW CLIENT SETUP                        ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║ Template:  $TEMPLATE_REPO_NAME"
echo "║ Client:    $CLIENT_DIR"
echo "║ Domain:    $DOMAIN"
echo "║ GitHub:    $GITHUB_REPO"
echo "║ DB:        $DB_NAME"
echo "║ Ports:     FE=$PORT_FE | BE=$PORT_BE | DB=$PORT_DB | Redis=$PORT_REDIS"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ─── Step 1: Check template exists ───────────────────────────
echo "[1/8] Kiểm tra template..."
if [[ ! -d "$TEMPLATE_DIR" ]]; then
  echo "❌ Không tìm thấy template tại: $TEMPLATE_DIR"
  exit 1
fi

if [[ -d "$CLIENT_DIR" ]]; then
  echo "❌ Thư mục client đã tồn tại: $CLIENT_DIR"
  exit 1
fi

# ─── Step 2: Copy template ───────────────────────────────────
echo "[2/8] Copy template → $CLIENT_DIR..."
cp -r "$TEMPLATE_DIR" "$CLIENT_DIR"
cd "$CLIENT_DIR"

# Xóa git history của template
rm -rf .git .orcai .playwright-mcp
git init
git add -A
git commit -m "chore: init from $TEMPLATE_REPO_NAME template"

# ─── Step 3: Replace project identifiers ─────────────────────
echo "[3/8] Thay thế ports, container names, domain, DB..."

# Port prefix WebTemplate gốc là "60" → đổi thành PORT_PREFIX mới
# Pattern match: "60" + 2 chữ số trong context port binding/APP_PORT
BASE_PREFIX="60"
for f in docker-compose.yml docker-compose.prod.yml docker-compose.dev.yml; do
  [[ -f "$f" ]] || continue
  # Thay port binding (127.0.0.1:60xx và :60xx)
  sed -i -E "s/(127\.0\.0\.1:|')(${BASE_PREFIX})([0-9]{2})/\1${PORT_PREFIX}\3/g" "$f"
  # Thay APP_PORT: 60xx
  sed -i -E "s/(APP_PORT: )(${BASE_PREFIX})([0-9]{2})/\1${PORT_PREFIX}\3/g" "$f"
  # Thay internal URL port :60xx/
  sed -i -E "s/(:)(${BASE_PREFIX})([0-9]{2})(\/)/\1${PORT_PREFIX}\3\4/g" "$f"
done

# Container names: "wt-" → "kh-{client}-"
CLIENT_SLUG="${CLIENT_NAME}"
for f in docker-compose.yml docker-compose.prod.yml docker-compose.dev.yml; do
  [[ -f "$f" ]] || continue
  sed -i "s/wt-/kh-${CLIENT_SLUG}-/g" "$f"
done

# Network names: "webtemplate_" → "kh_{client_underscore}_"
CLIENT_UNDER="${CLIENT_NAME//-/_}"
for f in docker-compose.yml docker-compose.prod.yml docker-compose.dev.yml; do
  [[ -f "$f" ]] || continue
  sed -i "s/webtemplate_/kh_${CLIENT_UNDER}_/g" "$f"
  sed -i "s/webtemplate-net/kh-${CLIENT_SLUG}-net/g" "$f"
done

# Domain: "template.bhquan.store" → domain KH
for f in docker-compose.prod.yml nginx/*.conf nginx/**/*.conf 2>/dev/null; do
  [[ -f "$f" ]] || continue
  sed -i "s/template\.bhquan\.store/${DOMAIN}/g" "$f"
done

# DB name: "webtemplate" → db name KH (trong docker-compose.prod.yml env vars)
sed -i "s/DB_NAME: webtemplate/DB_NAME: ${DB_NAME}/g" docker-compose.prod.yml 2>/dev/null || true
sed -i "s/DB_USERNAME: webtemplate/DB_USERNAME: ${DB_NAME}/g" docker-compose.prod.yml 2>/dev/null || true

# Redis prefix: "wt:" → "{client}:"
sed -i "s/REDIS_PREFIX: \"wt:\"/REDIS_PREFIX: \"${CLIENT_SLUG}:\"/g" docker-compose.prod.yml 2>/dev/null || true

echo "   ✅ Ports: ${PORT_PREFIX}00/${PORT_PREFIX}01/${PORT_PREFIX}02/${PORT_PREFIX}03"
echo "   ✅ Containers: kh-${CLIENT_SLUG}-*"
echo "   ✅ Domain: ${DOMAIN}"
echo "   ✅ DB: ${DB_NAME}"

# ─── Step 4: Generate secrets ────────────────────────────────
echo "[4/8] Tạo secrets..."
DB_PASS="$(openssl rand -base64 16 | tr -d '=+/')"
JWT_SECRET="$(openssl rand -base64 32)"
JWT_REFRESH="$(openssl rand -base64 32)"

# ─── Step 5: Create GitHub repo ──────────────────────────────
echo "[5/8] Tạo GitHub repo: $GITHUB_REPO..."
gh repo create "$GITHUB_REPO" --private --source=. --push
echo "   ✅ https://github.com/$GITHUB_REPO"

# ─── Step 6: Set GitHub Secrets ──────────────────────────────
echo "[6/8] Set GitHub Secrets..."
gh secret set VPS_HOST     --body "${VPS_HOST:-}"     --repo "$GITHUB_REPO"
gh secret set VPS_USER     --body "${VPS_USER:-}"     --repo "$GITHUB_REPO"
gh secret set DOMAIN        --body "$DOMAIN"           --repo "$GITHUB_REPO"
gh secret set DB_NAME       --body "$DB_NAME"          --repo "$GITHUB_REPO"
gh secret set DB_PASSWORD   --body "$DB_PASS"          --repo "$GITHUB_REPO"
gh secret set JWT_SECRET    --body "$JWT_SECRET"       --repo "$GITHUB_REPO"
gh secret set JWT_REFRESH_SECRET --body "$JWT_REFRESH" --repo "$GITHUB_REPO"
[[ -f "$HOME/.ssh/id_ed25519" ]] && \
  gh secret set VPS_SSH_KEY < "$HOME/.ssh/id_ed25519" --repo "$GITHUB_REPO"
echo "   ✅ Secrets đã set"

# ─── Step 7: Seed admin database ─────────────────────────────
echo "[7/8] Hướng dẫn seed data..."
echo "   Sau khi deploy xong, chạy lệnh này để tạo admin:"
echo "   docker exec shared-mysql mysql -u root -p<PASS> $DB_NAME < seeds/admin.sql"

# ─── Step 8: Summary ─────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅ SETUP XONG                                           ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Thư mục:   $CLIENT_DIR"
echo "║  GitHub:    https://github.com/$GITHUB_REPO"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  BƯỚC TIẾP THEO:                                         ║"
echo "║  1. cd $CLIENT_DIR"
echo "║  2. Sửa: frontend/src/config/site.config.ts"
echo "║  3. Thay logo: public/logo.png + public/og-image.jpg"
echo "║  4. git add -A && git commit -m 'feat: customize for KH'"
echo "║  5. git push → CI/CD tự deploy"
echo "║  6. Seed admin: chạy lệnh ở bước 7 ở trên"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Admin URL:  https://$DOMAIN/admin"
echo "║  Demo login: admin@demo.local / Admin@2026"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
