import fs from 'node:fs';
import { google } from 'googleapis';

const CREDENTIALS_PATH = process.env.YOUTUBE_OAUTH_CREDENTIALS || process.env.GOOGLE_OAUTH_CREDENTIALS || './credentials.json';
const TOKEN_PATH = process.env.YOUTUBE_OAUTH_TOKEN || './youtube-token.json';
const AUTH_CODE = process.env.YOUTUBE_AUTH_CODE || '';
const SCOPES = ['https://www.googleapis.com/auth/youtube.readonly'];

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function authClient() {
  const creds = readJson(CREDENTIALS_PATH);
  const installed = creds.installed || creds.web;
  if (!installed) throw new Error('OAuth credentials must contain installed or web client settings.');
  return new google.auth.OAuth2(installed.client_id, installed.client_secret, installed.redirect_uris?.[0]);
}

async function main() {
  const auth = authClient();
  if (!AUTH_CODE) {
    const url = auth.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: SCOPES });
    console.log('Open this URL with the YouTube channel owner account, then rerun with YOUTUBE_AUTH_CODE.');
    console.log(url);
    return;
  }
  const { tokens } = await auth.getToken(AUTH_CODE);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2) + '\n', 'utf8');
  console.log('Wrote token: ' + TOKEN_PATH);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
