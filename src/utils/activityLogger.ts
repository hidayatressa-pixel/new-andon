import { ActivityLog, AppLanguage } from "../types";

export function localizeActivityLog(
  log: ActivityLog,
  language: AppLanguage | string = "id"
): { title: string; details: string } {
  if (language === "id") {
    // If text is in Indonesian or English, return formatted Indonesian
    let title = log.title || "";
    let details = log.details || "";

    title = title
      .replace(/Andon Work Order \(WO\) (.*?) Opened/gi, "Work Order (WO) Andon $1 Dibuka")
      .replace(/Andon WO (.*?) Cancelled \/ Deleted/gi, "WO Andon $1 Dihapus / Dibatalkan")
      .replace(/Update WO (.*?): IN REPAIR/gi, "Update WO $1: IN_PROGRESS")
      .replace(/Update WO (.*?): MODIFIED/gi, "Update WO $1: DIUBAH");

    return { title, details };
  }

  // Language is English ('en')
  let title = log.title || "";
  let details = log.details || "";

  // Title patterns translation
  title = title
    .replace(/Work Order \(WO\) Andon (.*?) Dibuka/gi, "Andon Work Order (WO) $1 Opened")
    .replace(/WO Andon (.*?) Dibuka/gi, "Andon WO $1 Opened")
    .replace(/WO Andon (.*?) Dihapus \/ Dibatalkan/gi, "Andon WO $1 Cancelled / Deleted")
    .replace(/Update WO (.*?): DIUBAH/gi, "Update WO $1: MODIFIED")
    .replace(/Update WO (.*?): ACKNOWLEDGED/gi, "Update WO $1: ACKNOWLEDGED")
    .replace(/Update WO (.*?): IN_PROGRESS/gi, "Update WO $1: IN REPAIR")
    .replace(/Update WO (.*?): RESOLVED/gi, "Update WO $1: RESOLVED")
    .replace(/Update WO (.*?): CALLING/gi, "Update WO $1: NEW CALL")
    .replace(/Upload Master Data: (\d+) Lini/gi, "Master Data Upload: $1 Lines")
    .replace(/Upload Master Data: (\d+) Mesin/gi, "Master Data Upload: $1 Machines")
    .replace(/Upload Master Data: (\d+) Operator/gi, "Master Data Upload: $1 Operators")
    .replace(/Upload Master Line: (\d+) Lini/gi, "Upload Master Lines: $1 Lines")
    .replace(/Upload Master Mesin: (\d+) Mesin/gi, "Upload Master Machines: $1 Machines")
    .replace(/Upload Master Operator: (\d+) Akun/gi, "Upload Master Operators: $1 Accounts")
    .replace(/Bersihkan Data Trial & Reset Sistem/gi, "Purge Trial Data & System Reset")
    .replace(/Inisialisasi Sistem Andon Pabrik/gi, "Plant Andon System Initialized")
    .replace(/Pengaturan Identitas & Branding/gi, "Identity & Branding Settings")
    .replace(/Perubahan Pengaturan Audio & Display/gi, "Audio & Display Settings Updated")
    .replace(/User Login: (.*)/gi, "User Login: $1")
    .replace(/User Logout: (.*)/gi, "User Logout: $1");

  // Details patterns translation
  details = details
    .replace(/Kategori: abnormal_machine/gi, "Category: MACHINE ABNORMALITY")
    .replace(/Kategori: leader_call/gi, "Category: CALLING LEADER")
    .replace(/Kategori: material_support/gi, "Category: CALLING MATERIAL SUPPORT")
    .replace(/Kategori: machine_breakdown/gi, "Category: MACHINE BREAKDOWN")
    .replace(/Kategori: material_shortage/gi, "Category: MATERIAL SHORTAGE")
    .replace(/Kategori: quality_defect/gi, "Category: QUALITY DEFECT")
    .replace(/Kategori: maintenance_tooling/gi, "Category: MAINTENANCE / TOOLING")
    .replace(/Kategori: supervisor_call/gi, "Category: LEADER / SUPERVISOR")
    .replace(/Kategori: safety_alert/gi, "Category: SAFETY HAZARD")
    .replace(/Kategori: ABNORMAL MESIN/gi, "Category: MACHINE ABNORMALITY")
    .replace(/Kategori: CALLING LEADER/gi, "Category: CALLING LEADER")
    .replace(/Kategori: CALLING MATERIAL SUPPORT/gi, "Category: CALLING MATERIAL SUPPORT")
    .replace(/di (.*?) \((.*?)\)\./gi, "at $1 ($2).")
    .replace(/Line stop: YA/gi, "Line stop: YES")
    .replace(/Line stop: TIDAK/gi, "Line stop: NO")
    .replace(/Selesai dengan solusi: (.*?)\. Root cause: (.*)/gi, "Resolved with solution: $1. Root cause: $2")
    .replace(/Status WO diperbarui menjadi (.*?)\./gi, "WO status updated to $1.")
    .replace(/WO dihapus dari sistem oleh (.*?)\./gi, "WO deleted from system by $1.")
    .replace(/Seluruh data panggilan trial dan log berhasil direset\./gi, "All trial calls and logs successfully reset.")
    .replace(/Sistem siap untuk operasional produksi nyata\./gi, "System is initialized and ready for production operations.")
    .replace(/Impor massal master lini produksi berhasil\./gi, "Bulk import of production lines completed successfully.")
    .replace(/Impor master mesin pabrik berhasil\./gi, "Bulk import of machines completed successfully.")
    .replace(/Impor master akun operator berhasil\./gi, "Bulk import of operator accounts completed successfully.")
    .replace(/User session logged out\./gi, "User session logged out.")
    .replace(/Login sesi berhasil diverifikasi\./gi, "Login session verified successfully.");

  return { title, details };
}
