import { UserProfile } from "../types";

export const DEFAULT_USERS: UserProfile[] = [
  {
    id: "USR-OP-01",
    name: "Agus Pratama",
    badgeId: "OP-1001",
    role: "operator",
    department: "Machining",
    pin: "1234",
    lineAccess: ["LINE-1", "LINE-2"],
    email: "agus.op@factory.local"
  },
  {
    id: "USR-TECH-01",
    name: "Rudi Hermawan (Teknisi Maintenance)",
    badgeId: "TECH-2001",
    role: "technician",
    department: "Maintenance & Tooling",
    pin: "2345",
    lineAccess: ["*"],
    email: "rudi.tech@factory.local"
  },
  {
    id: "USR-SPV-01",
    name: "Budi Santoso (Production Supervisor)",
    badgeId: "SPV-3001",
    role: "supervisor",
    department: "Production Control",
    pin: "3456",
    lineAccess: ["*"],
    email: "budi.spv@factory.local"
  },
  {
    id: "USR-ADM-01",
    name: "Administrator Pabrik",
    badgeId: "ADM-9999",
    role: "admin",
    department: "Plant Management & IT",
    pin: "9999",
    lineAccess: ["*"],
    email: "admin@factory.local"
  }
];

const AUTH_STORAGE_KEY = "andon_auth_user_session_v1";

export function loadCurrentSession(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error("Error reading auth session:", e);
  }
  return null;
}

export function saveSession(user: UserProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
}
