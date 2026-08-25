import { UserProfile } from "../types";
import { sanitizeUserProfile, safeLocalStorageSet, safeLocalStorageGet } from "./sanitizer";

export const DEFAULT_USERS: UserProfile[] = [
  {
    id: "USR-OP-01",
    name: "Operator Demo",
    badgeId: "OP-1001",
    role: "operator",
    department: "Machining",
    pin: "1234",
    lineAccess: ["LINE-1", "LINE-2"],
    email: "operator.demo@smartandon.local"
  },
  {
    id: "USR-TECH-01",
    name: "Technician Demo",
    badgeId: "TECH-2001",
    role: "technician",
    department: "Maintenance & Tooling",
    pin: "2345",
    lineAccess: ["*"],
    email: "technician.demo@smartandon.local"
  },
  {
    id: "USR-SPV-01",
    name: "Supervisor Demo",
    badgeId: "SPV-3001",
    role: "supervisor",
    department: "Production Control",
    pin: "3456",
    lineAccess: ["*"],
    email: "supervisor.demo@smartandon.local"
  },
  {
    id: "USR-ADMIN-01",
    name: "Admin Demo",
    badgeId: "ADMIN-99",
    role: "admin",
    department: "Plant Management & IT",
    pin: "9999",
    lineAccess: ["*"],
    email: "admin.demo@smartandon.local"
  },
  {
    id: "USR-admin01",
    name: "Lead Plant Administrator",
    badgeId: "admin01",
    role: "admin",
    department: "Plant Management & IT",
    pin: "8888",
    lineAccess: ["*"],
    email: "admin@smartandon.local"
  }
];

const AUTH_STORAGE_KEY = "andon_auth_user_session_v1";

export function loadCurrentSession(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = safeLocalStorageGet(AUTH_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return sanitizeUserProfile(parsed);
    }
  } catch (e) {
    console.error("Error reading auth session:", e);
  }
  return null;
}

export function saveSession(user: UserProfile): void {
  if (typeof window === "undefined") return;
  const sanitizedUser = sanitizeUserProfile(user);
  safeLocalStorageSet(AUTH_STORAGE_KEY, JSON.stringify(sanitizedUser));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (e) {
    console.error("Error clearing auth session:", e);
  }
}

