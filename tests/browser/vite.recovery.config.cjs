const { readFileSync } = require("node:fs");
const { dirname, resolve } = require("node:path");
const { defineConfig } = require("vite");
const base = require("../../vite.config.js");
const firebasePackageRoot = resolve(dirname(require.resolve("firebase/app")), "../..");
const authEmulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
const [firestoreEmulatorAddress, firestoreEmulatorPort] = (
  process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080"
).split(":");

const localFirebaseCompat = {
  "/__recovery__/firebase-app-compat.js": "firebase/firebase-app-compat.js",
  "/__recovery__/firebase-auth-compat.js": "firebase/firebase-auth-compat.js",
  "/__recovery__/firebase-firestore-compat.js": "firebase/firebase-firestore-compat.js",
};

function recoveryBrowserPlugin() {
  return {
    name: "pm-recovery-browser-emulator-only",
    transformIndexHtml(html) {
      let result = html
        .replace(/https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.5\/firebase-app-compat\.js/g, "/__recovery__/firebase-app-compat.js")
        .replace(/https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.5\/firebase-auth-compat\.js/g, "/__recovery__/firebase-auth-compat.js")
        .replace(/https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.5\/firebase-firestore-compat\.js/g, "/__recovery__/firebase-firestore-compat.js");
      result = result.replace(
        '<script src="shared/types.js?v=1"></script>',
        `<script>
          (() => {
            const initializeApp = firebase.initializeApp.bind(firebase);
            firebase.initializeApp = (...args) => {
              const app = initializeApp(...args);
              firebase.auth(app).useEmulator("http://${authEmulatorHost}");
              firebase.firestore(app).useEmulator("${firestoreEmulatorAddress}", ${Number(firestoreEmulatorPort)});
              return app;
            };
          })();
        </script>
        <script src="shared/types.js?v=1"></script>`
      );
      return result;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = new URL(req.url || "/", "http://127.0.0.1").pathname;
        if (pathname === "/pm-env.js") {
          res.statusCode = 200;
          res.setHeader("content-type", "text/javascript; charset=utf-8");
          res.setHeader("cache-control", "no-store");
          res.end(`window.PM_FIREBASE_CONFIG = { apiKey: "recovery-demo-only", authDomain: "demo-myweb-recovery-e2e.firebaseapp.com", projectId: "demo-myweb-recovery-e2e", appId: "1:000000000000:web:recoverydemo", storageBucket: "demo-myweb-recovery-e2e.appspot.com", messagingSenderId: "000000000000" }; window.PM_APP_TARGET = "main";`);
          return;
        }
        const relative = localFirebaseCompat[pathname];
        if (!relative) return next();
        const filePath = resolve(firebasePackageRoot, relative.replace(/^firebase\//, ""));
        res.statusCode = 200;
        res.setHeader("content-type", "text/javascript; charset=utf-8");
        res.setHeader("cache-control", "no-store");
        res.end(readFileSync(filePath));
      });
    },
  };
}

module.exports = defineConfig({
  ...base,
  envDir: __dirname,
  plugins: [...(base.plugins || []), recoveryBrowserPlugin()],
  server: { host: "127.0.0.1", port: 5179, strictPort: true },
});
