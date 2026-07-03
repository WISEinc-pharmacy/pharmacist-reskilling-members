// firestore.rules をサービスアカウント経由で Firebase Rules API にデプロイする（headless対応）。
// firebase CLIのキャッシュ認証に依存せず、Admin SDKのサービスアカウントで完結する。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { google } from 'googleapis';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SA_PATH = process.env.RESKILLING_SERVICE_ACCOUNT
  || 'C:/Users/WISE-Yamauchi/Downloads/pharmacist-reskilling-members-firebase-adminsdk-fbsvc-149d19fe96.json';
const sa = JSON.parse(fs.readFileSync(SA_PATH, 'utf8'));
const PROJECT = sa.project_id;
const rulesSource = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');

const auth = new google.auth.GoogleAuth({
  credentials: { client_email: sa.client_email, private_key: sa.private_key },
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});
const authClient = await auth.getClient();
google.options({ auth: authClient });
const rules = google.firebaserules({ version: 'v1' });

const ruleset = await rules.projects.rulesets.create({
  name: `projects/${PROJECT}`,
  requestBody: { source: { files: [{ name: 'firestore.rules', content: rulesSource }] } }
});
const rulesetName = ruleset.data.name;
console.log('[rules] created ruleset:', rulesetName);

const releaseName = `projects/${PROJECT}/releases/cloud.firestore`;
try {
  await rules.projects.releases.patch({
    name: releaseName,
    requestBody: { release: { name: releaseName, rulesetName } }
  });
  console.log('[rules] release updated (patch)');
} catch (e) {
  await rules.projects.releases.create({
    name: `projects/${PROJECT}`,
    requestBody: { name: releaseName, rulesetName }
  });
  console.log('[rules] release created');
}
console.log('[rules] DEPLOYED to', PROJECT);
process.exit(0);
