import React, { useState, useEffect } from "react";
import { 
  Tv, 
  PhoneCall, 
  Wrench, 
  Map, 
  BarChart3, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Settings, 
  AlertTriangle, 
  Flame, 
  Layers, 
  History, 
  User, 
  LogOut, 
  ShieldCheck, 
  Sun, 
  Moon 
} from "lucide-react";
import { ActiveTab, AndonCall, SoundConfig, UserProfile, AppTheme, AppLanguage } from "../types";
import { getTranslation, TranslationKey } from "../utils/i18n";
import { canResolveAndon, canManageMasterData } from "../utils/permissions";
import { AppLogo } from "./Logo";
import { loadSavedBranding } from "../utils/branding";
import { BrandConfig } from "../types";

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  activeCalls: AndonCall[];
  soundConfig: SoundConfig;
  setSoundConfig: (config: SoundConfig) => void;
  currentUser: UserProfile | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenConfig: () => void;
  onSimulateEmergency: () => void;
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  activeCalls,
  soundConfig,
  setSoundConfig,
  currentUser,
  onOpenLogin,
  onLogout,
  onOpenConfig,
  onSimulateEmergency,
  theme,
  setTheme,
  language,
  setLanguage,
}) => {
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [branding, setBranding] = useState<BrandConfig>(loadSavedBranding);

  const t = (key: TranslationKey, params?: Record<string, string | number>) => 
    getTranslation(language, key, params);

  const isLight = theme === "light";

  const isOperator = currentUser?.role === "operator";
  const isLeader = canResolveAndon(currentUser);
  const isAdmin = canManageMasterData(currentUser);

  useEffect(() => {
    const handleBrandChange = (e: Event) => {
      const customEvent = e as CustomEvent<BrandConfig>;
      if (customEvent.detail) {
        setBranding(customEvent.detail);
      } else {
        setBranding(loadSavedBranding());
      }
    };
    window.addEventListener("andon_brand_change", handleBrandChange);
    return () => window.removeEventListener("andon_brand_change", handleBrandChange);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const locale = language === "id" ? "id-ID" : "en-US";
      setCurrentTime(
        now.toLocaleTimeString(locale, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false
        })
      );
      setCurrentDate(
        now.toLocaleDateString(locale, {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric"
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [language]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const lineStopCount = activeCalls.filter(c => c.isLineStopped && c.status !== 'resolved').length;
  const totalActiveCalls = activeCalls.filter(c => c.status !== 'resolved').length;

  return (
    <header 
      className={`sticky top-0 z-40 select-none transition-colors border-b shadow-sm ${
        isLight
          ? "bg-white border-slate-200 text-slate-800"
          : "bg-neutral-900 border-neutral-800 text-neutral-100"
      }`}
    >
      {/* Top Urgent Banner if any Line Stop */}
      {lineStopCount > 0 && (
        <div className="bg-red-600 text-white px-4 py-1.5 text-xs font-semibold tracking-wider flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 animate-bounce" />
            <span>
              {t("criticalBanner", { count: lineStopCount })}
            </span>
          </div>
          <span className="hidden sm:inline bg-black/30 px-2 py-0.5 rounded text-[10px] uppercase font-mono">
            {t("quickResponse")}
          </span>
        </div>
      )}

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & System Title */}
        <div className="flex items-center gap-3">
          <AppLogo size={branding.logoHeight || 34} theme={theme} />
          <div className="h-6 w-px bg-slate-200 dark:bg-neutral-800 hidden sm:block" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`font-black text-xs sm:text-sm tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                {branding.customAppName || "ANDON SMART FACTORY"}
              </h1>
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase border ${
                isLight 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                  : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
              }`}>
                {t("cloudFirestore")}
              </span>
            </div>
            <p className={`text-[10px] flex items-center gap-1.5 ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
              <span>{branding.customAppSubtitle || t("subtitle")}</span>
              <span className={`w-1 h-1 rounded-full ${isLight ? "bg-slate-300" : "bg-neutral-600"}`} />
              <span className={`font-semibold ${isLight ? "text-amber-700" : "text-amber-300"}`}>
                {t("shiftActive")}
              </span>
            </p>
          </div>
        </div>

        {/* Center Navigation Tabs (All Views) */}
        <nav className={`flex items-center p-1 rounded-2xl border text-xs font-medium overflow-x-auto max-w-full ${
          isLight ? "bg-slate-100/90 border-slate-200" : "bg-neutral-950 border-neutral-800"
        }`}>
          {(isAdmin || isLeader) && (
            <button
              id="tab-main-board"
              onClick={() => setActiveTab("main_board")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                activeTab === "main_board"
                  ? isLight
                    ? "bg-white text-slate-900 font-bold shadow-sm border border-slate-200"
                    : "bg-neutral-800 text-white font-bold shadow-sm border border-neutral-700"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
              }`}
            >
              <Tv className="w-3.5 h-3.5 text-cyan-500" />
              <span>{t("tabMainBoard")}</span>
              {totalActiveCalls > 0 && (
                <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {totalActiveCalls}
                </span>
              )}
            </button>
          )}

          {(isAdmin || isOperator) && (
            <button
              id="tab-operator-call"
              onClick={() => setActiveTab("operator_call")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                activeTab === "operator_call"
                  ? isLight
                    ? "bg-white text-slate-900 font-bold shadow-sm border border-slate-200"
                    : "bg-neutral-800 text-white font-bold shadow-sm border border-neutral-700"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5 text-amber-500" />
              <span>{t("tabOperatorCall")}</span>
            </button>
          )}

          {(isAdmin || isLeader) && (
            <button
              id="tab-responder-terminal"
              onClick={() => setActiveTab("responder_terminal")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                activeTab === "responder_terminal"
                  ? isLight
                    ? "bg-white text-slate-900 font-bold shadow-sm border border-slate-200"
                    : "bg-neutral-800 text-white font-bold shadow-sm border border-neutral-700"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-blue-500" />
              <span>{t("tabResponderTerminal")}</span>
              {totalActiveCalls > 0 && (
                <span className="bg-amber-500 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {totalActiveCalls}
                </span>
              )}
            </button>
          )}

          {(isAdmin || isLeader) && (
            <button
              id="tab-plant-map"
              onClick={() => setActiveTab("plant_map")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                activeTab === "plant_map"
                  ? isLight
                    ? "bg-white text-slate-900 font-bold shadow-sm border border-slate-200"
                    : "bg-neutral-800 text-white font-bold shadow-sm border border-neutral-700"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
              }`}
            >
              <Map className="w-3.5 h-3.5 text-emerald-500" />
              <span>{t("tabPlantMap")}</span>
            </button>
          )}

          {isAdmin && (
            <button
              id="tab-admin-dashboard"
              onClick={() => setActiveTab("admin_dashboard")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                activeTab === "admin_dashboard"
                  ? isLight
                    ? "bg-white text-slate-900 font-bold shadow-sm border border-slate-200"
                    : "bg-neutral-800 text-white font-bold shadow-sm border border-neutral-700"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
              <span>{language === "id" ? "Admin Console" : "Admin Console"}</span>
            </button>
          )}

          {isAdmin && (
            <button
              id="tab-master-data"
              onClick={() => setActiveTab("master_data")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                activeTab === "master_data"
                  ? isLight
                    ? "bg-white text-slate-900 font-bold shadow-sm border border-slate-200"
                    : "bg-neutral-800 text-white font-bold shadow-sm border border-neutral-700"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-cyan-600" />
              <span>{t("tabMasterData")}</span>
            </button>
          )}

          {(isAdmin || isLeader) && (
            <button
              id="tab-activity-logs"
              onClick={() => setActiveTab("activity_logs")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                activeTab === "activity_logs"
                  ? isLight
                    ? "bg-white text-slate-900 font-bold shadow-sm border border-slate-200"
                    : "bg-neutral-800 text-white font-bold shadow-sm border border-neutral-700"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
              }`}
            >
              <History className="w-3.5 h-3.5 text-amber-500" />
              <span>{t("tabActivityLogs")}</span>
            </button>
          )}

          {(isAdmin || isLeader) && (
            <button
              id="tab-analytics"
              onClick={() => setActiveTab("analytics_reports")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                activeTab === "analytics_reports"
                  ? isLight
                    ? "bg-white text-slate-900 font-bold shadow-sm border border-slate-200"
                    : "bg-neutral-800 text-white font-bold shadow-sm border border-neutral-700"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-purple-500" />
              <span>{t("tabAnalytics")}</span>
            </button>
          )}
        </nav>

        {/* Right Action Tools: Language, Theme, Sound, Config, Clock */}
        <div className="flex items-center gap-2">
          {/* Quick Language Toggle Pill */}
          <button
            id="btn-quick-lang"
            onClick={() => {
              const newLang = language === "id" ? "en" : "id";
              setLanguage(newLang);
              setSoundConfig({
                ...soundConfig,
                voiceLanguage: newLang === "id" ? "id-ID" : "en-US",
              });
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm ${
              isLight
                ? "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700"
            }`}
            title={t("langToggle")}
          >
            <span className="text-sm select-none">{language === "id" ? "🇮🇩" : "🇺🇸"}</span>
            <span className="uppercase text-[11px] font-mono">{language === "id" ? "ID" : "EN"}</span>
          </button>

          {/* Quick Theme Toggle (Sun/Moon) */}
          <button
            id="btn-quick-theme"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className={`p-2 rounded-xl border text-xs transition-all shadow-sm ${
              isLight
                ? "bg-slate-50 hover:bg-slate-100 text-amber-600 border-slate-200"
                : "bg-neutral-800 hover:bg-neutral-700 text-amber-400 border-neutral-700"
            }`}
            title={theme === "light" ? t("themeLight") : t("themeDark")}
          >
            {theme === "light" ? (
              <Sun className="w-4 h-4 text-amber-600" />
            ) : (
              <Moon className="w-4 h-4 text-amber-400" />
            )}
          </button>

          {/* User Auth Profile Pill / Login Button */}
          {currentUser ? (
            <div className={`flex items-center border rounded-xl p-1 pr-2 gap-2 shadow-sm ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-neutral-950 border-neutral-800"
            }`}>
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left pl-1"
                title={t("switchAuthority")}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                    currentUser.role === "operator"
                      ? "bg-blue-500/20 text-blue-600"
                      : currentUser.role === "technician"
                      ? "bg-amber-500/20 text-amber-600"
                      : currentUser.role === "supervisor"
                      ? "bg-purple-500/20 text-purple-600"
                      : "bg-emerald-500/20 text-emerald-600"
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="hidden lg:block">
                  <div className={`text-[11px] font-bold leading-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                    {currentUser.name}
                  </div>
                  <div className={`text-[9px] font-mono uppercase ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                    {currentUser.role} ({currentUser.badgeId})
                  </div>
                </div>
              </button>
              <button
                onClick={onLogout}
                className={`p-1 rounded-lg transition-colors ${
                  isLight 
                    ? "text-slate-400 hover:text-red-600 hover:bg-slate-200/60" 
                    : "text-neutral-500 hover:text-red-400 hover:bg-neutral-800"
                }`}
                title={t("logout")}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{t("authorityLogin")}</span>
            </button>
          )}

          {/* Quick Simulation Trigger */}
          <button
            id="btn-simulate-call"
            onClick={onSimulateEmergency}
            className={`hidden 2xl:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors border ${
              isLight
                ? "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700"
            }`}
            title="Simulasi Panggilan Cepat"
          >
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            <span>{t("simulateCall")}</span>
          </button>

          {/* Sound Toggle */}
          <button
            id="btn-toggle-sound"
            onClick={() => {
              setSoundConfig({
                ...soundConfig,
                soundEnabled: !soundConfig.soundEnabled
              });
            }}
            className={`p-2 rounded-xl border text-xs transition-colors shadow-sm ${
              soundConfig.soundEnabled
                ? isLight
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                  : "bg-neutral-800 border-neutral-700 text-emerald-400 hover:bg-neutral-700"
                : isLight
                ? "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
                : "bg-neutral-800/50 border-neutral-800 text-neutral-500 hover:bg-neutral-800"
            }`}
            title={soundConfig.soundEnabled ? t("soundActive") : t("soundMuted")}
          >
            {soundConfig.soundEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>

          {/* Settings Config */}
          <button
            id="btn-settings"
            onClick={onOpenConfig}
            className={`p-2 rounded-xl border transition-colors shadow-sm ${
              isLight
                ? "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700"
            }`}
            title={t("settings")}
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            id="btn-fullscreen"
            onClick={toggleFullscreen}
            className={`p-2 rounded-xl border transition-colors shadow-sm hidden sm:block ${
              isLight
                ? "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700"
            }`}
            title={t("fullscreen")}
          >
            {isFullscreen ? (
              <Minimize className="w-4 h-4" />
            ) : (
              <Maximize className="w-4 h-4" />
            )}
          </button>

          {/* Factory Clock */}
          <div className={`px-3 py-1 rounded-xl text-right hidden lg:block border shadow-sm ${
            isLight
              ? "bg-slate-50 border-slate-200"
              : "bg-black/60 border-neutral-800"
          }`}>
            <div className={`font-mono font-black text-xs tracking-wider ${
              isLight ? "text-amber-700" : "text-amber-400"
            }`}>
              {currentTime || "--:--:--"}
            </div>
            <div className={`text-[9px] font-medium ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
              {currentDate}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
