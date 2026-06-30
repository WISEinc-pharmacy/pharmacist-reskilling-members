# Pharmacist Reskilling Members

Member portal for the reskilling salon. The static build is safe to publish on GitHub Pages and runs in preview mode until Firebase config is added.

## Files

- index.html: member home
- videos.html: content list
- admin.html: member/content admin shell
- assets/app.js: Firebase auth + Firestore integration with preview fallback
- assets/firebase-config.js: public Firebase web config placeholder
- data/contents.json: public preview data only
- firestore.rules: member/admin Firestore access rules
- scripts/sync_sheet_to_firestore.mjs: sync video sheet rows to Firestore contents

## Firebase switch-over

1. Create or select the Firebase project.
2. Enable Google authentication and Firestore.
3. Fill assets/firebase-config.js with the Firebase web config.
4. Deploy firestore.rules.
5. Sign in first with director@wise-jmco.com to bootstrap the admin user.
6. Run npm run sync:sheet after credentials/token/service account files are prepared locally.

Do not commit .env, credentials.json, token.json, or serviceAccountKey.json.
