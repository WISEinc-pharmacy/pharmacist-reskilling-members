# Pharmacist Reskilling Members

Member portal for the reskilling salon. The static build is safe to publish on GitHub Pages and runs in preview mode until Firebase config is added.

## Files

- index.html: member home
- videos.html: content list
- admin.html: member/content admin shell
- assets/app.js: Firebase auth + Firestore integration with preview fallback
- assets/firebase-config.js: public Firebase web config placeholder
- data/contents.json: public video list generated from the source channel
- firestore.rules: member/admin Firestore access rules
- scripts/sync_sheet_to_firestore.mjs: legacy sheet-to-Firestore sync
- scripts/sync_youtube_to_json.mjs: preferred YouTube channel-to-JSON sync
- data/youtube-overrides.json: optional category/title/note overrides by videoId

## Firebase switch-over

1. Create or select the Firebase project.
2. Enable Google authentication and Firestore.
3. Fill assets/firebase-config.js with the Firebase web config.
4. Deploy firestore.rules.
5. Sign in first with director@wise-jmco.com to bootstrap the admin user.
6. Run npm run sync:sheet after credentials/token/service account files are prepared locally.

Do not commit .env, credentials.json, token.json, or serviceAccountKey.json.

## YouTube source-of-truth sync

The dedicated YouTube channel https://www.youtube.com/@reskilling_pharmacist is the source of truth for the member video list. Spreadsheet entry is not required for ordinary updates.

Required local files or GitHub Secrets:

- GOOGLE_OAUTH_CLIENT_JSON: OAuth client JSON for GitHub Actions
- YOUTUBE_OAUTH_TOKEN_JSON: OAuth token JSON with youtube.readonly scope for GitHub Actions
- YOUTUBE_CHANNEL_ID: optional, but recommended when the account owns multiple channels

One-time local OAuth setup:

```bash
npm run auth:youtube
# open the URL, then rerun with YOUTUBE_AUTH_CODE=<code>
```

Local run:

```bash
npm run sync:youtube
npm run verify
```

The GitHub Actions workflow runs daily at 17:00 UTC, which is 02:00 JST.

OAuth files must never be committed. Use GitHub Secrets for Actions and local ignored files for manual runs.


## Member access import

Member access is controlled by Firestore `users/{email}` documents. No invitation email is required. Members sign in with the Google account that matches their registered email address.

Keep roster CSV files outside this public repository. Import locally with:

```bash
RESKILLING_MEMBERS_CSV=C:/path/to/members.csv npm run import:members -- --dry-run
RESKILLING_MEMBERS_CSV=C:/path/to/members.csv npm run import:members
```

The importer writes `role: member` and `status: active` by default. It supports CSVs where the first row is internal field IDs and the second row contains labels such as `メールアドレス` and `システム表示名`.
## GitHub Actions note

The workflow template is stored at docs/github-actions/sync-youtube.yml.template because the current GitHub token cannot push files under .github/workflows without the workflow scope. After a token with workflow scope is available, copy it to .github/workflows/sync-youtube.yml and push.
