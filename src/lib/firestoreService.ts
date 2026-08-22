import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  writeBatch
} from "firebase/firestore";
import { db } from "./firebase";
import { 
  AndonCall, 
  AndonLine, 
  ActivityLog, 
  MasterMachine, 
  MasterWorkstation,
  CallStatus,
  UserProfile
} from "../types";
import { INITIAL_OPERATORS } from "../utils/initialData";

// Collections Constants
export const COLLECTIONS = {
  CALLS: "andon_calls",
  LINES: "master_lines",
  MACHINES: "master_machines",
  WORKSTATIONS: "master_workstations",
  OPERATORS: "master_operators",
  LOGS: "activity_logs",
  CONFIG: "system_config",
};

/**
 * Sanitizes object by removing all undefined values recursively,
 * because Firestore addDoc/setDoc/updateDoc throws when an undefined field is passed.
 */
export function cleanFirestorePayload<T extends Record<string, any>>(obj: T): T {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    }
    if (value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      cleaned[key] = cleanFirestorePayload(value);
    } else if (Array.isArray(value)) {
      cleaned[key] = value.filter((item) => item !== undefined);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned as T;
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
) {
  try {
    const logsRef = collection(db, COLLECTIONS.LOGS);
    const newLog: Record<string, any> = {
      timestamp: Date.now(),
      action: action || "config_change",
      title: title || "Aktivitas Tercatat",
      details: details || "-",
      userId: user?.id || "SYSTEM",
      userName: user?.name || "System Automated",
      userRole: user?.role || "system",
    };

    if (meta?.callId) newLog.callId = meta.callId;
    if (meta?.lineId) newLog.lineId = meta.lineId;
    if (meta?.ticketNo) newLog.ticketNo = meta.ticketNo;

    await addDoc(logsRef, cleanFirestorePayload(newLog));
  } catch (error) {
    console.error("Failed to write activity log:", error);
  }
}

export function subscribeActivityLogs(callback: (logs: ActivityLog[]) => void) {
  const logsRef = collection(db, COLLECTIONS.LOGS);
  const q = query(logsRef, orderBy("timestamp", "desc"), limit(150));
  
  return onSnapshot(q, (snapshot) => {
    const logs: ActivityLog[] = snapshot.docs.map((d) => ({
      ...d.data(),
      id: d.id,
    } as ActivityLog));
    callback(logs);
  }, (err) => {
    console.error("Error subscribing to activity logs:", err);
  });
}

// ==========================================
// 2. ANDON CALLS (REAL-TIME CRUD)
// ==========================================
export function subscribeAndonCalls(callback: (calls: AndonCall[]) => void) {
  const callsRef = collection(db, COLLECTIONS.CALLS);
  const q = query(callsRef, orderBy("timestamp", "desc"));

  return onSnapshot(q, (snapshot) => {
    const calls: AndonCall[] = snapshot.docs.map((d) => ({
      ...d.data(),
      id: d.id,
    } as AndonCall));
    callback(calls);
  }, (err) => {
    console.error("Error subscribing to andon calls:", err);
  });
}

