// Firebase runtime adapter for the current index.html + app.js screen.
// The TypeScript/Vite side still uses npm Firebase SDK through src/lib/firebase.ts.
(function () {
  const CONFIG_KEY = "pm:firebase:config";
  const runtimeDiagnostics = {
    firebaseAppCountAtInit: 0,
    firebaseInitializeAppCalledCount: 0,
    authInstanceCreatedCount: 0,
    firestoreInstanceCreatedCount: 0,
    lastInitAt: "",
    appName: "",
    compatFirestoreLoaded: false,
    compatAuthLoaded: false
  };

  function isPlaceholder(value) {
    return String(value || "").startsWith("%VITE_");
  }

  function isValidConfig(config) {
    return !!(config?.apiKey && config?.authDomain && config?.projectId && config?.appId)
      && !isPlaceholder(config.apiKey)
      && !isPlaceholder(config.authDomain)
      && !isPlaceholder(config.projectId)
      && !isPlaceholder(config.appId);
  }

  function readLocalStorageConfig() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG_KEY) || "null");
    } catch {
      return null;
    }
  }

  function readConfig() {
    if (isValidConfig(window.PM_FIREBASE_CONFIG)) return window.PM_FIREBASE_CONFIG;
    const saved = readLocalStorageConfig();
    if (isValidConfig(saved)) return saved;
    return null;
  }

  function saveConfig(config) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config || {}));
  }

  function hasConfig() {
    return isValidConfig(readConfig());
  }

  function debugConfig() {
    const host = location.hostname;
    const isDev = host === "localhost" || host === "127.0.0.1" || host === "";
    if (!isDev || window.__pmFirebaseDebugLogged) return;
    window.__pmFirebaseDebugLogged = true;
    const rawWindow = window.PM_FIREBASE_CONFIG || null;
    const config = readConfig();
    console.info("[PM Firebase debug]", {
      source: window.PM_FIREBASE_CONFIG_SOURCE || (isValidConfig(rawWindow) ? "window" : "none"),
      hasConfig: isValidConfig(config),
      apiKey: config?.apiKey ? `${String(config.apiKey).slice(0, 4)}...` : false,
      authDomain: !!config?.authDomain,
      projectId: !!config?.projectId,
      appId: !!config?.appId,
      windowConfigValid: isValidConfig(rawWindow),
      localStorageConfigValid: isValidConfig(readLocalStorageConfig())
    });
  }

  function compatFirestoreSdk() {
    return {
      doc(db, ...segments) {
        if (segments.length < 2 || segments.length % 2 !== 0) {
          throw new Error("Firestore document path must be collection/doc pairs.");
        }
        let ref = db.collection(segments[0]).doc(segments[1]);
        for (let index = 2; index < segments.length; index += 2) {
          ref = ref.collection(segments[index]).doc(segments[index + 1]);
        }
        return ref;
      },
      async getDoc(ref) {
        const snap = await ref.get();
        return {
          exists: () => snap.exists,
          data: () => snap.data()
        };
      },
      setDoc(ref, data, options) {
        return ref.set(data, options || {});
      },
      updateDoc(ref, data) {
        return ref.update(data);
      },
      serverTimestamp() {
        return firebase.firestore.FieldValue.serverTimestamp();
      },
      writeBatch(db) {
        const batch = db.batch();
        return {
          set(ref, data, options) {
            batch.set(ref, data, options || {});
          },
          update(ref, data) {
            batch.update(ref, data);
          },
          commit() {
            return batch.commit();
          }
        };
      }
    };
  }

  function compatAuthSdk() {
    return {
      createUserWithEmailAndPassword(auth, email, password) {
        return auth.createUserWithEmailAndPassword(email, password);
      },
      signInWithEmailAndPassword(auth, email, password) {
        return auth.signInWithEmailAndPassword(email, password);
      },
      sendEmailVerification(user) {
        return user.sendEmailVerification();
      },
      sendPasswordResetEmail(auth, email) {
        return auth.sendPasswordResetEmail(email);
      },
      signOut(auth) {
        return auth.signOut();
      },
      signInWithPopup(auth, provider) {
        return auth.signInWithPopup(provider);
      },
      onAuthStateChanged(auth, callback) {
        return auth.onAuthStateChanged(callback);
      },
      GoogleAuthProvider: firebase.auth.GoogleAuthProvider
    };
  }

  async function init() {
    debugConfig();
    if (!hasConfig()) return null;
    if (!window.firebase) throw new Error("Firebase SDK가 로드되지 않았습니다.");
    if (window.__pmFirebaseRuntime) return window.__pmFirebaseRuntime;

    const config = readConfig();
    runtimeDiagnostics.firebaseAppCountAtInit = firebase.apps.length;
    const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(config);
    if (!runtimeDiagnostics.firebaseAppCountAtInit) runtimeDiagnostics.firebaseInitializeAppCalledCount += 1;
    const authInstance = firebase.auth(app);
    runtimeDiagnostics.authInstanceCreatedCount += 1;
    try {
      await authInstance.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    } catch (error) {
      console.warn("[PM Firebase] in-memory persistence setup failed", error?.code || "", error?.message || String(error));
    }
    const firestoreInstance = firebase.firestore(app);
    runtimeDiagnostics.firestoreInstanceCreatedCount += 1;
    runtimeDiagnostics.lastInitAt = new Date().toISOString();
    runtimeDiagnostics.appName = app?.name || "";
    runtimeDiagnostics.compatFirestoreLoaded = Boolean(firebase.firestore);
    runtimeDiagnostics.compatAuthLoaded = Boolean(firebase.auth);
    window.__pmFirebaseRuntime = {
      app,
      auth: authInstance,
      db: firestoreInstance,
      sdk: {
        auth: compatAuthSdk(),
        firestore: compatFirestoreSdk()
      }
    };
    return window.__pmFirebaseRuntime;
  }

  debugConfig();
  window.PMFirebaseRuntimeDiagnostics = {
    snapshot() {
      return {
        ...runtimeDiagnostics,
        firebaseAppCount: window.firebase?.apps?.length || 0,
        runtimeCached: Boolean(window.__pmFirebaseRuntime)
      };
    }
  };
  window.PMFirebaseRuntime = { readConfig, saveConfig, hasConfig, init, debugConfig };
})();
