// web.app側で開いた場合はfirebaseapp.com側へ寄せる（OAuthクライアントの登録リダイレクト先がfirebaseapp.comのみのため。同一ドメインでないとGoogleログインがredirect_uri_mismatchになる）
if (location.hostname === "pharmacist-reskilling-members.web.app") {
  location.replace(location.href.replace("pharmacist-reskilling-members.web.app", "pharmacist-reskilling-members.firebaseapp.com"));
}

window.RESKILLING_FIREBASE_CONFIG = {
  apiKey: "AIzaSyB10EkMLI2DX3hFs-9aF55wASSIrLjC0M8",
  authDomain: "pharmacist-reskilling-members.firebaseapp.com",
  projectId: "pharmacist-reskilling-members",
  storageBucket: "pharmacist-reskilling-members.firebasestorage.app",
  messagingSenderId: "896005823878",
  appId: "1:896005823878:web:0e54c9ac03c40b803e2007"
};
