import fs from 'node:fs';
import admin from 'firebase-admin';

const SA_PATH = 'C:/Users/WISE-Yamauchi/Downloads/pharmacist-reskilling-members-firebase-adminsdk-fbsvc-149d19fe96.json';
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(SA_PATH, 'utf8'))) });
const db = admin.firestore();

const snap = await db.collection('users').get();
const users = snap.docs.map((d) => {
  const v = d.data();
  return { id: d.id, name: v.name || '', role: v.role || '', status: v.status || '', lineUserId: v.lineUserId || '' };
});
console.log(JSON.stringify({ count: users.length, users }, null, 2));
