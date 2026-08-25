import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  writeBatch,
  Unsubscribe
} from "firebase/firestore";
import { db, isFirebaseConfigured, COLLECTIONS } from "./firebase";
import { 
  AndonCall, 
  AndonLine, 
  ActivityLog, 
  MasterMachine, 
  UserProfile,
  CallStatus
} from "../types";
import { INITIAL_LINES, INITIAL_MACHINES } from "../utils/initialData";
import { DEFAULT_USERS } from "../utils/auth";
import { sendTelegramNotification, formatAndonCallTelegramMessage } from "../utils/telegram";
import { safeLocalStorageSet, safeLocalStorageGet } from "../utils/sanitizer";

// ==========================================
// DUAL MODE ABSTRACTION (DEMO & FIREBASE)
// ==========================================
export const IS_DEMO_MODE = 
  import.meta.env.VITE_DATA_PROVIDER === "demo" || 
  !isFirebaseConfigured();

/**
 * Basic XSS string sanitizer to neutralize malicious HTML/script injections
 */
export function sanitizeString(val: string): string {
  if (!val || typeof val !== "string") return "";
  return val
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Sanitizes object by removing all undefined values recursively,
 * and strips sensitive authentication keys before saving to remote database.
 */
export function cleanFirestorePayload<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  const isDemo = IS_DEMO_MODE;
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    }
    // Strip sensitive fields in cloud production mode
    if (!isDemo && ["pin", "password", "pass", "sandi"].includes(key.toLowerCase())) {
      continue;
    }
    if (value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      cleaned[key] = cleanFirestorePayload(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      cleaned[key] = value.filter((item) => item !== undefined);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

const DEMO_KEYS = {
  CALLS: "andon_calls_demo_v4",
  LINES: "master_lines_demo_v4",
  MACHINES: "master_machines_demo_v4",
  LOGS: "activity_logs_demo_v4",
  OPERATORS: "master_operators_demo_v4"
} as const;

// Helper function to safely dispatch Telegram notifications in background
async function dispatchTelegramNotification(
  callId: string, 
  actionType: "OPEN" | "ACK" | "RESOLVE" | "CANCEL", 
  initialCallData?: AndonCall
): Promise<void> {
  try {
    let fullCall: AndonCall | null = initialCallData || null;
    if (!fullCall) {
      if (IS_DEMO_MODE) {
        fullCall = demoState.calls.find(c => c.id === callId) || null;
      } else {
        const snap = await getDoc(doc(db, COLLECTIONS.CALLS, callId));
        if (snap.exists()) {
          fullCall = { id: snap.id, ...snap.data() } as AndonCall;
        }
      }
    }

    if (fullCall) {
      const tgMsg = formatAndonCallTelegramMessage(fullCall, actionType);
      await sendTelegramNotification(tgMsg);
    }
  } catch (err) {
    console.warn(`Error sending Telegram ${actionType} notification:`, err);
  }
}
function getLocalStorageData<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const data = safeLocalStorageGet(key);
    return data ? (JSON.parse(data) as T) : fallback;
  } catch (e) {
    console.error("Failed to parse localStorage key:", key, e);
    return fallback;
  }
}

function setLocalStorageData<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    safeLocalStorageSet(key, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save to localStorage key:", key, e);
  }
}

// In-Memory Demo State
const demoState = {
  calls: getLocalStorageData<AndonCall[]>(DEMO_KEYS.CALLS, []),
  lines: getLocalStorageData<AndonLine[]>(DEMO_KEYS.LINES, INITIAL_LINES),
  machines: getLocalStorageData<MasterMachine[]>(DEMO_KEYS.MACHINES, INITIAL_MACHINES),
  logs: getLocalStorageData<ActivityLog[]>(DEMO_KEYS.LOGS, []),
  operators: getLocalStorageData<UserProfile[]>(DEMO_KEYS.OPERATORS, DEFAULT_USERS)
};

// Subscriber Registry
type Callback<T> = (data: T) => void;
const listeners = {
  calls: [] as Callback<AndonCall[]>[],
  lines: [] as Callback<AndonLine[]>[],
  machines: [] as Callback<MasterMachine[]>[],
  logs: [] as Callback<ActivityLog[]>[],
  operators: [] as Callback<UserProfile[]>[]
};

function notifySubscribers(type: keyof typeof listeners) {
  const currentData = demoState[type];
  listeners[type].forEach(callback => {
    try {
      if (type === "calls") callback(currentData as AndonCall[] as never);
      else if (type === "lines") callback(currentData as AndonLine[] as never);
      else if (type === "machines") callback(currentData as MasterMachine[] as never);
      else if (type === "logs") callback(currentData as ActivityLog[] as never);
      else if (type === "operators") callback(currentData as UserProfile[] as never);
    } catch (e) {
      console.error(`Error in ${type} subscriber callback:`, e);
    }
  });
}

