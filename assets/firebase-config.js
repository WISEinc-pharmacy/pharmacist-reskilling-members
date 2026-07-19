// 正URLはfirebaseapp.com（OAuthクライアントの登録リダイレクト先がfirebaseapp.comのみ＝web.appはログイン不可。github.ioは別オリジン認証がスマホで遮断される）。旧URLで開いた場合は自動転送する
(function () {
  var CANON = "pharmacist-reskilling-members.firebaseapp.com";
  var h = location.hostname;
  if (h === "pharmacist-reskilling-members.web.app") {
    location.replace(location.href.replace(h, CANON));
  } else if (h === "wiseinc-pharmacy.github.io") {
    var path = location.pathname.replace(/^\/pharmacist-reskilling-members\/?/, "/");
    location.replace("https://" + CANON + path + location.search + location.hash);
  }
})();

window.RESKILLING_FIREBASE_CONFIG = {
  apiKey: "AIzaSyB10EkMLI2DX3hFs-9aF55wASSIrLjC0M8",
  authDomain: "pharmacist-reskilling-members.firebaseapp.com",
  projectId: "pharmacist-reskilling-members",
  storageBucket: "pharmacist-reskilling-members.firebasestorage.app",
  messagingSenderId: "896005823878",
  appId: "1:896005823878:web:0e54c9ac03c40b803e2007"
};
