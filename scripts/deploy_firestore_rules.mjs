import { readFileSync } from 'node:fs';
import { GoogleAuth } from 'google-auth-library';

const PROJECT = 'pharmacist-reskilling-members';
const SA_PATH = 'C:/Users/WISE-Yamauchi/Downloads/pharmacist-reskilling-members-firebase-adminsdk-fbsvc-149d19fe96.json';

const auth = new GoogleAuth({ keyFile: SA_PATH, scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
const client = await auth.getClient();
const source = readFileSync(new URL('./firestore.rules', import.meta.url), 'utf8');

const ruleset = await client.request({
  url: `https://firebaserules.googleapis.com/v1/projects/${PROJECT}/rulesets`,
  method: 'POST',
  data: { source: { files: [{ name: 'firestore.rules', content: source }] } }
});
console.log('ruleset created:', ruleset.data.name);

const release = await client.request({
  url: `https://firebaserules.googleapis.com/v1/projects/${PROJECT}/releases/cloud.firestore`,
  method: 'PATCH',
  data: { release: { name: `projects/${PROJECT}/releases/cloud.firestore`, rulesetName: ruleset.data.name } }
});
console.log('release updated:', release.data.name, '->', release.data.rulesetName);