// ==========================================
// 1. ACTIVITY LOGS (AUDIT TRAIL)
// ==========================================
export async function logActivity(
  action: ActivityLog["action"],
  title: string,
  details: string,
  user?: { name: string; id: string; role: string },
  meta?: { callId?: string | null; lineId?: string | null; ticketNo?: string | null }
): Promise<void> {
  const newLog: ActivityLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: Date.now(),
    action: action || "config_change",
    title: title || "Aktivitas Tercatat",
    details: details || "-",
    userId: user?.id || "SYSTEM",
    userName: user?.name || "System Automated",
    userRole: user?.role || "system",
    ...(meta?.callId ? { callId: meta.callId } : {}),
    ...(meta?.lineId ? { lineId: meta.lineId } : {}),
    ...(meta?.ticketNo ? { ticketNo: meta.ticketNo } : {})
  };

  if (IS_DEMO_MODE) {
    demoState.logs = [newLog, ...demoState.logs].slice(0, 150);
    setLocalStorageData(DEMO_KEYS.LOGS, demoState.logs);
    notifySubscribers("logs");
    return;
  }

  try {
    const logsRef = collection(db, COLLECTIONS.LOGS);
    await addDoc(logsRef, cleanFirestorePayload(newLog as unknown as Record<string, unknown>));
  } catch (error) {
    console.warn("Failed to write activity log to Firestore, falling back to local state:", error);
    demoState.logs = [newLog, ...demoState.logs].slice(0, 150);
    setLocalStorageData(DEMO_KEYS.LOGS, demoState.logs);
    notifySubscribers("logs");
  }
}

export function subscribeActivityLogs(callback: (logs: ActivityLog[]) => void): Unsubscribe {
  if (IS_DEMO_MODE) {
    listeners.logs.push(callback);
    callback(demoState.logs);
    return () => {
      listeners.logs = listeners.logs.filter(cb => cb !== callback);
    };
  }

  try {
    const logsRef = collection(db, COLLECTIONS.LOGS);
    const q = query(logsRef, orderBy("timestamp", "desc"), limit(150));
    
    return onSnapshot(q, (snapshot) => {
      const logs: ActivityLog[] = snapshot.docs.map((d) => ({
        ...d.data(),
        id: d.id,
      } as ActivityLog));
      callback(logs);
    }, (err) => {
      console.warn("Firestore activity logs subscription error, using local state:", err);
      callback(demoState.logs);
    });
  } catch (e) {
    console.warn("Exception during subscribeActivityLogs setup:", e);
    callback(demoState.logs);
    return () => {};
  }
}

// ==========================================
// 2. ANDON CALLS (REAL-TIME CRUD)
// ==========================================
export function subscribeAndonCalls(callback: (calls: AndonCall[]) => void): Unsubscribe {
  if (IS_DEMO_MODE) {
    listeners.calls.push(callback);
    callback(demoState.calls);
    return () => {
      listeners.calls = listeners.calls.filter(cb => cb !== callback);
    };
  }

  try {
    const callsRef = collection(db, COLLECTIONS.CALLS);
    const q = query(callsRef, orderBy("timestamp", "desc"));

    return onSnapshot(q, (snapshot) => {
      const calls: AndonCall[] = snapshot.docs.map((d) => ({
        ...d.data(),
        id: d.id,
      } as AndonCall));
      callback(calls);
    }, (err) => {
      console.warn("Firestore andon calls subscription error, fallback to local:", err);
      callback(demoState.calls);
    });
  } catch (e) {
    console.warn("Exception during subscribeAndonCalls setup:", e);
    callback(demoState.calls);
    return () => {};
  }
}

