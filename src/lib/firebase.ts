import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where, 
  serverTimestamp, 
  writeBatch 
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Use the database ID from config if available, otherwise default
const databaseId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)"
  ? firebaseConfig.firestoreDatabaseId 
  : undefined;

export const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);

// Collection references
export const COLLECTIONS = {
  CALLS: "andon_calls",
  LINES: "master_lines",
  MACHINES: "master_machines",
  WORKSTATIONS: "master_workstations",
  USERS: "users",
  ACTIVITY_LOGS: "activity_logs",
  SYSTEM_CONFIG: "system_config",
};
