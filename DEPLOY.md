# WEB TEMPLATE — DEPLOYMENT GUIDE

> Deploy: SSH password auth | Stack: Static/template project

---

## GitHub Actions Secrets

Secrets được lưu trong **repo settings** — không commit lên git.

| Secret | Mô tả |
|--------|-------|
| `VPS_HOST` | IP VPS: `134.122.21.251` |
| `VPS_PORT` | SSH port: `22` |
| `VPS_USER` | SSH user: `root` |
| `VPS_PASSWORD` | Mật khẩu SSH VPS |
| `DEPLOY_PATH` | Path trên VPS (vd: `/opt/webtemplate`) |

### Thêm/cập nhật secret nhanh qua CLI

```bash
# Không cần vào GitHub UI — dùng gh CLI
gh secret set VPS_PASSWORD --body "mat_khau_moi" --repo BHQUAN97/WebTemplate

# Thêm secret mới
gh secret set DEPLOY_PATH --body "/opt/webtemplate" --repo BHQUAN97/WebTemplate

# Xem danh sách secrets (chỉ thấy tên, không thấy giá trị)
gh secret list --repo BHQUAN97/WebTemplate
```

---

## Checklist trước khi deploy

- [ ] `gh secret list --repo BHQUAN97/WebTemplate` hiện đủ 5 secrets
- [ ] Push code lên `main` → Actions chạy tự động
- [ ] Xem progress: `gh run watch --repo BHQUAN97/WebTemplate`

> Đổi VPS password: `bash /e/DEVELOP/.claude-shared/secrets-infra/scripts/set-all-secrets.sh --shared`

---

## Deploy

### Tự động

- **Push tag `v*`** (vd: `git tag v1.0.0 && git push --tags`) → deploy lên `prod`
- **Manual**: GitHub Actions tab → Deploy → Run workflow → chọn `staging` hoặc `prod`

### Cách deploy

Workflow sẽ SSH vào VPS, `git pull`, rồi chạy `./deploy.sh <env>`. Script `deploy.sh` ở trong repo — tùy chỉnh theo nhu cầu.

---

## Quản lý trên VPS

```bash
ssh root@134.122.21.251
cd /opt/webtemplate

# Xem trạng thái
git log --oneline -5

# Chạy deploy thủ công
./deploy.sh prod
```