export async function createAndonCallInDb(
  callData: Omit<AndonCall, "id"> | AndonCall, 
  currentUser?: { name: string; id: string; role: string }
): Promise<string> {
  const callId = ("id" in callData && callData.id) 
    ? callData.id 
    : `call-${Date.now()}`;
    
  const finalCall: AndonCall = {
    ...callData,
    id: callId
  } as AndonCall;

  // Trigger Telegram Notification asynchronously (Non-blocking safe promise)
  void dispatchTelegramNotification(callId, "OPEN", finalCall);

  if (IS_DEMO_MODE) {
    demoState.calls = [finalCall, ...demoState.calls.filter(c => c.id !== callId)];
    setLocalStorageData(DEMO_KEYS.CALLS, demoState.calls);
    notifySubscribers("calls");

    if (currentUser) {
      await logActivity(
        "create_call",
        `Work Order (WO) Andon ${finalCall.ticketNo || callId} Dibuka`,
        `Kategori: ${finalCall.category} di ${finalCall.lineName} (${finalCall.workstation}). Line stop: ${finalCall.isLineStopped ? "YA" : "TIDAK"}.`,
        currentUser,
        { callId, lineId: finalCall.lineId, ticketNo: finalCall.ticketNo }
      );
    }
    return callId;
  }

  try {
    const docRef = doc(db, COLLECTIONS.CALLS, callId);
    const cleanedData = cleanFirestorePayload(finalCall as unknown as Record<string, unknown>);
    await setDoc(docRef, cleanedData, { merge: true });
  } catch (error) {
    console.warn("Failed to create call in Firestore, writing locally:", error);
    demoState.calls = [finalCall, ...demoState.calls.filter(c => c.id !== callId)];
    setLocalStorageData(DEMO_KEYS.CALLS, demoState.calls);
    notifySubscribers("calls");
  }
  
  if (currentUser) {
    const meta: { callId: string; lineId?: string; ticketNo?: string } = { callId };
    if (callData.lineId) meta.lineId = callData.lineId;
    if (callData.ticketNo) meta.ticketNo = callData.ticketNo;

    await logActivity(
      "create_call",
      `Work Order (WO) Andon ${callData.ticketNo || callId} Dibuka`,
      `Kategori: ${callData.category} di ${callData.lineName} (${callData.workstation}). Line stop: ${callData.isLineStopped ? "YA" : "TIDAK"}.`,
      currentUser,
      meta
    );
  }
  return callId;
}

export async function updateAndonCallInDb(
  callId: string, 
  statusOrData: CallStatus | Partial<AndonCall>, 
  extra?: Partial<AndonCall> | { name: string; id: string; role: string },
  currentUser?: { name: string; id: string; role: string }
): Promise<void> {
  let updatePayload: Partial<AndonCall> = {};
  let user = currentUser;

  if (typeof statusOrData === "string") {
    updatePayload = { status: statusOrData, ...(extra as Partial<AndonCall>) };
  } else {
    updatePayload = { ...statusOrData };
    if (extra && "name" in extra && "role" in extra) {
      user = extra as { name: string; id: string; role: string };
    }
  }

  if (IS_DEMO_MODE) {
    const existing = demoState.calls.find(c => c.id === callId);
    if (existing) {
      const updated = { ...existing, ...updatePayload };
      demoState.calls = demoState.calls.map(c => c.id === callId ? updated : c);
      setLocalStorageData(DEMO_KEYS.CALLS, demoState.calls);
      notifySubscribers("calls");

      if (user) {
        const status = updated.status;
        let logAction: ActivityLog["action"] = "acknowledge_call";
        if (status === "in_progress") logAction = "in_progress_call";
        if (status === "resolved") logAction = "resolve_call";

        await logActivity(
          logAction,
          `Update WO ${updated.ticketNo || callId}: ${status ? status.toUpperCase() : "DIUBAH"}`,
          updated.rootCause 
            ? `Selesai dengan solusi: ${updated.resolutionNotes || "-"}. Root cause: ${updated.rootCause}`
            : `Status WO diperbarui menjadi ${status || "diperbarui"}.`,
          user,
          { callId, ticketNo: updated.ticketNo }
        );
      }
    }
    return;
  }

  try {
    const callDocRef = doc(db, COLLECTIONS.CALLS, callId);
    await setDoc(callDocRef, cleanFirestorePayload(updatePayload as unknown as Record<string, unknown>), { merge: true });
  } catch (err) {
    console.warn("Failed to update call in Firestore, updating local state:", err);
    const existing = demoState.calls.find(c => c.id === callId);
    if (existing) {
      const updated = { ...existing, ...updatePayload };
      demoState.calls = demoState.calls.map(c => c.id === callId ? updated : c);
      setLocalStorageData(DEMO_KEYS.CALLS, demoState.calls);
      notifySubscribers("calls");
    }
  }

  if (user) {
    const status = updatePayload.status;
    let logAction: ActivityLog["action"] = "acknowledge_call";
    if (status === "in_progress") logAction = "in_progress_call";
    if (status === "resolved") logAction = "resolve_call";

    const meta: { callId?: string; ticketNo?: string } = { callId };
    if (updatePayload.ticketNo) meta.ticketNo = updatePayload.ticketNo;

    await logActivity(
      logAction,
      `Update WO ${updatePayload.ticketNo || callId}: ${status ? status.toUpperCase() : "DIUBAH"}`,
      updatePayload.rootCause 
        ? `Selesai dengan solusi: ${updatePayload.resolutionNotes || "-"}. Root cause: ${updatePayload.rootCause}`
        : `Status WO diperbarui menjadi ${status || "diperbarui"}.`,
      user,
      meta
    );
  }

  // Trigger Telegram Notification asynchronously for State transitions (ACK / RESOLVE)
  const targetAction: "ACK" | "RESOLVE" | null = 
    updatePayload.status === "in_progress" 
      ? "ACK" 
      : updatePayload.status === "resolved" 
        ? "RESOLVE" 
        : null;

  if (targetAction) {
    void dispatchTelegramNotification(callId, targetAction);
  }
}

