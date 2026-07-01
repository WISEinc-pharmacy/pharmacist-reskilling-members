import fs from 'node:fs';
import path from 'node:path';
import admin from 'firebase-admin';

const CSV_PATH = process.env.RESKILLING_MEMBERS_CSV || process.argv[2] || '';
const DRY_RUN = process.env.DRY_RUN === '1' || process.argv.includes('--dry-run');
const ROLE = process.env.RESKILLING_MEMBER_ROLE || 'member';
const STATUS = process.env.RESKILLING_MEMBER_STATUS || 'active';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function initFirestore() {
  if (admin.apps.length) return admin.firestore();
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
  } else {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT || './serviceAccountKey.json';
    admin.initializeApp({ credential: admin.credential.cert(readJson(serviceAccountPath)) });
  }
  return admin.firestore();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (char !== '\r') {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function normalizeHeader(value) {
  return String(value || '').trim().replace(/\s+/g, '');
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function pick(row, index, names) {
  for (const name of names) {
    const key = normalizeHeader(name);
    if (index.has(key)) return row[index.get(key)] || '';
  }
  return '';
}

function rowsToMembers(rows) {
  const headerRowIndex = rows.findIndex((row) => row.some((cell) => normalizeHeader(cell) === 'メールアドレス'));
  const header = rows[headerRowIndex >= 0 ? headerRowIndex : 0] || [];
  const index = new Map(header.map((name, i) => [normalizeHeader(name), i]));
  const members = [];
  const seen = new Set();
  for (const row of rows.slice((headerRowIndex >= 0 ? headerRowIndex : 0) + 1)) {
    const email = normalizeEmail(pick(row, index, ['メールアドレス', 'email', 'mail']));
    if (!email || seen.has(email)) continue;
    seen.add(email);
    const name = String(pick(row, index, ['システム表示名', 'LINE表示名', '氏名']) || '').trim();
    const lineUserId = String(pick(row, index, ['ユーザーID', 'ID']) || '').trim();
    const joinedAt = String(pick(row, index, ['友だち情報_薬剤師リスキリングサロン入会日', '入会日']) || '').trim();
    members.push({
      email,
      name,
      role: String(pick(row, index, ['role']) || ROLE).trim() || ROLE,
      status: String(pick(row, index, ['status']) || STATUS).trim() || STATUS,
      lineUserId,
      joinedAt,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  return members;
}

async function main() {
  if (!CSV_PATH) throw new Error('CSV path is required. Set RESKILLING_MEMBERS_CSV or pass it as the first argument.');
  const resolved = path.resolve(CSV_PATH);
  const rows = parseCsv(fs.readFileSync(resolved, 'utf8'));
  const members = rowsToMembers(rows);
  if (!members.length) throw new Error('No members with email addresses were found.');
  if (DRY_RUN) {
    const roles = members.reduce((acc, member) => ({ ...acc, [member.role]: (acc[member.role] || 0) + 1 }), {});
    console.log(JSON.stringify({ dryRun: true, csv: resolved, count: members.length, roles, firstEmails: members.slice(0, 5).map((member) => member.email) }, null, 2));
    return;
  }
  const db = initFirestore();
  let batch = db.batch();
  let batchSize = 0;
  let written = 0;
  for (const member of members) {
    batch.set(db.collection('users').doc(member.email), member, { merge: true });
    batchSize += 1;
    written += 1;
    if (batchSize === 450) {
      await batch.commit();
      batch = db.batch();
      batchSize = 0;
    }
  }
  if (batchSize) await batch.commit();
  console.log(JSON.stringify({ imported: written, csv: resolved }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
