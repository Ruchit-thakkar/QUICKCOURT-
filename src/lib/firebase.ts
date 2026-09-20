import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== "AIzaSyYourApiKeyHere" &&
  firebaseConfig.projectId
);

let app: FirebaseApp;

if (!getApps().length) {
  // If keys are not set yet, use a fallback config structure to prevent runtime crash during build/prerender
  app = initializeApp(
    isFirebaseConfigured
      ? firebaseConfig
      : {
          apiKey: "AIzaSyDummyKeyForBuildVerification12345",
          authDomain: "quickcourt-placeholder.firebaseapp.com",
          projectId: "quickcourt-placeholder",
          storageBucket: "quickcourt-placeholder.appspot.com",
          messagingSenderId: "123456789012",
          appId: "1:123456789012:web:placeholder",
        }
  );
} else {
  app = getApp();
}

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export { app };