export async function deleteAndonCallInDb(
  callId: string, 
  currentUser?: { name: string; id: string; role: string }, 
  ticketNo?: string
): Promise<void> {
  // Trigger Telegram Notification asynchronously for Cancellation (Non-blocking safe promise)
  void dispatchTelegramNotification(callId, "CANCEL");

  if (IS_DEMO_MODE) {
    demoState.calls = demoState.calls.filter(c => c.id !== callId);
    setLocalStorageData(DEMO_KEYS.CALLS, demoState.calls);
    notifySubscribers("calls");

    if (currentUser) {
      await logActivity(
        "delete_call",
        `WO Andon ${ticketNo || callId} Dihapus / Dibatalkan`,
        `WO dihapus dari sistem oleh ${currentUser.name}.`,
        currentUser,
        { callId, ticketNo }
      );
    }
    return;
  }

  try {
    const callDocRef = doc(db, COLLECTIONS.CALLS, callId);
    await deleteDoc(callDocRef);
  } catch (e) {
    console.warn("Failed to delete call from Firestore, deleting locally:", e);
    demoState.calls = demoState.calls.filter(c => c.id !== callId);
    setLocalStorageData(DEMO_KEYS.CALLS, demoState.calls);
    notifySubscribers("calls");
  }

  if (currentUser) {
    const meta: { callId?: string; ticketNo?: string } = { callId };
    if (ticketNo) meta.ticketNo = ticketNo;

    await logActivity(
      "delete_call",
      `WO Andon ${ticketNo || callId} Dihapus / Dibatalkan`,
      `WO dihapus dari sistem oleh ${currentUser.name}.`,
      currentUser,
      meta
    );
  }
}

export async function clearAllCallsInDb(currentUser?: { name: string; id: string; role: string }): Promise<void> {
  if (IS_DEMO_MODE) {
    demoState.calls = [];
    setLocalStorageData(DEMO_KEYS.CALLS, demoState.calls);
    notifySubscribers("calls");

    if (currentUser) {
      await logActivity(
        "delete_call",
        "Reset Semua Data Tiket Panggilan",
        "Seluruh riwayat panggilan Andon aktif dan selesai telah dibersihkan.",
        currentUser
      );
    }
    return;
  }

  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.CALLS));
    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (e) {
    console.warn("Failed to clear Firestore calls batch, clearing local state:", e);
    demoState.calls = [];
    setLocalStorageData(DEMO_KEYS.CALLS, demoState.calls);
    notifySubscribers("calls");
  }

  if (currentUser) {
    await logActivity(
      "delete_call",
      "Reset Semua Data Tiket Panggilan",
      "Seluruh riwayat panggilan Andon aktif dan selesai telah dibersihkan.",
      currentUser
    );
  }
}

/**
 * Wipes all trial data (calls, test logs) and resets lines to clean state.
 */
