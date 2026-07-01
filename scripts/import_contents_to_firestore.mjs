import fs from 'node:fs';
import admin from 'firebase-admin';

const INPUT_PATH = process.env.RESKILLING_CONTENTS_JSON || process.argv[2] || 'data/contents-private.local.json';
const DRY_RUN = process.env.DRY_RUN === '1' || process.argv.includes('--dry-run');

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

function docIdFor(item) {
  if (item.id) return String(item.id).replaceAll('/', '-');
  if (item.videoId) return 'yt-' + item.videoId;
  return Buffer.from(String(item.url || item.title)).toString('base64url').slice(0, 48);
}

async function main() {
  const contents = readJson(INPUT_PATH).filter((item) => item && item.published !== false);
  if (!contents.length) throw new Error('No contents were found.');
  if (DRY_RUN) {
    console.log(JSON.stringify({ dryRun: true, input: INPUT_PATH, count: contents.length, first: contents[0]?.url }, null, 2));
    return;
  }
  const db = initFirestore();
  let batch = db.batch();
  let batchSize = 0;
  for (const item of contents) {
    const payload = {
      ...item,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    batch.set(db.collection('contents').doc(docIdFor(item)), payload, { merge: true });
    batchSize += 1;
    if (batchSize === 450) {
      await batch.commit();
      batch = db.batch();
      batchSize = 0;
    }
  }
  if (batchSize) await batch.commit();
  console.log(JSON.stringify({ imported: contents.length, input: INPUT_PATH }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});