import 'dotenv/config';
import fs from 'node:fs';
import { google } from 'googleapis';
import admin from 'firebase-admin';

const SHEET_ID = process.env.RESKILLING_VIDEO_SHEET_ID || '1hjsTBi6phi9qY3aJoVqu8xEOLOuCp9--KKNm8pehdbM';
const SHEET_NAME = process.env.RESKILLING_VIDEO_SHEET_NAME || '\u30b5\u30ed\u30f3\u30e1\u30f3\u30d0\u30fc\u9650\u5b9a\u52d5\u753b';
const TOKEN_PATH = process.env.GOOGLE_TOKEN_PATH || './token.json';
const CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_PATH || './credentials.json';

function readJson(path) { return JSON.parse(fs.readFileSync(path, 'utf8')); }
async function sheetsAuth() { const creds = readJson(CREDENTIALS_PATH); const installed = creds.installed || creds.web; if (!installed) throw new Error('credentials.json must contain installed or web OAuth client'); const { client_id, client_secret, redirect_uris } = installed; const auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris?.[0]); auth.setCredentials(readJson(TOKEN_PATH)); return auth; }
function initFirestore() { if (admin.apps.length) return admin.firestore(); if (process.env.GOOGLE_APPLICATION_CREDENTIALS) { admin.initializeApp({ credential: admin.credential.applicationDefault() }); } else { const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT || './serviceAccountKey.json'; admin.initializeApp({ credential: admin.credential.cert(readJson(serviceAccountPath)) }); } return admin.firestore(); }
function categoryFor(title) { if (/\u7591\u7fa9\u7167\u4f1a|\u51e6\u65b9\u63d0\u6848/.test(title)) return '\u51e6\u65b9\u63d0\u6848'; if (/\u75be\u60a3|\u75c5\u614b|\u85ac\u7406/.test(title)) return '\u75be\u60a3\u5225\u30a2\u30c3\u30d7\u30c7\u30fc\u30c8'; if (/\u5728\u5b85|\u65bd\u8a2d|\u8a2a\u554f/.test(title)) return '\u5728\u5b85\u533b\u7642'; if (/\u5065\u5eb7\u30b5\u30dd\u30fc\u30c8|\u6804\u990a|\u691c\u67fb|OTC/.test(title)) return '\u5065\u5eb7\u30b5\u30dd\u30fc\u30c8'; if (/AI|DX|\u52b9\u7387\u5316/.test(title)) return '\u696d\u52d9\u52b9\u7387\u5316'; return '\u57fa\u790e\u8b1b\u7fa9'; }
function normalizeDate(value) { if (!value) return null; const date = new Date(value); if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10); return String(value).trim(); }
function rowToContent(row, index) { const [uploadedAt, title, url, note] = row.map((cell) => String(cell || '').trim()); if (!title || !/^https?:\/\/(youtu\.be|www\.youtube\.com|youtube\.com)\//i.test(url)) return null; return { title: title.replace(/[\u000b\r]+/g, '\n'), url, note: note || '', uploadedAt: normalizeDate(uploadedAt), publishedAt: normalizeDate(uploadedAt), category: categoryFor(title), type: 'video', published: true, order: index + 1, updatedAt: admin.firestore.FieldValue.serverTimestamp() }; }
function docIdFor(content) { return Buffer.from((content.uploadedAt || '') + ':' + content.title).toString('base64url').slice(0, 80); }
async function main() { const auth = await sheetsAuth(); const sheets = google.sheets({ version: 'v4', auth }); const db = initFirestore(); const result = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: SHEET_NAME + '!A2:D' }); const rows = result.data.values || []; const contents = rows.map(rowToContent).filter(Boolean); const batch = db.batch(); for (const content of contents) batch.set(db.collection('contents').doc(docIdFor(content)), content, { merge: true }); await batch.commit(); console.log('synced ' + contents.length + ' contents'); }
main().catch((error) => { console.error(error); process.exitCode = 1; });