export async function clearAllTrialDataInDb(
  defaultLines: AndonLine[],
  currentUser?: { name: string; id: string; role: string }
): Promise<void> {
  if (IS_DEMO_MODE) {
    demoState.calls = [];
    demoState.logs = [];
    demoState.operators = DEFAULT_USERS;
    demoState.lines = defaultLines.map(line => ({
      ...line,
      status: "running",
      activeCallsCount: 0,
      actualOutput: 0,
      efficiency: 100,
    }));

    setLocalStorageData(DEMO_KEYS.CALLS, demoState.calls);
    setLocalStorageData(DEMO_KEYS.LOGS, demoState.logs);
    setLocalStorageData(DEMO_KEYS.OPERATORS, demoState.operators);
    setLocalStorageData(DEMO_KEYS.LINES, demoState.lines);

    notifySubscribers("calls");
    notifySubscribers("logs");
    notifySubscribers("operators");
    notifySubscribers("lines");

    await logActivity(
      "config_change",
      "Sistem Siap Digunakan: Database Dibersihkan",
      "Semua data trial/mock telah dihapus. Sistem dalam kondisi bersih (clean slate) siap untuk operasional pabrik.",
      currentUser || { name: "System Admin", id: "ADMIN-01", role: "admin" }
    );
    return;
  }

  try {
    // 1. Delete all calls
    const callsSnap = await getDocs(collection(db, COLLECTIONS.CALLS));
    const callsBatch = writeBatch(db);
    callsSnap.docs.forEach((d) => callsBatch.delete(d.ref));
    await callsBatch.commit();

    // 2. Delete all activity logs
    const logsSnap = await getDocs(collection(db, COLLECTIONS.LOGS));
    const logsBatch = writeBatch(db);
    logsSnap.docs.forEach((d) => logsBatch.delete(d.ref));
    await logsBatch.commit();

    // 2.5. Reset Operators in DB to clean trial/initial state
    const opsSnap = await getDocs(collection(db, COLLECTIONS.OPERATORS));
    const opsDeleteBatch = writeBatch(db);
    opsSnap.docs.forEach((d) => opsDeleteBatch.delete(d.ref));
    await opsDeleteBatch.commit();

    const opsBatch = writeBatch(db);
    DEFAULT_USERS.forEach((op) => {
      const opDocRef = doc(db, COLLECTIONS.OPERATORS, op.badgeId);
      opsBatch.set(opDocRef, cleanFirestorePayload(op as unknown as Record<string, unknown>), { merge: true });
    });
    await opsBatch.commit();

    // 3. Reset Lines in DB to clean running state
    const linesBatch = writeBatch(db);
    defaultLines.forEach((line) => {
      const cleanLine: AndonLine = {
        ...line,
        status: "running",
        activeCallsCount: 0,
        actualOutput: 0,
        efficiency: 100,
      };
      const lineDocRef = doc(db, COLLECTIONS.LINES, line.id);
      linesBatch.set(lineDocRef, cleanFirestorePayload(cleanLine as unknown as Record<string, unknown>), { merge: true });
    });
    await linesBatch.commit();
  } catch (e) {
    console.warn("Firestore clean trial data batch failed, resetting local fallback:", e);
    demoState.calls = [];
    demoState.logs = [];
    demoState.operators = DEFAULT_USERS;
    demoState.lines = defaultLines.map(line => ({
      ...line,
      status: "running",
      activeCallsCount: 0,
      actualOutput: 0,
      efficiency: 100,
    }));
    setLocalStorageData(DEMO_KEYS.CALLS, demoState.calls);
    setLocalStorageData(DEMO_KEYS.LOGS, demoState.logs);
    setLocalStorageData(DEMO_KEYS.OPERATORS, demoState.operators);
    setLocalStorageData(DEMO_KEYS.LINES, demoState.lines);
    notifySubscribers("calls");
    notifySubscribers("logs");
    notifySubscribers("operators");
    notifySubscribers("lines");
  }

  // 4. Log clean initialization
  await logActivity(
    "config_change",
    "Sistem Siap Digunakan: Database Dibersihkan",
    "Semua data trial/mock telah dihapus. Sistem dalam kondisi bersih (clean slate) siap untuk operasional pabrik.",
    currentUser || { name: "System Admin", id: "ADMIN-01", role: "admin" }
  );

  // 5. Clean local storage trial artifacts
  if (typeof window !== "undefined") {
    localStorage.removeItem("andon_smart_factory_calls_v1");
  }
}

// ==========================================
// 3. MASTER LINES (CRUD & BULK UPLOAD)
// ==========================================
export function subscribeMasterLines(callback: (lines: AndonLine[]) => void): Unsubscribe {
  if (IS_DEMO_MODE) {
    listeners.lines.push(callback);
    callback(demoState.lines);
    return () => {
      listeners.lines = listeners.lines.filter(cb => cb !== callback);
    };
  }

  try {
    const linesRef = collection(db, COLLECTIONS.LINES);
    return onSnapshot(linesRef, (snapshot) => {
      const lines: AndonLine[] = snapshot.docs.map((d) => ({
        ...d.data(),
        id: d.id,
      } as AndonLine));
      callback(lines);
    }, (err) => {
      console.warn("Firestore master lines subscription error, fallback to local:", err);
      callback(demoState.lines);
    });
  } catch (e) {
    console.warn("Exception during subscribeMasterLines setup:", e);
    callback(demoState.lines);
    return () => {};
  }
}

