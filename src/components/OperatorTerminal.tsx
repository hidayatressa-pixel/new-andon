import React, { useState, useEffect } from "react";
import { 
  Flame, 
  Boxes, 
  Wrench, 
  ShieldAlert, 
  UserCheck, 
  AlertTriangle, 
  CheckCircle, 
  PhoneCall, 
  Clock, 
  User,
  Shield,
  Layers
} from "lucide-react";
import { AndonCall, AndonLine, CallCategory, CallSeverity, UserProfile, AppTheme, AppLanguage } from "../types";
import { CATEGORIES_DATA } from "../utils/categories";
import { formatDuration } from "../utils/storage";
import { getTranslation, TranslationKey } from "../utils/i18n";

interface OperatorTerminalProps {
  lines: AndonLine[];
  activeCalls: AndonCall[];
  selectedLineId: string;
  setSelectedLineId: (id: string) => void;
  onSubmitCall: (callData: Omit<AndonCall, "id" | "ticketNo" | "timestamp" | "status">) => void;
  onCancelCall?: (callId: string) => void;
  currentUser?: UserProfile | null;
  theme?: AppTheme;
  language?: AppLanguage;
}

export const OperatorTerminal: React.FC<OperatorTerminalProps> = ({
  lines,
  activeCalls,
  selectedLineId,
  setSelectedLineId,
  onSubmitCall,
  onCancelCall,
  currentUser,
  theme = "light",
  language = "id",
}) => {
  const currentLine = lines.find((l) => l.id === selectedLineId) || lines[0] || {
    id: "LINE-1",
    name: "Line 1: Machining",
    shortCode: "L1",
    department: "Machining",
    workstations: ["OP-10 Station", "OP-20 Station"],
    status: "running",
    activeCallsCount: 0,
    targetDaily: 500,
    actualOutput: 0,
    efficiency: 100,
    leaderName: "Leader Shift",
    currentShift: "Shift 1",
  };

  const [selectedStation, setSelectedStation] = useState<string>(
    currentLine?.workstations?.[0] || "OP-10 Station"
  );
  const [selectedCategory, setSelectedCategory] = useState<CallCategory>("machine_breakdown");
  const [severity, setSeverity] = useState<CallSeverity>("critical_line_stop");
  const [isLineStopped, setIsLineStopped] = useState<boolean>(true);
  const [operatorName, setOperatorName] = useState<string>(
    currentUser?.name || "Operator Shift 1"
  );
  const [operatorId, setOperatorId] = useState<string>(
    currentUser?.badgeId || "OP-1001"
  );
  const [machineId, setMachineId] = useState<string>("");
  const [partNumber, setPartNumber] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [submittedSuccess, setSubmittedSuccess] = useState<boolean>(false);

  const t = (key: TranslationKey, params?: Record<string, string | number>) => 
    getTranslation(language, key, params);

  const isLight = theme === "light";

  // Sync if currentUser changed
  useEffect(() => {
    if (currentUser) {
      setOperatorName(currentUser.name);
      setOperatorId(currentUser.badgeId);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentLine?.workstations && currentLine.workstations.length > 0) {
      if (!currentLine.workstations.includes(selectedStation)) {
        setSelectedStation(currentLine.workstations[0]);
      }
    }
  }, [currentLine, selectedStation]);

  const existingCall = activeCalls.find(
    (c) => c.lineId === currentLine?.id && c.workstation === selectedStation && c.status !== "resolved"
  );

  const handleLineChange = (lineId: string) => {
    setSelectedLineId(lineId);
    const newLine = lines.find((l) => l.id === lineId);
    if (newLine && newLine.workstations?.length > 0) {
      setSelectedStation(newLine.workstations[0]);
    }
  };

  const handleQuickCategorySelect = (cat: CallCategory) => {
    setSelectedCategory(cat);
    if (cat === "machine_breakdown" || cat === "safety_alert") {
      setIsLineStopped(true);
      setSeverity("critical_line_stop");
    } else if (cat === "material_shortage" || cat === "quality_defect") {
      setIsLineStopped(false);
      setSeverity("major");
    } else {
      setIsLineStopped(false);
      setSeverity("minor");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let autoDesc = description.trim();
    if (!autoDesc) {
      const catLabel = language === "en" 
        ? CATEGORIES_DATA[selectedCategory]?.labelEn || selectedCategory
        : CATEGORIES_DATA[selectedCategory]?.label || selectedCategory;
      autoDesc = language === "en"
        ? `Andon Call for ${catLabel} at ${selectedStation}. Requires immediate responder attention.`
        : `Panggilan ${catLabel} pada ${selectedStation}. Memerlukan penanganan segera di lantai produksi.`;
    }

    onSubmitCall({
      lineId: currentLine.id,
      lineName: currentLine.name,
      workstation: selectedStation,
      category: selectedCategory,
      severity,
      isLineStopped,
      operatorName: operatorName.trim() || (currentUser?.name || "Operator"),
      operatorId: operatorId.trim() || (currentUser?.badgeId || "OP-00"),
      machineId: machineId.trim() || undefined,
      partNumber: partNumber.trim() || undefined,
      description: autoDesc,
    });

    setDescription("");
    setSubmittedSuccess(true);
    setTimeout(() => {
      setSubmittedSuccess(false);
    }, 4000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header Info */}
      <div className={`border rounded-3xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors ${
        isLight ? "bg-white border-slate-200 text-slate-900" : "bg-neutral-900 border-neutral-800 text-neutral-100"
      }`}>
        <div>
          <div className="flex items-center gap-3">
            <span className={`p-2.5 rounded-2xl border ${
              isLight ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-amber-500/20 text-amber-400 border-amber-500/30"
            }`}>
              <PhoneCall className="w-5 h-5" />
            </span>
            <div>
              <h2 className={`text-lg sm:text-xl font-black tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                {t("operatorTerminalTitle")}
              </h2>
              <p className={`text-xs ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                {t("operatorTerminalSubtitle")}
              </p>
            </div>
          </div>
        </div>

        {/* Selected Line Selector Chips */}
        <div className={`flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl border ${
          isLight ? "bg-slate-100 border-slate-200" : "bg-neutral-950 border-neutral-800"
        }`}>
          {lines.map((l) => {
            const hasCall = activeCalls.some((c) => c.lineId === l.id && c.status !== "resolved");
            return (
              <button
                key={l.id}
                id={`select-line-${l.id}`}
                onClick={() => handleLineChange(l.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all relative ${
                  selectedLineId === l.id
                    ? isLight
                      ? "bg-amber-500 text-slate-950 font-black shadow"
                      : "bg-amber-500 text-neutral-950 shadow-md font-black"
                    : isLight
                    ? "text-slate-600 hover:bg-white/80"
                    : "text-neutral-300 hover:bg-neutral-900"
                }`}
              >
                <span>{l.shortCode || l.id}</span>
                {hasCall && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Call Alert for this Line/Station */}
      {existingCall && (
        <div className={`border-2 rounded-3xl p-5 shadow-xl animate-pulse flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          isLight 
            ? "bg-red-50 border-red-400 text-red-950" 
            : "bg-red-950/40 border-red-500 text-neutral-100"
        }`}>
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-red-600 rounded-2xl text-white shadow-md">
              <Flame className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-red-600 text-white font-mono text-xs px-2 py-0.5 rounded font-black uppercase">
                  {language === "en" ? "ACTIVE CALL AT THIS STATION" : "PANGGILAN AKTIF DI STASIUN INI"}
                </span>
                <span className="text-xs font-mono font-bold">
                  {existingCall.ticketNo}
                </span>
              </div>
              <h3 className="text-base font-black mt-1">
                {(language === "en" ? CATEGORIES_DATA[existingCall.category]?.labelEn : CATEGORIES_DATA[existingCall.category]?.label) || existingCall.category} - {existingCall.workstation}
              </h3>
              <p className="text-xs mt-0.5 font-medium">
                {existingCall.description}
              </p>
              <div className="text-xs text-amber-700 dark:text-amber-300 mt-2 font-mono flex items-center gap-3 font-bold">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {t("waitTime")}: {formatDuration(Date.now() - existingCall.timestamp)}
                </span>
                <span>• Status: {existingCall.status.toUpperCase()}</span>
              </div>
            </div>
          </div>

          {onCancelCall && (
            <button
              onClick={() => onCancelCall(existingCall.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap border shadow-sm ${
                isLight
                  ? "bg-white hover:bg-slate-100 text-red-700 border-red-300"
                  : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-600"
              }`}
            >
              {language === "en" ? "Cancel / Resolved" : "Batalkan / Sudah Selesai"}
            </button>
          )}
        </div>
      )}

      {submittedSuccess && (
        <div className={`border-2 rounded-3xl p-4 flex items-center gap-3 shadow-lg ${
          isLight
            ? "bg-emerald-50 border-emerald-400 text-emerald-950"
            : "bg-emerald-950/40 border-emerald-500 text-emerald-200"
        }`}>
          <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />
          <div>
            <div className="font-bold text-sm">{language === "en" ? "Andon Call Broadcasted Successfully!" : "Panggilan Andon Berhasil Dibuat!"}</div>
            <div className="text-xs">
              {language === "en" 
                ? "Alarm sounded and ticket saved to Cloud Firestore & logged in Activity Logs." 
                : "Notifikasi alarm berbunyi dan tiket tersimpan di Database Cloud Firestore & tercatat di Activity Log."}
            </div>
          </div>
        </div>
      )}

      {/* Main Calling Form & Visual Buttons */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Quick Action Category Push Buttons */}
        <div className="lg:col-span-8 space-y-5">
          {/* Workstation Selector */}
          <div className={`border rounded-3xl p-5 shadow-sm transition-colors ${
            isLight ? "bg-white border-slate-200" : "bg-neutral-900 border-neutral-800"
          }`}>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2.5 ${
              isLight ? "text-slate-700" : "text-neutral-300"
            }`}>
              1. {t("selectWorkstation")} {currentLine.name}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(currentLine.workstations || ["OP-10 Station"]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSelectedStation(st)}
                  className={`p-3 rounded-2xl text-xs font-bold text-left transition-all border ${
                    selectedStation === st
                      ? isLight
                        ? "bg-amber-50 text-slate-900 border-amber-500 shadow-sm ring-1 ring-amber-500"
                        : "bg-neutral-800 text-white border-amber-500 shadow-md ring-1 ring-amber-500"
                      : isLight
                      ? "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"
                      : "bg-neutral-950/80 text-neutral-400 border-neutral-800 hover:border-neutral-700"
                  }`}
                >
                  <div className={isLight ? "text-slate-900 font-bold" : "text-neutral-200 font-bold"}>{st}</div>
                  <div className={`text-[10px] mt-0.5 ${isLight ? "text-slate-500" : "text-neutral-500"}`}>{t("stations")}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 6 Giant Andon Category Push-Buttons */}
          <div className={`border rounded-3xl p-5 shadow-sm transition-colors ${
            isLight ? "bg-white border-slate-200" : "bg-neutral-900 border-neutral-800"
          }`}>
            <div className="flex items-center justify-between mb-3">
              <label className={`block text-xs font-bold uppercase tracking-wider ${
                isLight ? "text-slate-700" : "text-neutral-300"
              }`}>
                2. {t("selectProblemCategory")}
              </label>
              <span className={`text-xs font-bold ${isLight ? "text-amber-700" : "text-amber-400"}`}>Lean TPM Standard</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Machine Breakdown */}
              <button
                type="button"
                id="btn-cat-machine"
                onClick={() => handleQuickCategorySelect("machine_breakdown")}
                className={`p-4 rounded-2xl text-left border-2 transition-all flex items-start gap-3.5 relative overflow-hidden group cursor-pointer ${
                  selectedCategory === "machine_breakdown"
                    ? isLight
                      ? "bg-red-50 border-red-500 shadow-md ring-2 ring-red-500/20 text-slate-900"
                      : "bg-red-950/50 border-red-500 shadow-lg ring-2 ring-red-500/40 text-white"
                    : isLight
                    ? "bg-slate-50/60 border-slate-200 hover:border-red-300"
                    : "bg-neutral-950/60 border-neutral-800 hover:border-red-500/40"
                }`}
              >
                <div className="p-3 rounded-xl bg-red-600 text-white shadow-md group-hover:scale-105 transition-transform flex-shrink-0">
                  <Flame className="w-6 h-6" />
                </div>
                <div>
                  <div className={`font-black text-sm ${isLight ? "text-slate-900" : "text-white"}`}>{t("machineBreakdown")}</div>
                  <div className="text-xs text-red-600 font-bold">Machine Breakdown / Line Stop</div>
                  <div className={`text-[11px] mt-1 ${isLight ? "text-slate-600" : "text-neutral-400"}`}>
                    {language === "en" ? "Sensor error, conveyor jam, motor overheating, electrical trip." : "Sensor error, hidrolik mati, konveyor macet, electrical trip."}
                  </div>
                </div>
              </button>

              {/* Material Shortage */}
              <button
                type="button"
                id="btn-cat-material"
                onClick={() => handleQuickCategorySelect("material_shortage")}
                className={`p-4 rounded-2xl text-left border-2 transition-all flex items-start gap-3.5 relative overflow-hidden group cursor-pointer ${
                  selectedCategory === "material_shortage"
                    ? isLight
                      ? "bg-amber-50 border-amber-500 shadow-md ring-2 ring-amber-500/20 text-slate-900"
                      : "bg-amber-950/50 border-amber-500 shadow-lg ring-2 ring-amber-500/40 text-white"
                    : isLight
                    ? "bg-slate-50/60 border-slate-200 hover:border-amber-300"
                    : "bg-neutral-950/60 border-neutral-800 hover:border-amber-500/40"
                }`}
              >
                <div className="p-3 rounded-xl bg-amber-500 text-slate-950 shadow-md group-hover:scale-105 transition-transform flex-shrink-0">
                  <Boxes className="w-6 h-6" />
                </div>
                <div>
                  <div className={`font-black text-sm ${isLight ? "text-slate-900" : "text-white"}`}>{t("materialShortage")}</div>
                  <div className="text-xs text-amber-700 dark:text-amber-400 font-bold">Material / Part Shortage</div>
                  <div className={`text-[11px] mt-1 ${isLight ? "text-slate-600" : "text-neutral-400"}`}>
                    {language === "en" ? "Out of stock parts, wrong kit supply, empty bin." : "Stok part habis, salah part suplai, bin kosong, call logistics."}
                  </div>
                </div>
              </button>

              {/* Quality Defect */}
              <button
                type="button"
                id="btn-cat-quality"
                onClick={() => handleQuickCategorySelect("quality_defect")}
                className={`p-4 rounded-2xl text-left border-2 transition-all flex items-start gap-3.5 relative overflow-hidden group cursor-pointer ${
                  selectedCategory === "quality_defect"
                    ? isLight
                      ? "bg-orange-50 border-orange-500 shadow-md ring-2 ring-orange-500/20 text-slate-900"
                      : "bg-orange-950/50 border-orange-500 shadow-lg ring-2 ring-orange-500/40 text-white"
                    : isLight
                    ? "bg-slate-50/60 border-slate-200 hover:border-orange-300"
                    : "bg-neutral-950/60 border-neutral-800 hover:border-orange-500/40"
                }`}
              >
                <div className="p-3 rounded-xl bg-orange-600 text-white shadow-md group-hover:scale-105 transition-transform flex-shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <div className={`font-black text-sm ${isLight ? "text-slate-900" : "text-white"}`}>{t("qualityDefect")}</div>
                  <div className="text-xs text-orange-600 font-bold">Quality Issue / Defect Part</div>
                  <div className={`text-[11px] mt-1 ${isLight ? "text-slate-600" : "text-neutral-400"}`}>
                    {language === "en" ? "Dimension tolerance NG, scratch/dent, weld porosity." : "Cacat dimensi, baret cat, pengelasan porositas, NG berturut."}
                  </div>
                </div>
              </button>

              {/* Maintenance & Tooling */}
              <button
                type="button"
                id="btn-cat-tooling"
                onClick={() => handleQuickCategorySelect("maintenance_tooling")}
                className={`p-4 rounded-2xl text-left border-2 transition-all flex items-start gap-3.5 relative overflow-hidden group cursor-pointer ${
                  selectedCategory === "maintenance_tooling"
                    ? isLight
                      ? "bg-blue-50 border-blue-500 shadow-md ring-2 ring-blue-500/20 text-slate-900"
                      : "bg-blue-950/50 border-blue-500 shadow-lg ring-2 ring-blue-500/40 text-white"
                    : isLight
                    ? "bg-slate-50/60 border-slate-200 hover:border-blue-300"
                    : "bg-neutral-950/60 border-neutral-800 hover:border-blue-500/40"
                }`}
              >
                <div className="p-3 rounded-xl bg-blue-600 text-white shadow-md group-hover:scale-105 transition-transform flex-shrink-0">
                  <Wrench className="w-6 h-6" />
                </div>
                <div>
                  <div className={`font-black text-sm ${isLight ? "text-slate-900" : "text-white"}`}>{t("toolingMaintenance")}</div>
                  <div className="text-xs text-blue-600 font-bold">Dies / Tool Wear / Calibration</div>
                  <div className={`text-[11px] mt-1 ${isLight ? "text-slate-600" : "text-neutral-400"}`}>
                    {language === "en" ? "Replace cutting insert, sharpening blade, jig wear." : "Ganti mata potong, asah pisau cutter, ganti jig cetakan."}
                  </div>
                </div>
              </button>

              {/* Leader / Supervisor */}
              <button
                type="button"
                id="btn-cat-supervisor"
                onClick={() => handleQuickCategorySelect("supervisor_call")}
                className={`p-4 rounded-2xl text-left border-2 transition-all flex items-start gap-3.5 relative overflow-hidden group cursor-pointer ${
                  selectedCategory === "supervisor_call"
                    ? isLight
                      ? "bg-purple-50 border-purple-500 shadow-md ring-2 ring-purple-500/20 text-slate-900"
                      : "bg-purple-950/50 border-purple-500 shadow-lg ring-2 ring-purple-500/40 text-white"
                    : isLight
                    ? "bg-slate-50/60 border-slate-200 hover:border-purple-300"
                    : "bg-neutral-950/60 border-neutral-800 hover:border-purple-500/40"
                }`}
              >
                <div className="p-3 rounded-xl bg-purple-600 text-white shadow-md group-hover:scale-105 transition-transform flex-shrink-0">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className={`font-black text-sm ${isLight ? "text-slate-900" : "text-white"}`}>{t("supervisorSupport")}</div>
                  <div className="text-xs text-purple-600 font-bold">Foreman / Supervisor Support</div>
                  <div className={`text-[11px] mt-1 ${isLight ? "text-slate-600" : "text-neutral-400"}`}>
                    {language === "en" ? "SOP validation, operator substitution, rework approval." : "Validasi SOP, pergantian operator, persetujuan rework."}
                  </div>
                </div>
              </button>

              {/* Safety Alert (K3) */}
              <button
                type="button"
                id="btn-cat-safety"
                onClick={() => handleQuickCategorySelect("safety_alert")}
                className={`p-4 rounded-2xl text-left border-2 transition-all flex items-start gap-3.5 relative overflow-hidden group cursor-pointer ${
                  selectedCategory === "safety_alert"
                    ? isLight
                      ? "bg-emerald-50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20 text-slate-900"
                      : "bg-emerald-950/50 border-emerald-500 shadow-lg ring-2 ring-emerald-500/40 text-white"
                    : isLight
                    ? "bg-slate-50/60 border-slate-200 hover:border-emerald-300"
                    : "bg-neutral-950/60 border-neutral-800 hover:border-emerald-500/40"
                }`}
              >
                <div className="p-3 rounded-xl bg-emerald-600 text-white shadow-md group-hover:scale-105 transition-transform flex-shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <div className={`font-black text-sm ${isLight ? "text-slate-900" : "text-white"}`}>{t("safetyHazard")}</div>
                  <div className="text-xs text-emerald-600 font-bold">Safety & EHS Hazard Alert</div>
                  <div className={`text-[11px] mt-1 ${isLight ? "text-slate-600" : "text-neutral-400"}`}>
                    {language === "en" ? "Oil/chemical spill, smoke odor, broken machine guard." : "Tumpahan oli/kimia, bau asap, pelindung mesin lepas."}
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Details & 1-Click Trigger Button */}
        <div className="lg:col-span-4 space-y-5">
          <div className={`border rounded-3xl p-5 space-y-4 shadow-sm transition-colors ${
            isLight ? "bg-white border-slate-200" : "bg-neutral-900 border-neutral-800"
          }`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-700" : "text-neutral-300"}`}>
                3. {language === "en" ? "Call Details & ID" : "Detail Panggilan & Identitas"}
              </h3>
              {currentUser && (
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border ${
                  isLight ? "text-amber-800 bg-amber-50 border-amber-200" : "text-amber-400 bg-amber-500/10 border-amber-500/30"
                }`}>
                  {currentUser.role.toUpperCase()}
                </span>
              )}
            </div>

            {/* Line Stop Status Toggle */}
            <div className={`p-3.5 rounded-2xl border ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-neutral-950 border-neutral-800"
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-xs font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                    {language === "en" ? "Line Stop Condition?" : "Kondisi Line Berhenti?"}
                  </div>
                  <div className={`text-[11px] ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                    {language === "en" ? "Has production halted completely?" : "Apakah lini stop total?"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLineStopped(!isLineStopped)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isLineStopped ? "bg-red-600" : isLight ? "bg-slate-300" : "bg-neutral-700"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                      isLineStopped ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Severity Level */}
            <div>
              <label className={`block text-[11px] font-bold mb-1.5 ${isLight ? "text-slate-600" : "text-neutral-400"}`}>
                {t("severityTitle")}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["minor", "major", "critical_line_stop"] as CallSeverity[]).map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSeverity(sev)}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold transition-all border ${
                      severity === sev
                        ? sev === "critical_line_stop"
                          ? "bg-red-600 text-white border-red-500 shadow-sm"
                          : sev === "major"
                          ? "bg-amber-500 text-slate-950 border-amber-400 shadow-sm"
                          : "bg-blue-600 text-white border-blue-500 shadow-sm"
                        : isLight
                        ? "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"
                        : "bg-neutral-950 text-neutral-400 border-neutral-800"
                    }`}
                  >
                    {sev === "critical_line_stop" ? t("severityCritical") : sev === "major" ? t("severityMajor") : t("severityMinor")}
                  </button>
                ))}
              </div>
            </div>

            {/* Machine & Part No */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={`block text-[11px] font-semibold mb-1 ${isLight ? "text-slate-600" : "text-neutral-400"}`}>
                  {t("machineToolId")}
                </label>
                <input
                  type="text"
                  value={machineId}
                  onChange={(e) => setMachineId(e.target.value)}
                  placeholder="e.g. CNC-01"
                  className={`w-full rounded-xl px-3 py-2 text-xs border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                    isLight
                      ? "bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400"
                      : "bg-neutral-950 border-neutral-800 text-white placeholder-neutral-600"
                  }`}
                />
              </div>
              <div>
                <label className={`block text-[11px] font-semibold mb-1 ${isLight ? "text-slate-600" : "text-neutral-400"}`}>
                  {t("partNumber")}
                </label>
                <input
                  type="text"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  placeholder="e.g. PRT-900"
                  className={`w-full rounded-xl px-3 py-2 text-xs border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                    isLight
                      ? "bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400"
                      : "bg-neutral-950 border-neutral-800 text-white placeholder-neutral-600"
                  }`}
                />
              </div>
            </div>

            {/* Operator Name & ID */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={`block text-[11px] font-semibold mb-1 ${isLight ? "text-slate-600" : "text-neutral-400"}`}>
                  {t("operatorName")}
                </label>
                <input
                  type="text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                    isLight
                      ? "bg-slate-50 border-slate-300 text-slate-900"
                      : "bg-neutral-950 border-neutral-800 text-white"
                  }`}
                />
              </div>
              <div>
                <label className={`block text-[11px] font-semibold mb-1 ${isLight ? "text-slate-600" : "text-neutral-400"}`}>
                  {t("badgeId")}
                </label>
                <input
                  type="text"
                  value={operatorId}
                  onChange={(e) => setOperatorId(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs font-mono border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                    isLight
                      ? "bg-slate-50 border-slate-300 text-slate-900"
                      : "bg-neutral-950 border-neutral-800 text-white"
                  }`}
                />
              </div>
            </div>

            {/* Optional Description */}
            <div>
              <label className={`block text-[11px] font-semibold mb-1 ${isLight ? "text-slate-600" : "text-neutral-400"}`}>
                {t("symptomNotes")}
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={language === "en" ? "e.g. Bearing noise, hydraulic leak, error code E-102..." : "Contoh: Suara berderit pada bearing, silinder macet, error code E-102..."}
                className={`w-full rounded-xl p-3 text-xs border focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none ${
                  isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400"
                    : "bg-neutral-950 border-neutral-800 text-white placeholder-neutral-600"
                }`}
              />
            </div>

            {/* Giant Submit Button */}
            <button
              type="submit"
              id="btn-submit-andon-call"
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 via-amber-600 to-red-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-base tracking-wide flex items-center justify-center gap-2 shadow-xl shadow-red-500/20 transform active:scale-98 transition-all cursor-pointer"
            >
              <PhoneCall className="w-5 h-5 animate-bounce" />
              <span>{t("sendAndonCallBtn")}</span>
            </button>
            <p className={`text-[10px] text-center ${isLight ? "text-slate-500" : "text-neutral-500"}`}>
              {language === "en" 
                ? "Tower lights & siren will trigger across shopfloor immediately." 
                : "Lampu tower & sirene di plant akan aktif seketika setelah tombol ditekan."}
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};
