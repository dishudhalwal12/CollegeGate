import "server-only";

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import firebaseConfig from "@/firebase/config";
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type AppOptions,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const resolveProjectId = () =>
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  process.env.VITE_FIREBASE_PROJECT_ID ||
  firebaseConfig.projectId;

const resolveStorageBucket = () =>
  process.env.FIREBASE_STORAGE_BUCKET ||
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  process.env.VITE_FIREBASE_STORAGE_BUCKET ||
  firebaseConfig.storageBucket;

function findApplicationDefaultCredentialsFile() {
  const homeDirectory = os.homedir();
  const candidatePaths = [
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    path.join(homeDirectory, ".config", "gcloud", "application_default_credentials.json"),
  ].filter(Boolean) as string[];

  const firebaseConfigDirectory = path.join(homeDirectory, ".config", "firebase");

  if (fs.existsSync(firebaseConfigDirectory)) {
    const firebaseCandidates = fs
      .readdirSync(firebaseConfigDirectory)
      .filter((fileName) => fileName.endsWith("_application_default_credentials.json"))
      .map((fileName) => path.join(firebaseConfigDirectory, fileName));

    candidatePaths.push(...firebaseCandidates);
  }

  return candidatePaths.find((candidatePath) => fs.existsSync(candidatePath)) ?? null;
}

function resolveAdminOptions(): AppOptions | null {
  const projectId = resolveProjectId();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    return {
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
      storageBucket: resolveStorageBucket(),
    };
  }

  if (projectId && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return {
      credential: applicationDefault(),
      projectId,
      storageBucket: resolveStorageBucket(),
    };
  }

  const fallbackCredentialsFile = findApplicationDefaultCredentialsFile();

  if (projectId && fallbackCredentialsFile) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS ??= fallbackCredentialsFile;

    return {
      credential: applicationDefault(),
      projectId,
      storageBucket: resolveStorageBucket(),
    };
  }

  return null;
}

const adminOptions = resolveAdminOptions();
const adminApp = adminOptions
  ? getApps().length
    ? getApps()[0]
    : initializeApp(adminOptions)
  : null;

export const hasAdminCredentials = Boolean(adminApp);
export const adminAuth = adminApp ? getAuth(adminApp) : null;
export const adminDb = adminApp ? getFirestore(adminApp) : null;

export function requireAdminSdk(feature: string) {
  if (!adminAuth || !adminDb) {
    throw new Error(
      `Firebase Admin SDK is not configured for ${feature}. Add FIREBASE_PROJECT_ID plus either FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY, GOOGLE_APPLICATION_CREDENTIALS, or a local application default credentials file.`,
    );
  }

  return {
    adminAuth,
    adminDb,
  };
}
