import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { 
  getFirestore, 
  Firestore
} from "firebase/firestore";

// Read Firebase configurations strictly from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || "",
};

export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    firebaseConfig.apiKey && 
    firebaseConfig.apiKey.trim() !== "" && 
    firebaseConfig.apiKey !== "your_api_key_here" &&
    firebaseConfig.projectId &&
    firebaseConfig.projectId.trim() !== "" &&
    firebaseConfig.projectId !== "your_project_id"
  );
};

// Lazy & safe initialization to prevent startup crashes when keys are absent
let firebaseAppInstance: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;
let authInstance: Auth | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!firebaseAppInstance) {
    if (getApps().length > 0) {
      firebaseAppInstance = getApp();
    } else {
      firebaseAppInstance = initializeApp(
        isFirebaseConfigured()
          ? firebaseConfig
          : {
              apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDemoFallbackKeyOnly",
              authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "demo.firebaseapp.com",
              projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-app",
              storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "demo-app.appspot.com",
              messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
              appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:000000000000:web:0000000000000000000000"
            }
      );
    }
  }
  return firebaseAppInstance;
}

export function getDb(): Firestore {
  if (!firestoreInstance) {
    const app = getFirebaseApp();
    const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)"
      ? firebaseConfig.firestoreDatabaseId 
      : undefined;
    firestoreInstance = dbId ? getFirestore(app, dbId) : getFirestore(app);
  }
  return firestoreInstance;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());
  }
  return authInstance;
}

export const db = getDb();
export const auth = getFirebaseAuth();

// Collection references
export const COLLECTIONS = {
  CALLS: "andon_calls",
  LINES: "master_lines",
  MACHINES: "master_machines",
  WORKSTATIONS: "master_workstations",
  USERS: "users",
  OPERATORS: "master_operators",
  LOGS: "activity_logs",
  CONFIG: "system_config",
} as const;
