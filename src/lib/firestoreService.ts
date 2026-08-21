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
  CallStatus
} from "../types";

// Collections Constants
export const COLLECTIONS = {
  CALLS: "andon_calls",
  LINES: "master_lines",
  MACHINES: "master_machines",
  WORKSTATIONS: "master_workstations",
  LOGS: "activity_logs",
  CONFIG: "system_config",
};

// ==========================================
// 1. ACTIVITY LOGS (AUDIT TRAIL)
// ==========================================
export async function logActivity(
  action: ActivityLog["action"],
  title: string,
  details: string,
  user?: { name: string; id: string; role: string },
  meta?: { callId?: string; lineId?: string; ticketNo?: string }
) {
  try {
    const logsRef = collection(db, COLLECTIONS.LOGS);
    const newLog: Omit<ActivityLog, "id"> = {
      timestamp: Date.now(),
      action,
      title,
      details,
      userId: user?.id || "SYSTEM",
      userName: user?.name || "System Automated",
      userRole: (user?.role as any) || "system",
      callId: meta?.callId,
      lineId: meta?.lineId,
      ticketNo: meta?.ticketNo,
    };
    await addDoc(logsRef, newLog);
  } catch (error) {
    console.error("Failed to write activity log:", error);
  }
}

export function subscribeActivityLogs(callback: (logs: ActivityLog[]) => void) {
  const logsRef = collection(db, COLLECTIONS.LOGS);
  const q = query(logsRef, orderBy("timestamp", "desc"), limit(150));
  
  return onSnapshot(q, (snapshot) => {
    const logs: ActivityLog[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
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
      id: d.id,
      ...d.data(),
    } as AndonCall));
    callback(calls);
  }, (err) => {
    console.error("Error subscribing to andon calls:", err);
  });
}

export async function createAndonCallInDb(
  callData: Omit<AndonCall, "id">, 
  currentUser?: { name: string; id: string; role: string }
): Promise<string> {
  const callsRef = collection(db, COLLECTIONS.CALLS);
  const docRef = await addDoc(callsRef, callData);
  
  if (currentUser) {
    await logActivity(
      "create_call",
      `Tiket Andon ${callData.ticketNo} Dibuka`,
      `Kategori: ${callData.category} di ${callData.lineName} (${callData.workstation}). Line stop: ${callData.isLineStopped ? "YA" : "TIDAK"}.`,
      currentUser,
      { callId: docRef.id, lineId: callData.lineId, ticketNo: callData.ticketNo }
    );
  }
  return docRef.id;
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

  const callDocRef = doc(db, COLLECTIONS.CALLS, callId);
  await updateDoc(callDocRef, updatePayload);

  if (user) {
    const status = updatePayload.status;
    let logAction: ActivityLog["action"] = "acknowledge_call";
    if (status === "in_progress") logAction = "in_progress_call";
    if (status === "resolved") logAction = "resolve_call";

    await logActivity(
      logAction,
      `Update Tiket ${updatePayload.ticketNo || callId}: ${status ? status.toUpperCase() : "DIUBAH"}`,
      updatePayload.rootCause 
        ? `Selesai dengan solusi: ${updatePayload.resolutionNotes || "-"}. Root cause: ${updatePayload.rootCause}`
        : `Status tiket diperbarui menjadi ${status}.`,
      user,
      { callId, ticketNo: updatePayload.ticketNo }
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
    await logActivity(
      "delete_call",
      `Tiket Andon ${ticketNo || callId} Dihapus / Dibatalkan`,
      `Tiket dihapus dari sistem oleh ${currentUser.name}.`,
      currentUser,
      { callId, ticketNo }
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

// ==========================================
// 3. MASTER LINES (CRUD & BULK UPLOAD)
// ==========================================
export function subscribeMasterLines(callback: (lines: AndonLine[]) => void) {
  const linesRef = collection(db, COLLECTIONS.LINES);
  return onSnapshot(linesRef, (snapshot) => {
    const lines: AndonLine[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    } as AndonLine));
    callback(lines);
  }, (err) => {
    console.error("Error subscribing to master lines:", err);
  });
}

export async function saveMasterLineInDb(line: AndonLine, currentUser?: { name: string; id: string; role: string }) {
  const lineDocRef = doc(db, COLLECTIONS.LINES, line.id);
  await setDoc(lineDocRef, line, { merge: true });

  if (currentUser) {
    await logActivity(
      "update_master",
      `Master Lini ${line.name} Disimpan`,
      `Target: ${line.targetDaily} pcs. Stasiun: ${line.workstations.join(", ")}.`,
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

export async function bulkUploadMasterLinesInDb(
  lines: AndonLine[], 
  currentUser?: { name: string; id: string; role: string }
) {
  const batch = writeBatch(db);
  lines.forEach((line) => {
    const docRef = doc(db, COLLECTIONS.LINES, line.id);
    batch.set(docRef, line, { merge: true });
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
      id: d.id,
      ...d.data(),
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
    batch.set(docRef, mch, { merge: true });
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
