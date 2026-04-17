#!/usr/bin/env node
/* ──────────────────────────────────────────
 * Google Drive Restore — LeQuyDon CMS
 *
 * Tai file backup tu Google Drive ve local. Ho tro:
 *  - Liet ke file backup (DB hoac media) trong GDrive folder
 *  - Download file moi nhat hoac theo ten/regex
 *  - Chain tu dong goi restore-mysql.sh sau khi download (neu --chain-restore)
 *
 * Usage:
 *   node restore-gdrive.js --list --type=db
 *   node restore-gdrive.js --type=db --latest
 *   node restore-gdrive.js --type=media --latest
 *   node restore-gdrive.js --type=db --name=lqd_2026-04-17_02-00.sql.gz
 *   node restore-gdrive.js --type=db --latest --chain-restore --force
 *
 * Env vars: giong backup-gdrive.js (GDRIVE_*, BACKUP_DIR, UPLOADS_DIR)
 * ────────────────────────────────────────── */

'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

// Load .env giong backup-gdrive.js
try {
  const dotenv = require('dotenv');
  const rootEnv = path.resolve(__dirname, '..', '.env');
  const localEnv = path.resolve(__dirname, '.env');
  if (fs.existsSync(rootEnv)) dotenv.config({ path: rootEnv });
  else if (fs.existsSync(localEnv)) dotenv.config({ path: localEnv });
} catch (_) {}

// ─── CLI args ────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (name, def) => {
  const hit = args.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return def;
  if (hit === `--${name}`) return true;
  return hit.split('=').slice(1).join('=');
};
const TYPE = String(getArg('type', 'db')).toLowerCase();
const LIST_ONLY = Boolean(getArg('list', false));
const LATEST = Boolean(getArg('latest', false));
const NAME = getArg('name', '');
const CHAIN_RESTORE = Boolean(getArg('chain-restore', false));
const FORCE = Boolean(getArg('force', false));
const DRY_RUN = Boolean(getArg('dry-run', false));

if (!['db', 'media'].includes(TYPE)) {
  console.error(`[ERROR] --type phai la db|media (got "${TYPE}")`);
  process.exit(2);
}

// ─── Config ─────────────────────────────────────────────
const CFG = {
  enabled: (process.env.GDRIVE_ENABLED || 'false').toLowerCase() === 'true',
  credentialsPath: process.env.GDRIVE_CREDENTIALS_PATH || './scripts/.gdrive-credentials.json',
  folderId: process.env.GDRIVE_FOLDER_ID || '',
  dbSubfolder: process.env.GDRIVE_DB_SUBFOLDER || 'database',
  uploadsSubfolder: process.env.GDRIVE_UPLOADS_SUBFOLDER || 'media',
  backupDir: process.env.BACKUP_DIR || '/opt/webtemplate/backups',
  uploadsDir: process.env.UPLOADS_DIR || './backend/uploads',
};

const SESSION_ID = `${Date.now()}-${process.pid}`;
const SCRIPT_START = Date.now();
const SCRIPT_NAME = path.basename(__filename);
const ts = () => new Date().toISOString().replace('T', ' ').slice(0, 19);
const log = (...m) => console.log(`[${ts()}] [INFO] [S=${SESSION_ID}]`, ...m);
const warn = (...m) => console.warn(`[${ts()}] [WARN] [S=${SESSION_ID}]`, ...m);
const errLog = (...m) => console.error(`[${ts()}] [ERROR] [S=${SESSION_ID}]`, ...m);

const SUMMARY = { downloaded: [], errors: [] };

function printSummary(result, extra = {}) {
  const durationSec = Math.round((Date.now() - SCRIPT_START) / 1000);
  const summary = {
    ts: new Date().toISOString(),
    session: SESSION_ID,
    script: SCRIPT_NAME,
    result,
    durationSec,
    type: TYPE,
    listOnly: LIST_ONLY,
    latest: LATEST,
    name: NAME || null,
    chainRestore: CHAIN_RESTORE,
    downloaded: SUMMARY.downloaded,
    errorCount: SUMMARY.errors.length,
    errors: SUMMARY.errors.slice(0, 3),
    ...extra,
  };
  console.log(`[${ts()}] [SUMMARY] ${JSON.stringify(summary)}`);
}

log(`═══ SCRIPT START ═══ script=${SCRIPT_NAME} pid=${process.pid} session=${SESSION_ID} host=${os.hostname()}`);

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
      if (!isNet && attempt === 1) throw e;
      const delayMs = 1000 * Math.pow(2, attempt - 1);
      warn(`${label} attempt ${attempt}/${maxAttempts} failed: ${e.message}. Retry in ${delayMs}ms`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

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
    scopes: ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/drive.file'],
  });
  await auth.authorize();
  return google.drive({ version: 'v3', auth });
}

async function findSubfolder(drive, parentId, name) {
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
    'find subfolder'
  );
  return (res.data.files || [])[0] || null;
}

