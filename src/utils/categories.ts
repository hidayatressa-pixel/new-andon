import { CallCategory, CategoryMetadata } from "../types";

export const CATEGORIES_DATA: Record<CallCategory, CategoryMetadata> = {
  machine_breakdown: {
    id: "machine_breakdown",
    label: "Mesin Rusak / Line Stop",
    labelEn: "Machine Breakdown",
    icon: "Flame",
    color: "red",
    bgLight: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
    borderLight: "border-red-500",
    badgeBg: "bg-red-600",
    badgeText: "text-white",
    soundPitch: 880,
    towerColor: "red"
  },
  material_shortage: {
    id: "material_shortage",
    label: "Kekurangan Material / Part",
    labelEn: "Material Shortage",
    icon: "Boxes",
    color: "amber",
    bgLight: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    borderLight: "border-amber-500",
    badgeBg: "bg-amber-500",
    badgeText: "text-neutral-900",
    soundPitch: 660,
    towerColor: "yellow"
  },
  quality_defect: {
    id: "quality_defect",
    label: "Masalah Kualitas / Cacat Part",
    labelEn: "Quality Defect / NG Part",
    icon: "ShieldAlert",
    color: "orange",
    bgLight: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
    borderLight: "border-orange-500",
    badgeBg: "bg-orange-600",
    badgeText: "text-white",
    soundPitch: 580,
    towerColor: "orange"
  },
  maintenance_tooling: {
    id: "maintenance_tooling",
    label: "Maintenance / Ganti Tooling",
    labelEn: "Maintenance & Tooling",
    icon: "Wrench",
    color: "blue",
    bgLight: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
    borderLight: "border-blue-500",
    badgeBg: "bg-blue-600",
    badgeText: "text-white",
    soundPitch: 520,
    towerColor: "blue"
  },
  supervisor_call: {
    id: "supervisor_call",
    label: "Bantuan Leader / Supervisor",
    labelEn: "Leader / SPV Assistance",
    icon: "UserCheck",
    color: "purple",
    bgLight: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
    borderLight: "border-purple-500",
    badgeBg: "bg-purple-600",
    badgeText: "text-white",
    soundPitch: 740,
    towerColor: "purple"
  },
  safety_alert: {
    id: "safety_alert",
    label: "K3 / Bahaya Keselamatan (EHS)",
    labelEn: "Safety / EHS Hazard",
    icon: "AlertTriangle",
    color: "emerald",
    bgLight: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    borderLight: "border-emerald-500",
    badgeBg: "bg-emerald-600",
    badgeText: "text-white",
    soundPitch: 920,
    towerColor: "white"
  }
};
