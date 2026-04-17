#!/usr/bin/env node
/* ──────────────────────────────────────────
 * Google Drive Backup — LeQuyDon CMS
 *
 * Standalone Node.js CLI upload:
 *  - Latest MySQL dump (.sql.gz) from BACKUP_DIR
 *  - Zipped uploads folder (UPLOADS_DIR)
 * to a shared Google Drive folder via Service Account.
 *
 * Usage:
 *   node backup-gdrive.js [--type=db|media|all] [--dry-run] [--force]
 *
 * Env vars (see ../.env.example):
 *   GDRIVE_ENABLED, GDRIVE_CREDENTIALS_PATH, GDRIVE_FOLDER_ID,
 *   GDRIVE_DB_SUBFOLDER, GDRIVE_UPLOADS_SUBFOLDER, GDRIVE_KEEP_COUNT,
 *   BACKUP_DIR, UPLOADS_DIR
 * ────────────────────────────────────────── */

'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const os = require('os');

// Load .env (ưu tiên .env tại project root, fallback .env cùng thư mục scripts)
try {
  const dotenv = require('dotenv');
  const rootEnv = path.resolve(__dirname, '..', '.env');
  const localEnv = path.resolve(__dirname, '.env');
  if (fs.existsSync(rootEnv)) dotenv.config({ path: rootEnv });
  else if (fs.existsSync(localEnv)) dotenv.config({ path: localEnv });
} catch (_) {
  // dotenv chưa cài — bỏ qua, cho phép chạy với env thuần
}

// ─── CLI args ────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (name, def) => {
  const hit = args.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return def;
  if (hit === `--${name}`) return true;
  return hit.split('=').slice(1).join('=');
};
const TYPE = String(getArg('type', 'all')).toLowerCase();
const DRY_RUN = Boolean(getArg('dry-run', false));
const FORCE = Boolean(getArg('force', false));

if (!['db', 'media', 'all'].includes(TYPE)) {
  console.error(`[ERROR] --type phải là db|media|all (got "${TYPE}")`);
  process.exit(2);
}

// ─── Config ─────────────────────────────────────────────
const CFG = {
  enabled: (process.env.GDRIVE_ENABLED || 'false').toLowerCase() === 'true',
  credentialsPath: process.env.GDRIVE_CREDENTIALS_PATH || './scripts/.gdrive-credentials.json',
  folderId: process.env.GDRIVE_FOLDER_ID || '',
  dbSubfolder: process.env.GDRIVE_DB_SUBFOLDER || 'database',
  uploadsSubfolder: process.env.GDRIVE_UPLOADS_SUBFOLDER || 'media',
  keepCount: parseInt(process.env.GDRIVE_KEEP_COUNT || '14', 10),
  backupDir: process.env.BACKUP_DIR || '/opt/webtemplate/backups',
  uploadsDir: process.env.UPLOADS_DIR || './backend/uploads',
};

// ─── Logging helpers ────────────────────────────────────
const SESSION_ID = `${Date.now()}-${process.pid}`;
const SCRIPT_START = Date.now();
const SCRIPT_NAME = path.basename(__filename);
const ts = () => new Date().toISOString().replace('T', ' ').slice(0, 19);
const log = (...m) => console.log(`[${ts()}] [INFO] [S=${SESSION_ID}]`, ...m);
const warn = (...m) => console.warn(`[${ts()}] [WARN] [S=${SESSION_ID}]`, ...m);
const errLog = (...m) => console.error(`[${ts()}] [ERROR] [S=${SESSION_ID}]`, ...m);

// Uploaded/downloaded file tracker — de summary cuoi run co day du info
const SUMMARY = { uploads: [], deletes: [], errors: [] };

