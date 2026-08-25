/**
 * Security & Sanitization Utilities
 * Protects against CWE-79 (XSS), CWE-80, CWE-922, and SonarQube S8475 (Browser storage poisoning).
 * Ensures tainted user/DOM inputs are strictly sanitized before being written to browser storage or rendered.
 */

import { UserProfile, BrandConfig, UserRole } from "../types";

/**
 * Strips dangerous HTML tags, JavaScript event handlers, and escapes special HTML entities
 */
export function sanitizeString(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val).trim();
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/`/g, "&#x60;");
}

/**
 * Validates and sanitizes identifier strings (e.g. Line IDs, Machine IDs, Badge IDs)
 * Restricts strictly to safe alphanumeric characters, dashes, underscores, and dots.
 */
export function sanitizeIdentifier(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val).trim();
  // Keep only alphanumeric characters, dashes, underscores, dots, and colons (max 64 chars)
  return str.replace(/[^a-zA-Z0-9_\-\.:]/g, "").slice(0, 64);
}

/**
 * Validates and sanitizes image URLs or data URLs, blocking javascript: or arbitrary protocols
 */
export function sanitizeMediaUrl(url: unknown): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  
  // Allow safe base64 data URLs for images
  if (/^data:image\/(png|jpeg|jpg|webp|svg\+xml|gif);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) {
    return trimmed;
  }
  
  // Allow standard HTTP/HTTPS URLs
  if (/^https?:\/\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=]+$/i.test(trimmed)) {
    return trimmed;
  }
  
  // Allow safe relative paths
  if (/^\/[a-zA-Z0-9_\-\.\/]+$/i.test(trimmed)) {
    return trimmed;
  }
  
  return "";
}

/**
 * Sanitizes a UserProfile object before writing to browser session or storage
 */
export function sanitizeUserProfile(user: UserProfile): UserProfile {
  const allowedRoles: UserRole[] = ["operator", "technician", "supervisor", "admin"];
  const safeRole: UserRole = allowedRoles.includes(user.role) ? user.role : "operator";

  return {
    id: sanitizeIdentifier(user.id || `USR-${Date.now()}`),
    name: sanitizeString(user.name).slice(0, 100) || "Operator",
    badgeId: sanitizeIdentifier(user.badgeId).slice(0, 32) || "EMP-001",
    role: safeRole,
    department: sanitizeString(user.department || "").slice(0, 80),
    pin: sanitizeIdentifier(user.pin || "").slice(0, 16),
    lineAccess: Array.isArray(user.lineAccess)
      ? user.lineAccess.map((l) => sanitizeIdentifier(l)).filter(Boolean)
      : ["*"],
    email: sanitizeString(user.email || "").slice(0, 120),
  };
}

/**
 * Sanitizes BrandConfig before writing to localStorage
 */
export function sanitizeBrandConfig(config: BrandConfig): BrandConfig {
  const safeMode = config.mode === "custom_image" || config.mode === "custom_text" ? config.mode : "demo";
  return {
    mode: safeMode,
    customLogoUrl: sanitizeMediaUrl(config.customLogoUrl),
    customLogoText: sanitizeString(config.customLogoText).slice(0, 30) || "assy",
    customAppName: sanitizeString(config.customAppName).slice(0, 80) || "ANDON SMART FACTORY",
    customAppSubtitle: sanitizeString(config.customAppSubtitle).slice(0, 120) || "Live Shop Floor & Andon Monitor",
    logoHeight: typeof config.logoHeight === "number" && config.logoHeight >= 16 && config.logoHeight <= 100 
      ? config.logoHeight 
      : 34,
  };
}

/**
 * Safe wrapper for localStorage.setItem that validates and sanitizes values before storage
 * Compliant with SonarQube S8475 (Browser storage should not be poisoned).
 */
export function safeLocalStorageSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  const safeKey = sanitizeIdentifier(key);
  // Ensure the value string is stripped of active script injections
  const sanitizedValue = typeof value === "string" 
    ? value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    : JSON.stringify(value);
  try {
    localStorage.setItem(safeKey, sanitizedValue);
  } catch (err) {
    console.error(`Failed safe write to localStorage for key: ${safeKey}`, err);
  }
}

/**
 * Safe wrapper for localStorage.getItem
 */
export function safeLocalStorageGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  const safeKey = sanitizeIdentifier(key);
  try {
    return localStorage.getItem(safeKey);
  } catch (err) {
    console.error(`Failed safe read from localStorage for key: ${safeKey}`, err);
    return null;
  }
}