export async function saveMasterLineInDb(line: AndonLine, currentUser?: { name: string; id: string; role: string }): Promise<void> {
  if (IS_DEMO_MODE) {
    demoState.lines = [line, ...demoState.lines.filter(l => l.id !== line.id)];
    setLocalStorageData(DEMO_KEYS.LINES, demoState.lines);
    notifySubscribers("lines");

    if (currentUser) {
      await logActivity(
        "update_master",
        `Master Lini ${line.name} Disimpan`,
        `Target: ${line.targetDaily} pcs. Stasiun: ${line.workstations?.join(", ") || "-"}.`,
        currentUser,
        { lineId: line.id }
      );
    }
    return;
  }

  try {
    const lineDocRef = doc(db, COLLECTIONS.LINES, line.id);
    await setDoc(lineDocRef, cleanFirestorePayload(line as unknown as Record<string, unknown>), { merge: true });
  } catch (e) {
    console.warn("Failed to save master line in Firestore, saving locally:", e);
    demoState.lines = [line, ...demoState.lines.filter(l => l.id !== line.id)];
    setLocalStorageData(DEMO_KEYS.LINES, demoState.lines);
    notifySubscribers("lines");
  }

  if (currentUser) {
    await logActivity(
      "update_master",
      `Master Lini ${line.name} Disimpan`,
      `Target: ${line.targetDaily} pcs. Stasiun: ${line.workstations?.join(", ") || "-"}.`,
      currentUser,
      { lineId: line.id }
    );
  }
}

export async function deleteMasterLineInDb(lineId: string, currentUser?: { name: string; id: string; role: string }): Promise<void> {
  if (IS_DEMO_MODE) {
    demoState.lines = demoState.lines.filter(l => l.id !== lineId);
    setLocalStorageData(DEMO_KEYS.LINES, demoState.lines);
    notifySubscribers("lines");

    if (currentUser) {
      await logActivity(
        "update_master",
        `Master Lini ${lineId} Dihapus`,
        `Lini dihapus dari master konfigurasi.`,
        currentUser,
        { lineId }
      );
    }
    return;
  }

  try {
    const lineDocRef = doc(db, COLLECTIONS.LINES, lineId);
    await deleteDoc(lineDocRef);
  } catch (e) {
    console.warn("Failed to delete master line in Firestore, updating locally:", e);
    demoState.lines = demoState.lines.filter(l => l.id !== lineId);
    setLocalStorageData(DEMO_KEYS.LINES, demoState.lines);
    notifySubscribers("lines");
  }

  if (currentUser) {
    await logActivity(
      "update_master",
      `Master Lini ${lineId} Dihapus`,
      `Lini dihapus dari master konfigurasi.`,
      currentUser,
      { lineId }
    );
  }
}

export async function clearAllMasterLinesInDb(): Promise<void> {
  if (IS_DEMO_MODE) {
    demoState.lines = [];
    setLocalStorageData(DEMO_KEYS.LINES, demoState.lines);
    notifySubscribers("lines");
    return;
  }

  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.LINES));
    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (e) {
    console.warn("Failed to clear master lines in Firestore:", e);
    demoState.lines = [];
    setLocalStorageData(DEMO_KEYS.LINES, demoState.lines);
    notifySubscribers("lines");
  }
}

export async function clearAllMasterMachinesInDb(): Promise<void> {
  if (IS_DEMO_MODE) {
    demoState.machines = [];
    setLocalStorageData(DEMO_KEYS.MACHINES, demoState.machines);
    notifySubscribers("machines");
    return;
  }

  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.MACHINES));
    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (e) {
    console.warn("Failed to clear master machines in Firestore:", e);
    demoState.machines = [];
    setLocalStorageData(DEMO_KEYS.MACHINES, demoState.machines);
    notifySubscribers("machines");
  }
}

export async function bulkUploadMasterLinesInDb(
  lines: AndonLine[], 
  currentUser?: { name: string; id: string; role: string }
): Promise<void> {
  if (IS_DEMO_MODE) {
    const existingIds = lines.map(l => l.id);
    demoState.lines = [...lines, ...demoState.lines.filter(l => !existingIds.includes(l.id))];
    setLocalStorageData(DEMO_KEYS.LINES, demoState.lines);
    notifySubscribers("lines");

    if (currentUser) {
      await logActivity(
        "upload_master",
        `Upload Master Lini (${lines.length} Baris)`,
        `Berhasil mengimpor ${lines.length} master lini produksi dari file Excel/CSV.`,
        currentUser
      );
    }
    return;
  }

  try {
    const batch = writeBatch(db);
    lines.forEach((line) => {
      const docRef = doc(db, COLLECTIONS.LINES, line.id);
      batch.set(docRef, cleanFirestorePayload(line as unknown as Record<string, unknown>), { merge: true });
    });
    await batch.commit();
  } catch (e) {
    console.warn("Bulk upload master lines Firestore failed, applying locally:", e);
    const existingIds = lines.map(l => l.id);
    demoState.lines = [...lines, ...demoState.lines.filter(l => !existingIds.includes(l.id))];
    setLocalStorageData(DEMO_KEYS.LINES, demoState.lines);
    notifySubscribers("lines");
  }

  if (currentUser) {
    await logActivity(
      "upload_master",
      `Upload Master Lini (${lines.length} Baris)`,
      `Berhasil mengimpor ${lines.length} master lini produksi dari file Excel/CSV.`,
      currentUser
    );
  }
}