// Print summary JSON mot dong — dung JQ/grep de parse forensic sau
function printSummary(result, extra = {}) {
  const durationSec = Math.round((Date.now() - SCRIPT_START) / 1000);
  const summary = {
    ts: new Date().toISOString(),
    session: SESSION_ID,
    script: SCRIPT_NAME,
    result,  // success | fail | skip
    durationSec,
    type: TYPE,
    dryRun: DRY_RUN,
    uploads: SUMMARY.uploads,
    deletes: SUMMARY.deletes,
    errorCount: SUMMARY.errors.length,
    errors: SUMMARY.errors.slice(0, 3),
    ...extra,
  };
  console.log(`[${ts()}] [SUMMARY] ${JSON.stringify(summary)}`);
}

log(`═══ SCRIPT START ═══ script=${SCRIPT_NAME} pid=${process.pid} session=${SESSION_ID} host=${os.hostname()} cwd=${process.cwd()}`);

// ─── Retry wrapper với exponential backoff ──────────────
async function retry(fn, label, maxAttempts = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const isNet = /ECONN|ETIMEDOUT|ENETUNREACH|EAI_AGAIN|socket hang up|network|rate/i.test(
        (e && (e.code || e.message)) || ''
      );
      // Lỗi không phải network -> không retry (credentials, 404, permission...)
      if (!isNet && attempt === 1) throw e;
      const delayMs = 1000 * Math.pow(2, attempt - 1);
      warn(`${label} attempt ${attempt}/${maxAttempts} failed: ${e.message}. Retry in ${delayMs}ms`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

// ─── Tìm file .sql.gz mới nhất trong BACKUP_DIR ─────────
async function findLatestSqlDump(baseDir) {
  // Search recursive 1 cấp con (backup-mysql.sh có thể ghi vào ${BACKUP_DIR}/mysql/)
  const candidates = [];
  const pushFiles = async (dir) => {
    let entries;
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) await pushFiles(full);
      else if (ent.isFile() && ent.name.endsWith('.sql.gz')) {
        const stat = await fsp.stat(full);
        candidates.push({ path: full, mtime: stat.mtimeMs, size: stat.size });
      }
    }
  };
  await pushFiles(baseDir);
  candidates.sort((a, b) => b.mtime - a.mtime);
  return candidates[0] || null;
}

// ─── Zip uploads folder → temp file ─────────────────────
async function zipUploadsDir(srcDir) {
  const archiver = require('archiver');
  const dateStr = new Date().toISOString().slice(0, 10);
  const tmpPath = path.join(os.tmpdir(), `uploads-${dateStr}-${process.pid}.zip`);
  log(`Zipping ${srcDir} → ${tmpPath}`);
  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(tmpPath);
    const archive = archiver('zip', { zlib: { level: 6 } });
    output.on('close', resolve);
    output.on('error', reject);
    archive.on('error', reject);
    archive.on('warning', (w) => warn('archiver warning:', w.message));
    archive.pipe(output);
    archive.directory(srcDir, false);
    archive.finalize();
  });
  const stat = await fsp.stat(tmpPath);
  return { path: tmpPath, size: stat.size, name: `uploads-${dateStr}.zip` };
}

// ─── Google Drive client init ───────────────────────────
async function initDriveClient() {
  const { google } = require('googleapis');
  const credsRaw = await fsp.readFile(path.resolve(CFG.credentialsPath), 'utf8');
  const creds = JSON.parse(credsRaw);
  if (!creds.client_email || !creds.private_key) {
    throw new Error('Credentials file missing client_email or private_key');
  }
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
  await auth.authorize();
  const drive = google.drive({ version: 'v3', auth });
  return { drive, clientEmail: creds.client_email };
}

