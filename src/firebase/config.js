const readEnv = (primary, secondary, fallback) =>
  process.env[primary] ?? process.env[secondary] ?? fallback;

export const firebaseConfig = {
  apiKey: readEnv(
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "VITE_FIREBASE_API_KEY",
    "AIzaSyBCnaC7Q8EcASXbd3LYb5ycE7twOGVJeOI",
  ),
  authDomain: readEnv(
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "VITE_FIREBASE_AUTH_DOMAIN",
    "krishna-e9c59.firebaseapp.com",
  ),
  projectId: readEnv(
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "VITE_FIREBASE_PROJECT_ID",
    "krishna-e9c59",
  ),
  storageBucket: readEnv(
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "VITE_FIREBASE_STORAGE_BUCKET",
    "krishna-e9c59.firebasestorage.app",
  ),
  messagingSenderId: readEnv(
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "VITE_FIREBASE_MESSAGING_SENDER_ID",
    "1048468387337",
  ),
  appId: readEnv(
    "NEXT_PUBLIC_FIREBASE_APP_ID",
    "VITE_FIREBASE_APP_ID",
    "1:1048468387337:web:a9956d1112f7a177b02ad8",
  ),
};

export default firebaseConfig;