async function listBackupFiles(drive, folderId) {
  const q = `'${folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`;
  const res = await retry(
    () =>
      drive.files.list({
        q,
        fields: 'files(id, name, size, createdTime, mimeType)',
        orderBy: 'createdTime desc',
        pageSize: 100,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      }),
    'list backups'
  );
  return res.data.files || [];
}

// ─── Tai file ve dest theo resumable stream ─────────────
async function downloadFile(drive, fileId, destPath) {
  await fsp.mkdir(path.dirname(destPath), { recursive: true });
  const res = await drive.files.get({ fileId, alt: 'media', supportsAllDrives: true }, { responseType: 'stream' });
  await new Promise((resolve, reject) => {
    const out = fs.createWriteStream(destPath);
    let downloaded = 0;
    res.data
      .on('data', (chunk) => {
        downloaded += chunk.length;
        if (downloaded % (5 * 1024 * 1024) < chunk.length) {
          log(`  downloaded ${(downloaded / 1024 / 1024).toFixed(2)} MB`);
        }
      })
      .on('end', resolve)
      .on('error', reject)
      .pipe(out);
  });
  const stat = await fsp.stat(destPath);
  return stat.size;
}

// ─── Goi restore-mysql.sh ───────────────────────────────
function chainRestore(dumpPath) {
  const script = path.resolve(__dirname, 'restore-mysql.sh');
  if (!fs.existsSync(script)) {
    errLog(`restore-mysql.sh not found at ${script}`);
    return 1;
  }
  const shArgs = [script, dumpPath];
  if (FORCE) shArgs.push('--force');
  log(`Chaining restore: bash ${shArgs.join(' ')}`);
  const result = spawnSync('bash', shArgs, { stdio: 'inherit' });
  return result.status ?? 1;
}

async function main() {
  log(`restore-gdrive.js starting (type=${TYPE}, list=${LIST_ONLY}, latest=${LATEST}, name=${NAME || '-'}, chain=${CHAIN_RESTORE})`);

  const missing = [];
  if (!CFG.folderId) missing.push('GDRIVE_FOLDER_ID');
  if (!fs.existsSync(path.resolve(CFG.credentialsPath))) missing.push(`credentials file at ${CFG.credentialsPath}`);
  if (missing.length) {
    const msg = `Missing required config: ${missing.join(', ')}`;
    errLog(msg);
    SUMMARY.errors.push({ msg, stack: '' });
    printSummary('fail', { exitCode: 1 });
    process.exit(1);
  }

  const drive = await initDriveClient();
  const subName = TYPE === 'db' ? CFG.dbSubfolder : CFG.uploadsSubfolder;
  const sub = await findSubfolder(drive, CFG.folderId, subName);
  if (!sub) {
    errLog(`Subfolder "${subName}" not found in GDRIVE_FOLDER_ID=${CFG.folderId}`);
    process.exit(1);
  }

  const files = await listBackupFiles(drive, sub.id);
  if (files.length === 0) {
    warn(`No backup files in ${subName}/`);
    process.exit(0);
  }

  if (LIST_ONLY) {
    log(`Files in ${subName}/ (${files.length} total):`);
    for (const f of files) {
      const mb = (parseInt(f.size || '0', 10) / 1024 / 1024).toFixed(2);
      console.log(`  ${f.createdTime}  ${mb} MB  ${f.name}  [${f.id}]`);
    }
    return;
  }

  // Chon file target
  let target;
  if (NAME) {
    target = files.find((f) => f.name === NAME);
    if (!target) {
      errLog(`File "${NAME}" not found in ${subName}/`);
      process.exit(1);
    }
  } else if (LATEST) {
    target = files[0];
  } else {
    errLog('Must specify --latest, --name=<file>, or --list');
    process.exit(2);
  }

  const destDir = TYPE === 'db' ? path.join(CFG.backupDir, 'mysql') : CFG.backupDir;
  const destPath = path.join(destDir, target.name);
  const sizeMb = (parseInt(target.size || '0', 10) / 1024 / 1024).toFixed(2);

  if (DRY_RUN) {
    log(`[dry-run] would download ${target.name} (${sizeMb} MB) → ${destPath}`);
    return;
  }

  log(`Downloading ${target.name} (${sizeMb} MB) → ${destPath}`);
  const bytes = await retry(() => downloadFile(drive, target.id, destPath), 'download');
  log(`Downloaded ${bytes} bytes to ${destPath}`);
  SUMMARY.downloaded.push({ name: target.name, size: bytes, path: destPath });

  if (CHAIN_RESTORE) {
    if (TYPE !== 'db') {
      warn('--chain-restore chi ho tro --type=db. Skipping.');
      printSummary('success');
      return;
    }
    const code = chainRestore(destPath);
    printSummary(code === 0 ? 'success' : 'fail', { chainExitCode: code });
    process.exit(code);
  }
}

main()
  .then(() => printSummary('success'))
  .catch((e) => {
    errLog(e.stack || e.message || e);
    SUMMARY.errors.push({ msg: e.message, stack: (e.stack || '').split('\n').slice(0, 3).join(' | ') });
    printSummary('fail', { exitCode: 1 });
    process.exit(1);
  });