// ─── Find or create subfolder trong parent ──────────────
async function findOrCreateFolder(drive, parentId, name) {
  // Escape dấu ' trong tên
  const safe = name.replace(/'/g, "\\'");
  const q = `'${parentId}' in parents and name = '${safe}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const res = await retry(
    () =>
      drive.files.list({
        q,
        fields: 'files(id, name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        pageSize: 10,
      }),
    `findFolder(${name})`
  );
  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id;
  }
  log(`Creating subfolder "${name}" under ${parentId}`);
  const created = await retry(
    () =>
      drive.files.create({
        requestBody: {
          name,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId],
        },
        fields: 'id, name',
        supportsAllDrives: true,
      }),
    `createFolder(${name})`
  );
  return created.data.id;
}

// ─── Resumable upload với progress log ──────────────────
async function uploadFile(drive, folderId, filePath, displayName) {
  const stat = await fsp.stat(filePath);
  const totalMB = (stat.size / 1024 / 1024).toFixed(2);
  log(`Uploading ${displayName} (${totalMB} MB) → folder ${folderId}`);

  // Googleapis Node client tự xử lý resumable khi size > 5MB; explicit onUploadProgress
  const res = await retry(
    () =>
      drive.files.create(
        {
          requestBody: {
            name: displayName,
            parents: [folderId],
          },
          media: {
            body: fs.createReadStream(filePath),
          },
          fields: 'id, name, webViewLink, createdTime, size',
          supportsAllDrives: true,
        },
        {
          // Progress callback — log mỗi ~5MB
          onUploadProgress: (evt) => {
            const uploadedMB = evt.bytesRead / 1024 / 1024;
            if (!uploadFile._lastLog) uploadFile._lastLog = {};
            const key = displayName;
            const last = uploadFile._lastLog[key] || 0;
            if (uploadedMB - last >= 5 || evt.bytesRead === stat.size) {
              const pct = ((evt.bytesRead / stat.size) * 100).toFixed(1);
              log(`  ${displayName}: ${uploadedMB.toFixed(1)}/${totalMB} MB (${pct}%)`);
              uploadFile._lastLog[key] = uploadedMB;
            }
          },
        }
      ),
    `upload(${displayName})`
  );
  log(`Uploaded: id=${res.data.id} link=${res.data.webViewLink || 'n/a'}`);
  return res.data;
}

// ─── Rotation: giữ N bản mới nhất, xóa cũ hơn ───────────
async function rotateFolder(drive, folderId, keepCount, label) {
  const res = await retry(
    () =>
      drive.files.list({
        q: `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name, createdTime, size)',
        orderBy: 'createdTime desc',
        pageSize: 1000,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      }),
    `listFor rotation(${label})`
  );
  const files = res.data.files || [];
  if (files.length <= keepCount) {
    log(`Rotation (${label}): ${files.length} files, keep=${keepCount}, nothing to delete`);
    return { deleted: 0, kept: files.length };
  }
  const toDelete = files.slice(keepCount);
  log(`Rotation (${label}): ${files.length} files → deleting ${toDelete.length} oldest`);
  let deleted = 0;
  for (const f of toDelete) {
    if (DRY_RUN) {
      log(`  [dry-run] would delete ${f.name} (id=${f.id}, created=${f.createdTime})`);
      continue;
    }
    try {
      await retry(
        () => drive.files.delete({ fileId: f.id, supportsAllDrives: true }),
        `delete(${f.name})`
      );
      log(`  deleted ${f.name} (${f.createdTime})`);
      deleted++;
    } catch (e) {
      warn(`  failed to delete ${f.name}: ${e.message}`);
    }
  }
  return { deleted, kept: keepCount };
}

// ─── Task DB ────────────────────────────────────────────
async function taskDb(drive) {
  log('=== Task: DB backup ===');
  const latest = await findLatestSqlDump(CFG.backupDir);
  if (!latest) {
    warn(`No .sql.gz found in ${CFG.backupDir}. Skipping DB upload.`);
    return { skipped: true };
  }
  const sizeMB = (latest.size / 1024 / 1024).toFixed(2);
  log(`Latest dump: ${latest.path} (${sizeMB} MB, mtime=${new Date(latest.mtime).toISOString()})`);

  if (DRY_RUN) {
    log(`[dry-run] would upload ${latest.path} → ${CFG.dbSubfolder}/`);
    return { dryRun: true, file: latest.path };
  }
  const subId = await findOrCreateFolder(drive, CFG.folderId, CFG.dbSubfolder);
  const displayName = path.basename(latest.path);
  const uploaded = await uploadFile(drive, subId, latest.path, displayName);
  const rot = await rotateFolder(drive, subId, CFG.keepCount, 'db');
  return { uploaded, rotation: rot };
}