export async function createAndonCallInDb(
  callData: Omit<AndonCall, "id"> | AndonCall, 
  currentUser?: { name: string; id: string; role: string }
): Promise<string> {
  const callId = ("id" in callData && callData.id) 
    ? callData.id 
    : doc(collection(db, COLLECTIONS.CALLS)).id;
    
  const docRef = doc(db, COLLECTIONS.CALLS, callId);
  const cleanedData = cleanFirestorePayload({ ...callData, id: callId });
  await setDoc(docRef, cleanedData, { merge: true });
  
  if (currentUser) {
    const meta: { callId: string; lineId?: string; ticketNo?: string } = { callId };
    if (callData.lineId) meta.lineId = callData.lineId;
    if (callData.ticketNo) meta.ticketNo = callData.ticketNo;

    await logActivity(
      "create_call",
      `Tiket Andon ${callData.ticketNo || callId} Dibuka`,
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
) {
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

  // Use setDoc with merge: true to avoid "No document to update" error
  const callDocRef = doc(db, COLLECTIONS.CALLS, callId);
  await setDoc(callDocRef, cleanFirestorePayload(updatePayload), { merge: true });

  if (user) {
    const status = updatePayload.status;
    let logAction: ActivityLog["action"] = "acknowledge_call";
    if (status === "in_progress") logAction = "in_progress_call";
    if (status === "resolved") logAction = "resolve_call";

    const meta: { callId?: string; ticketNo?: string } = { callId };
    if (updatePayload.ticketNo) meta.ticketNo = updatePayload.ticketNo;

    await logActivity(
      logAction,
      `Update Tiket ${updatePayload.ticketNo || callId}: ${status ? status.toUpperCase() : "DIUBAH"}`,
      updatePayload.rootCause 
        ? `Selesai dengan solusi: ${updatePayload.resolutionNotes || "-"}. Root cause: ${updatePayload.rootCause}`
        : `Status tiket diperbarui menjadi ${status || "diperbarui"}.`,
      user,
      meta
    );
  }
}

export async function deleteAndonCallInDb(
  callId: string, 
  currentUser?: { name: string; id: string; role: string }, 
  ticketNo?: string
) {
  const callDocRef = doc(db, COLLECTIONS.CALLS, callId);
  await deleteDoc(callDocRef);

  if (currentUser) {
    const meta: { callId?: string; ticketNo?: string } = { callId };
    if (ticketNo) meta.ticketNo = ticketNo;

    await logActivity(
      "delete_call",
      `Tiket Andon ${ticketNo || callId} Dihapus / Dibatalkan`,
      `Tiket dihapus dari sistem oleh ${currentUser.name}.`,
      currentUser,
      meta
    );
  }
}

export async function clearAllCallsInDb(currentUser?: { name: string; id: string; role: string }) {
  const snapshot = await getDocs(collection(db, COLLECTIONS.CALLS));
  const batch = writeBatch(db);
  snapshot.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();

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
) {
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
  INITIAL_OPERATORS.forEach((op) => {
    const opDocRef = doc(db, COLLECTIONS.OPERATORS, op.badgeId);
    opsBatch.set(opDocRef, cleanFirestorePayload(op), { merge: true });
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
    linesBatch.set(lineDocRef, cleanFirestorePayload(cleanLine), { merge: true });
  });
  await linesBatch.commit();

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
export function subscribeMasterLines(callback: (lines: AndonLine[]) => void) {
  const linesRef = collection(db, COLLECTIONS.LINES);
  return onSnapshot(linesRef, (snapshot) => {
    const lines: AndonLine[] = snapshot.docs.map((d) => ({
      ...d.data(),
      id: d.id,
    } as AndonLine));
    callback(lines);
  }, (err) => {
    console.error("Error subscribing to master lines:", err);
  });
}

export async function saveMasterLineInDb(line: AndonLine, currentUser?: { name: string; id: string; role: string }) {
  const lineDocRef = doc(db, COLLECTIONS.LINES, line.id);
  await setDoc(lineDocRef, cleanFirestorePayload(line), { merge: true });

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

export async function deleteMasterLineInDb(lineId: string, currentUser?: { name: string; id: string; role: string }) {
  const lineDocRef = doc(db, COLLECTIONS.LINES, lineId);
  await deleteDoc(lineDocRef);

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

export async function clearAllMasterLinesInDb() {
  const snapshot = await getDocs(collection(db, COLLECTIONS.LINES));
  const batch = writeBatch(db);
  snapshot.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

export async function clearAllMasterMachinesInDb() {
  const snapshot = await getDocs(collection(db, COLLECTIONS.MACHINES));
  const batch = writeBatch(db);
  snapshot.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

export async function bulkUploadMasterLinesInDb(
  lines: AndonLine[], 
  currentUser?: { name: string; id: string; role: string }
) {
  const batch = writeBatch(db);
  lines.forEach((line) => {
    const docRef = doc(db, COLLECTIONS.LINES, line.id);
    batch.set(docRef, cleanFirestorePayload(line), { merge: true });
  });
  await batch.commit();

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
export function subscribeMasterMachines(callback: (machines: MasterMachine[]) => void) {
  const mchRef = collection(db, COLLECTIONS.MACHINES);
  return onSnapshot(mchRef, (snapshot) => {
    const machines: MasterMachine[] = snapshot.docs.map((d) => ({
      ...d.data(),
      id: d.id,
    } as MasterMachine));
    callback(machines);
  }, (err) => {
    console.error("Error subscribing to master machines:", err);
  });
}

export async function bulkUploadMasterMachinesInDb(
  machines: MasterMachine[], 
  currentUser?: { name: string; id: string; role: string }
) {
  const batch = writeBatch(db);
  machines.forEach((mch) => {
    const docRef = doc(db, COLLECTIONS.MACHINES, mch.id);
    batch.set(docRef, cleanFirestorePayload(mch), { merge: true });
  });
  await batch.commit();

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
export function subscribeMasterOperators(callback: (operators: UserProfile[]) => void) {
  const opRef = collection(db, COLLECTIONS.OPERATORS);
  return onSnapshot(opRef, (snapshot) => {
    const operators: UserProfile[] = snapshot.docs.map((d) => ({
      ...d.data(),
      id: d.id,
    } as UserProfile));
    callback(operators);
  }, (err) => {
    console.error("Error subscribing to master operators:", err);
  });
}

export async function saveMasterOperatorInDb(operator: UserProfile, currentUser?: { name: string; id: string; role: string }) {
  const opDocRef = doc(db, COLLECTIONS.OPERATORS, operator.badgeId);
  await setDoc(opDocRef, cleanFirestorePayload(operator), { merge: true });

  if (currentUser) {
    await logActivity(
      "update_master",
      `Operator ${operator.name} Disimpan`,
      `Role: ${operator.role.toUpperCase()} | NPK: ${operator.badgeId} | Dept: ${operator.department || "-"}`,
      currentUser
    );
  }
}

export async function deleteMasterOperatorInDb(badgeId: string, currentUser?: { name: string; id: string; role: string }) {
  const opDocRef = doc(db, COLLECTIONS.OPERATORS, badgeId);
  await deleteDoc(opDocRef);

  if (currentUser) {
    await logActivity(
      "update_master",
      `Operator NPK ${badgeId} Dihapus`,
      `Data operator dihapus dari sistem.`,
      currentUser
    );
  }
}

export async function clearAllMasterOperatorsInDb() {
  const snapshot = await getDocs(collection(db, COLLECTIONS.OPERATORS));
  const batch = writeBatch(db);
  snapshot.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

export async function bulkUploadMasterOperatorsInDb(
  operators: UserProfile[],
  currentUser?: { name: string; id: string; role: string }
) {
  const batch = writeBatch(db);
  operators.forEach((op) => {
    const docRef = doc(db, COLLECTIONS.OPERATORS, op.badgeId);
    batch.set(docRef, cleanFirestorePayload(op), { merge: true });
  });
  await batch.commit();

  if (currentUser) {
    await logActivity(
      "upload_master",
      `Upload Master Operator (${operators.length} Akun)`,
      `Berhasil mengimpor ${operators.length} akun operator dari file Excel/CSV.`,
      currentUser
    );
  }
}

