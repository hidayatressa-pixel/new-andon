import React, { useState, useEffect } from "react";
import { 
  Flame, 
  Boxes, 
  UserCheck, 
  CheckCircle, 
  PhoneCall, 
  Clock, 
  User, 
  Layers,
  AlertOctagon,
  Radio
} from "lucide-react";
import { AndonCall, AndonLine, CallCategory, CallSeverity, UserProfile, AppTheme, AppLanguage } from "../types";
import { CATEGORIES_DATA, PRIMARY_ANDON_BUTTONS, normalizeCategoryToPrimary } from "../utils/categories";
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
  // Default to MERAH (abnormal_machine)
  const [selectedCategory, setSelectedCategory] = useState<CallCategory>("abnormal_machine");
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

  // Force reset station selection when active line ID changes (especially helpful after uploading real factory data)
  useEffect(() => {
    if (currentLine?.workstations && currentLine.workstations.length > 0) {
      setSelectedStation(currentLine.workstations[0]);
    }
  }, [currentLine?.id]);

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

  const handleSelectCategory = (cat: CallCategory) => {
    setSelectedCategory(cat);
    if (cat === "abnormal_machine" || cat === "machine_breakdown") {
      setIsLineStopped(true);
      setSeverity("critical_line_stop");
    } else if (cat === "leader_call" || cat === "quality_defect") {
      setIsLineStopped(false);
      setSeverity("major");
    } else {
      // material_support
      setIsLineStopped(false);
      setSeverity("major");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let autoDesc = description.trim();
    if (!autoDesc) {
      if (selectedCategory === "abnormal_machine" || selectedCategory === "machine_breakdown") {
        autoDesc = language === "en"
          ? `[RED] Machine abnormality / breakdown reported at ${selectedStation}. Line halted for maintenance.`
          : `[MERAH] Abnormal Mesin / Kerusakan dilaporkan pada ${selectedStation}. Butuh penanganan teknisi mesin segera.`;
      } else if (selectedCategory === "leader_call" || selectedCategory === "quality_defect") {
        autoDesc = language === "en"
          ? `[YELLOW] Calling Leader: Quality, process, or productivity abnormality at ${selectedStation}.`
          : `[KUNING] Calling Leader: Terjadi kendala kualitas, proses, atau produktivitas di ${selectedStation}.`;
      } else {
        autoDesc = language === "en"
          ? `[GREEN] Calling Material Support: Material shortage or abnormality at ${selectedStation}.`
          : `[HIJAU] Calling Material Support: Permintaan pengadaan material / abnormality part di ${selectedStation}.`;
      }
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

  const activeCategoryItem = PRIMARY_ANDON_BUTTONS.find(
    (b) => b.id === selectedCategory || normalizeCategoryToPrimary(selectedCategory) === b.id
  ) || PRIMARY_ANDON_BUTTONS[0];

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
                {language === "en" 
                  ? "Select line & station, then press 1 of the 3 primary Andon buttons below."
                  : "Pilih lini & stasiun, lalu tekan salah satu dari 3 tombol panggilan Andon utama di bawah."}
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
              1. {t("selectWorkstation")} - {currentLine.name}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(currentLine.workstations || ["OP-10 Station"]).map((st) => (
                <button
                  key={st}
                  type="button"
                  id={`btn-station-${st.replace(/\s+/g, '-').toLowerCase()}`}
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

          {/* 3 Physical-Style Andon Push-Buttons (Red, Yellow, Green) */}
          <div className={`border rounded-3xl p-6 shadow-sm transition-colors space-y-4 ${
            isLight ? "bg-white border-slate-200" : "bg-neutral-900 border-neutral-800"
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <label className={`block text-xs font-black uppercase tracking-wider ${
                  isLight ? "text-slate-800" : "text-neutral-200"
                }`}>
                  2. {language === "en" ? "Select Andon Call Button (3 Core Buttons)" : "Pilih Tombol Panggilan Operator (3 Tombol Utama)"}
                </label>
                <p className={`text-xs ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                  {language === "en" ? "Touch the button below to arm and activate call category" : "Tekan tombol di bawah untuk memilih kategori masalah"}
                </p>
              </div>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                isLight ? "bg-slate-100 border-slate-200 text-slate-700" : "bg-neutral-950 border-neutral-800 text-neutral-400"
              }`}>
                Shopfloor 3-Button Standard
              </span>
            </div>

            {/* 3 Buttons Grid */}
            <div className="grid grid-cols-1 gap-4">
              {/* BUTTON 1: MERAH = ABNORMAL MESIN */}
              <button
                type="button"
                id="btn-cat-abnormal-machine"
                onClick={() => handleSelectCategory("abnormal_machine")}
                className={`p-5 rounded-2xl text-left border-2 transition-all flex items-start gap-4 relative overflow-hidden group cursor-pointer ${
                  selectedCategory === "abnormal_machine" || selectedCategory === "machine_breakdown"
                    ? isLight
                      ? "bg-red-50/80 border-red-500 shadow-lg ring-4 ring-red-500/25 text-slate-900"
                      : "bg-red-950/40 border-red-500 shadow-xl ring-4 ring-red-500/35 text-white"
                    : isLight
                    ? "bg-slate-50 border-slate-200 hover:border-red-400 hover:bg-red-50/30"
                    : "bg-neutral-950 border-neutral-800 hover:border-red-500/50 hover:bg-neutral-900"
                }`}
              >
                {/* Visual Pill Indicator */}
                <div className="p-3.5 rounded-2xl bg-red-600 text-white shadow-md flex-shrink-0 group-hover:scale-105 transition-transform flex items-center justify-center">
                  <Flame className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-red-600 text-white font-mono font-black text-xs px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                      {language === "en" ? "RED BUTTON" : "TOMBOL MERAH"}
                    </span>
                    <span className="text-xs text-red-600 font-bold">
                      {language === "en" ? "LINE STOP TRIGGER" : "PRIORITAS TINGGI / STOP"}
                    </span>
                  </div>
                  <div className={`text-base font-black tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                    {language === "en" ? "MACHINE ABNORMALITY" : "ABNORMAL MESIN"}
                  </div>
                  <div className={`text-xs mt-1 leading-relaxed ${isLight ? "text-slate-600" : "text-neutral-300"}`}>
                    {language === "en"
                      ? "Machine breakdown, electrical/mechanical fault, sensor failure, or critical line stop."
                      : "Kerusakan Mesin / Line Stop / Kendala Mekanikal, Elektrikal & Sensor Rusak."}
                  </div>
                </div>
                {/* Active Radio Pill */}
                <div className="flex-shrink-0 pt-1">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedCategory === "abnormal_machine" || selectedCategory === "machine_breakdown"
                      ? "border-red-600 bg-red-600 text-white"
                      : isLight ? "border-slate-300 bg-white" : "border-neutral-700 bg-neutral-900"
                  }`}>
                    {(selectedCategory === "abnormal_machine" || selectedCategory === "machine_breakdown") && (
                      <span className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </div>
              </button>

              {/* BUTTON 2: KUNING = CALLING LEADER */}
              <button
                type="button"
                id="btn-cat-calling-leader"
                onClick={() => handleSelectCategory("leader_call")}
                className={`p-5 rounded-2xl text-left border-2 transition-all flex items-start gap-4 relative overflow-hidden group cursor-pointer ${
                  selectedCategory === "leader_call" || selectedCategory === "quality_defect" || selectedCategory === "supervisor_call"
                    ? isLight
                      ? "bg-amber-50/80 border-amber-500 shadow-lg ring-4 ring-amber-500/25 text-slate-900"
                      : "bg-amber-950/40 border-amber-500 shadow-xl ring-4 ring-amber-500/35 text-white"
                    : isLight
                    ? "bg-slate-50 border-slate-200 hover:border-amber-400 hover:bg-amber-50/30"
                    : "bg-neutral-950 border-neutral-800 hover:border-amber-500/50 hover:bg-neutral-900"
                }`}
              >
                {/* Visual Pill Indicator */}
                <div className="p-3.5 rounded-2xl bg-amber-500 text-slate-950 shadow-md flex-shrink-0 group-hover:scale-105 transition-transform flex items-center justify-center">
                  <UserCheck className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-amber-500 text-slate-950 font-mono font-black text-xs px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                      {language === "en" ? "YELLOW BUTTON" : "TOMBOL KUNING"}
                    </span>
                    <span className="text-xs text-amber-700 dark:text-amber-300 font-bold">
                      {language === "en" ? "LEADER & QUALITY" : "SUPERVISI & KUALITAS"}
                    </span>
                  </div>
                  <div className={`text-base font-black tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                    {language === "en" ? "CALLING LEADER" : "CALLING LEADER"}
                  </div>
                  <div className={`text-xs mt-1 leading-relaxed ${isLight ? "text-slate-600" : "text-neutral-300"}`}>
                    {language === "en"
                      ? "Abnormal Quality (NG parts, defect), Process delays, Tooling issues, and Productivity bottlenecks."
                      : "Abnormal Kualitas (Part Cacat/NG), Kendala Proses Kerja, Tooling, dan Penurunan Produktivitas."}
                  </div>
                </div>
                {/* Active Radio Pill */}
                <div className="flex-shrink-0 pt-1">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedCategory === "leader_call" || selectedCategory === "quality_defect" || selectedCategory === "supervisor_call"
                      ? "border-amber-500 bg-amber-500 text-slate-950"
                      : isLight ? "border-slate-300 bg-white" : "border-neutral-700 bg-neutral-900"
                  }`}>
                    {(selectedCategory === "leader_call" || selectedCategory === "quality_defect" || selectedCategory === "supervisor_call") && (
                      <span className="w-2 h-2 rounded-full bg-slate-950" />
                    )}
                  </div>
                </div>
              </button>

              {/* BUTTON 3: HIJAU = CALLING MATERIAL SUPPORT */}
              <button
                type="button"
                id="btn-cat-calling-material"
                onClick={() => handleSelectCategory("material_support")}
                className={`p-5 rounded-2xl text-left border-2 transition-all flex items-start gap-4 relative overflow-hidden group cursor-pointer ${
                  selectedCategory === "material_support" || selectedCategory === "material_shortage"
                    ? isLight
                      ? "bg-emerald-50/80 border-emerald-500 shadow-lg ring-4 ring-emerald-500/25 text-slate-900"
                      : "bg-emerald-950/40 border-emerald-500 shadow-xl ring-4 ring-emerald-500/35 text-white"
                    : isLight
                    ? "bg-slate-50 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30"
                    : "bg-neutral-950 border-neutral-800 hover:border-emerald-500/50 hover:bg-neutral-900"
                }`}
              >
                {/* Visual Pill Indicator */}
                <div className="p-3.5 rounded-2xl bg-emerald-600 text-white shadow-md flex-shrink-0 group-hover:scale-105 transition-transform flex items-center justify-center">
                  <Boxes className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-emerald-600 text-white font-mono font-black text-xs px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                      {language === "en" ? "GREEN BUTTON" : "TOMBOL HIJAU"}
                    </span>
                    <span className="text-xs text-emerald-600 font-bold">
                      {language === "en" ? "MATERIAL LOGISTICS" : "LOGISTIK & MATERIAL"}
                    </span>
                  </div>
                  <div className={`text-base font-black tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                    {language === "en" ? "CALLING MATERIAL SUPPORT" : "CALLING MATERIAL SUPPORT"}
                  </div>
                  <div className={`text-xs mt-1 leading-relaxed ${isLight ? "text-slate-600" : "text-neutral-300"}`}>
                    {language === "en"
                      ? "Pengadaan Material replenishment, empty bin supply, or Abnormality Material (wrong spec, contaminated)."
                      : "Pengadaan Material / Pasokan Habis / Abnormality Material (Salah Tipe, Rusak dari Vendor)."}
                  </div>
                </div>
                {/* Active Radio Pill */}
                <div className="flex-shrink-0 pt-1">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedCategory === "material_support" || selectedCategory === "material_shortage"
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : isLight ? "border-slate-300 bg-white" : "border-neutral-700 bg-neutral-900"
                  }`}>
                    {(selectedCategory === "material_support" || selectedCategory === "material_shortage") && (
                      <span className="w-2 h-2 rounded-full bg-white" />
                    )}
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
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border ${activeCategoryItem.badgeClass}`}>
                {language === "en" ? activeCategoryItem.colorNameEn : activeCategoryItem.colorName}
              </span>
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

            {/* Prominent Problem Description (Uraian Masalah) only, for Operator Efficiency */}
            <div>
              <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wide ${isLight ? "text-slate-700" : "text-neutral-300"}`}>
                {language === "id" ? "Uraian Masalah" : "Problem Description"} <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  language === "id"
                    ? "Tuliskan uraian masalah secara singkat (contoh: Sensor pneumatic macet, baut longgar, part reject...)"
                    : "Describe the issue briefly (e.g., Pneumatic sensor jammed, loose bolt, reject part...)"
                }
                className={`w-full rounded-2xl p-3.5 text-xs border focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none font-medium leading-relaxed ${
                  isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white"
                    : "bg-neutral-950 border-neutral-800 text-white placeholder-neutral-600 focus:bg-neutral-900"
                }`}
              />
            </div>

            {/* Giant Submit Button */}
            <button
              type="submit"
              id="btn-submit-andon-call"
              className={`w-full py-4 rounded-2xl text-white font-black text-base tracking-wide flex items-center justify-center gap-2 shadow-xl transform active:scale-98 transition-all cursor-pointer ${
                selectedCategory === "abnormal_machine" || selectedCategory === "machine_breakdown"
                  ? "bg-red-600 hover:bg-red-500 shadow-red-500/25"
                  : selectedCategory === "leader_call" || selectedCategory === "quality_defect" || selectedCategory === "supervisor_call"
                  ? "bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-amber-500/25 font-black"
                  : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/25"
              }`}
            >
              <PhoneCall className="w-5 h-5 animate-bounce" />
              <span>{t("sendAndonCallBtn")}</span>
            </button>
            <p className={`text-[10px] text-center ${isLight ? "text-slate-500" : "text-neutral-500"}`}>
              {language === "en" 
                ? "Tower lights & siren will broadcast across shopfloor instantly." 
                : "Lampu tower & sirene di plant akan aktif seketika setelah tombol ditekan."}
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};
