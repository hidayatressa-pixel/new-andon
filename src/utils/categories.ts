import { CallCategory, CategoryMetadata } from "../types";

export interface AndonCategoryDefinition extends CategoryMetadata {
  subtitle: string;
  subtitleEn: string;
  codeName: string;
}

export const CATEGORIES_DATA: Record<CallCategory, CategoryMetadata> = {
  // 1. MERAH = ABNORMAL MESIN
  abnormal_machine: {
    id: "abnormal_machine",
    label: "MACHINE ABNORMALITY",
    labelEn: "MACHINE ABNORMALITY",
    icon: "Flame",
    color: "red",
    bgLight: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
    borderLight: "border-red-500",
    badgeBg: "bg-red-600",
    badgeText: "text-white",
    soundPitch: 880,
    towerColor: "red"
  },
  // 2. KUNING = CALLING LEADER (QUALITY, PROCESS, & PRODUCTIVITY)
  leader_call: {
    id: "leader_call",
    label: "CALLING LEADER",
    labelEn: "CALLING LEADER",
    icon: "UserCheck",
    color: "amber",
    bgLight: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    borderLight: "border-amber-500",
    badgeBg: "bg-amber-500",
    badgeText: "text-slate-950",
    soundPitch: 660,
    towerColor: "yellow"
  },
  // 3. HIJAU = CALLING MATERIAL SUPPORT (MATERIAL SUPPLY / REPLENISHMENT)
  material_support: {
    id: "material_support",
    label: "CALLING MATERIAL SUPPORT",
    labelEn: "CALLING MATERIAL SUPPORT",
    icon: "Boxes",
    color: "emerald",
    bgLight: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    borderLight: "border-emerald-500",
    badgeBg: "bg-emerald-600",
    badgeText: "text-white",
    soundPitch: 520,
    towerColor: "green"
  },

  // Legacy mappings for backward compatibility
  machine_breakdown: {
    id: "machine_breakdown",
    label: "MACHINE ABNORMALITY",
    labelEn: "MACHINE ABNORMALITY",
    icon: "Flame",
    color: "red",
    bgLight: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
    borderLight: "border-red-500",
    badgeBg: "bg-red-600",
    badgeText: "text-white",
    soundPitch: 880,
    towerColor: "red"
  },
  material_shortage: {
    id: "material_shortage",
    label: "CALLING MATERIAL SUPPORT",
    labelEn: "CALLING MATERIAL SUPPORT",
    icon: "Boxes",
    color: "emerald",
    bgLight: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    borderLight: "border-emerald-500",
    badgeBg: "bg-emerald-600",
    badgeText: "text-white",
    soundPitch: 520,
    towerColor: "green"
  },
  quality_defect: {
    id: "quality_defect",
    label: "CALLING LEADER (QUALITY)",
    labelEn: "CALLING LEADER (QUALITY)",
    icon: "UserCheck",
    color: "amber",
    bgLight: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    borderLight: "border-amber-500",
    badgeBg: "bg-amber-500",
    badgeText: "text-slate-950",
    soundPitch: 660,
    towerColor: "yellow"
  },
  maintenance_tooling: {
    id: "maintenance_tooling",
    label: "MACHINE (TOOLING)",
    labelEn: "MACHINE (TOOLING)",
    icon: "Flame",
    color: "red",
    bgLight: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
    borderLight: "border-red-500",
    badgeBg: "bg-red-600",
    badgeText: "text-white",
    soundPitch: 880,
    towerColor: "red"
  },
  supervisor_call: {
    id: "supervisor_call",
    label: "CALLING LEADER",
    labelEn: "CALLING LEADER",
    icon: "UserCheck",
    color: "amber",
    bgLight: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    borderLight: "border-amber-500",
    badgeBg: "bg-amber-500",
    badgeText: "text-slate-950",
    soundPitch: 660,
    towerColor: "yellow"
  },
  safety_alert: {
    id: "safety_alert",
    label: "MACHINE (SAFETY)",
    labelEn: "MACHINE (SAFETY)",
    icon: "Flame",
    color: "red",
    bgLight: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
    borderLight: "border-red-500",
    badgeBg: "bg-red-600",
    badgeText: "text-white",
    soundPitch: 880,
    towerColor: "red"
  }
};

export interface PrimaryCategoryItem {
  id: CallCategory;
  colorName: "MERAH" | "KUNING" | "HIJAU";
  colorNameEn: "RED" | "YELLOW" | "GREEN";
  title: string;
  titleEn: string;
  subtitle: string;
  subtitleEn: string;
  badgeClass: string;
  borderClass: string;
  activeRing: string;
  iconBg: string;
  themeColor: string;
}

export const PRIMARY_ANDON_BUTTONS: PrimaryCategoryItem[] = [
  {
    id: "abnormal_machine",
    colorName: "MERAH",
    colorNameEn: "RED",
    title: "MACHINE ABNORMALITY",
    titleEn: "MACHINE ABNORMALITY",
    subtitle: "Machine breakdown, electrical/mechanical fault, line stop",
    subtitleEn: "Machine breakdown, electrical/mechanical fault, line stop",
    badgeClass: "bg-red-600 text-white",
    borderClass: "border-red-500",
    activeRing: "ring-4 ring-red-500/30 border-red-500 bg-red-50 dark:bg-red-950/50",
    iconBg: "bg-red-600 text-white",
    themeColor: "red",
  },
  {
    id: "leader_call",
    colorName: "KUNING",
    colorNameEn: "YELLOW",
    title: "CALLING LEADER",
    titleEn: "CALLING LEADER",
    subtitle: "Quality abnormality, process delay, tooling & productivity",
    subtitleEn: "Quality abnormality, process delay, tooling & productivity",
    badgeClass: "bg-amber-500 text-slate-950",
    borderClass: "border-amber-500",
    activeRing: "ring-4 ring-amber-500/30 border-amber-500 bg-amber-50 dark:bg-amber-950/50",
    iconBg: "bg-amber-500 text-slate-950",
    themeColor: "amber",
  },
  {
    id: "material_support",
    colorName: "HIJAU",
    colorNameEn: "GREEN",
    title: "CALLING MATERIAL SUPPORT",
    titleEn: "CALLING MATERIAL SUPPORT",
    subtitle: "Material supply replenishment & abnormality",
    subtitleEn: "Material supply replenishment & abnormality",
    badgeClass: "bg-emerald-600 text-white",
    borderClass: "border-emerald-500",
    activeRing: "ring-4 ring-emerald-500/30 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50",
    iconBg: "bg-emerald-600 text-white",
    themeColor: "emerald",
  }
];

/**
 * Normalizes any category string into the 3 core schema categories
 */
export function normalizeCategoryToPrimary(category: string): 'abnormal_machine' | 'leader_call' | 'material_support' {
  if (category === 'abnormal_machine' || category === 'machine_breakdown' || category === 'maintenance_tooling' || category === 'safety_alert') {
    return 'abnormal_machine';
  }
  if (category === 'leader_call' || category === 'quality_defect' || category === 'supervisor_call') {
    return 'leader_call';
  }
  return 'material_support';
}