// ─── Task Media ─────────────────────────────────────────
async function taskMedia(drive) {
  log('=== Task: Media backup ===');
  const uploadsAbs = path.resolve(CFG.uploadsDir);
  if (!fs.existsSync(uploadsAbs)) {
    warn(`UPLOADS_DIR does not exist: ${uploadsAbs}. Skipping media upload.`);
    return { skipped: true };
  }

  if (DRY_RUN) {
    log(`[dry-run] would zip ${uploadsAbs} and upload → ${CFG.uploadsSubfolder}/`);
    return { dryRun: true, dir: uploadsAbs };
  }

  const zipped = await zipUploadsDir(uploadsAbs);
  try {
    const subId = await findOrCreateFolder(drive, CFG.folderId, CFG.uploadsSubfolder);
    const uploaded = await uploadFile(drive, subId, zipped.path, zipped.name);
    const rot = await rotateFolder(drive, subId, CFG.keepCount, 'media');
    return { uploaded, rotation: rot };
  } finally {
    // Cleanup temp zip dù upload fail hay không
    try {
      await fsp.unlink(zipped.path);
      log(`Removed temp zip: ${zipped.path}`);
    } catch (e) {
      warn(`Cannot remove temp zip ${zipped.path}: ${e.message}`);
    }
  }
}

// ─── main() ─────────────────────────────────────────────
async function main() {
  log(`backup-gdrive.js starting (type=${TYPE}, dryRun=${DRY_RUN}, force=${FORCE})`);

  if (!CFG.enabled && !FORCE) {
    log('GDRIVE_ENABLED=false — skipping. Use --force to override.');
    return 0;
  }

  // Validate config
  const missing = [];
  if (!CFG.folderId) missing.push('GDRIVE_FOLDER_ID');
  if (!fs.existsSync(path.resolve(CFG.credentialsPath))) {
    missing.push(`credentials file at ${CFG.credentialsPath}`);
  }
  if (missing.length) {
    if (DRY_RUN) {
      warn(`[dry-run] Missing config: ${missing.join(', ')} — would fail in real run. Continuing dry-run.`);
      // Dry-run: vẫn in các hành động sẽ làm, nhưng không init client
      if (TYPE === 'db' || TYPE === 'all') await taskDb(null);
      if (TYPE === 'media' || TYPE === 'all') await taskMedia(null);
      return 0;
    }
    const msg = `Missing required config: ${missing.join(', ')}`;
    errLog(msg);
    SUMMARY.errors.push({ msg, stack: '' });
    return 1;
  }

  // Dry-run có credentials → vẫn không cần init client cho phần list/upload
  let drive = null;
  if (!DRY_RUN) {
    const initRes = await initDriveClient();
    drive = initRes.drive;
    log(`Auth OK as ${initRes.clientEmail}`);
  } else {
    log('[dry-run] skipping Drive client init');
  }

  const results = {};
  if (TYPE === 'db' || TYPE === 'all') results.db = await taskDb(drive);
  if (TYPE === 'media' || TYPE === 'all') results.media = await taskMedia(drive);

  log('=== Summary ===');
  log(JSON.stringify(results, null, 2));
  log('backup-gdrive.js finished OK');
  printSummary('success', { results });
  return 0;
}

main()
  .then((code) => {
    if (code && code !== 0) printSummary('fail', { exitCode: code });
    process.exit(code || 0);
  })
  .catch((e) => {
    errLog(e.stack || e.message || String(e));
    SUMMARY.errors.push({ msg: e.message, stack: (e.stack || '').split('\n').slice(0, 3).join(' | ') });
    printSummary('fail', { exitCode: 1 });
    process.exit(1);
  });
