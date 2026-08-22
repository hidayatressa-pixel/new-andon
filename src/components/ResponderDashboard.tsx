import React, { useState, useEffect } from "react";
import { 
  Wrench, 
  Clock, 
  CheckCircle2, 
  Flame, 
  User, 
  ArrowRight, 
  Check, 
  Search, 
  Filter, 
  PlayCircle
} from "lucide-react";
import confetti from "canvas-confetti";
import { AndonCall, CallStatus, CallCategory, UserProfile, AppTheme, AppLanguage } from "../types";
import { CATEGORIES_DATA } from "../utils/categories";
import { formatDuration, formatTimestamp } from "../utils/storage";
import { getTranslation, TranslationKey } from "../utils/i18n";

interface ResponderDashboardProps {
  calls: AndonCall[];
  onUpdateCallStatus: (callId: string, status: CallStatus, extra?: Partial<AndonCall>) => void;
  currentUser?: UserProfile | null;
  theme?: AppTheme;
  language?: AppLanguage;
}

export const ResponderDashboard: React.FC<ResponderDashboardProps> = ({
  calls,
  onUpdateCallStatus,
  currentUser,
  theme = "light",
  language = "id",
}) => {
  const [timerTick, setTimerTick] = useState(Date.now());
  const [responderName, setResponderName] = useState<string>(
    currentUser?.name || "Teknisi Maintenance Shift 1"
  );
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("active");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Resolution Modal State
  const [resolvingCall, setResolvingCall] = useState<AndonCall | null>(null);
  const [rootCauseInput, setRootCauseInput] = useState<string>("");
  const [actionNotesInput, setActionNotesInput] = useState<string>("");
  const [fiveWhy1, setFiveWhy1] = useState<string>("");
  const [fiveWhy2, setFiveWhy2] = useState<string>("");
  const [fiveWhy3, setFiveWhy3] = useState<string>("");

  const t = (key: TranslationKey, params?: Record<string, string | number>) => 
    getTranslation(language, key, params);

  const isLight = theme === "light";

  useEffect(() => {
    if (currentUser) {
      setResponderName(currentUser.name);
    }
  }, [currentUser]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimerTick(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredCalls = calls.filter((c) => {
    if (filterStatus === "active" && c.status === "resolved") return false;
    if (filterStatus === "resolved" && c.status !== "resolved") return false;
    if (filterCategory !== "all" && c.category !== filterCategory) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        c.ticketNo.toLowerCase().includes(term) ||
        c.lineName.toLowerCase().includes(term) ||
        c.workstation.toLowerCase().includes(term) ||
        c.description.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const handleAcknowledge = (call: AndonCall) => {
    onUpdateCallStatus(call.id, "acknowledged", {
      acknowledgedAt: Date.now(),
      acknowledgedBy: responderName,
    });
  };

  const handleStartWork = (call: AndonCall) => {
    onUpdateCallStatus(call.id, "in_progress", {
      inProgressAt: Date.now(),
    });
  };

  const handleOpenResolveModal = (call: AndonCall) => {
    setResolvingCall(call);
    setRootCauseInput(call.rootCause || "");
    setActionNotesInput(call.resolutionNotes || "");
    setFiveWhy1(call.fiveWhyAnalysis?.[0] || "");
    setFiveWhy2(call.fiveWhyAnalysis?.[1] || "");
    setFiveWhy3(call.fiveWhyAnalysis?.[2] || "");
  };

  const handleConfirmResolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingCall) return;

    const fiveWhyList = [fiveWhy1, fiveWhy2, fiveWhy3].filter(Boolean);

    onUpdateCallStatus(resolvingCall.id, "resolved", {
      resolvedAt: Date.now(),
      resolvedBy: responderName,
      rootCause: rootCauseInput.trim() || (language === "en" ? "Operational wear and deviation." : "Penyebab keausan operasional dan deviasi toleransi."),
      resolutionNotes: actionNotesInput.trim() || (language === "en" ? "Part adjusted, recalibrated, tested normal." : "Komponen diperbaiki/dikalibrasi dan line kembali normal."),
      fiveWhyAnalysis: fiveWhyList.length > 0 ? fiveWhyList : undefined,
      isLineStopped: false,
    });

    if (resolvingCall.isLineStopped) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {}
    }

    setResolvingCall(null);
  };

  const activeCount = calls.filter((c) => c.status !== "resolved").length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Banner & Responder Identity */}
      <div className={`border rounded-3xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors ${
        isLight ? "bg-white border-slate-200 text-slate-900" : "bg-neutral-900 border-neutral-800 text-neutral-100"
      }`}>
        <div>
          <div className="flex items-center gap-3">
            <span className={`p-2.5 rounded-2xl border ${
              isLight ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-blue-500/20 text-blue-400 border-blue-500/30"
            }`}>
              <Wrench className="w-5 h-5" />
            </span>
            <div>
              <h2 className={`text-lg sm:text-xl font-black tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                {t("responderDashboardTitle")}
              </h2>
              <p className={`text-xs ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                {t("responderDashboardSubtitle")}
              </p>
            </div>
          </div>
        </div>

        {/* Responder Name Input */}
        <div className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border ${
          isLight ? "bg-slate-50 border-slate-200" : "bg-neutral-950 border-neutral-800"
        }`}>
          <User className="w-4 h-4 text-slate-400" />
          <span className={`text-xs font-semibold ${isLight ? "text-slate-600" : "text-neutral-400"}`}>
            {language === "en" ? "Responder:" : "Petugas Aktif:"}
          </span>
          <input
            type="text"
            value={responderName}
            onChange={(e) => setResponderName(e.target.value)}
            className={`bg-transparent text-xs font-bold focus:outline-none w-48 ${
              isLight ? "text-amber-700" : "text-amber-300"
            }`}
          />
        </div>
      </div>

      {/* Filters Bar */}
      <div className={`border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm transition-colors ${
        isLight ? "bg-white border-slate-200" : "bg-neutral-900 border-neutral-800"
      }`}>
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={language === "en" ? "Search ticket, line, station, or keywords..." : "Cari nomor tiket, line, stasiun, atau kata kunci..."}
            className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
              isLight
                ? "bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400"
                : "bg-neutral-950 border-neutral-800 text-white placeholder-neutral-500"
            }`}
          />
        </div>

        {/* Status Toggle Buttons */}
        <div className={`flex items-center gap-1 p-1 rounded-xl border text-xs ${
          isLight ? "bg-slate-100 border-slate-200" : "bg-neutral-950 border-neutral-800"
        }`}>
          <button
            onClick={() => setFilterStatus("active")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
              filterStatus === "active"
                ? isLight
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : "bg-amber-500 text-neutral-950 shadow-sm"
                : isLight
                ? "text-slate-600 hover:text-slate-900"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {language === "en" ? "Active Tickets" : "Tiket Aktif"} ({activeCount})
          </button>
          <button
            onClick={() => setFilterStatus("resolved")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
              filterStatus === "resolved"
                ? isLight
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                  : "bg-neutral-800 text-white shadow-sm border border-neutral-700"
                : isLight
                ? "text-slate-600 hover:text-slate-900"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {language === "en" ? "Resolved" : "Selesai Ditangani"}
          </button>
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
              filterStatus === "all"
                ? isLight
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                  : "bg-neutral-800 text-white shadow-sm border border-neutral-700"
                : isLight
                ? "text-slate-600 hover:text-slate-900"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {language === "en" ? "All" : "Semua"}
          </button>
        </div>

        {/* Category Dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={`text-xs rounded-xl px-3 py-2 border focus:outline-none ${
              isLight
                ? "bg-slate-50 border-slate-300 text-slate-800"
                : "bg-neutral-950 border-neutral-800 text-neutral-300"
            }`}
          >
            <option value="all">{language === "en" ? "All Categories" : "Semua Kategori"}</option>
            <option value="machine_breakdown">{t("machineBreakdown")}</option>
            <option value="material_shortage">{t("materialShortage")}</option>
            <option value="quality_defect">{t("qualityDefect")}</option>
            <option value="maintenance_tooling">{t("toolingMaintenance")}</option>
            <option value="supervisor_call">{t("supervisorSupport")}</option>
            <option value="safety_alert">{t("safetyHazard")}</option>
          </select>
        </div>
      </div>

      {/* Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCalls.length === 0 ? (
          <div className={`col-span-full text-center py-12 border border-dashed rounded-3xl ${
            isLight ? "bg-slate-50 border-slate-200" : "bg-neutral-900 border-neutral-800"
          }`}>
            <CheckCircle2 className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <div className={`text-sm font-bold ${isLight ? "text-slate-800" : "text-neutral-300"}`}>
              {t("noActiveCalls")}
            </div>
            <div className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-neutral-500"}`}>
              {language === "en" ? "All lines are operating normally." : "Seluruh lini dalam kondisi normal atau tidak ada tiket yang cocok dengan filter."}
            </div>
          </div>
        ) : (
          filteredCalls.map((call) => {
            const cat = CATEGORIES_DATA[call.category] || CATEGORIES_DATA.machine_breakdown;
            const elapsedTotal = timerTick - call.timestamp;
            const totalRepairDuration = call.resolvedAt ? call.resolvedAt - call.timestamp : null;

            return (
              <div
                key={call.id}
                id={`responder-card-${call.id}`}
                className={`rounded-3xl border p-5 flex flex-col justify-between transition-all shadow-sm ${
                  call.isLineStopped && call.status !== "resolved"
                    ? isLight
                      ? "border-red-400 bg-red-50/50 shadow-md"
                      : "border-red-500/80 bg-red-950/20 shadow-lg shadow-red-950/40"
                    : call.status === "calling"
                    ? isLight
                      ? "border-amber-300 bg-amber-50/40"
                      : "border-amber-500/60 bg-amber-950/15"
                    : call.status === "in_progress"
                    ? isLight
                      ? "border-blue-300 bg-blue-50/30"
                      : "border-blue-500/60 bg-neutral-900"
                    : isLight
                    ? "border-slate-200 bg-white"
                    : "border-neutral-800 bg-neutral-900"
                }`}
              >
                <div>
                  {/* Card Top: Ticket ID, Severity, Badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                          isLight ? "text-slate-700 bg-slate-100 border-slate-200" : "text-neutral-300 bg-neutral-950 border-neutral-800"
                        }`}>
                          {call.ticketNo}
                        </span>
                        {call.isLineStopped && (
                          <span className="bg-red-600 text-white font-black text-[10px] px-2 py-0.5 rounded uppercase animate-pulse shadow-sm">
                            {t("criticalStatus")}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${cat.bgLight}`}>
                          {language === "en" ? cat.labelEn : cat.label}
                        </span>
                      </div>
                      <h3 className={`font-black text-base mt-1.5 ${isLight ? "text-slate-900" : "text-white"}`}>
                        {call.lineName}
                      </h3>
                      <div className={`text-xs font-bold ${isLight ? "text-amber-700" : "text-amber-300"}`}>
                        {call.workstation} {call.machineId ? `• ${call.machineId}` : ""}
                      </div>
                    </div>
                  </div>

                  {/* Problem Description */}
                  <div className={`p-3.5 rounded-2xl border text-xs mb-3 ${
                    isLight 
                      ? "bg-slate-50 border-slate-200 text-slate-800" 
                      : "bg-neutral-950/70 border-neutral-800 text-neutral-300"
                  }`}>
                    <p className="font-medium leading-relaxed">{call.description}</p>
                    <div className={`mt-2 pt-2 border-t flex flex-wrap items-center justify-between text-[11px] gap-2 ${
                      isLight ? "border-slate-200 text-slate-500" : "border-neutral-800/80 text-neutral-400"
                    }`}>
                      <span>Operator: <strong className={isLight ? "text-slate-800" : "text-neutral-300"}>{call.operatorName}</strong> ({call.operatorId})</span>
                      <span>{formatTimestamp(call.timestamp)}</span>
                    </div>
                  </div>

                  {/* Stopwatch Timers & Resolution Log */}
                  <div className="space-y-1 text-xs mb-4">
                    {call.status !== "resolved" ? (
                      <div className={`flex items-center justify-between p-2.5 rounded-2xl border ${
                        isLight ? "bg-slate-50 border-slate-200" : "bg-neutral-950 border-neutral-800"
                      }`}>
                        <span className={`flex items-center gap-1.5 font-semibold ${isLight ? "text-slate-600" : "text-neutral-400"}`}>
                          <Clock className={`w-3.5 h-3.5 ${isLight ? "text-amber-600" : "text-amber-400"}`} />
                          {t("waitTime")}:
                        </span>
                        <span className={`font-mono font-black text-sm animate-pulse ${isLight ? "text-amber-700" : "text-amber-400"}`}>
                          {formatDuration(elapsedTotal)}
                        </span>
                      </div>
                    ) : (
                      <div className={`p-3 rounded-2xl border text-xs space-y-1 ${
                        isLight
                          ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                          : "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
                      }`}>
                        <div className="flex items-center justify-between font-bold text-emerald-600 dark:text-emerald-400">
                          <span className="flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> {language === "en" ? "Resolved by" : "Selesai Ditangani"} ({call.resolvedBy})
                          </span>
                          <span className="font-mono">{formatDuration(totalRepairDuration || 0)}</span>
                        </div>
                        {call.rootCause && (
                          <div className="text-[11px]">
                            <strong>{language === "en" ? "Root Cause:" : "Akar Masalah:"}</strong> {call.rootCause}
                          </div>
                        )}
                        {call.resolutionNotes && (
                          <div className="text-[11px]">
                            <strong>{language === "en" ? "Action:" : "Tindakan:"}</strong> {call.resolutionNotes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Interactive Workflow Buttons */}
                <div className={`pt-3 border-t flex items-center justify-between gap-2 ${
                  isLight ? "border-slate-200" : "border-neutral-800"
                }`}>
                  {call.status === "calling" && (
                    <button
                      id={`btn-ack-${call.id}`}
                      onClick={() => handleAcknowledge(call)}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-500/20"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>{t("respondCallBtn")}</span>
                    </button>
                  )}

                  {call.status === "acknowledged" && (
                    <div className="w-full flex items-center gap-2">
                      <button
                        id={`btn-start-${call.id}`}
                        onClick={() => handleStartWork(call)}
                        className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
                      >
                        <PlayCircle className="w-4 h-4" />
                        <span>{t("startRepairBtn")}</span>
                      </button>
                      <button
                        onClick={() => handleOpenResolveModal(call)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-colors shadow-sm ${
                          isLight
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
                            : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700"
                        }`}
                      >
                        {language === "en" ? "Fast Resolve" : "Langsung Selesai"}
                      </button>
                    </div>
                  )}

                  {call.status === "in_progress" && (
                    <button
                      id={`btn-resolve-${call.id}`}
                      onClick={() => handleOpenResolveModal(call)}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t("resolveCallBtn")}</span>
                    </button>
                  )}

                  {call.status === "resolved" && (
                    <div className={`w-full flex items-center justify-between text-xs ${
                      isLight ? "text-slate-500" : "text-neutral-400"
                    }`}>
                      <span>{language === "en" ? "Closed:" : "Ditutup:"} {formatTimestamp(call.resolvedAt || 0)}</span>
                      <button
                        onClick={() => handleOpenResolveModal(call)}
                        className={`underline text-[11px] font-bold ${
                          isLight ? "text-slate-700 hover:text-slate-900" : "text-neutral-300 hover:text-white"
                        }`}
                      >
                        {language === "en" ? "Edit Log" : "Edit Log"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Resolution & 5-Why Analysis Modal */}
      {resolvingCall && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className={`border rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl relative ${
            isLight ? "bg-white border-slate-200 text-slate-900" : "bg-neutral-900 border-neutral-800 text-neutral-100"
          }`}>
            <div className={`flex items-start justify-between border-b pb-3 ${isLight ? "border-slate-200" : "border-neutral-800"}`}>
              <div>
                <span className={`font-mono text-xs font-bold ${isLight ? "text-amber-700" : "text-amber-400"}`}>
                  {resolvingCall.ticketNo}
                </span>
                <h3 className={`text-lg font-black ${isLight ? "text-slate-900" : "text-white"}`}>
                  {language === "en" ? "Close Ticket & Root Cause Form" : "Formulir Penutupan Tiket & Analisis Masalah"}
                </h3>
                <p className={`text-xs ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                  {resolvingCall.lineName} • {resolvingCall.workstation}
                </p>
              </div>
              <button
                onClick={() => setResolvingCall(null)}
                className={`p-1 font-bold text-lg ${isLight ? "text-slate-400 hover:text-slate-900" : "text-neutral-400 hover:text-white"}`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmResolve} className="space-y-3.5 text-xs">
              <div>
                <label className={`block font-bold mb-1 ${isLight ? "text-slate-700" : "text-neutral-300"}`}>
                  {t("rootCause")}
                </label>
                <input
                  type="text"
                  required
                  value={rootCauseInput}
                  onChange={(e) => setRootCauseInput(e.target.value)}
                  placeholder={language === "en" ? "e.g. Proximity sensor offset by metal scrap, limit switch worn out..." : "Contoh: Sensor proximity tergeser debu, limit switch aus..."}
                  className={`w-full rounded-xl p-2.5 border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                    isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-neutral-950 border-neutral-800 text-white"
                  }`}
                />
              </div>

              <div>
                <label className={`block font-bold mb-1 ${isLight ? "text-slate-700" : "text-neutral-300"}`}>
                  {t("correctiveAction")}
                </label>
                <textarea
                  rows={2}
                  required
                  value={actionNotesInput}
                  onChange={(e) => setActionNotesInput(e.target.value)}
                  placeholder={language === "en" ? "e.g. Cleaned sensor, readjusted gap to 2mm, tested 5 cycles OK." : "Contoh: Sensor dibersihkan dan diposisikan ulang ke gap 2mm, mesin test run 5 cycle OK."}
                  className={`w-full rounded-xl p-2.5 border focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none ${
                    isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-neutral-950 border-neutral-800 text-white"
                  }`}
                />
              </div>

              {/* 5-Why Lean Section */}
              <div className={`p-3.5 rounded-2xl border space-y-2 ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-neutral-950 border-neutral-800"
              }`}>
                <div className="flex items-center justify-between font-bold">
                  <span className={isLight ? "text-slate-800" : "text-neutral-300"}>{language === "en" ? "5-Why Analysis (Lean TPM)" : "Analisis 5-Why (Metode Lean TPM)"}</span>
                  <span className={`text-[10px] ${isLight ? "text-slate-500" : "text-neutral-500"}`}>{language === "en" ? "Optional" : "Opsional"}</span>
                </div>
                <input
                  type="text"
                  value={fiveWhy1}
                  onChange={(e) => setFiveWhy1(e.target.value)}
                  placeholder={language === "en" ? "Why 1: Why did the machine stop?..." : "Why 1: Mengapa mesin berhenti?..."}
                  className={`w-full rounded-lg p-2 text-[11px] border focus:outline-none ${
                    isLight ? "bg-white border-slate-300 text-slate-900" : "bg-neutral-900 border-neutral-800 text-white"
                  }`}
                />
                <input
                  type="text"
                  value={fiveWhy2}
                  onChange={(e) => setFiveWhy2(e.target.value)}
                  placeholder={language === "en" ? "Why 2: Why did sensor fail to detect part?..." : "Why 2: Mengapa sensor tidak mendeteksi part?..."}
                  className={`w-full rounded-lg p-2 text-[11px] border focus:outline-none ${
                    isLight ? "bg-white border-slate-300 text-slate-900" : "bg-neutral-900 border-neutral-800 text-white"
                  }`}
                />
                <input
                  type="text"
                  value={fiveWhy3}
                  onChange={(e) => setFiveWhy3(e.target.value)}
                  placeholder={language === "en" ? "Why 3: Why was there metal debris buildup?..." : "Why 3: Mengapa ada penumpukan gram besi?..."}
                  className={`w-full rounded-lg p-2 text-[11px] border focus:outline-none ${
                    isLight ? "bg-white border-slate-300 text-slate-900" : "bg-neutral-900 border-neutral-800 text-white"
                  }`}
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResolvingCall(null)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                    isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                  }`}
                >
                  {language === "en" ? "Cancel" : "Batal"}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md"
                >
                  {language === "en" ? "Save & Normalize Line" : "Simpan & Normalisasi Line"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
