(function () {
  "use strict";

  var ADMIN_EMAIL = "director@wise-jmco.com";
  var TXT = {
  "preview": "プレビューで見る",
  "videoTitle": "爆速リスキリング動画",
  "sampleNote": "Firebase設定後に会員限定データへ切り替わります。",
  "uncategorized": "未分類",
  "openVideo": "動画を開く",
  "noPublished": "公開中の動画はまだありません。",
  "noMatch": "条件に合う動画がありません。",
  "mail": "メール",
  "name": "氏名",
  "role": "権限",
  "status": "状態",
  "noUsers": "会員データはまだありません。",
  "title": "タイトル",
  "category": "カテゴリ",
  "type": "種別",
  "publishDate": "公開日",
  "public": "公開",
  "private": "非公開",
  "noVideos": "動画データはまだありません。",
  "firebaseSave": "Firebase設定後に会員保存を利用できます。",
  "enterEmail": "メールアドレスを入力してください。",
  "savedMember": "会員を保存しました。",
  "adminOnly": "管理画面はadmin権限が必要です。",
  "previewToast": "Firebase未設定のためプレビュー表示です。",
  "previewMsg": "Firebase設定前のため、公開プレビューとして表示できます。",
  "noMember": "このメールアドレスは会員登録されていません。",
  "basic": "基礎講義",
  "sampleIntro": "爆速リスキリング動画 はじめに",
  "memberSample": "会員向け動画の公開準備用サンプルです。"
};
  var state = { page: "home", firebaseReady: false, preview: false, auth: null, db: null, user: null, profile: null, contents: [], users: [] };
  function byId(id) { return document.getElementById(id); }
  function firebaseConfig() { var config = window.RESKILLING_FIREBASE_CONFIG || {}; return (!config.apiKey || !config.projectId) ? null : config; }
  function hasFirebaseSdk() { return typeof window.firebase !== "undefined" && window.firebase.auth && window.firebase.firestore; }
  function showLogin(message) { var login = byId("loginView"); var app = byId("appView"); var msg = byId("loginMsg"); if (login) login.classList.remove("hidden"); if (app) app.classList.add("hidden"); if (msg && message) msg.textContent = message; }
  function showApp() { var login = byId("loginView"); var app = byId("appView"); if (login) login.classList.add("hidden"); if (app) app.classList.remove("hidden"); }
  function escapeHtml(value) { return String(value == null ? "" : value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
  function normalizeEmail(email) { return String(email || "").trim().toLowerCase(); }
  function displayDate(value) { if (!value) return "-"; if (typeof value === "string") return value.slice(0, 10); if (value.toDate) return value.toDate().toISOString().slice(0, 10); return String(value).slice(0, 10); }
  function isAdmin() { return state.profile && state.profile.role === "admin"; }
  function setChrome() { if (byId("userName")) byId("userName").textContent = (state.profile && state.profile.name) || (state.user && state.user.displayName) || (state.user && state.user.email) || "Preview"; if (byId("roleBadge")) byId("roleBadge").textContent = state.preview ? "preview" : ((state.profile && state.profile.role) || "member"); if (byId("adminLink")) byId("adminLink").classList.toggle("hidden", !isAdmin()); if (byId("adminCta")) byId("adminCta").classList.toggle("hidden", !isAdmin()); if (byId("loginBtn") && !state.firebaseReady) byId("loginBtn").textContent = TXT.preview; }
  function toast(message) { var mount = byId("toastMount"); if (!mount) return; var el = document.createElement("div"); el.className = "toast"; el.textContent = message; mount.appendChild(el); window.setTimeout(function () { el.remove(); }, 3200); }
  async function loadSampleContents() { try { var response = await fetch("data/contents.json", { cache: "no-store" }); if (!response.ok) throw new Error("sample load failed"); return await response.json(); } catch (error) { return [{ id: "fallback", title: TXT.videoTitle, category: TXT.basic, type: "video", url: "https://www.youtube.com/@phama_cam", note: TXT.sampleNote, published: true, publishedAt: "2026-06-30", order: 1 }]; } }
  async function enterPreview() { state.preview = true; state.user = { email: "preview@wise-jmco.com", displayName: "Preview" }; state.profile = { email: state.user.email, name: "Preview", role: "member", status: "active" }; state.contents = await loadSampleContents(); setChrome(); showApp(); renderPage(); }
  async function loadProfile(user) { var email = normalizeEmail(user.email); var ref = state.db.collection("users").doc(email); var snap = await ref.get(); if (!snap.exists) { if (email !== ADMIN_EMAIL) return null; var bootstrap = { email: email, name: user.displayName || "Director", role: "admin", status: "active", createdAt: window.firebase.firestore.FieldValue.serverTimestamp(), updatedAt: window.firebase.firestore.FieldValue.serverTimestamp() }; await ref.set(bootstrap); return bootstrap; } return snap.data(); }
  async function loadContents() { if (!state.firebaseReady) { state.contents = await loadSampleContents(); return; } var snap = await state.db.collection("contents").where("published", "==", true).orderBy("order", "asc").get(); state.contents = snap.docs.map(function (doc) { return Object.assign({ id: doc.id }, doc.data()); }); }
  async function loadAdminData() { if (!isAdmin() || !state.firebaseReady) { state.users = state.preview ? [state.profile] : []; return; } var results = await Promise.all([state.db.collection("users").orderBy("email", "asc").get(), state.db.collection("contents").orderBy("order", "asc").get()]); state.users = results[0].docs.map(function (doc) { return Object.assign({ id: doc.id }, doc.data()); }); state.contents = results[1].docs.map(function (doc) { return Object.assign({ id: doc.id }, doc.data()); }); }
  function contentCard(item) { var url = item.url || "#"; return '<article class="card"><div class="meta"><span class="type">' + escapeHtml(item.type || "video") + '</span><span class="badge">' + escapeHtml(item.category || TXT.uncategorized) + '</span></div><h3>' + escapeHtml(item.title) + '</h3><p class="muted">' + escapeHtml(item.note || "") + '</p><div class="meta"><span>' + escapeHtml(displayDate(item.publishedAt || item.uploadedAt)) + '</span></div><a class="btn secondary small" href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' + TXT.openVideo + '</a></article>'; }
  function renderHome() { var published = state.contents.filter(function (item) { return item.published !== false; }); var categories = new Set(published.map(function (item) { return item.category; }).filter(Boolean)); if (byId("statPublished")) byId("statPublished").textContent = String(published.length); if (byId("statCategories")) byId("statCategories").textContent = String(categories.size); if (byId("statLatest")) byId("statLatest").textContent = displayDate(published[0] && (published[0].publishedAt || published[0].uploadedAt)); if (byId("latestList")) byId("latestList").innerHTML = published.slice(0, 6).map(contentCard).join("") || '<div class="empty">' + TXT.noPublished + '</div>'; }
  function renderVideos() { var list = byId("videoList"); if (!list) return; var searchInput = byId("searchInput"); var categoryFilter = byId("categoryFilter"); var categories = Array.from(new Set(state.contents.map(function (item) { return item.category; }).filter(Boolean))).sort(); if (categoryFilter && categoryFilter.options.length <= 1) categoryFilter.insertAdjacentHTML("beforeend", categories.map(function (category) { return '<option value="' + escapeHtml(category) + '">' + escapeHtml(category) + '</option>'; }).join("")); var keyword = normalizeEmail(searchInput && searchInput.value); var category = (categoryFilter && categoryFilter.value) || ""; var filtered = state.contents.filter(function (item) { return (!keyword || normalizeEmail(item.title).includes(keyword)) && (!category || item.category === category); }); list.innerHTML = filtered.map(contentCard).join("") || '<div class="empty">' + TXT.noMatch + '</div>'; }
  function renderMemberTable() { var mount = byId("memberTable"); if (!mount) return; var rows = state.users.map(function (user) { return '<tr><td>' + escapeHtml(user.email) + '</td><td>' + escapeHtml(user.name || "") + '</td><td>' + escapeHtml(user.role) + '</td><td>' + escapeHtml(user.status) + '</td></tr>'; }).join(""); mount.innerHTML = '<table><thead><tr><th>' + TXT.mail + '</th><th>' + TXT.name + '</th><th>' + TXT.role + '</th><th>' + TXT.status + '</th></tr></thead><tbody>' + (rows || '<tr><td colspan="4">' + TXT.noUsers + '</td></tr>') + '</tbody></table>'; }
  function renderContentTable() { var mount = byId("contentTable"); if (!mount) return; var rows = state.contents.map(function (item) { return '<tr><td>' + escapeHtml(item.title) + '</td><td>' + escapeHtml(item.category) + '</td><td>' + escapeHtml(item.type) + '</td><td>' + escapeHtml(displayDate(item.publishedAt || item.uploadedAt)) + '</td><td>' + (item.published === false ? TXT.private : TXT.public) + '</td></tr>'; }).join(""); mount.innerHTML = '<table><thead><tr><th>' + TXT.title + '</th><th>' + TXT.category + '</th><th>' + TXT.type + '</th><th>' + TXT.publishDate + '</th><th>' + TXT.status + '</th></tr></thead><tbody>' + (rows || '<tr><td colspan="5">' + TXT.noVideos + '</td></tr>') + '</tbody></table>'; }
  async function saveMember() { if (!isAdmin() || !state.firebaseReady) { toast(TXT.firebaseSave); return; } var email = normalizeEmail(byId("memberEmail") && byId("memberEmail").value); if (!email) { toast(TXT.enterEmail); return; } var payload = { email: email, name: (byId("memberName") && byId("memberName").value.trim()) || "", role: (byId("memberRole") && byId("memberRole").value) || "member", status: (byId("memberStatus") && byId("memberStatus").value) || "active", updatedAt: window.firebase.firestore.FieldValue.serverTimestamp() }; await state.db.collection("users").doc(email).set(payload, { merge: true }); await loadAdminData(); renderMemberTable(); toast(TXT.savedMember); }
  async function renderAdmin() { if (!isAdmin()) { var content = document.querySelector(".content"); if (content) content.insertAdjacentHTML("afterbegin", '<section class="panel"><p class="error">' + TXT.adminOnly + '</p></section>'); return; } await loadAdminData(); renderMemberTable(); renderContentTable(); }
  function renderPage() { if (state.page === "home") renderHome(); if (state.page === "videos") renderVideos(); if (state.page === "admin") renderAdmin(); }
  function bindCommonEvents() { if (byId("loginBtn")) byId("loginBtn").addEventListener("click", async function () { if (!state.firebaseReady) { await enterPreview(); toast(TXT.previewToast); return; } await state.auth.signInWithPopup(new window.firebase.auth.GoogleAuthProvider()); }); if (byId("logoutBtn")) byId("logoutBtn").addEventListener("click", async function () { if (state.firebaseReady) await state.auth.signOut(); state.preview = false; showLogin(); }); if (byId("searchInput")) byId("searchInput").addEventListener("input", renderVideos); if (byId("categoryFilter")) byId("categoryFilter").addEventListener("change", renderVideos); if (byId("saveMemberBtn")) byId("saveMemberBtn").addEventListener("click", function () { saveMember().catch(function (error) { toast(error.message); }); }); }
  async function initFirebase() { var config = firebaseConfig(); if (!config || !hasFirebaseSdk()) return false; window.firebase.initializeApp(config); state.auth = window.firebase.auth(); state.db = window.firebase.firestore(); return true; }
  async function init(page) { state.page = page; bindCommonEvents(); state.firebaseReady = await initFirebase(); if (!state.firebaseReady) { if (byId("loginMsg")) byId("loginMsg").textContent = TXT.previewMsg; if (byId("loginBtn")) byId("loginBtn").textContent = TXT.preview; await enterPreview(); return; } state.auth.onAuthStateChanged(async function (user) { if (!user) { showLogin(); return; } try { var profile = await loadProfile(user); if (!profile || profile.status !== "active") { await state.auth.signOut(); showLogin(TXT.noMember); return; } state.user = user; state.profile = profile; await loadContents(); setChrome(); showApp(); renderPage(); } catch (error) { showLogin(error.message); } }); }
  window.ReskillApp = { init: init };
})();
