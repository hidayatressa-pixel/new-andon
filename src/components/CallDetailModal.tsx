import React from "react";
import { AndonCall, CallStatus, AppTheme, AppLanguage } from "../types";
import { CATEGORIES_DATA } from "../utils/categories";
import { formatDuration, formatTimestamp } from "../utils/storage";
import { getTranslation, TranslationKey } from "../utils/i18n";

interface CallDetailModalProps {
  call: AndonCall | null;
  onClose: () => void;
  onUpdateStatus: (callId: string, status: CallStatus, extra?: Partial<AndonCall>) => void;
  theme?: AppTheme;
  language?: AppLanguage;
}

export const CallDetailModal: React.FC<CallDetailModalProps> = ({
  call,
  onClose,
  onUpdateStatus,
  theme = "light",
  language = "id",
}) => {
  if (!call) return null;

  const t = (key: TranslationKey, params?: Record<string, string | number>) => 
    getTranslation(language, key, params);

  const isLight = theme === "light";
  const cat = CATEGORIES_DATA[call.category] || CATEGORIES_DATA.machine_breakdown;
  const elapsedMs = (call.resolvedAt || Date.now()) - call.timestamp;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className={`border rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative transition-colors ${
        isLight ? "bg-white border-slate-200 text-slate-900" : "bg-neutral-900 border-neutral-800 text-neutral-100"
      }`}>
        {/* Header */}
        <div className={`flex items-start justify-between border-b pb-3 ${isLight ? "border-slate-200" : "border-neutral-800"}`}>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                isLight ? "bg-slate-100 text-slate-800 border-slate-200" : "text-amber-400 bg-neutral-950 border-neutral-800"
              }`}>
                {call.ticketNo}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${cat.bgLight}`}>
                {language === "en" ? cat.labelEn : cat.label}
              </span>
              {call.isLineStopped && (
                <span className="bg-red-600 text-white font-black text-[10px] px-2 py-0.5 rounded uppercase animate-pulse">
                  {t("criticalStatus")}
                </span>
              )}
            </div>
            <h3 className={`text-lg font-black mt-1.5 ${isLight ? "text-slate-900" : "text-white"}`}>{call.lineName}</h3>
            <p className={`text-xs ${isLight ? "text-slate-500" : "text-neutral-400"}`}>{call.workstation}</p>
          </div>
          <button
            onClick={onClose}
            className={`p-1 text-lg font-bold ${isLight ? "text-slate-400 hover:text-slate-900" : "text-neutral-400 hover:text-white"}`}
          >
            ✕
          </button>
        </div>

        {/* Content details */}
        <div className="space-y-3.5 text-xs">
          {/* Problem description */}
          <div className={`p-4 rounded-2xl border ${
            isLight ? "bg-slate-50 border-slate-200" : "bg-neutral-950 border-neutral-800"
          }`}>
            <div className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${
              isLight ? "text-slate-500" : "text-neutral-400"
            }`}>
              {t("problemDesc")}:
            </div>
            <p className={`text-sm font-semibold leading-relaxed ${isLight ? "text-slate-900" : "text-white"}`}>
              {call.description}
            </p>
          </div>

          {/* Machine and Operator Metadata */}
          <div className="grid grid-cols-2 gap-2">
            <div className={`p-3 rounded-xl border ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-neutral-950 border-neutral-800"
            }`}>
              <div className={`text-[10px] uppercase font-bold ${isLight ? "text-slate-500" : "text-neutral-500"}`}>{t("operatorName")}</div>
              <div className={`text-xs font-bold mt-0.5 ${isLight ? "text-slate-900" : "text-white"}`}>{call.operatorName}</div>
              <div className={`text-[10px] font-mono ${isLight ? "text-slate-500" : "text-neutral-400"}`}>ID: {call.operatorId}</div>
            </div>
            <div className={`p-3 rounded-xl border ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-neutral-950 border-neutral-800"
            }`}>
              <div className={`text-[10px] uppercase font-bold ${isLight ? "text-slate-500" : "text-neutral-500"}`}>ID Mesin / Part No</div>
              <div className={`text-xs font-bold mt-0.5 ${isLight ? "text-slate-900" : "text-white"}`}>{call.machineId || "N/A"}</div>
              <div className={`text-[10px] font-mono ${isLight ? "text-slate-500" : "text-neutral-400"}`}>{call.partNumber || "N/A"}</div>
            </div>
          </div>

          {/* Timeline */}
          <div className={`p-4 rounded-2xl border space-y-2 ${
            isLight ? "bg-slate-50 border-slate-200" : "bg-neutral-950 border-neutral-800"
          }`}>
            <div className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
              Kronologi Waktu:
            </div>
            <div className={`space-y-1.5 ${isLight ? "text-slate-700" : "text-neutral-300"}`}>
              <div className="flex justify-between">
                <span>Panggilan Dimulai:</span>
                <span className={`font-mono font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{formatTimestamp(call.timestamp)}</span>
              </div>
              {call.acknowledgedAt && (
                <div className="flex justify-between">
                  <span>Diterima / Menuju Lokasi:</span>
                  <span className={`font-mono font-bold ${isLight ? "text-blue-700" : "text-blue-400"}`}>
                    {formatTimestamp(call.acknowledgedAt)} ({call.acknowledgedBy})
                  </span>
                </div>
              )}
              {call.resolvedAt && (
                <div className="flex justify-between">
                  <span>Selesai & Normalisasi:</span>
                  <span className={`font-mono font-bold ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
                    {formatTimestamp(call.resolvedAt)} ({call.resolvedBy})
                  </span>
                </div>
              )}
              <div className={`flex justify-between pt-1 border-t font-bold ${isLight ? "border-slate-200" : "border-neutral-800"}`}>
                <span>Total Durasi:</span>
                <span className={`font-mono ${isLight ? "text-amber-700" : "text-amber-400"}`}>{formatDuration(elapsedMs)}</span>
              </div>
            </div>
          </div>

          {/* Root Cause if solved */}
          {call.rootCause && (
            <div className={`p-3 rounded-xl border ${
              isLight ? "bg-emerald-50 border-emerald-200 text-emerald-950" : "bg-emerald-950/30 border-emerald-500/30 text-emerald-200"
            }`}>
              <strong>Akar Masalah:</strong> {call.rootCause}
              {call.resolutionNotes && (
                <div className="mt-1 text-[11px]">
                  <strong>Tindakan:</strong> {call.resolutionNotes}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={`border-t pt-3 flex items-center justify-end gap-2 ${isLight ? "border-slate-200" : "border-neutral-800"}`}>
          {call.status === "calling" && (
            <button
              onClick={() => {
                onUpdateStatus(call.id, "acknowledged", {
                  acknowledgedAt: Date.now(),
                  acknowledgedBy: "Responder Shift 1",
                });
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20"
            >
              {t("respondCallBtn")}
            </button>
          )}
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl font-bold text-xs border transition-all ${
              isLight
                ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700"
            }`}
          >
            {language === "en" ? "Close" : "Tutup"}
          </button>
        </div>
      </div>
    </div>
  );
};
