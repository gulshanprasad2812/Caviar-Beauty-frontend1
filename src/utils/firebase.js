/**
 * Firebase Phone Auth loader.
 *
 * Firebase's web SDK is large, so it is imported dynamically and only on the
 * account-verification page; the storefront bundle is unaffected.
 *
 * The config comes from the API at runtime (`/api/auth/verification/config` ->
 * `sms.firebase`), so changing the Firebase project does not require rebuilding
 * the site. Build-time VITE_FIREBASE_* values are used as a fallback for local
 * development or standalone deployments; a runtime value always wins.
 */
const buildTimeConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** Runtime values (from the API) take precedence over build-time ones. */
const resolveConfig = (runtime) => {
  const merged = { ...buildTimeConfig };
  if (runtime && typeof runtime === 'object') {
    for (const [key, value] of Object.entries(runtime)) {
      if (value) merged[key] = value;
    }
  }
  return merged;
};

const isComplete = (config) => Boolean(config.apiKey && config.projectId && config.appId);

export const isFirebaseConfigured = (runtime) => isComplete(resolveConfig(runtime));

let loader = null;

/**
 * Resolves to `{ auth, api }` once, or `null` when Firebase is not configured.
 * `api` is the `firebase/auth` module (signInWithPhoneNumber, RecaptchaVerifier).
 */
export function loadFirebaseAuth(runtime) {
  const config = resolveConfig(runtime);
  if (!isComplete(config)) return Promise.resolve(null);
  if (!loader) {
    loader = Promise.all([import('firebase/app'), import('firebase/auth')])
      .then(([appModule, authModule]) => {
        const app = appModule.getApps().length ? appModule.getApps()[0] : appModule.initializeApp(config);
        const auth = authModule.getAuth(app);
        try {
          auth.useDeviceLanguage();
        } catch {
          /* language hint is best-effort */
        }
        return { auth, api: authModule };
      })
      .catch((err) => {
        loader = null;
        throw err;
      });
  }
  return loader;
}
