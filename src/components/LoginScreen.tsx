import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  User, 
  Lock, 
  MapPin,
  ArrowRight,
  Languages,
  Activity
} from "lucide-react";
import { UserProfile, AndonLine, AppTheme, AppLanguage } from "../types";
import { saveSession, DEFAULT_USERS } from "../utils/auth";
import { subscribeMasterOperators, logActivity } from "../lib/firestoreService";
import { getTranslation, TranslationKey } from "../utils/i18n";

interface LoginScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
  theme: AppTheme;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  lines: AndonLine[];
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  theme,
  language,
  setLanguage,
  lines,
}) => {
  const [badgeIdOrName, setBadgeIdOrName] = useState<string>("");
  const [selectedLineId, setSelectedLineId] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [dbOperators, setDbOperators] = useState<UserProfile[]>([]);

  const isLight = theme === "light";

  const t = (key: TranslationKey, params?: Record<string, string | number>) => 
    getTranslation(language, key, params);

  // Subscribe to real-time master operators from Firestore
  useEffect(() => {
    const unsub = subscribeMasterOperators((operators) => {
      setDbOperators(operators);
    });
    return () => unsub();
  }, []);

  // Autofill selected line if lines are loaded
  useEffect(() => {
    if (lines.length > 0 && !selectedLineId) {
      setSelectedLineId(lines[0].id);
    }
  }, [lines, selectedLineId]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const inputClean = badgeIdOrName.trim().toLowerCase();
    if (!inputClean) {
      setErrorMessage(language === "en" ? "Please enter NPK, Operator Name, or User ID." : "Silakan masukkan NPK, Nama Operator, atau User ID.");
      return;
    }

    if (!selectedLineId) {
      setErrorMessage(language === "en" ? "Please select a production line." : "Silakan pilih lini produksi.");
      return;
    }

    // Search source: Firestore master operators + fallback preset users (trial data)
    const allUsers = dbOperators.length > 0 ? dbOperators : DEFAULT_USERS;

    const matchedUser = allUsers.find((usr) => {
      const matchId = usr.id?.toLowerCase() === inputClean;
      const matchBadge = usr.badgeId?.toLowerCase() === inputClean;
      const matchName = usr.name?.toLowerCase() === inputClean;
      
      // Allow general match if either matches
      const isUserMatch = matchId || matchBadge || matchName;
      
      // Check password/PIN (default to "1234" if not set on the user object)
      const userPassword = usr.pin || "1234";
      const isPasswordMatch = password === userPassword;

      return isUserMatch && isPasswordMatch;
    });

    if (matchedUser) {
      // Complete user payload with their selected active line
      const sessionUser: UserProfile = {
        ...matchedUser,
        // Override or inject selected line for this login session
        lineAccess: matchedUser.role === "operator" ? [selectedLineId] : matchedUser.lineAccess || ["*"],
      };

      // Also store their chosen active line ID inside localStorage so components can instantly pre-load it
      localStorage.setItem("andon_active_login_line_id", selectedLineId);

      saveSession(sessionUser);

      // Log successful login
      logActivity(
        "login",
        `User Login: ${sessionUser.name}`,
        `Masuk sebagai ${sessionUser.role.toUpperCase()} di Lini ${selectedLineId}.`,
        { name: sessionUser.name, id: sessionUser.badgeId, role: sessionUser.role }
      );

      onLoginSuccess(sessionUser);
    } else {
      setErrorMessage(
        language === "en" 
          ? "Invalid Credentials. Check your NPK / User ID & Password (Default: 1234)." 
          : "Kredensial Salah. Periksa kembali NPK / User ID & Password Anda (Default: 1234)."
      );
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 relative ${
      isLight ? "bg-slate-50" : "bg-neutral-950"
    }`}>
      {/* Dynamic Ambient Background Blur Circles */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className={`w-full max-w-md border rounded-3xl p-8 space-y-6 shadow-2xl relative z-10 transition-colors ${
        isLight ? "bg-white border-slate-200" : "bg-neutral-900 border-neutral-800"
      }`}>
        
        {/* Top Header & Language Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-white">
              <Activity className="w-4 h-4" />
            </div>
            <span className={`text-xs font-black tracking-widest uppercase ${isLight ? "text-slate-900" : "text-white"}`}>
              ANDON SMART
            </span>
          </div>

          <button
            onClick={() => setLanguage(language === "id" ? "en" : "id")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all ${
              isLight
                ? "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700"
            }`}
          >
            <Languages className="w-3 h-3" />
            <span>{language === "id" ? "ID" : "EN"}</span>
          </button>
        </div>

        {/* Brand Greeting */}
        <div className="space-y-1.5">
          <h2 className={`text-xl font-black tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
            {language === "id" ? "Selamat Datang di Sistem Andon" : "Welcome to Andon System"}
          </h2>
          <p className={`text-xs ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
            {language === "id" 
              ? "Silakan login menggunakan akun Operator, Leader, atau Admin Anda." 
              : "Please login with your Operator, Leader, or Admin account."}
          </p>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        {/* 3-Column Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          
          {/* Column 1: NPK / Nama Operator / User ID */}
          <div>
            <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wide ${
              isLight ? "text-slate-700" : "text-neutral-300"
            }`}>
              {language === "id" ? "NPK / Nama Operator / User ID" : "NPK / Operator Name / User ID"}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={badgeIdOrName}
                onChange={(e) => setBadgeIdOrName(e.target.value)}
                placeholder={language === "id" ? "Contoh: OP-1001 atau Agus Pratama" : "E.g. OP-1001 or Agus Pratama"}
                className={`w-full rounded-xl pl-9 pr-3 py-2.5 text-xs border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                  isLight 
                    ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white" 
                    : "bg-neutral-950 border-neutral-800 text-white focus:bg-neutral-900"
                }`}
              />
            </div>
          </div>

          {/* Column 2: Line (Dropdown Selection) */}
          <div>
            <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wide ${
              isLight ? "text-slate-700" : "text-neutral-300"
            }`}>
              {language === "id" ? "Pilih Lini Produksi (Line)" : "Select Production Line (Line)"}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <MapPin className="w-4 h-4" />
              </span>
              <select
                required
                value={selectedLineId}
                onChange={(e) => setSelectedLineId(e.target.value)}
                className={`w-full rounded-xl pl-9 pr-3 py-2.5 text-xs border appearance-none focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                  isLight 
                    ? "bg-slate-50 border-slate-300 text-slate-900" 
                    : "bg-neutral-950 border-neutral-800 text-neutral-200"
                }`}
              >
                {lines.map((ln) => (
                  <option key={ln.id} value={ln.id}>
                    {ln.name} ({ln.id})
                  </option>
                ))}
                {lines.length === 0 && (
                  <option value="LINE-1">Line 1: Machining & CNC Milling (LINE-1)</option>
                )}
              </select>
            </div>
          </div>

          {/* Column 3: Password / PIN */}
          <div>
            <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wide ${
              isLight ? "text-slate-700" : "text-neutral-300"
            }`}>
              Password / PIN
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••"
                className={`w-full rounded-xl pl-9 pr-3 py-2.5 text-xs border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                  isLight 
                    ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white" 
                    : "bg-neutral-950 border-neutral-800 text-white focus:bg-neutral-900"
                }`}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 mt-2 group"
          >
            <span>{language === "id" ? "Masuk ke Sistem" : "Sign In to System"}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        {/* Footer info containing defaults */}
        <div className={`pt-4 border-t text-center text-xs font-bold tracking-wider ${
          isLight ? "border-slate-100 text-slate-400" : "border-neutral-800 text-neutral-500"
        }`}>
          <p className="font-mono">assyteam@2026</p>
        </div>

      </div>
    </div>
  );
};
