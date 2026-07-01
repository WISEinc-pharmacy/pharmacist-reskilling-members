# Member Announcement Draft

薬剤師リスキリングサロン メンバーの皆さま

いつもご参加ありがとうございます。

このたび、メンバー専用サイトを公開しました。
これまで配信してきた「爆速リスキリング動画」を、カテゴリや掲載日で探しやすく一覧化しています。

▼メンバー専用サイト
https://wiseinc-pharmacy.github.io/pharmacist-reskilling-members/

ログインは、ご登録いただいているメールアドレスのGoogleアカウントでお願いします。
新たな招待メールは送られませんので、上記URLからそのままアクセスしてください。

今後の動画も、こちらのサイトから順次確認できるようにしていきます。
ぜひ復習や学び直しにご活用ください。

---

公開前チェック:

- Firebase Auth / Firestore が有効化済み
- `assets/firebase-config.js` が本番Firebase設定済み
- `firestore.rules` がデプロイ済み
- 会員CSVのメールアドレスが `users/{email}` に登録済み
- YouTube同期結果がFirestore `contents` に投入済み
- 非会員メールでログイン不可を確認済み
- 会員メールで動画一覧とYouTube遷移を確認済み