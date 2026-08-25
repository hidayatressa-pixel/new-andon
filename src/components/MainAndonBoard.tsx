import React, { useState, useEffect } from "react";
import { 
  AlertOctagon, 
  CheckCircle2, 
  Clock, 
  Flame, 
  AlertTriangle, 
  ArrowRight, 
  TrendingUp, 
  Activity, 
  Zap,
  HelpCircle,
  Boxes,
  ChevronUp,
  ChevronDown,
  PhoneCall,
  Tv,
  Wrench,
  Database
} from "lucide-react";
import { AndonCall, AndonLine, AppTheme, AppLanguage } from "../types";
import { CATEGORIES_DATA, normalizeCategoryToPrimary } from "../utils/categories";
import { formatDuration, formatTimestamp } from "../utils/storage";
import { getTranslation, TranslationKey } from "../utils/i18n";
import { safeLocalStorageSet, safeLocalStorageGet } from "../utils/sanitizer";

interface MainAndonBoardProps {
  lines: AndonLine[];
  calls: AndonCall[];
  onSelectCall: (call: AndonCall) => void;
  onNavigateToCall: (lineId: string) => void;
  theme?: AppTheme;
  language?: AppLanguage;
}

export const MainAndonBoard: React.FC<MainAndonBoardProps> = ({
  lines,
  calls,
  onSelectCall,
  onNavigateToCall,
  theme = "light",
  language = "id",
}) => {
  const [timerTick, setTimerTick] = useState(Date.now());
  const [showGuide, setShowGuide] = useState<boolean>(() => {
    return safeLocalStorageGet("andon_show_guide") !== "false";
  });

  const t = (key: TranslationKey, params?: Record<string, string | number>) => 
    getTranslation(language, key, params);

  const isLight = theme === "light";

  const toggleGuide = () => {
    const nextState = !showGuide;
    setShowGuide(nextState);
    safeLocalStorageSet("andon_show_guide", String(nextState));
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setTimerTick(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeCalls = calls.filter((c) => c.status !== "resolved");
  const lineStopCalls = activeCalls.filter((c) => c.isLineStopped);
  const resolvedTodayCalls = calls.filter((c) => c.status === "resolved");

  // Summary Metrics
  const totalLines = lines.length;
  const runningLines = lines.filter((l) => l.status === "running").length;
  const lineStopLines = lines.filter((l) => l.status === "critical").length;
  const warningLines = lines.filter((l) => l.status === "warning").length;

  const overallPlantEfficiency = Math.round(
    lines.reduce((acc, l) => acc + l.efficiency, 0) / (totalLines || 1)
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Interactive Workflow Guide for New Users */}
      <div className={`border rounded-2xl p-4 sm:p-5 transition-all shadow-sm ${
        isLight 
          ? "bg-slate-50/80 border-slate-200 text-slate-900" 
          : "bg-neutral-900/90 border-neutral-800 text-neutral-100"
      }`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
              isLight ? "bg-amber-100 text-amber-800" : "bg-amber-500/20 text-amber-400"
            }`}>
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold tracking-tight">
                {t("quickGuideTitle")}
              </h3>
              <p className={`text-[11px] ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                {t("quickGuideSubtitle")}
              </p>
            </div>
          </div>
          <button
            onClick={toggleGuide}
            className={`text-xs font-semibold px-2.5 py-1 rounded-xl flex items-center gap-1 border transition-colors ${
              isLight 
                ? "bg-white hover:bg-slate-100 border-slate-200 text-slate-700" 
                : "bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-300"
            }`}
          >
            <span>{showGuide ? t("hideGuide") : t("showGuide")}</span>
            {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {showGuide && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-3 border-t border-dashed border-slate-200 dark:border-neutral-800">
            {/* Step 1 */}
            <div className={`p-3 rounded-xl border flex flex-col justify-between ${
              isLight ? "bg-white border-slate-200/80 shadow-xs" : "bg-neutral-950 border-neutral-800/80"
            }`}>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center">
                    <PhoneCall className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold">{t("step1Title")}</span>
                </div>
                <p className={`text-[11px] leading-relaxed ${isLight ? "text-slate-600" : "text-neutral-400"}`}>
                  {t("step1Desc")}
                </p>
              </div>
              <button
                onClick={() => onNavigateToCall(lines[0]?.id || "LINE-1")}
                className={`mt-2.5 text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1`}
              >
                <span>{language === "en" ? "Open Operator Terminal" : "Buka Terminal Operator"}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Step 2 */}
            <div className={`p-3 rounded-xl border flex flex-col justify-between ${
              isLight ? "bg-white border-slate-200/80 shadow-xs" : "bg-neutral-950 border-neutral-800/80"
            }`}>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-lg bg-red-500/15 text-red-600 flex items-center justify-center">
                    <Tv className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold">{t("step2Title")}</span>
                </div>
                <p className={`text-[11px] leading-relaxed ${isLight ? "text-slate-600" : "text-neutral-400"}`}>
                  {t("step2Desc")}
                </p>
              </div>
              <span className={`mt-2.5 text-[11px] font-medium ${isLight ? "text-slate-400" : "text-neutral-500"}`}>
                Real-time Sync & Audio Alert
              </span>
            </div>

            {/* Step 3 */}
            <div className={`p-3 rounded-xl border flex flex-col justify-between ${
              isLight ? "bg-white border-slate-200/80 shadow-xs" : "bg-neutral-950 border-neutral-800/80"
            }`}>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/15 text-blue-600 flex items-center justify-center">
                    <Wrench className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold">{t("step3Title")}</span>
                </div>
                <p className={`text-[11px] leading-relaxed ${isLight ? "text-slate-600" : "text-neutral-400"}`}>
                  {t("step3Desc")}
                </p>
              </div>
              <span className={`mt-2.5 text-[11px] font-medium ${isLight ? "text-slate-400" : "text-neutral-500"}`}>
                {language === "en" ? "Rapid On-Site Response" : "Penanganan cepat di lini"}
              </span>
            </div>

            {/* Step 4 */}
            <div className={`p-3 rounded-xl border flex flex-col justify-between ${
              isLight ? "bg-white border-slate-200/80 shadow-xs" : "bg-neutral-950 border-neutral-800/80"
            }`}>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                    <Database className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold">{t("step4Title")}</span>
                </div>
                <p className={`text-[11px] leading-relaxed ${isLight ? "text-slate-600" : "text-neutral-400"}`}>
                  {t("step4Desc")}
                </p>
              </div>
              <span className={`mt-2.5 text-[11px] font-medium ${isLight ? "text-slate-400" : "text-neutral-500"}`}>
                Firestore Cloud & Export Excel
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Top KPI Cards (Andon KPI Header) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Plant Status / Running Lines */}
        <div className={`border rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-sm transition-colors ${
          isLight 
            ? "bg-white border-slate-200 text-slate-900" 
            : "bg-neutral-900 border-neutral-800 text-neutral-100"
        }`}>
          <div>
            <div className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
              {t("plantStatus")}
            </div>
            <div className="text-2xl sm:text-3xl font-black mt-1 flex items-baseline gap-1.5">
              <span className={isLight ? "text-emerald-600" : "text-emerald-400"}>{runningLines}</span>
              <span className={`text-xs sm:text-sm font-semibold ${isLight ? "text-slate-500" : "text-neutral-500"}`}>
                / {totalLines} {t("linesNormal")}
              </span>
            </div>
            <div className={`text-[11px] mt-1 flex items-center gap-1.5 font-medium ${
              isLight ? "text-emerald-700" : "text-emerald-400"
            }`}>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{t("plantSmooth")}</span>
            </div>
          </div>
          <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${
            isLight
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
          }`}>
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* Critical Line Stop Counter */}
        <div className={`rounded-2xl p-4 sm:p-5 flex items-center justify-between border shadow-sm transition-colors ${
          lineStopLines > 0 
            ? isLight
              ? "bg-red-50 border-red-300 text-red-950"
              : "bg-red-950/40 border-red-500/50 text-red-100" 
            : isLight
            ? "bg-white border-slate-200 text-slate-900"
            : "bg-neutral-900 border-neutral-800 text-neutral-100"
        }`}>
          <div>
            <div className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
              {t("criticalLineStop")}
            </div>
            <div className="text-2xl sm:text-3xl font-black mt-1 flex items-baseline gap-1.5">
              <span className={lineStopLines > 0 ? "text-red-600 animate-pulse font-mono" : isLight ? "text-slate-800" : "text-neutral-300"}>
                {lineStopLines}
              </span>
              <span className={`text-xs sm:text-sm font-semibold ${isLight ? "text-slate-500" : "text-neutral-500"}`}>
                {t("linesStopped")}
              </span>
            </div>
            <div className={`text-[11px] mt-1 font-medium ${lineStopLines > 0 ? "text-red-600 font-bold" : isLight ? "text-slate-500" : "text-neutral-400"}`}>
              {lineStopLines > 0 ? t("immediateResponseNeeded") : t("zeroLineStop")}
            </div>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
            lineStopLines > 0 
              ? isLight
                ? "bg-red-100 border-red-300 text-red-600 animate-pulse"
                : "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse" 
              : isLight
              ? "bg-slate-100 border-slate-200 text-slate-400"
              : "bg-neutral-800 border-neutral-700 text-neutral-500"
          }`}>
            <Flame className="w-6 h-6" />
          </div>
        </div>

        {/* Active Andon Calls */}
        <div className={`border rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-sm transition-colors ${
          isLight 
            ? "bg-white border-slate-200 text-slate-900" 
            : "bg-neutral-900 border-neutral-800 text-neutral-100"
        }`}>
          <div>
            <div className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
              {t("activeCallsKpi")}
            </div>
            <div className="text-2xl sm:text-3xl font-black mt-1 flex items-baseline gap-1.5">
              <span className={isLight ? "text-amber-700 font-mono" : "text-amber-400 font-mono"}>{activeCalls.length}</span>
              <span className={`text-xs sm:text-sm font-semibold ${isLight ? "text-slate-500" : "text-neutral-500"}`}>
                {t("ticketsInProgress")}
              </span>
            </div>
            <div className={`text-[11px] mt-1 font-medium ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
              {resolvedTodayCalls.length} {t("resolvedTicketsCount")}
            </div>
          </div>
          <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${
            isLight
              ? "bg-amber-50 border-amber-200 text-amber-700"
              : "bg-amber-500/10 border-amber-500/20 text-amber-400"
          }`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Overall Plant Efficiency */}
        <div className={`border rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-sm transition-colors ${
          isLight 
            ? "bg-white border-slate-200 text-slate-900" 
            : "bg-neutral-900 border-neutral-800 text-neutral-100"
        }`}>
          <div>
            <div className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
              {t("plantEfficiency")}
            </div>
            <div className="text-2xl sm:text-3xl font-black mt-1 flex items-baseline gap-1.5">
              <span className={overallPlantEfficiency >= 85 ? (isLight ? "text-emerald-700 font-mono" : "text-emerald-400 font-mono") : (isLight ? "text-amber-700 font-mono" : "text-amber-400 font-mono")}>
                {overallPlantEfficiency}%
              </span>
              <span className={`text-xs sm:text-sm font-semibold ${isLight ? "text-slate-500" : "text-neutral-500"}`}>
                {t("avgOee")}
              </span>
            </div>
            <div className={`text-[11px] mt-1 flex items-center gap-1 font-medium ${
              isLight ? "text-slate-600" : "text-neutral-400"
            }`}>
              <TrendingUp className={`w-3.5 h-3.5 ${isLight ? "text-emerald-700" : "text-emerald-400"}`} />
              <span>{t("targetOee")}</span>
            </div>
          </div>
          <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${
            isLight
              ? "bg-purple-50 border-purple-200 text-purple-700"
              : "bg-purple-500/10 border-purple-500/20 text-purple-400"
          }`}>
            <Zap className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Andon Grid (Line Tower Lights & Statuses) */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <h2 className={`text-base sm:text-lg font-black tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
              {t("productionLinesStatus")}
            </h2>
            <span className={`text-xs hidden sm:inline ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
              • {t("allRunningSmooth")}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className={`flex items-center gap-1.5 font-medium ${isLight ? "text-slate-600" : "text-neutral-300"}`}>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
              <span>{t("runningStatus")}</span>
            </span>
            <span className={`flex items-center gap-1.5 font-medium ${isLight ? "text-slate-600" : "text-neutral-300"}`}>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" />
              <span>{t("warningStatus")}</span>
            </span>
            <span className={`flex items-center gap-1.5 font-medium ${isLight ? "text-slate-600" : "text-neutral-300"}`}>
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm animate-pulse" />
              <span>{t("criticalStatus")}</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lines.map((line) => {
            const lineCalls = activeCalls.filter((c) => c.lineId === line.id);
            
            // 3-button standard: RED, YELLOW, GREEN
            const hasRed = lineCalls.some((c) => normalizeCategoryToPrimary(c.category) === "abnormal_machine");
            const hasYellow = lineCalls.some((c) => normalizeCategoryToPrimary(c.category) === "leader_call");
            const hasGreenCall = lineCalls.some((c) => normalizeCategoryToPrimary(c.category) === "material_support");

            const hasStop = hasRed || lineCalls.some((c) => c.isLineStopped);
            const hasWarning = (hasYellow || hasGreenCall || lineCalls.length > 0) && !hasStop;
            const primaryCall = lineCalls[0];

            let borderClass = isLight 
              ? "border-slate-200 hover:border-slate-300 bg-white" 
              : "border-neutral-800 hover:border-neutral-700 bg-neutral-900";
            
            let statusBadge = (
              <span className={`text-xs px-2.5 py-0.5 rounded-lg font-bold flex items-center gap-1 border ${
                isLight
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
              }`}>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {t("runningStatus")}
              </span>
            );

            if (hasRed) {
              borderClass = isLight
                ? "border-red-400 bg-red-50/40 shadow-md shadow-red-500/10"
                : "border-red-500/80 bg-red-950/20 shadow-lg shadow-red-950/40";
              statusBadge = (
                <span className="bg-red-600 text-white text-xs px-2.5 py-0.5 rounded-lg font-bold flex items-center gap-1 animate-pulse shadow-sm">
                  <Flame className="w-3.5 h-3.5" />
                  {language === "en" ? "MACHINE ABNORMALITY" : "ABNORMAL MESIN"}
                </span>
              );
            } else if (hasYellow) {
              borderClass = isLight
                ? "border-amber-300 bg-amber-50/40 shadow-sm"
                : "border-amber-500/60 bg-amber-950/15";
              statusBadge = (
                <span className="bg-amber-500 text-slate-950 text-xs px-2.5 py-0.5 rounded-lg font-black flex items-center gap-1 shadow-sm">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  CALLING LEADER
                </span>
              );
            } else if (hasGreenCall) {
              borderClass = isLight
                ? "border-emerald-300 bg-emerald-50/40 shadow-sm"
                : "border-emerald-500/60 bg-emerald-950/15";
              statusBadge = (
                <span className="bg-emerald-600 text-white text-xs px-2.5 py-0.5 rounded-lg font-bold flex items-center gap-1 shadow-sm">
                  <Boxes className="w-3.5 h-3.5" />
                  {language === "en" ? "CALLING MATERIAL SUPPORT" : "CALLING MATERIAL"}
                </span>
              );
            }

            return (
              <div
                key={line.id}
                id={`line-card-${line.id}`}
                className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between transition-all relative overflow-hidden shadow-sm ${borderClass}`}
              >
                {/* Visual Tower Light Simulator at top-right */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                        isLight 
                          ? "bg-slate-100 text-slate-700 border-slate-200" 
                          : "bg-neutral-800 text-neutral-300 border-neutral-700"
                      }`}>
                        {line.shortCode}
                      </span>
                      <h3 className={`font-black text-sm sm:text-base line-clamp-1 ${isLight ? "text-slate-900" : "text-white"}`}>
                        {line.name}
                      </h3>
                    </div>
                    <div className={`text-xs mt-1 flex items-center gap-2 font-medium ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                      <span>{t("leader")}: {line.leaderName}</span>
                      <span>•</span>
                      <span>Dept: {line.department}</span>
                    </div>
                  </div>

                  {/* 3-Color Physical Andon Tower Lamp Display */}
                  <div className={`border p-1 rounded-xl flex flex-col items-center gap-1 shadow-inner ${
                    isLight ? "bg-slate-900 border-slate-800" : "bg-neutral-950 border-neutral-800"
                  }`}>
                    {/* Red Lamp: Abnormal Mesin */}
                    <div
                      className={`w-3.5 h-3.5 rounded-full transition-all ${
                        hasRed
                          ? "bg-red-500 shadow-[0_0_14px_#ef4444] animate-pulse scale-110"
                          : "bg-red-950/40 opacity-30"
                      }`}
                      title="Red: Abnormal Mesin"
                    />
                    {/* Yellow Lamp: Calling Leader */}
                    <div
                      className={`w-3.5 h-3.5 rounded-full transition-all ${
                        hasYellow
                          ? "bg-amber-400 shadow-[0_0_14px_#f59e0b] animate-pulse scale-110"
                          : "bg-amber-950/40 opacity-30"
                      }`}
                      title="Yellow: Calling Leader"
                    />
                    {/* Green Lamp: Calling Material or Normal Production */}
                    <div
                      className={`w-3.5 h-3.5 rounded-full transition-all ${
                        hasGreenCall
                          ? "bg-emerald-500 shadow-[0_0_14px_#10b981] animate-pulse scale-110 border border-white/20"
                          : lineCalls.length === 0
                          ? "bg-emerald-500 shadow-[0_0_8px_#10b981]/50"
                          : "bg-emerald-950/30 opacity-20"
                      }`}
                      title={hasGreenCall ? "Green: Calling Material Support" : "Green: Normal Production"}
                    />
                  </div>
                </div>

                {/* Status & Active Issue Details */}
                <div className={`my-2 rounded-xl p-3 border ${
                  isLight 
                    ? "bg-slate-50/80 border-slate-200" 
                    : "bg-neutral-950/60 border-neutral-800/80"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-semibold ${isLight ? "text-slate-600" : "text-neutral-400"}`}>
                      {t("plantStatus")}:
                    </span>
                    {statusBadge}
                  </div>

                  {primaryCall ? (
                    <div 
                      onClick={() => onSelectCall(primaryCall)}
                      className={`cursor-pointer p-2.5 rounded-xl transition-all border shadow-sm ${
                        isLight 
                          ? "bg-white hover:bg-slate-100 border-slate-200" 
                          : "bg-neutral-900/90 hover:bg-neutral-800 border-neutral-800"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className={isLight ? "text-amber-700 flex items-center gap-1" : "text-amber-400 flex items-center gap-1"}>
                          {language === "en" ? (CATEGORIES_DATA[primaryCall.category]?.labelEn || primaryCall.category) : (CATEGORIES_DATA[primaryCall.category]?.label || primaryCall.category)}
                        </span>
                        <span className="text-red-600 font-mono flex items-center gap-1 font-bold">
                          <Clock className="w-3 h-3" />
                          {formatDuration(timerTick - primaryCall.timestamp)}
                        </span>
                      </div>
                      <p className={`text-xs line-clamp-2 mt-1 font-medium ${isLight ? "text-slate-700" : "text-neutral-300"}`}>
                        {primaryCall.description}
                      </p>
                      <div className={`mt-2 flex items-center justify-between text-[11px] font-medium ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                        <span>{t("stations")}: {primaryCall.workstation}</span>
                        <span className="text-cyan-600 dark:text-cyan-400 font-bold underline">
                          {t("viewDetails")} →
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className={`text-center py-2 text-xs flex items-center justify-center gap-1.5 font-bold ${
                      isLight ? "text-emerald-700" : "text-emerald-400/90"
                    }`}>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>{t("allRunningSmooth")}</span>
                    </div>
                  )}
                </div>

                {/* Output Progress Bar & Quick Action */}
                <div className={`mt-2 pt-3 border-t flex items-center justify-between gap-3 ${
                  isLight ? "border-slate-200" : "border-neutral-800"
                }`}>
                  <div className="flex-1">
                    <div className={`flex justify-between text-[11px] mb-1 font-medium ${
                      isLight ? "text-slate-500" : "text-neutral-400"
                    }`}>
                      <span>{t("targetDaily")}: {line.targetDaily} pcs</span>
                      <span className={`font-black ${isLight ? "text-slate-900" : "text-white"}`}>
                        {line.actualOutput} pcs ({line.efficiency}%)
                      </span>
                    </div>
                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${isLight ? "bg-slate-200" : "bg-neutral-800"}`}>
                      <div
                        className={`h-full rounded-full transition-all ${
                          line.efficiency >= 90
                            ? "bg-emerald-500"
                            : line.efficiency >= 75
                            ? "bg-amber-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${Math.min(100, (line.actualOutput / line.targetDaily) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <button
                    id={`btn-call-from-board-${line.id}`}
                    onClick={() => onNavigateToCall(line.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all whitespace-nowrap border shadow-sm ${
                      isLight
                        ? "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200"
                        : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700"
                    }`}
                  >
                    <span>{t("callOperator")}</span>
                    <ArrowRight className="w-3 h-3 text-amber-500" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Incidents Live Queue (Daftar Panggilan Berjalan) */}
      <div className={`border rounded-3xl p-5 sm:p-6 shadow-sm transition-colors ${
        isLight 
          ? "bg-white border-slate-200 text-slate-900" 
          : "bg-neutral-900 border-neutral-800 text-neutral-100"
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-amber-500" />
            <h3 className={`font-black text-sm sm:text-base ${isLight ? "text-slate-900" : "text-white"}`}>
              {t("activeAndonCallsTitle")}
            </h3>
            <span className={`font-mono text-xs px-2.5 py-0.5 rounded-full font-bold border ${
              isLight
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : "bg-amber-500/20 text-amber-300 border-amber-500/30"
            }`}>
              {activeCalls.length} {t("activeCallsKpi")}
            </span>
          </div>
          <span className={`text-[11px] font-mono ${isLight ? "text-slate-400" : "text-neutral-400"}`}>
            Live Auto Refresh
          </span>
        </div>

        {activeCalls.length === 0 ? (
          <div className={`text-center py-10 border border-dashed rounded-2xl ${
            isLight ? "border-slate-200 bg-slate-50" : "border-neutral-800 bg-neutral-950/40"
          }`}>
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
            <h4 className={`text-sm font-bold ${isLight ? "text-slate-800" : "text-neutral-200"}`}>
              {t("noActiveCalls")}
            </h4>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b text-[11px] font-bold uppercase ${
                  isLight 
                    ? "border-slate-200 text-slate-500 bg-slate-50" 
                    : "border-neutral-800 text-neutral-400 bg-neutral-950/50"
                }`}>
                  <th className="py-2.5 px-3">{language === "en" ? "WO & Time" : "WO & Waktu"}</th>
                  <th className="py-2.5 px-3">{language === "en" ? "Line / Station" : "Lini / Stasiun"}</th>
                  <th className="py-2.5 px-3">{language === "en" ? "Issue Category" : "Kategori Masalah"}</th>
                  <th className="py-2.5 px-3">{language === "en" ? "Line Condition" : "Kondisi Line"}</th>
                  <th className="py-2.5 px-3">{t("waitTime")}</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">{language === "en" ? "Action" : "Aksi"}</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-medium ${isLight ? "divide-slate-200 text-slate-700" : "divide-neutral-800/60 text-neutral-300"}`}>
                {activeCalls.map((call) => {
                  const cat = CATEGORIES_DATA[call.category] || CATEGORIES_DATA.machine_breakdown;
                  const elapsedMs = timerTick - call.timestamp;
                  const isLongWaiting = elapsedMs > 300000; // > 5 mins

                  return (
                    <tr 
                      key={call.id}
                      className={`transition-colors ${
                        call.isLineStopped 
                          ? isLight ? "bg-red-50/80" : "bg-red-950/20" 
                          : isLight ? "hover:bg-slate-50" : "hover:bg-neutral-800/40"
                      }`}
                    >
                      <td className="py-3 px-3">
                        <div className={`font-mono font-bold text-xs ${isLight ? "text-slate-900" : "text-white"}`}>
                          {call.ticketNo}
                        </div>
                        <div className={`text-[10px] ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                          {formatTimestamp(call.timestamp)}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className={`font-bold ${isLight ? "text-slate-900" : "text-neutral-100"}`}>{call.lineName}</div>
                        <div className={`text-[11px] ${isLight ? "text-slate-500" : "text-neutral-400"}`}>{call.workstation}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold border ${cat.bgLight}`}>
                          <span>{language === "en" ? cat.labelEn : cat.label}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {call.isLineStopped ? (
                          <span className="bg-red-600 text-white font-black px-2 py-0.5 rounded text-[10px] uppercase animate-pulse shadow-sm">
                            {t("criticalStatus")}
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            isLight ? "bg-slate-100 text-slate-600 border-slate-200" : "bg-neutral-800 text-neutral-300 border-neutral-700"
                          }`}>
                            {t("runningStatus")}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold">
                        <span className={isLongWaiting ? "text-red-600 flex items-center gap-1 animate-pulse" : isLight ? "text-amber-700" : "text-amber-400"}>
                          <Clock className="w-3.5 h-3.5" />
                          {formatDuration(elapsedMs)}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {call.status === "calling" && (
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase border animate-pulse ${
                            isLight
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-red-500/20 text-red-400 border-red-500/40"
                          }`}>
                            {language === "en" ? "NEW CALL" : "PANGGILAN BARU"}
                          </span>
                        )}
                        {call.status === "acknowledged" && (
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                            isLight
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-blue-500/20 text-blue-400 border-blue-500/40"
                          }`}>
                            {language === "en" ? "EN ROUTE" : "MENUJU LOKASI"} ({call.acknowledgedBy})
                          </span>
                        )}
                        {call.status === "in_progress" && (
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                            isLight
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          }`}>
                            {language === "en" ? "IN REPAIR" : "SEDANG DIPERBAIKI"}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          id={`btn-inspect-call-${call.id}`}
                          onClick={() => onSelectCall(call)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold border transition-colors shadow-sm ${
                            isLight
                              ? "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-300"
                              : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700"
                          }`}
                        >
                          {t("viewDetails")}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
