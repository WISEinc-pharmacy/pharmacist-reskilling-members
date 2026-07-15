/**
 * サロン会員サイト「お問い合わせ」フォーム受信用 Google Apps Script Webアプリ
 *
 * 会員サイト（index.html + assets/app.js の submitInquiry）から
 * Content-Type: text/plain でPOSTされたJSONを受け取り、
 * academic@wise-jmco.com 宛にメールを送信する。
 *
 * 転送は既存の博士Bot（academic@のINBOX新着を無条件でSlack転送）が担当するため、
 * このスクリプト側ではSlack投稿・Bot呼び出しは一切行わない。
 * このファイルはコード管理用にリポジトリへ置いているだけで、
 * 実際の動作には下記手順でGASプロジェクトへ手動デプロイする必要がある。
 *
 * デプロイ手順:
 * 1. https://script.google.com/ で新規プロジェクトを作成する
 *    （info@wise-jmco.com で作成する。既存GAS編集基盤=info@トークンで
 *      以後のコード修正ができるため。差出人はinfo@になるが
 *      academic@のINBOXに届き博士Botが拾うことは確認済み）
 * 2. このファイルの内容をコード.gs にそのまま貼り付ける
 * 3. 「デプロイ」>「新しいデプロイ」> 種類:「ウェブアプリ」を選択
 *    - 説明: 任意
 *    - 実行ユーザー: 自分
 *    - アクセスできるユーザー: 全員
 * 4. デプロイ後に発行される「ウェブアプリのURL」を、
 *    assets/app.js の INQUIRY_GAS_ENDPOINT 定数の値に貼り付ける
 * 5. 動作確認: ブラウザで直接ウェブアプリURLへアクセスし、
 *    「inquiry webapp ok」と表示されればdoGetは疎通している
 */

// お問い合わせメールの送信先（固定）
var INQUIRY_TO_EMAIL = 'academic@wise-jmco.com';

// 本文の最大文字数（これを超えるとバリデーションエラー）
var INQUIRY_MESSAGE_MAX_LENGTH = 2000;

// 簡易メール形式チェック用の正規表現（member-siteのsubmitCardChangeRequestと同等の粒度）
var INQUIRY_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * ヘルスチェック用。ブラウザから直接GETした際に疎通確認できるようにするだけ。
 */
function doGet() {
  return ContentService.createTextOutput('inquiry webapp ok')
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * 会員サイトからのお問い合わせ送信を受け付けるエンドポイント。
 * 1回のリクエストにつきメール送信は1通のみ（ループ送信は行わない）。
 */
function doPost(e) {
  try {
    var payload = parseInquiryRequestBody_(e);
    var validation = validateInquiryPayload_(payload);
    if (!validation.ok) {
      return buildInquiryJsonResponse_({ ok: false, error: validation.error });
    }

    sendInquiryMail_(validation.data);
    return buildInquiryJsonResponse_({ ok: true });
  } catch (err) {
    var message = (err && err.message) ? err.message : String(err);
    return buildInquiryJsonResponse_({ ok: false, error: 'server_error: ' + message });
  }
}

/**
 * e.postData.contents をJSONとして読み取る。
 * フォーム側はCORSプリフライトを避けるためContent-Type: text/plainで送信してくる想定。
 */
function parseInquiryRequestBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('empty request body');
  }
  return JSON.parse(e.postData.contents);
}

/**
 * name / email / message の必須チェックと簡易フォーマットチェックを行う。
 * 戻り値: { ok: true, data: {...} } または { ok: false, error: string }
 */
function validateInquiryPayload_(payload) {
  payload = payload || {};
  var name = String(payload.name || '').trim();
  var email = String(payload.email || '').trim();
  var message = String(payload.message || '').trim();

  if (!name) return { ok: false, error: 'name is required' };
  if (!email) return { ok: false, error: 'email is required' };
  if (!message) return { ok: false, error: 'message is required' };
  if (!INQUIRY_EMAIL_PATTERN.test(email)) return { ok: false, error: 'email format is invalid' };
  if (message.length > INQUIRY_MESSAGE_MAX_LENGTH) {
    return { ok: false, error: 'message must be ' + INQUIRY_MESSAGE_MAX_LENGTH + ' characters or fewer' };
  }

  return { ok: true, data: { name: name, email: email, message: message } };
}

/**
 * academic@wise-jmco.com へお問い合わせメールを1通送信する。
 * ループでの複数送信は行わない（実行ユーザーの送信枠を浪費しないため）。
 */
function sendInquiryMail_(data) {
  var sentAt = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');
  var subject = '[サロン問い合わせ] ' + data.name;
  var body = [
    '会員サイトからお問い合わせを受け付けました。',
    '',
    '氏名: ' + data.name,
    '会員メール: ' + data.email,
    '送信日時: ' + sentAt,
    '',
    '本文:',
    data.message
  ].join('\n');

  MailApp.sendEmail({
    to: INQUIRY_TO_EMAIL,
    subject: subject,
    body: body
  });
}

/**
 * ContentService経由でJSONレスポンスを返す共通ヘルパー。
 */
function buildInquiryJsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
