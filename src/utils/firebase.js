/**
 * Firebase Phone Auth loader.
 *
 * The Firebase SDK is large, so it is imported dynamically and only when the
 * deployment is configured for it. Mounting it here instead of importing at
 * module scope keeps the storefront bundle unchanged; the chunk is fetched only
 * on the account-verification page.
 *
 * Configure with VITE_FIREBASE_* on the frontend (and FIREBASE_API_KEY +
 * FIREBASE_PROJECT_ID on the API so it can check the resulting ID token).
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = () =>
  Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

let loader = null;

/**
 * Resolves to `{ auth, api }` once, or `null` when Firebase is not configured.
 * `api` is the `firebase/auth` module (signInWithPhoneNumber, RecaptchaVerifier).
 */
export function loadFirebaseAuth() {
  if (!isFirebaseConfigured()) return Promise.resolve(null);
  if (!loader) {
    loader = Promise.all([import('firebase/app'), import('firebase/auth')])
      .then(([appModule, authModule]) => {
        const app = appModule.getApps().length ? appModule.getApps()[0] : appModule.initializeApp(firebaseConfig);
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
