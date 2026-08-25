import React, { useState } from "react";
import { 
  Map, 
  Flame, 
  AlertTriangle, 
  ArrowRight, 
  Box, 
  Truck, 
  Activity 
} from "lucide-react";
import { AndonCall, AndonLine, AppTheme, AppLanguage } from "../types";
import { CATEGORIES_DATA } from "../utils/categories";
import { getTranslation, TranslationKey } from "../utils/i18n";

interface PlantLayoutMapProps {
  lines: AndonLine[];
  activeCalls: AndonCall[];
  onSelectLine: (lineId: string) => void;
  onSelectCall: (call: AndonCall) => void;
  theme?: AppTheme;
  language?: AppLanguage;
}

export const PlantLayoutMap: React.FC<PlantLayoutMapProps> = ({
  lines,
  activeCalls,
  onSelectLine,
  onSelectCall,
  theme = "light",
  language = "id",
}) => {
  const [selectedLineForDetail, setSelectedLineForDetail] = useState<AndonLine | null>(lines[0] || null);

  const t = (key: TranslationKey, params?: Record<string, string | number>) => 
    getTranslation(language, key, params);

  const isLight = theme === "light";

  const getLineCall = (lineId: string) => {
    return activeCalls.find((c) => c.lineId === lineId && c.status !== "resolved");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className={`border rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
        isLight ? "bg-white border-slate-200 text-slate-900" : "bg-neutral-900 border-neutral-800 text-neutral-100"
      }`}>
        <div>
          <div className="flex items-center gap-3">
            <span className={`p-2.5 rounded-2xl border ${
              isLight ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
            }`}>
              <Map className="w-5 h-5" />
            </span>
            <div>
              <h2 className={`text-lg sm:text-xl font-black tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                {t("plantMapTitle")}
              </h2>
              <p className={`text-xs ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                {t("plantMapSubtitle")}
              </p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className={`flex items-center gap-3 text-xs px-3.5 py-2 rounded-2xl border ${
          isLight ? "bg-slate-50 border-slate-200" : "bg-neutral-950 border-neutral-800"
        }`}>
          <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>{t("runningStatus")}</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>{t("warningStatus")}</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-red-600 dark:text-red-400">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span>{t("criticalStatus")}</span>
          </div>
        </div>
      </div>

      {/* 2D Plant Grid Representation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Floor Blueprint */}
        <div className={`lg:col-span-8 border rounded-3xl p-6 relative overflow-hidden shadow-sm transition-colors ${
          isLight 
            ? "bg-slate-50 border-slate-200" 
            : "bg-neutral-950 border-neutral-800"
        }`}>
          {/* Subtle Grid Background Pattern */}
          <div 
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: isLight 
                ? "radial-gradient(#0f172a 1px, transparent 1px)" 
                : "radial-gradient(#ffffff 1px, transparent 1px)",
              backgroundSize: "20px 20px"
            }}
          />

          {/* Plant Top Boundary / Material Inbound */}
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-dashed border-slate-300 dark:border-neutral-800 text-xs font-mono font-bold text-slate-500 dark:text-neutral-500">
            <div className="flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-amber-500" />
              <span>{language === "en" ? "MATERIAL INBOUND DOCK (LOGISTICS)" : "AREA INBOUND MATERIAL & LOGISTIK"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Box className="w-4 h-4 text-cyan-500" />
              <span>{language === "en" ? "WAREHOUSE RAW MATERIALS" : "GUDANG BAHAN BAKU"}</span>
            </div>
          </div>

          {/* Lines Layout Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
            {lines.map((line) => {
              const activeCall = getLineCall(line.id);
              const isLineStop = activeCall?.isLineStopped;
              const hasWarning = activeCall && !isLineStop;
              const isSelected = selectedLineForDetail?.id === line.id;

              return (
                <div
                  key={line.id}
                  id={`map-node-${line.id}`}
                  onClick={() => setSelectedLineForDetail(line)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative shadow-sm ${
                    isSelected
                      ? isLight
                        ? "ring-2 ring-amber-500 border-amber-500 bg-white shadow-md"
                        : "ring-2 ring-amber-500 border-amber-500 bg-neutral-900"
                      : isLight
                      ? "bg-white border-slate-200 hover:border-slate-300 hover:shadow"
                      : "bg-neutral-900 border-neutral-800 hover:border-neutral-700"
                  }`}
                >
                  {/* Status Indicator Beacon */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-[11px] font-black px-2 py-0.5 rounded border ${
                          isLight ? "bg-slate-100 text-slate-700 border-slate-200" : "bg-neutral-950 text-neutral-300 border-neutral-800"
                        }`}>
                          {line.shortCode}
                        </span>
                        <h4 className={`font-black text-sm line-clamp-1 ${isLight ? "text-slate-900" : "text-white"}`}>
                          {line.name}
                        </h4>
                      </div>
                      <div className={`text-[11px] mt-1 font-medium ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                        Dept: {line.department} • {line.workstations?.length || 0} {t("stations")}
                      </div>
                    </div>

                    {/* Beacon Tower */}
                    <div className="flex flex-col items-center gap-1">
                      {isLineStop ? (
                        <div className="w-5 h-5 rounded-full bg-red-500 animate-ping shadow-[0_0_12px_#ef4444]" />
                      ) : hasWarning ? (
                        <div className="w-4 h-4 rounded-full bg-amber-400 animate-pulse shadow-[0_0_10px_#f59e0b]" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                      )}
                    </div>
                  </div>

                  {/* Workstations Mini Flow */}
                  <div className={`mt-3 pt-2.5 border-t flex items-center justify-between text-[11px] font-mono ${
                    isLight ? "border-slate-100 text-slate-600" : "border-neutral-800 text-neutral-400"
                  }`}>
                    <span>Target: {line.targetDaily} pcs</span>
                    <span className={`font-bold ${line.efficiency >= 90 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                      {line.efficiency}% OEE
                    </span>
                  </div>

                  {activeCall && (
                    <div className={`mt-2 p-2 rounded-xl text-[11px] font-semibold border ${
                      isLineStop 
                        ? isLight ? "bg-red-50 text-red-700 border-red-200" : "bg-red-950/60 text-red-300 border-red-500/40"
                        : isLight ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-amber-950/60 text-amber-300 border-amber-500/40"
                    }`}>
                      <div className="flex items-center gap-1 font-bold">
                        {isLineStop ? <Flame className="w-3.5 h-3.5 text-red-500 animate-bounce" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                        <span>{language === "en" ? (CATEGORIES_DATA[activeCall.category]?.labelEn || activeCall.category) : (CATEGORIES_DATA[activeCall.category]?.label || activeCall.category)}</span>
                      </div>
                      <div className="truncate mt-0.5 font-normal">{activeCall.workstation}: {activeCall.description}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Plant Bottom Boundary / Finished Goods Outbound */}
          <div className="flex items-center justify-between mt-6 pt-2 border-t border-dashed border-slate-300 dark:border-neutral-800 text-xs font-mono font-bold text-slate-500 dark:text-neutral-500">
            <div className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span>{language === "en" ? "FINAL QUALITY AUDIT & BUYOFF" : "AREA FINAL QUALITY AUDIT & BUYOFF"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-purple-500" />
              <span>{language === "en" ? "FINISHED GOODS OUTBOUND" : "PENGIRIMAN PRODUK JADI"}</span>
            </div>
          </div>
        </div>

        {/* Selected Line Detail Panel */}
        <div className="lg:col-span-4 space-y-4">
          {selectedLineForDetail ? (
            <div className={`border rounded-3xl p-5 space-y-4 shadow-sm transition-colors ${
              isLight ? "bg-white border-slate-200 text-slate-900" : "bg-neutral-900 border-neutral-800 text-neutral-100"
            }`}>
              <div className="flex items-center justify-between">
                <span className={`font-mono text-xs font-black px-2.5 py-1 rounded-xl border ${
                  isLight ? "bg-slate-100 text-slate-800 border-slate-200" : "bg-neutral-950 text-amber-400 border-neutral-800"
                }`}>
                  {selectedLineForDetail.shortCode}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-lg font-bold border ${
                  selectedLineForDetail.status === "running"
                    ? isLight ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                    : selectedLineForDetail.status === "critical"
                    ? "bg-red-600 text-white animate-pulse"
                    : "bg-amber-500 text-slate-950"
                }`}>
                  {selectedLineForDetail.status.toUpperCase()}
                </span>
              </div>

              <div>
                <h3 className={`text-base font-black ${isLight ? "text-slate-900" : "text-white"}`}>
                  {selectedLineForDetail.name}
                </h3>
                <p className={`text-xs mt-0.5 ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                  Departemen: {selectedLineForDetail.department} • Leader: {selectedLineForDetail.leaderName}
                </p>
              </div>

              {/* Station Breakdown in this line */}
              <div className="space-y-2">
                <label className={`block text-xs font-bold uppercase tracking-wider ${
                  isLight ? "text-slate-700" : "text-neutral-300"
                }`}>
                  {language === "en" ? "Workstations in this Line:" : "Daftar Stasiun Kerja:"}
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {selectedLineForDetail.workstations?.map((st) => {
                    const stCall = activeCalls.find(
                      (c) => c.lineId === selectedLineForDetail.id && c.workstation === st && c.status !== "resolved"
                    );

                    return (
                      <div
                        key={st}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                          stCall
                            ? isLight ? "bg-red-50 border-red-300 text-red-950" : "bg-red-950/40 border-red-500/50 text-red-200"
                            : isLight ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-neutral-950 border-neutral-800 text-neutral-300"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${stCall ? "bg-red-500 animate-ping" : "bg-emerald-500"}`} />
                          <span className="font-semibold">{st}</span>
                        </div>
                        {stCall && (
                          <button
                            onClick={() => onSelectCall(stCall)}
                            className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-bold hover:bg-red-500 shadow-sm"
                          >
                            {language === "en" ? "Call" : "Inspeksi"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Button */}
              <div className={`pt-3 border-t ${isLight ? "border-slate-200" : "border-neutral-800"}`}>
                <button
                  onClick={() => onSelectLine(selectedLineForDetail.id)}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
                >
                  <span>{t("callOperator")} {selectedLineForDetail.shortCode}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className={`border rounded-3xl p-6 text-center text-xs ${
              isLight ? "bg-white border-slate-200 text-slate-500" : "bg-neutral-900 border-neutral-800 text-neutral-500"
            }`}>
              {language === "en" ? "Click any line on the map to inspect stations." : "Pilih lini pada peta untuk melihat detail stasiun."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
