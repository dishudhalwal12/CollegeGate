import firebaseConfig from "@/firebase/config";

export function resolveFirebaseProjectId() {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    firebaseConfig.projectId
  );
}

export function resolveFirebaseApiKey() {
  return (
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    process.env.VITE_FIREBASE_API_KEY ||
    firebaseConfig.apiKey
  );
}
