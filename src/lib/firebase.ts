import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import firebaseConfig from "@/firebase/config";

const clientApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const clientAuth = getAuth(clientApp);
export const clientDb = getFirestore(clientApp);
export const clientStorage = getStorage(clientApp);