// ==========================================
// 4. MASTER MACHINES (CRUD & BULK UPLOAD)
// ==========================================
export function subscribeMasterMachines(callback: (machines: MasterMachine[]) => void): Unsubscribe {
  if (IS_DEMO_MODE) {
    listeners.machines.push(callback);
    callback(demoState.machines);
    return () => {
      listeners.machines = listeners.machines.filter(cb => cb !== callback);
    };
  }

  try {
    const mchRef = collection(db, COLLECTIONS.MACHINES);
    return onSnapshot(mchRef, (snapshot) => {
      const machines: MasterMachine[] = snapshot.docs.map((d) => ({
        ...d.data(),
        id: d.id,
      } as MasterMachine));
      callback(machines);
    }, (err) => {
      console.warn("Firestore master machines subscription error, fallback to local:", err);
      callback(demoState.machines);
    });
  } catch (e) {
    console.warn("Exception during subscribeMasterMachines setup:", e);
    callback(demoState.machines);
    return () => {};
  }
}

export async function bulkUploadMasterMachinesInDb(
  machines: MasterMachine[], 
  currentUser?: { name: string; id: string; role: string }
): Promise<void> {
  if (IS_DEMO_MODE) {
    const existingIds = machines.map(m => m.id);
    demoState.machines = [...machines, ...demoState.machines.filter(m => !existingIds.includes(m.id))];
    setLocalStorageData(DEMO_KEYS.MACHINES, demoState.machines);
    notifySubscribers("machines");

    if (currentUser) {
      await logActivity(
        "upload_master",
        `Upload Master Mesin (${machines.length} Unit)`,
        `Berhasil mengimpor ${machines.length} data mesin dari file spreadsheet.`,
        currentUser
      );
    }
    return;
  }

  try {
    const batch = writeBatch(db);
    machines.forEach((mch) => {
      const docRef = doc(db, COLLECTIONS.MACHINES, mch.id);
      batch.set(docRef, cleanFirestorePayload(mch as unknown as Record<string, unknown>), { merge: true });
    });
    await batch.commit();
  } catch (e) {
    console.warn("Bulk upload machines Firestore failed, saving locally:", e);
    const existingIds = machines.map(m => m.id);
    demoState.machines = [...machines, ...demoState.machines.filter(m => !existingIds.includes(m.id))];
    setLocalStorageData(DEMO_KEYS.MACHINES, demoState.machines);
    notifySubscribers("machines");
  }

  if (currentUser) {
    await logActivity(
      "upload_master",
      `Upload Master Mesin (${machines.length} Unit)`,
      `Berhasil mengimpor ${machines.length} data mesin dari file spreadsheet.`,
      currentUser
    );
  }
}

// ==========================================
// 5. MASTER OPERATORS (CRUD, SUBSCRIPTIONS, BULK)
// ==========================================
export function subscribeMasterOperators(callback: (operators: UserProfile[]) => void): Unsubscribe {
  if (IS_DEMO_MODE) {
    listeners.operators.push(callback);
    callback(demoState.operators);
    return () => {
      listeners.operators = listeners.operators.filter(cb => cb !== callback);
    };
  }

  try {
    const opRef = collection(db, COLLECTIONS.OPERATORS);
    return onSnapshot(opRef, (snapshot) => {
      const operators: UserProfile[] = snapshot.docs.map((d) => ({
        ...d.data(),
        id: d.id,
      } as UserProfile));
      callback(operators);
    }, (err) => {
      console.warn("Firestore master operators subscription error, fallback to local:", err);
      callback(demoState.operators);
    });
  } catch (e) {
    console.warn("Exception during subscribeMasterOperators setup:", e);
    callback(demoState.operators);
    return () => {};
  }
}

