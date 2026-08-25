import { AndonCall } from "../types";

// =========================================================================
// TELEGRAM NOTIFICATION CONFIGURATION
// =========================================================================
// Read directly and safely from Vite environment variables.
// =========================================================================

const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID || "";

function escapeHtml(text: string | undefined | null): string {
  if (!text) return "-";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Sends a notification message to the configured Telegram Chat.
 */
export async function sendTelegramNotification(message: string): Promise<boolean> {
  // Guard clause to skip sending if token or chat ID is not configured
  if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN.trim() === "" || TELEGRAM_BOT_TOKEN.includes("TEMPATKAN_")) {
    return false;
  }
  if (!TELEGRAM_CHAT_ID || TELEGRAM_CHAT_ID.trim() === "" || TELEGRAM_CHAT_ID.includes("TEMPATKAN_")) {
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "HTML",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("❌ Failed to send Telegram notification:", errText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("❌ Exception occurred while sending Telegram notification:", error);
    return false;
  }
}

/**
 * Formats Andon call details into a rich Telegram HTML message template with escaped inputs.
 */
export function formatAndonCallTelegramMessage(
  call: AndonCall, 
  actionType: "OPEN" | "ACK" | "RESOLVE" | "CANCEL"
): string {
  const headerText = {
    OPEN: "<b>ANDON CALL RAISED</b>",
    ACK: "<b>ANDON CALL ACKNOWLEDGED</b>",
    RESOLVE: "<b>ANDON CALL RESOLVED</b>",
    CANCEL: "<b>ANDON CALL CANCELLED</b>"
  }[actionType];

  const timestampStr = new Date(call.timestamp).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta"
  });

  let msg = `-----------------------------------------\n`;
  msg += `${headerText}\n`;
  msg += `-----------------------------------------\n`;
  msg += `<b>No. WO:</b> <code>${escapeHtml(call.ticketNo || call.id)}</code>\n`;
  msg += `<b>Lini:</b> ${escapeHtml(call.lineName)}\n`;
  msg += `<b>Workstation:</b> ${escapeHtml(call.workstation)}\n`;
  msg += `<b>Kategori:</b> ${escapeHtml(call.category.toUpperCase())}\n`;
  msg += `<b>Severity:</b> ${escapeHtml(call.severity.toUpperCase())}\n`;
  msg += `<b>Line Stop:</b> ${call.isLineStopped ? "YA" : "TIDAK"}\n`;
  msg += `<b>Operator:</b> ${escapeHtml(call.operatorName)}\n`;
  msg += `<b>Waktu:</b> ${escapeHtml(timestampStr)}\n`;

  if (actionType === "ACK" && call.acknowledgedBy) {
    msg += `-----------------------------------------\n`;
    msg += `<b>Responder:</b> ${escapeHtml(call.acknowledgedBy)}\n`;
    if (call.acknowledgedAt) {
      const responseTime = Math.round((call.acknowledgedAt - call.timestamp) / 1000);
      msg += `<b>Response Time:</b> ${responseTime} detik\n`;
    }
  }

  if (actionType === "RESOLVE") {
    msg += `-----------------------------------------\n`;
    if (call.resolvedBy) msg += `<b>Diperbaiki Oleh:</b> ${escapeHtml(call.resolvedBy)}\n`;
    if (call.rootCause) msg += `<b>Akar Masalah:</b> ${escapeHtml(call.rootCause)}\n`;
    if (call.resolutionNotes) msg += `<b>Tindakan Korektif:</b> ${escapeHtml(call.resolutionNotes)}\n`;
    if (call.resolvedAt) {
      const totalDowntimeSec = Math.round((call.resolvedAt - call.timestamp) / 1000);
      const m = Math.floor(totalDowntimeSec / 60);
      const s = totalDowntimeSec % 60;
      msg += `<b>Total Downtime:</b> ${m}m ${s}s\n`;
    }
  }
  msg += `-----------------------------------------`;

  return msg;
}
