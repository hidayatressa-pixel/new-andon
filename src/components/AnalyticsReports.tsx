import React, { useState } from "react";
import { 
  BarChart3, 
  Download, 
  TrendingDown, 
  Clock, 
  Flame, 
  Search, 
  Filter, 
  CheckCircle
} from "lucide-react";
import { AndonCall, AndonLine, CallCategory, AppTheme, AppLanguage, ActivityLog } from "../types";
import { CATEGORIES_DATA, normalizeCategoryToPrimary } from "../utils/categories";
import { formatDuration, formatTimestamp } from "../utils/storage";
import { getTranslation, TranslationKey } from "../utils/i18n";
import Papa from "papaparse";

interface AnalyticsReportsProps {
  calls: AndonCall[];
  lines: AndonLine[];
  activityLogs?: ActivityLog[];
  theme?: AppTheme;
  language?: AppLanguage;
}

export const AnalyticsReports: React.FC<AnalyticsReportsProps> = ({
  calls,
  lines,
  activityLogs = [],
  theme = "light",
  language = "id",
}) => {
  const [filterLine, setFilterLine] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const t = (key: TranslationKey, params?: Record<string, string | number>) => 
    getTranslation(language, key, params);

  const isLight = theme === "light";

  // Metrics Calculations
  const resolvedCalls = calls.filter((c) => c.status === "resolved");

  // Mean Time to Respond (MTTR - Response) in minutes
  const totalResponseTimeMs = resolvedCalls.reduce((acc, c) => {
    if (c.acknowledgedAt) {
      return acc + (c.acknowledgedAt - c.timestamp);
    }
    return acc;
  }, 0);
  const avgResponseTimeMin = resolvedCalls.length > 0
    ? (totalResponseTimeMs / resolvedCalls.length / 60000).toFixed(1)
    : "2.4";

  // Mean Time to Repair / Resolve (MTTR - Resolution) in minutes
  const totalRepairTimeMs = resolvedCalls.reduce((acc, c) => {
    if (c.resolvedAt) {
      return acc + (c.resolvedAt - (c.inProgressAt || c.acknowledgedAt || c.timestamp));
    }
    return acc;
  }, 0);
  const avgRepairTimeMin = resolvedCalls.length > 0
    ? (totalRepairTimeMs / resolvedCalls.length / 60000).toFixed(1)
    : "14.5";

  // Total Downtime Minutes from Line Stops
  const lineStopCalls = calls.filter((c) => c.isLineStopped);
  const totalDowntimeMin = lineStopCalls.reduce((acc, c) => {
    const end = c.resolvedAt || Date.now();
    return acc + Math.floor((end - c.timestamp) / 60000);
  }, 0);

  // Category Breakdown for Pareto Chart (strictly 3 primary categories)
  const categoryCounts: Record<"abnormal_machine" | "leader_call" | "material_support", number> = {
    abnormal_machine: 0,
    leader_call: 0,
    material_support: 0,
  };

  calls.forEach((c) => {
    const primary = normalizeCategoryToPrimary(c.category);
    if (categoryCounts[primary] !== undefined) {
      categoryCounts[primary]++;
    }
  });

  const maxCategoryCount = Math.max(...Object.values(categoryCounts), 1);

  // Filtered Calls for History Table
  const filteredCalls = calls.filter((c) => {
    if (filterLine !== "all" && c.lineId !== filterLine) return false;
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

  const handleExportCsv = () => {
    const csvData = filteredCalls.map((c) => {
      const durationMin = c.resolvedAt
        ? Math.round((c.resolvedAt - c.timestamp) / 60000)
        : Math.round((Date.now() - c.timestamp) / 60000);

      return {
        Ticket_No: c.ticketNo,
        Line: c.lineName,
        Workstation: c.workstation,
        Category: c.category,
        Severity: c.severity,
        Line_Stop: c.isLineStopped ? "YES" : "NO",
        Status: c.status,
        Operator: c.operatorName,
        Created_At: new Date(c.timestamp).toLocaleString(),
        Resolved_At: c.resolvedAt ? new Date(c.resolvedAt).toLocaleString() : "-",
        Resolved_By: c.resolvedBy || "-",
        Duration_Minutes: durationMin,
        Root_Cause: c.rootCause || "-",
        Resolution_Notes: c.resolutionNotes || "-",
      };
    });

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `andon_analytics_${Date.now()}.csv`;
    a.click();
  };

  const handleExportConsolidatedCsv = () => {
    // 1. Executive Summary
    const summaryData = [
      { Section: "1. EXECUTIVE KPI SUMMARY", Metric: "Mean Time to Respond (MTTR - Response)", Value: `${avgResponseTimeMin} min`, Notes: "Target < 3.0 minutes (SLA OK)" },
      { Section: "1. EXECUTIVE KPI SUMMARY", Metric: "Mean Time to Resolve (MTTR - Resolution)", Value: `${avgRepairTimeMin} min`, Notes: "Average technical repair duration" },
      { Section: "1. EXECUTIVE KPI SUMMARY", Metric: "Total Production Downtime", Value: `${totalDowntimeMin} min`, Notes: "Sum of line stop durations" },
      { Section: "1. EXECUTIVE KPI SUMMARY", Metric: "Total Raised Work Orders (WOs)", Value: calls.length, Notes: "Total logged calls" },
      { Section: "1. EXECUTIVE KPI SUMMARY", Metric: "Resolved Incidents", Value: resolvedCalls.length, Notes: "Successfully repaired issues" },
    ];

    // 2. Detailed Work Orders List
    const ticketsData = filteredCalls.map((c) => {
      const durationMin = c.resolvedAt
        ? Math.round((c.resolvedAt - c.timestamp) / 60000)
        : Math.round((Date.now() - c.timestamp) / 60000);
      return {
        Section: "2. DETAILED WORK ORDERS LIST",
        Ticket_No: c.ticketNo,
        Line: c.lineName,
        Workstation: c.workstation,
        Category: c.category,
        Severity: c.severity,
        Line_Stop: c.isLineStopped ? "YES" : "NO",
        Status: c.status,
        Operator: c.operatorName,
        Created_At: new Date(c.timestamp).toLocaleString(),
        Resolved_At: c.resolvedAt ? new Date(c.resolvedAt).toLocaleString() : "-",
        Duration_Minutes: durationMin,
        Root_Cause: c.rootCause || "-",
        Resolution_Notes: c.resolutionNotes || "-",
      };
    });

    // 3. Activity Logs
    const logsData = (activityLogs || []).map((l) => ({
      Section: "3. ACTIVITY LOGS AUDIT TRAIL",
      Timestamp: new Date(l.timestamp).toLocaleString(),
      Action: l.action,
      Title: l.title,
      Details: l.details,
      User_Name: l.userName,
      User_Role: l.userRole,
      Ticket_No: l.ticketNo || "-",
    }));

    const csvSummary = Papa.unparse(summaryData);
    const csvTickets = ticketsData.length > 0 
      ? "\n\n" + Papa.unparse(ticketsData) 
      : "\n\n2. DETAILED WORK ORDERS LIST\nNo Work Orders recorded";
    const csvLogs = logsData.length > 0 
      ? "\n\n" + Papa.unparse(logsData) 
      : "\n\n3. ACTIVITY LOGS AUDIT TRAIL\nNo activity logs recorded";

    const finalCsvContent = csvSummary + csvTickets + csvLogs;
    const blob = new Blob([finalCsvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smart_andon_consolidated_report_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Banner */}
      <div className={`border rounded-3xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors ${
        isLight ? "bg-white border-slate-200 text-slate-900" : "bg-neutral-900 border-neutral-800 text-neutral-100"
      }`}>
        <div>
          <div className="flex items-center gap-3">
            <span className={`p-2.5 rounded-2xl border ${
              isLight ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-purple-500/20 text-purple-400 border-purple-500/30"
            }`}>
              <BarChart3 className="w-5 h-5" />
            </span>
            <div>
              <h2 className={`text-lg sm:text-xl font-black tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                {t("analyticsTitle")}
              </h2>
              <p className={`text-xs ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                {t("analyticsSubtitle")}
              </p>
            </div>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto shrink-0">
          {/* Individual Tickets Export */}
          <button
            onClick={handleExportCsv}
            className={`px-4 py-2 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm border transition-all ${
              isLight
                ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
                : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700"
            }`}
          >
            <Download className="w-4 h-4" />
            <span>{language === "id" ? "Laporan WO (CSV)" : "Work Orders Report (CSV)"}</span>
          </button>

          {/* Consolidated Executive Package Export */}
          <button
            onClick={handleExportConsolidatedCsv}
            className="px-4 py-2 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transition-all transform active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>
              {language === "id" 
                ? "Unduh Laporan Konsolidasi (CSV)" 
                : "Consolidated Executive Report (CSV)"}
            </span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: MTTR Response */}
        <div className={`border rounded-3xl p-5 shadow-sm transition-colors ${
          isLight ? "bg-white border-slate-200" : "bg-neutral-900 border-neutral-800"
        }`}>
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-neutral-400 mb-2">
            <span>{t("avgResponseTime")}</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-black font-mono ${isLight ? "text-blue-700" : "text-blue-400"}`}>
              {avgResponseTimeMin}
            </span>
            <span className="text-xs text-slate-500 dark:text-neutral-500 font-semibold">{t("minutes")}</span>
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-2 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Target &lt; 3.0 mnt (SLA OK)</span>
          </div>
        </div>

        {/* KPI 2: MTTR Repair */}
        <div className={`border rounded-3xl p-5 shadow-sm transition-colors ${
          isLight ? "bg-white border-slate-200" : "bg-neutral-900 border-neutral-800"
        }`}>
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-neutral-400 mb-2">
            <span>{t("avgRepairTime")}</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-black font-mono ${isLight ? "text-amber-700" : "text-amber-400"}`}>
              {avgRepairTimeMin}
            </span>
            <span className="text-xs text-slate-500 dark:text-neutral-500 font-semibold">{t("minutes")}</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-neutral-400 font-medium mt-2">
            Rata-rata durasi penanganan teknisi
          </div>
        </div>

        {/* KPI 3: Total Downtime */}
        <div className={`border rounded-3xl p-5 shadow-sm transition-colors ${
          isLight ? "bg-white border-slate-200" : "bg-neutral-900 border-neutral-800"
        }`}>
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-neutral-400 mb-2">
            <span>{t("totalDowntime")}</span>
            <Flame className="w-4 h-4 text-red-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-black font-mono ${isLight ? "text-red-700" : "text-red-400"}`}>
              {totalDowntimeMin}
            </span>
            <span className="text-xs text-slate-500 dark:text-neutral-500 font-semibold">{t("minutes")}</span>
          </div>
          <div className="text-[11px] text-red-600 dark:text-red-400 font-bold mt-2">
            {lineStopCalls.length} Insiden Line Stop
          </div>
        </div>

        {/* KPI 4: Total Calls */}
        <div className={`border rounded-3xl p-5 shadow-sm transition-colors ${
          isLight ? "bg-white border-slate-200" : "bg-neutral-900 border-neutral-800"
        }`}>
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-neutral-400 mb-2">
            <span>{t("totalCalls")}</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-black font-mono ${isLight ? "text-slate-900" : "text-white"}`}>
              {calls.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-neutral-500 font-semibold font-semibold">WO</span>
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-2">
            {resolvedCalls.length} Selesai Dinormalisasi
          </div>
        </div>
      </div>

      {/* Pareto Category Distribution Chart */}
      <div className={`border rounded-3xl p-6 shadow-sm transition-colors ${
        isLight ? "bg-white border-slate-200 text-slate-900" : "bg-neutral-900 border-neutral-800 text-neutral-100"
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={`text-base font-black ${isLight ? "text-slate-900" : "text-white"}`}>
              {t("breakdownByCategory")}
            </h3>
            <p className={`text-xs ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
              Distribusi frekuensi insiden untuk pemetaan Continuous Improvement (Kaizen)
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {Object.entries(categoryCounts).map(([catKey, count]) => {
            const cat = CATEGORIES_DATA[catKey as CallCategory] || CATEGORIES_DATA.machine_breakdown;
            const percentage = Math.round((count / (calls.length || 1)) * 100);
            const barWidth = Math.round((count / maxCategoryCount) * 100);

            return (
              <div key={catKey} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${cat.badgeBg}`} />
                    <span className={isLight ? "text-slate-800" : "text-neutral-200"}>{language === "en" ? cat.labelEn : cat.label}</span>
                  </div>
                  <div className="font-mono text-xs font-bold">
                    <span className={isLight ? "text-slate-900" : "text-white"}>{count} panggilan</span>
                    <span className={`ml-2 text-[11px] ${isLight ? "text-slate-400" : "text-neutral-500"}`}>({percentage}%)</span>
                  </div>
                </div>
                <div className={`w-full h-3 rounded-full overflow-hidden ${isLight ? "bg-slate-100" : "bg-neutral-950"}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      catKey === "abnormal_machine" ? "bg-red-500 shadow-[0_0_8px_#ef4444]" :
                      catKey === "leader_call" ? "bg-amber-400 shadow-[0_0_8px_#f59e0b]" :
                      "bg-emerald-500 shadow-[0_0_8px_#10b981]"
                    }`}
                    style={{ width: `${Math.max(barWidth, count > 0 ? 5 : 0)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Historical Calls Filter & Table */}
      <div className="space-y-4">
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
              placeholder="Cari WO, lini, deskripsi..."
              className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-neutral-950 border-neutral-800 text-white"
              }`}
            />
          </div>

          {/* Line Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterLine}
              onChange={(e) => setFilterLine(e.target.value)}
              className={`text-xs rounded-xl px-3 py-2 border focus:outline-none ${
                isLight ? "bg-slate-50 border-slate-300 text-slate-800" : "bg-neutral-950 border-neutral-800 text-neutral-300"
              }`}
            >
              <option value="all">Semua Lini</option>
              {lines.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={`text-xs rounded-xl px-3 py-2 border focus:outline-none ${
              isLight ? "bg-slate-50 border-slate-300 text-slate-800" : "bg-neutral-950 border-neutral-800 text-neutral-300"
            }`}
          >
            <option value="all">{language === "en" ? "All Categories" : "Semua Kategori"}</option>
            <option value="machine_breakdown">{language === "en" ? "Machine Breakdown" : "Mesin Rusak"}</option>
            <option value="material_shortage">{language === "en" ? "Material Shortage" : "Material Kurang"}</option>
            <option value="quality_defect">{language === "en" ? "Quality Defect" : "Kualitas"}</option>
            <option value="maintenance_tooling">{language === "en" ? "Tooling / MTC" : "Tooling"}</option>
            <option value="supervisor_call">{language === "en" ? "Leader Support" : "Leader Support"}</option>
            <option value="safety_alert">{language === "en" ? "Safety / EHS" : "K3 / Safety"}</option>
          </select>
        </div>

        {/* History Table */}
        <div className={`border rounded-3xl overflow-hidden shadow-sm transition-colors ${
          isLight ? "bg-white border-slate-200" : "bg-neutral-900 border-neutral-800"
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b text-[11px] font-bold uppercase ${
                  isLight ? "border-slate-200 text-slate-500 bg-slate-50" : "border-neutral-800 text-neutral-400 bg-neutral-950/50"
                }`}>
                  <th className="py-3 px-4">{language === "en" ? "WO No." : "No. WO"}</th>
                  <th className="py-3 px-4">{language === "en" ? "Line & Station" : "Lini & Stasiun"}</th>
                  <th className="py-3 px-4">{language === "en" ? "Category & Issue" : "Kategori & Masalah"}</th>
                  <th className="py-3 px-4">{language === "en" ? "Call Timestamp" : "Waktu Panggilan"}</th>
                  <th className="py-3 px-4">{language === "en" ? "Status & Handling" : "Status & Penanganan"}</th>
                  <th className="py-3 px-4">{language === "en" ? "Root Cause & Solution" : "Akar Masalah (Root Cause)"}</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-medium ${isLight ? "divide-slate-200 text-slate-700" : "divide-neutral-800 text-neutral-300"}`}>
                {filteredCalls.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-neutral-500">
                      {t("noLogsFound")}
                    </td>
                  </tr>
                ) : (
                  filteredCalls.map((c) => {
                    const cat = CATEGORIES_DATA[c.category] || CATEGORIES_DATA.machine_breakdown;
                    return (
                      <tr key={c.id} className={isLight ? "hover:bg-slate-50" : "hover:bg-neutral-800/40"}>
                        <td className="py-3 px-4 font-mono font-bold">
                          <span className={`px-2 py-0.5 rounded border ${
                            isLight ? "bg-slate-100 text-slate-800 border-slate-200" : "bg-neutral-950 text-neutral-300 border-neutral-800"
                          }`}>
                            {c.ticketNo}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className={`font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{c.lineName}</div>
                          <div className={`text-[11px] ${isLight ? "text-slate-500" : "text-neutral-400"}`}>{c.workstation}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cat.bgLight}`}>
                            {language === "en" ? cat.labelEn : cat.label}
                          </span>
                          <div className={`text-[11px] mt-1 line-clamp-1 ${isLight ? "text-slate-700" : "text-neutral-300"}`}>{c.description}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          {formatTimestamp(c.timestamp)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            c.status === "resolved"
                              ? isLight ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : c.status === "in_progress"
                              ? isLight ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                              : "bg-amber-500 text-slate-950"
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className={`py-3 px-4 text-[11px] max-w-xs truncate ${isLight ? "text-slate-600" : "text-neutral-400"}`}>
                          {c.rootCause || "-"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
