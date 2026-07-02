// エルメ→Firestore users 会員同期（半自動運用）
//
// 使い方:
//   1. Claude Codeセッション内でエルメMCPから取得（bot_id: qxwr4O）:
//      - get_field_friends(field_id=-3) … メールアドレス一覧
//      - get_field_friends(field_id=-1) … システム表示名（正式氏名）
//      - get_tag_friends(tag_id=984883)  … オンラインサロン入会
//      - get_tag_friends(tag_id=1218762) … オンラインサロン退会
//   2. 下記形式のJSONを作って実行:
//      node scripts/sync_lme_members_to_firestore.mjs lme_members.json [--dry-run]
//
// JSON形式:
//   { "members": [{ "email": "...", "name": "システム表示名(正式氏名)", "lineUserId": "U...", "retired": false }] }
//   ※ members = 入会タグ付き全員。退会タグも付いていれば retired: true
//   ※ name はエルメの「システム表示名」(field_id:-1) = 正式氏名を使う（LINE表示名ではない）
//
// やること:
//   - users: 追加 / 退会inactive化 / 再入会active化 / 氏名更新（名簿の正=エルメ）
//   - member_directory: 現役member(role=member & status=active)の {name, email} だけで全再構築
//     → リードコンファーマ向け名簿閲覧(viewerロール)はこのコレクションのみ読める
//
// ガード:
//   - role が editor/admin の既存docは一切触らない
//   - 削除はしない（退会= status:"inactive" のみ。member_directoryからは消える）
//   - @univapay.com（決済ダミーアドレス）は除外
import fs from 'node:fs';
import admin from 'firebase-admin';

const SA_PATH = 'C:/Users/WISE-Yamauchi/Downloads/pharmacist-reskilling-members-firebase-adminsdk-fbsvc-149d19fe96.json';
const INPUT = process.argv[2];
const DRY_RUN = process.argv.includes('--dry-run');
if (!INPUT) { console.error('usage: node sync_lme_members_to_firestore.mjs <lme_members.json> [--dry-run]'); process.exit(1); }

const { members } = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
if (!Array.isArray(members)) throw new Error('input JSON must have a "members" array');

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(SA_PATH, 'utf8'))) });
const db = admin.firestore();
const now = admin.firestore.FieldValue.serverTimestamp();

const normalize = (v) => String(v || '').trim().toLowerCase();
const lme = new Map();
for (const m of members) {
  const email = normalize(m.email);
  if (!email || email.endsWith('@univapay.com')) continue; // 決済ダミーアドレス除外
  lme.set(email, { name: String(m.name || '').trim(), lineUserId: m.lineUserId || '', retired: !!m.retired });
}

const snap = await db.collection('users').get();
const fsUsers = new Map(snap.docs.map((d) => [d.id, d.data()]));

const plan = { add: [], deactivate: [], reactivate: [], rename: [], skippedProtected: [], unchanged: 0 };

for (const [email, m] of lme) {
  const existing = fsUsers.get(email);
  if (existing && ['editor', 'admin'].includes(existing.role)) { plan.skippedProtected.push(email); continue; }
  if (m.retired) {
    if (existing && existing.status === 'active') plan.deactivate.push({ email, name: m.name });
    else plan.unchanged += 1;
    continue;
  }
  if (!existing) {
    plan.add.push({ email, name: m.name, lineUserId: m.lineUserId });
    continue;
  }
  if (existing.status !== 'active') plan.reactivate.push({ email, name: m.name });
  else plan.unchanged += 1;
  // 氏名の正はエルメ（memberのみ・空文字では上書きしない）
  if (m.name && existing.name !== m.name) plan.rename.push({ email, from: existing.name || '', to: m.name });
}

// Firestoreにいてエルメにいないmemberは報告のみ（自動では触らない）
plan.inFirestoreOnly = [...fsUsers.entries()]
  .filter(([email, u]) => u.role === 'member' && !lme.has(email))
  .map(([email, u]) => ({ email, status: u.status }));

console.log(JSON.stringify({ dryRun: DRY_RUN, ...plan }, null, 2));
if (DRY_RUN) process.exit(0);

const batch = db.batch();
for (const a of plan.add) {
  batch.set(db.collection('users').doc(a.email), {
    email: a.email, name: a.name, role: 'member', status: 'active',
    lineUserId: a.lineUserId, joinedAt: '', updatedAt: now
  }, { merge: true });
}
for (const d of plan.deactivate) {
  batch.set(db.collection('users').doc(d.email), { status: 'inactive', updatedAt: now }, { merge: true });
}
for (const r of plan.reactivate) {
  batch.set(db.collection('users').doc(r.email), { status: 'active', updatedAt: now }, { merge: true });
}
for (const n of plan.rename) {
  batch.set(db.collection('users').doc(n.email), { name: n.to, updatedAt: now }, { merge: true });
}
await batch.commit();

// member_directory 全再構築（現役member = エルメ現役 + 上記反映後の状態）
const after = await db.collection('users').get();
const activeMembers = after.docs
  .map((d) => ({ id: d.id, ...d.data() }))
  .filter((u) => u.role === 'member' && u.status === 'active');
const dirSnap = await db.collection('member_directory').get();
const dirBatch = db.batch();
const keep = new Set(activeMembers.map((u) => u.id));
for (const doc of dirSnap.docs) if (!keep.has(doc.id)) dirBatch.delete(doc.ref);
for (const u of activeMembers) {
  dirBatch.set(db.collection('member_directory').doc(u.id), {
    email: u.id, name: u.name || '', updatedAt: now
  });
}
await dirBatch.commit();

console.log(JSON.stringify({
  applied: {
    added: plan.add.length, deactivated: plan.deactivate.length,
    reactivated: plan.reactivate.length, renamed: plan.rename.length,
    directoryCount: activeMembers.length
  }
}));
