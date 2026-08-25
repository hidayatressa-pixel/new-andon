import { UserProfile, UserRole } from "../types";

/**
 * Centered Permission and Authorization Engine
 * Enforces client-side UI visibility in alignment with server-side Firestore Security Rules.
 */

export function canManageMasterData(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  return user.role === "admin";
}

export function canManageUsers(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  return user.role === "admin";
}

export function canManageSettings(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  return user.role === "admin" || user.role === "supervisor";
}

export function canResetDemoData(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  return user.role === "admin";
}

export function canClearLogs(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  return user.role === "admin";
}

export function canResolveAndon(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  // Technicians, supervisors, and admins can resolve
  return user.role === "admin" || user.role === "supervisor" || user.role === "technician";
}

export function canViewReports(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  // Only supervisor and admin are allowed report queries
  return user.role === "admin" || user.role === "supervisor";
}

export function canRaiseAndon(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  return true; // Any authenticated personnel can raise an alert
}