export async function saveMasterOperatorInDb(operator: UserProfile, currentUser?: { name: string; id: string; role: string }): Promise<void> {
  if (IS_DEMO_MODE) {
    demoState.operators = [operator, ...demoState.operators.filter(op => op.badgeId !== operator.badgeId)];
    setLocalStorageData(DEMO_KEYS.OPERATORS, demoState.operators);
    notifySubscribers("operators");

    if (currentUser) {
      await logActivity(
        "update_master",
        `Operator ${operator.name} Disimpan`,
        `Role: ${operator.role.toUpperCase()} | NPK: ${operator.badgeId} | Dept: ${operator.department || "-"}`,
        currentUser
      );
    }
    return;
  }

  try {
    const docId = operator.id || operator.badgeId;
    const opDocRef = doc(db, COLLECTIONS.OPERATORS, docId);
    await setDoc(opDocRef, cleanFirestorePayload(operator as unknown as Record<string, unknown>), { merge: true });
  } catch (e) {
    console.warn("Failed to save master operator in Firestore, updating locally:", e);
    demoState.operators = [operator, ...demoState.operators.filter(op => op.badgeId !== operator.badgeId)];
    setLocalStorageData(DEMO_KEYS.OPERATORS, demoState.operators);
    notifySubscribers("operators");
  }

  if (currentUser) {
    await logActivity(
      "update_master",
      `Operator ${operator.name} Disimpan`,
      `Role: ${operator.role.toUpperCase()} | NPK: ${operator.badgeId} | Dept: ${operator.department || "-"}`,
      currentUser
    );
  }
}

export async function deleteMasterOperatorInDb(badgeId: string, currentUser?: { name: string; id: string; role: string }): Promise<void> {
  if (IS_DEMO_MODE) {
    demoState.operators = demoState.operators.filter(op => op.badgeId !== badgeId);
    setLocalStorageData(DEMO_KEYS.OPERATORS, demoState.operators);
    notifySubscribers("operators");

    if (currentUser) {
      await logActivity(
        "update_master",
        `Operator NPK ${badgeId} Dihapus`,
        `Data operator dihapus dari sistem.`,
        currentUser
      );
    }
    return;
  }

  try {
    const opDocRef = doc(db, COLLECTIONS.OPERATORS, badgeId);
    await deleteDoc(opDocRef);
  } catch (e) {
    console.warn("Failed to delete master operator in Firestore, updating locally:", e);
    demoState.operators = demoState.operators.filter(op => op.badgeId !== badgeId);
    setLocalStorageData(DEMO_KEYS.OPERATORS, demoState.operators);
    notifySubscribers("operators");
  }

  if (currentUser) {
    await logActivity(
      "update_master",
      `Operator NPK ${badgeId} Dihapus`,
      `Data operator dihapus dari sistem.`,
      currentUser
    );
  }
}

export async function clearAllMasterOperatorsInDb(): Promise<void> {
  if (IS_DEMO_MODE) {
    demoState.operators = [];
    setLocalStorageData(DEMO_KEYS.OPERATORS, demoState.operators);
    notifySubscribers("operators");
    return;
  }

  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.OPERATORS));
    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (e) {
    console.warn("Failed to clear master operators in Firestore:", e);
    demoState.operators = [];
    setLocalStorageData(DEMO_KEYS.OPERATORS, demoState.operators);
    notifySubscribers("operators");
  }
}

export async function bulkUploadMasterOperatorsInDb(
  operators: UserProfile[],
  currentUser?: { name: string; id: string; role: string }
): Promise<void> {
  if (IS_DEMO_MODE) {
    const existingBadges = operators.map(op => op.badgeId);
    demoState.operators = [...operators, ...demoState.operators.filter(op => !existingBadges.includes(op.badgeId))];
    setLocalStorageData(DEMO_KEYS.OPERATORS, demoState.operators);
    notifySubscribers("operators");

    if (currentUser) {
      await logActivity(
        "upload_master",
        `Upload Master Operator (${operators.length} Akun)`,
        `Berhasil mengimpor ${operators.length} akun operator dari file Excel/CSV.`,
        currentUser
      );
    }
    return;
  }

  try {
    const batch = writeBatch(db);
    operators.forEach((op) => {
      const docRef = doc(db, COLLECTIONS.OPERATORS, op.badgeId);
      batch.set(docRef, cleanFirestorePayload(op as unknown as Record<string, unknown>), { merge: true });
    });
    await batch.commit();
  } catch (e) {
    console.warn("Bulk upload master operators Firestore failed, saving locally:", e);
    const existingBadges = operators.map(op => op.badgeId);
    demoState.operators = [...operators, ...demoState.operators.filter(op => !existingBadges.includes(op.badgeId))];
    setLocalStorageData(DEMO_KEYS.OPERATORS, demoState.operators);
    notifySubscribers("operators");
  }

  if (currentUser) {
    await logActivity(
      "upload_master",
      `Upload Master Operator (${operators.length} Akun)`,
      `Berhasil mengimpor ${operators.length} akun operator dari file Excel/CSV.`,
      currentUser
    );
  }
}
