import React, { useState } from "react";
import { 
  ShieldCheck, 
  User, 
  ChevronRight,
} from "lucide-react";
import { UserProfile, UserRole, AppTheme, AppLanguage } from "../types";
import { DEFAULT_USERS, saveSession } from "../utils/auth";
import { logActivity } from "../lib/firestoreService";
import { getTranslation, TranslationKey } from "../utils/i18n";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
  theme?: AppTheme;
  language?: AppLanguage;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  theme = "light",
  language = "id",
}) => {
  const [customName, setCustomName] = useState<string>("");
  const [customRole, setCustomRole] = useState<UserRole>("operator");
  const [isManualEntry, setIsManualEntry] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  if (!isOpen) return null;

  const t = (key: TranslationKey, params?: Record<string, string | number>) => 
    getTranslation(language, key, params);

  const isLight = theme === "light";

  const handleQuickLogin = (presetUser: UserProfile) => {
    saveSession(presetUser);
    logActivity(
      "login",
      `User Login: ${presetUser.name}`,
      `Masuk sebagai ${presetUser.role.toUpperCase()} (${presetUser.badgeId}) di departemen ${presetUser.department}.`,
      { name: presetUser.name, id: presetUser.badgeId, role: presetUser.role }
    );
    onLoginSuccess(presetUser);
    onClose();
  };

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) {
      setErrorMessage(language === "en" ? "Please enter full name or Badge ID." : "Silakan masukkan nama lengkap atau ID badge.");
      return;
    }

    const newUser: UserProfile = {
      id: `USR-${Date.now()}`,
      name: customName.trim(),
      badgeId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      role: customRole,
      department: customRole === "technician" ? "Maintenance Dept" : customRole === "supervisor" ? "Production Control" : customRole === "admin" ? "Plant IT" : "Shop Floor Operations",
      lineAccess: ["*"],
    };

    saveSession(newUser);
    logActivity(
      "login",
      `User Login: ${newUser.name}`,
      `Login manual peran ${newUser.role.toUpperCase()}.`,
      { name: newUser.name, id: newUser.badgeId, role: newUser.role }
    );
    onLoginSuccess(newUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className={`border rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative transition-colors ${
        isLight ? "bg-white border-slate-200 text-slate-900" : "bg-neutral-900 border-neutral-800 text-neutral-100"
      }`}>
        {/* Modal Header */}
        <div className={`flex items-start justify-between border-b pb-3 ${isLight ? "border-slate-200" : "border-neutral-800"}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border ${
              isLight ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-amber-500/20 text-amber-400 border-amber-500/30"
            }`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className={`text-lg font-black ${isLight ? "text-slate-900" : "text-white"}`}>
                {t("loginTitle")}
              </h3>
              <p className={`text-xs ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                {t("loginSubtitle")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1 text-lg font-bold ${isLight ? "text-slate-400 hover:text-slate-900" : "text-neutral-400 hover:text-white"}`}
          >
            ✕
          </button>
        </div>

        {/* Mode Switch: Quick Select Presets vs Manual Entry */}
        <div className={`flex items-center gap-1 p-1 rounded-xl border text-xs ${
          isLight ? "bg-slate-100 border-slate-200" : "bg-neutral-950 border-neutral-800"
        }`}>
          <button
            onClick={() => setIsManualEntry(false)}
            className={`flex-1 py-2 rounded-lg font-bold transition-all ${
              !isManualEntry
                ? isLight
                  ? "bg-white text-slate-900 shadow-sm"
                  : "bg-neutral-800 text-white shadow-sm"
                : isLight
                ? "text-slate-600 hover:text-slate-900"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            {language === "en" ? "Preset Factory Profiles" : "Profil Cepat (Quick Preset)"}
          </button>
          <button
            onClick={() => setIsManualEntry(true)}
            className={`flex-1 py-2 rounded-lg font-bold transition-all ${
              isManualEntry
                ? isLight
                  ? "bg-white text-slate-900 shadow-sm"
                  : "bg-neutral-800 text-white shadow-sm"
                : isLight
                ? "text-slate-600 hover:text-slate-900"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            {language === "en" ? "Manual Badge Entry" : "Input Manual ID & Peran"}
          </button>
        </div>

        {/* Preset Profiles List */}
        {!isManualEntry ? (
          <div className="space-y-2.5">
            <label className={`block text-xs font-bold uppercase tracking-wider ${
              isLight ? "text-slate-600" : "text-neutral-400"
            }`}>
              {language === "en" ? "Select Active Role:" : "Pilih Peran Otoritas:"}
            </label>
            <div className="space-y-2">
              {DEFAULT_USERS.map((usr) => {
                return (
                  <button
                    key={usr.id}
                    id={`login-preset-${usr.badgeId}`}
                    onClick={() => handleQuickLogin(usr)}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all group ${
                      isLight
                        ? "bg-slate-50 border-slate-200 hover:border-amber-500 hover:bg-amber-50/40 hover:shadow-sm"
                        : "bg-neutral-950 border-neutral-800 hover:border-amber-500/60 hover:bg-neutral-900"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs border ${
                        usr.role === "admin"
                          ? "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30"
                          : usr.role === "supervisor"
                          ? "bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30"
                          : usr.role === "technician"
                          ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30"
                          : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      }`}>
                        {usr.role.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className={`text-xs font-black ${isLight ? "text-slate-900" : "text-white"}`}>
                          {usr.name}
                        </div>
                        <div className={`text-[11px] font-mono ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                          {usr.role.toUpperCase()} • {usr.badgeId} ({usr.department})
                        </div>
                      </div>
                    </div>

                    <div className={`flex items-center gap-1 font-bold text-xs ${
                      isLight ? "text-slate-400 group-hover:text-amber-700" : "text-neutral-500 group-hover:text-amber-400"
                    }`}>
                      <span>Masuk</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <form onSubmit={handleCustomLogin} className="space-y-3.5 text-xs">
            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 text-xs">
                {errorMessage}
              </div>
            )}

            <div>
              <label className={`block font-bold mb-1 ${isLight ? "text-slate-700" : "text-neutral-300"}`}>
                Nama Lengkap Petugas
              </label>
              <input
                type="text"
                required
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Contoh: Hendra Setiawan"
                className={`w-full rounded-xl px-3 py-2.5 border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                  isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-neutral-950 border-neutral-800 text-white"
                }`}
              />
            </div>

            <div>
              <label className={`block font-bold mb-1 ${isLight ? "text-slate-700" : "text-neutral-300"}`}>
                Tingkat Otoritas (Role)
              </label>
              <select
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value as UserRole)}
                className={`w-full rounded-xl px-3 py-2.5 border focus:outline-none ${
                  isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-neutral-950 border-neutral-800 text-neutral-200"
                }`}
              >
                <option value="operator">Operator (Memanggil Andon Lini)</option>
                <option value="technician">Teknisi / Responder (Merespon & Menangani Masalah)</option>
                <option value="supervisor">Supervisor (Manajemen Lini & Target OEE)</option>
                <option value="admin">Administrator (Upload Master Data & Konfigurasi Penuh)</option>
              </select>
            </div>

            <div className={`pt-3 flex items-center justify-end gap-2 border-t ${isLight ? "border-slate-200" : "border-neutral-800"}`}>
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                  isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                }`}
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md"
              >
                Masuk Sesi Sekarang
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
