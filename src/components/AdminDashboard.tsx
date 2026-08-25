import React, { useState, useEffect } from "react";
import { 
  Activity, 
  ShieldAlert, 
  Database, 
  Server, 
  Cpu, 
  Clock, 
  Trash2, 
  UserPlus, 
  Search, 
  ShieldCheck, 
  AlertCircle, 
  ListRestart, 
  CheckCircle2, 
  ActivitySquare,
  HardDrive
} from "lucide-react";
import { UserProfile, UserRole, ActivityLog, AndonCall, AndonLine } from "../types";
import { 
  subscribeMasterOperators, 
  saveMasterOperatorInDb, 
  deleteMasterOperatorInDb,
  subscribeActivityLogs,
  IS_DEMO_MODE
} from "../lib/firestoreService";
import { localizeActivityLog } from "../utils/activityLogger";
import { motion, AnimatePresence } from "motion/react";

interface AdminDashboardProps {
  lines: AndonLine[];
  calls: AndonCall[];
  currentUser: UserProfile | null;
  theme: "light" | "dark";
  language: "id" | "en";
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  lines,
  calls,
  currentUser,
  theme,
  language,
}) => {
  const isLight = theme === "light";
  const isAdmin = currentUser?.role === "admin";

  // State managers
  const [operators, setOperators] = useState<UserProfile[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  
  // New User Form State
  const [newBadgeId, setNewBadgeId] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("operator");
  const [newDept, setNewDept] = useState("Production");
  const [newPin, setNewPin] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // System Metric State Simulations
  const [dbPing, setDbPing] = useState(24);
  const [cpuUsage, setCpuUsage] = useState(2.4);
  const [ramUsage, setRamUsage] = useState(142);
  const [uptime, setUptime] = useState("4d 12h 35m");

  // Real-time Database listeners
  useEffect(() => {
    if (!isAdmin) return;

    const unsubOps = subscribeMasterOperators((data) => {
      setOperators(data);
    });

    const unsubLogs = subscribeActivityLogs((logs) => {
      setActivityLogs(logs.slice(0, 100)); // Keep last 100 logs
    });

    // Simulate light dynamic values for metrics
    const interval = setInterval(() => {
      setDbPing(prev => Math.max(12, Math.min(60, prev + Math.floor(Math.random() * 9) - 4)));
      setCpuUsage(prev => Math.max(1.1, Math.min(8.5, prev + (Math.random() * 1.2) - 0.6)));
      setRamUsage(prev => Math.max(135, Math.min(150, prev + Math.floor(Math.random() * 5) - 2)));
    }, 4000);

    // Live Uptime counter
    const startSecs = Math.floor(Date.now() / 1000) - 390935; // ~4.5 days ago
    const uptimeInterval = setInterval(() => {
      const diff = Math.floor(Date.now() / 1000) - startSecs;
      const days = Math.floor(diff / (24 * 3600));
      const hours = Math.floor((diff % (24 * 3600)) / 3600);
      const mins = Math.floor((diff % 3600) / 60);
      const secs = diff % 60;
      setUptime(`${days}d ${hours}h ${mins}m ${secs}s`);
    }, 1000);

    return () => {
      unsubOps();
      unsubLogs();
      clearInterval(interval);
      clearInterval(uptimeInterval);
    };
  }, [isAdmin]);

  // Handle adding users
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    
    const badgeClean = newBadgeId.trim();
    const nameClean = newName.trim();
    const pinClean = newPin.trim();
    const emailClean = newEmail.trim();

    if (!badgeClean || !nameClean || !pinClean) {
      setFormError(language === "id" ? "Mohon lengkapi NPK, Nama, dan PIN." : "Please fill NPK, Name, and PIN.");
      return;
    }

    if (pinClean.length < 4) {
      setFormError(language === "id" ? "PIN minimal harus 4 digit." : "PIN must be at least 4 digits.");
      return;
    }

    // Check duplicate badge ID in current active list
    if (operators.some(op => op.badgeId.toLowerCase() === badgeClean.toLowerCase())) {
      setFormError(language === "id" ? `NPK ${badgeClean} sudah terdaftar!` : `NPK ${badgeClean} is already registered!`);
      return;
    }

    setIsSubmitting(true);
    try {
      const newUser: UserProfile = {
        id: `USR-${badgeClean}`,
        badgeId: badgeClean,
        name: nameClean,
        role: newRole,
        department: newDept || "Production",
        pin: pinClean,
        lineAccess: ["*"], // Full system line access by default
        email: emailClean || `${badgeClean.toLowerCase()}@smartandon.local`
      };

      await saveMasterOperatorInDb(newUser, currentUser || undefined);
      
      setFormSuccess(language === "id" ? `Berhasil membuat akun: ${nameClean}` : `Successfully created user: ${nameClean}`);
      setNewBadgeId("");
      setNewName("");
      setNewPin("");
      setNewEmail("");
      setNewRole("operator");
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete user
  const handleDeleteUser = async (badgeId: string, name: string) => {
    const isConfirmed = window.confirm(
      language === "id" 
        ? `Apakah Anda yakin ingin menghapus user ${name} (NPK: ${badgeId})?`
        : `Are you sure you want to delete user ${name} (NPK: ${badgeId})?`
    );

    if (!isConfirmed) return;

    try {
      await deleteMasterOperatorInDb(badgeId, currentUser || undefined);
    } catch (err: unknown) {
      alert("Error: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Secure Role Guard Screen
  if (!isAdmin) {
    return (
      <div className={`flex flex-col items-center justify-center p-12 rounded-2xl border text-center ${
        isLight ? "bg-white border-slate-200" : "bg-neutral-900 border-neutral-800"
      }`}>
        <ShieldAlert className="w-16 h-16 text-rose-500 animate-pulse mb-4" />
        <h2 className={`text-2xl font-black mb-2 ${isLight ? "text-slate-900" : "text-white"}`}>
          {language === "id" ? "Akses Ditolak!" : "Access Denied!"}
        </h2>
        <p className={`max-w-md text-sm mb-6 ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
          {language === "id" 
            ? "Halaman ini sangat rahasia dan hanya dapat diakses oleh personil dengan peran Administrator Utama." 
            : "This screen is highly secure and only accessible by core system administrators."}
        </p>
      </div>
    );
  }

  // Filter operator list
  const filteredOperators = operators.filter(op => {
    const matchSearch = 
      op.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      op.badgeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (op.department || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchRole = roleFilter === "all" || op.role === roleFilter;

    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-6">
      {/* Header and Summary Status bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/10 text-rose-500 tracking-wider">
              Secure Guard Active
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-500 tracking-wider">
              {IS_DEMO_MODE ? "Sandbox Mode" : "Firebase Cloud Mode"}
            </span>
          </div>
          <h1 className={`text-3xl font-black tracking-tight mt-1 ${isLight ? "text-slate-900" : "text-white"}`}>
            {language === "id" ? "Admin Console & Health" : "Admin Console & Health"}
          </h1>
          <p className={`text-xs mt-0.5 ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
            {language === "id" 
              ? "Pusat pemantauan kesehatan server, audit log sistem, dan kontrol manajemen akun operator."
              : "Core operational hub monitoring cloud server health, system logs, and operator accounts."}
          </p>
        </div>
      </div>

      {/* Grid 1: Server and Database Health Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Database Status Card */}
        <div className={`p-4 rounded-2xl border flex items-start gap-3.5 shadow-sm transition-all ${
          isLight ? "bg-white border-slate-100" : "bg-neutral-900 border-neutral-800"
        }`}>
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-500">
            <Database className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 block">
              Cloud Database
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className={`text-xl font-black ${isLight ? "text-slate-800" : "text-white"}`}>
                {dbPing}ms
              </span>
              <span className="text-[10px] font-black text-emerald-500 uppercase">
                Active
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[10px] text-neutral-400 truncate">
                Firestore Connected
              </span>
            </div>
          </div>
        </div>

        {/* Port / Server Node Status */}
        <div className={`p-4 rounded-2xl border flex items-start gap-3.5 shadow-sm transition-all ${
          isLight ? "bg-white border-slate-100" : "bg-neutral-900 border-neutral-800"
        }`}>
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
            <Server className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 block">
              Production Port
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className={`text-xl font-black ${isLight ? "text-slate-800" : "text-white"}`}>
                PORT 3000
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-neutral-400 truncate">
                Host 0.0.0.0 Running
              </span>
            </div>
          </div>
        </div>

        {/* CPU/Memory Consumption */}
        <div className={`p-4 rounded-2xl border flex items-start gap-3.5 shadow-sm transition-all ${
          isLight ? "bg-white border-slate-100" : "bg-neutral-900 border-neutral-800"
        }`}>
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
            <Cpu className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 block">
              VM Utilization
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className={`text-xl font-black ${isLight ? "text-slate-800" : "text-white"}`}>
                {cpuUsage.toFixed(1)}% CPU
              </span>
            </div>
            <span className="text-[10px] text-neutral-400 block mt-1">
              RAM Usage: {ramUsage} MB
            </span>
          </div>
        </div>

        {/* System Node Uptime */}
        <div className={`p-4 rounded-2xl border flex items-start gap-3.5 shadow-sm transition-all ${
          isLight ? "bg-white border-slate-100" : "bg-neutral-900 border-neutral-800"
        }`}>
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
            <Clock className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 block">
              Runtime Uptime
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className={`text-base font-black ${isLight ? "text-slate-800" : "text-white"}`}>
                {uptime}
              </span>
            </div>
            <span className="text-[10px] text-neutral-400 block mt-1">
              Status: Excellent Health
            </span>
          </div>
        </div>
      </div>

      {/* NEW: Firebase Console Database Selection Guide */}
      <div className={`p-5 rounded-2xl border flex flex-col md:flex-row gap-4 items-start shadow-sm transition-all ${
        isLight ? "bg-amber-50/50 border-amber-200" : "bg-amber-950/10 border-amber-900/30"
      }`}>
        <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
          <AlertCircle className="w-6 h-6 animate-pulse" />
        </div>
        <div className="flex-1 space-y-2">
          <h3 className={`text-sm font-black flex items-center gap-2 ${isLight ? "text-amber-800" : "text-amber-200"}`}>
            💡 {language === "id" ? "Petunjuk Penting: Menemukan Data Anda di Firebase Console" : "Important: How to view your live data in the Firebase Console"}
          </h3>
          <p className="text-xs leading-relaxed text-neutral-400">
            {language === "id" 
              ? "Ketika Anda membuka halaman Firestore Database di Firebase Console, konsol secara default hanya akan menampilkan database "
              : "When viewing the Firestore Database section in your Firebase Console, Google Cloud displays the "}
            <strong className={`${isLight ? "text-slate-800" : "text-white"}`}>&quot;(default)&quot;</strong> 
            {language === "id" 
              ? " yang kosong. Agar seluruh data real Anda terlihat, Anda wajib memilih database kustom di bawah ini:"
              : " database by default, which is empty. You must switch databases using the dropdown selector in Firebase:"}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className={`p-3 rounded-xl border text-xs ${isLight ? "bg-white border-amber-200/60" : "bg-neutral-950 border-amber-900/20"}`}>
              <span className="text-[10px] uppercase tracking-wider text-neutral-400 block font-bold">
                Project ID
              </span>
              <code className={`font-mono font-black text-xs ${isLight ? "text-slate-800" : "text-amber-300"}`}>
                {import.meta.env.VITE_FIREBASE_PROJECT_ID || "cloud-andon-production"}
              </code>
            </div>

            <div className={`p-3 rounded-xl border text-xs ${isLight ? "bg-white border-amber-200/60" : "bg-neutral-950 border-amber-900/20"}`}>
              <span className="text-[10px] uppercase tracking-wider text-neutral-400 block font-bold">
                Firestore Database ID (Kustom)
              </span>
              <code className="font-mono font-black text-xs text-cyan-500">
                {import.meta.env.VITE_FIREBASE_DATABASE_ID || "(default)"}
              </code>
            </div>
          </div>

          <p className="text-[11px] font-bold text-neutral-400 pt-1">
            {language === "id" 
              ? "👉 Cara Beralih: Di halaman Firebase Firestore, klik menu dropdown pilihan database di atas tabel data (yang saat ini bertuliskan '(default)'), lalu klik database kustom di atas. Seluruh data operator, lini, dan log Anda akan langsung muncul seketika!"
              : "👉 How to switch: On your Firebase Firestore console page, click the database selector dropdown at the top (currently showing '(default)') and choose the custom database listed above. Your operators, production lines, and logs will appear instantly!"}
          </p>
        </div>
      </div>

      {/* Grid 2: Core User Management Controls & New User Registration Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Account Registry List */}
        <div className={`lg:col-span-2 p-6 rounded-2xl border shadow-sm flex flex-col ${
          isLight ? "bg-white border-slate-100" : "bg-neutral-900 border-neutral-800"
        }`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
            <div>
              <h2 className={`text-lg font-black ${isLight ? "text-slate-900" : "text-white"}`}>
                {language === "id" ? "Daftar Akun Operator & Admin" : "Active Operator & Admin Registry"}
              </h2>
              <p className={`text-xs ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                {language === "id" 
                  ? `${operators.length} akun terdaftar di sistem database pabrik.`
                  : `${operators.length} active authorized users recorded in the database.`}
              </p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder={language === "id" ? "Cari berdasarkan Nama, NPK, atau Departemen..." : "Search Name, NPK, or Department..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 ${
                  isLight 
                    ? "bg-slate-50 border-slate-200 text-slate-800 focus:border-cyan-500 focus:ring-cyan-500" 
                    : "bg-neutral-950 border-neutral-800 text-white focus:border-cyan-500 focus:ring-cyan-500"
                }`}
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className={`px-3 py-2 text-xs rounded-xl border focus:outline-none ${
                isLight 
                  ? "bg-slate-50 border-slate-200 text-slate-800" 
                  : "bg-neutral-950 border-neutral-800 text-white"
              }`}
            >
              <option value="all">{language === "id" ? "Semua Peran" : "All Roles"}</option>
              <option value="admin">Admin / Developer</option>
              <option value="supervisor">Supervisor / Leader</option>
              <option value="technician">Technician</option>
              <option value="operator">Operator</option>
            </select>
          </div>

          {/* Table list */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b ${isLight ? "border-slate-100 text-slate-400" : "border-neutral-800 text-neutral-500"}`}>
                  <th className="py-2.5 font-bold">{language === "id" ? "Nama / Akun" : "Name / Account"}</th>
                  <th className="py-2.5 font-bold">NPK / Badge</th>
                  <th className="py-2.5 font-bold">Departemen</th>
                  <th className="py-2.5 font-bold">Peran</th>
                  <th className="py-2.5 font-bold text-center">PIN</th>
                  <th className="py-2.5 font-bold text-right">{language === "id" ? "Aksi" : "Action"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-solid divide-neutral-100 dark:divide-neutral-800">
                <AnimatePresence>
                  {filteredOperators.map((op) => (
                    <motion.tr 
                      key={op.id || op.badgeId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20`}
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black uppercase ${
                            op.role === "admin" 
                              ? "bg-rose-500/10 text-rose-500" 
                              : op.role === "supervisor"
                              ? "bg-amber-500/10 text-amber-500"
                              : op.role === "technician"
                              ? "bg-blue-500/10 text-blue-500"
                              : "bg-neutral-500/10 text-neutral-400"
                          }`}>
                            {op.name.charAt(0)}
                          </div>
                          <div>
                            <p className={`font-black ${isLight ? "text-slate-800" : "text-white"}`}>{op.name}</p>
                            <p className="text-[10px] text-neutral-400">{op.email || "-"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 font-mono font-bold text-neutral-400">{op.badgeId}</td>
                      <td className="py-3 text-neutral-400">{op.department}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          op.role === "admin" 
                            ? "bg-rose-500/10 text-rose-500" 
                            : op.role === "supervisor"
                            ? "bg-amber-500/10 text-amber-500"
                            : op.role === "technician"
                            ? "bg-blue-500/10 text-blue-500"
                            : "bg-neutral-500/10 text-neutral-400"
                        }`}>
                          {op.role}
                        </span>
                      </td>
                      <td className="py-3 font-mono font-bold text-center text-neutral-400">
                        {op.pin || "••••"}
                      </td>
                      <td className="py-3 text-right">
                        {op.badgeId === "admin01" ? (
                          <span className="text-[10px] text-rose-500 font-bold px-2 py-1 bg-rose-500/10 rounded-lg">
                            System Lock
                          </span>
                        ) : (
                          <button
                            onClick={() => handleDeleteUser(op.badgeId, op.name)}
                            className="p-1 text-neutral-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  ))}

                  {filteredOperators.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-400">
                        {language === "id" ? "Tidak ada akun operator yang cocok." : "No operator accounts matched filters."}
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>

        {/* Create New User Form Card */}
        <div className={`p-6 rounded-2xl border shadow-sm flex flex-col justify-between ${
          isLight ? "bg-white border-slate-100" : "bg-neutral-900 border-neutral-800"
        }`}>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <UserPlus className="w-5 h-5 text-cyan-500" />
              <h2 className={`text-base font-black ${isLight ? "text-slate-900" : "text-white"}`}>
                {language === "id" ? "Registrasi User Baru" : "Register New Account"}
              </h2>
            </div>
            <p className={`text-xs mb-4 ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
              {language === "id" 
                ? "Daftarkan NPK karyawan baru dan tetapkan peran beserta kode PIN masuk."
                : "Add operational badges, security credentials, department routes, and terminal PINs."}
            </p>

            {formError && (
              <div className="p-3 mb-4 rounded-xl text-xs flex items-center gap-2 bg-rose-500/10 text-rose-500 border border-rose-500/20">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p>{formError}</p>
              </div>
            )}

            {formSuccess && (
              <div className="p-3 mb-4 rounded-xl text-xs flex items-center gap-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <p>{formSuccess}</p>
              </div>
            )}

            <form onSubmit={handleAddUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-neutral-400 mb-1">
                  NPK / Badge ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === "id" ? "Contoh: OP-1088 atau ADMIN-99" : "e.g. OP-1088 or ADMIN-99"}
                  value={newBadgeId}
                  onChange={(e) => setNewBadgeId(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${
                    isLight 
                      ? "bg-slate-50 border-slate-200 text-slate-800" 
                      : "bg-neutral-950 border-neutral-800 text-white"
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-400 mb-1">
                  {language === "id" ? "Nama Lengkap *" : "Full Name *"}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === "id" ? "Contoh: John Doe" : "e.g. John Doe"}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${
                    isLight 
                      ? "bg-slate-50 border-slate-200 text-slate-800" 
                      : "bg-neutral-950 border-neutral-800 text-white"
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-neutral-400 mb-1">
                    {language === "id" ? "Hak Akses *" : "Role *"}
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${
                      isLight 
                        ? "bg-slate-50 border-slate-200 text-slate-800" 
                        : "bg-neutral-950 border-neutral-800 text-white"
                    }`}
                  >
                    <option value="operator">Operator</option>
                    <option value="technician">Technician</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="admin">Admin / Dev</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-neutral-400 mb-1">
                    {language === "id" ? "PIN Keamanan *" : "Security PIN *"}
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    placeholder={language === "id" ? "Min 4 angka" : "Min 4 digits"}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                    className={`w-full px-3 py-2 rounded-xl border font-mono tracking-widest text-center focus:outline-none ${
                      isLight 
                        ? "bg-slate-50 border-slate-200 text-slate-800" 
                        : "bg-neutral-950 border-neutral-800 text-white"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-400 mb-1">
                  {language === "id" ? "Departemen" : "Department"}
                </label>
                <input
                  type="text"
                  placeholder={language === "id" ? "Contoh: Assembly, Maintenance, QA" : "e.g. Assembly, Maintenance, QA"}
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${
                    isLight 
                      ? "bg-slate-50 border-slate-200 text-slate-800" 
                      : "bg-neutral-950 border-neutral-800 text-white"
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-400 mb-1">
                  {language === "id" ? "Alamat Email" : "Email Address"}
                </label>
                <input
                  type="email"
                  placeholder={language === "id" ? "Alamat email korespondensi (Opsional)" : "Email address (Optional)"}
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${
                    isLight 
                      ? "bg-slate-50 border-slate-200 text-slate-800" 
                      : "bg-neutral-950 border-neutral-800 text-white"
                  }`}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black py-2.5 rounded-xl transition-all shadow-md hover:shadow-cyan-500/15 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>{language === "id" ? "Daftarkan User" : "Register User"}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Grid 3: Audit Activity Trail Logs Component */}
      <div className={`p-6 rounded-2xl border shadow-sm ${
        isLight ? "bg-white border-slate-100" : "bg-neutral-900 border-neutral-800"
      }`}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <ActivitySquare className="w-5 h-5 text-amber-500" />
            <h2 className={`text-base font-black ${isLight ? "text-slate-900" : "text-white"}`}>
              {language === "id" ? "Live Audit Trail Sistem" : "Live System Audit Trail Logs"}
            </h2>
          </div>
          <span className="text-[10px] bg-slate-100 dark:bg-neutral-950 text-neutral-400 font-bold px-3 py-1 rounded-full">
            Real-time Streaming
          </span>
        </div>

        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
          {activityLogs.map((log) => {
            const isCall = log.action.includes("call");
            const isUpload = log.action.includes("upload") || log.action.includes("update");
            const isAuth = log.action === "login" || log.action === "logout";
            
            return (
              <div 
                key={log.id} 
                className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 transition-colors ${
                  isLight 
                    ? "bg-slate-50/50 hover:bg-slate-50 border-slate-100" 
                    : "bg-neutral-950/40 hover:bg-neutral-950/80 border-neutral-800/80"
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${
                  isCall 
                    ? "bg-rose-500/10 text-rose-500" 
                    : isUpload 
                    ? "bg-cyan-500/10 text-cyan-500" 
                    : isAuth 
                    ? "bg-emerald-500/10 text-emerald-500" 
                    : "bg-amber-500/10 text-amber-500"
                }`}>
                  {isCall ? (
                    <Activity className="w-4 h-4" />
                  ) : isUpload ? (
                    <ListRestart className="w-4 h-4" />
                  ) : isAuth ? (
                    <ShieldCheck className="w-4 h-4" />
                  ) : (
                    <HardDrive className="w-4 h-4" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {(() => {
                    const loc = localizeActivityLog(log, language);
                    return (
                      <>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <span className={`font-black ${isLight ? "text-slate-800" : "text-white"}`}>
                            {loc.title}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            {new Date(log.timestamp).toLocaleString(language === "id" ? "id-ID" : "en-US")}
                          </span>
                        </div>
                        <p className="text-neutral-400 mt-1">{loc.details}</p>
                      </>
                    );
                  })()}
                  <p className="text-[10px] text-neutral-400 font-bold mt-1">
                    By: {log.userName} ({log.userRole.toUpperCase()}) | ID: {log.userId}
                  </p>
                </div>
              </div>
            );
          })}

          {activityLogs.length === 0 && (
            <p className="text-center text-neutral-400 py-6">
              {language === "id" ? "Belum ada aktivitas terekam." : "No action logs recorded yet."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
