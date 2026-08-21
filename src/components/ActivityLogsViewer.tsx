import React, { useState } from "react";
import { 
  History, 
  Search, 
  Filter, 
  Trash2, 
  Download, 
  User, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  Wrench, 
  Sparkles,
  AlertTriangle,
  Layers,
  Settings
} from "lucide-react";
import { ActivityLog, UserProfile, AppTheme, AppLanguage } from "../types";
import { formatTimestamp } from "../utils/storage";
import Papa from "papaparse";
import { getTranslation, TranslationKey } from "../utils/i18n";

interface ActivityLogsViewerProps {
  logs: ActivityLog[];
  currentUser: UserProfile | null;
  onClearLogs?: () => void;
  theme?: AppTheme;
  language?: AppLanguage;
}

export const ActivityLogsViewer: React.FC<ActivityLogsViewerProps> = ({
  logs,
  currentUser,
  theme = "light",
  language = "id",
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");

  const t = (key: TranslationKey, params?: Record<string, string | number>) => 
    getTranslation(language, key, params);

  const isLight = theme === "light";
  const canClearLogs = currentUser?.role === "admin";

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.ticketNo && log.ticketNo.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesAction = filterAction === "all" || log.action === filterAction;

    return matchesSearch && matchesAction;
  });

  const getActionBadge = (action: ActivityLog["action"]) => {
    switch (action) {
      case "create_call":
        return {
          label: language === "en" ? "New Ticket" : "Tiket Baru",
          bg: isLight ? "bg-red-50 text-red-700 border-red-200" : "bg-red-500/20 text-red-400 border-red-500/30",
          icon: AlertTriangle,
        };
      case "acknowledge_call":
        return {
          label: "Acknowledge",
          bg: isLight ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-blue-500/20 text-blue-400 border-blue-500/30",
          icon: Clock,
        };
      case "in_progress_call":
        return {
          label: language === "en" ? "In Progress" : "Perbaikan",
          bg: isLight ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-purple-500/20 text-purple-400 border-purple-500/30",
          icon: Wrench,
        };
      case "resolve_call":
        return {
          label: language === "en" ? "Resolved" : "Selesai",
          bg: isLight ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
          icon: CheckCircle2,
        };
      case "upload_master":
      case "update_master":
        return {
          label: "Master Data",
          bg: isLight ? "bg-cyan-50 text-cyan-700 border-cyan-200" : "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
          icon: Layers,
        };
      case "login":
        return {
          label: "Auth Sesi",
          bg: isLight ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-amber-500/20 text-amber-400 border-amber-500/30",
          icon: User,
        };
      default:
        return {
          label: "Sistem",
          bg: isLight ? "bg-slate-50 text-slate-700 border-slate-200" : "bg-neutral-800 text-neutral-300 border-neutral-700",
          icon: Settings,
        };
    }
  };

  const handleExportCsv = () => {
    const data = filteredLogs.map((l) => ({
      Timestamp: new Date(l.timestamp).toISOString(),
      Aksi: l.action,
      Judul: l.title,
      Detail: l.details,
      User: l.userName,
      Role: l.userRole,
      ID_Pengguna: l.userId,
      Tiket: l.ticketNo || "-",
    }));

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity_logs_${Date.now()}.csv`;
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
              <History className="w-5 h-5" />
            </span>
            <div>
              <h2 className={`text-lg sm:text-xl font-black tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                {t("activityLogsTitle")}
              </h2>
              <p className={`text-xs ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                {t("activityLogsSubtitle")}
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className={`px-4 py-2 rounded-2xl font-bold text-xs flex items-center gap-1.5 shadow-sm border transition-all ${
              isLight 
                ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300" 
                : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700"
            }`}
          >
            <Download className="w-4 h-4" />
            <span>{t("exportCsv")}</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className={`border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm transition-colors ${
        isLight ? "bg-white border-slate-200" : "bg-neutral-900 border-neutral-800"
      }`}>
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={language === "en" ? "Search activity title, details, user name, ticket..." : "Cari judul aktivitas, detail, nama pengguna, tiket..."}
            className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
              isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-neutral-950 border-neutral-800 text-white"
            }`}
          />
        </div>

        {/* Action Type Dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className={`text-xs rounded-xl px-3 py-2 border focus:outline-none ${
              isLight ? "bg-slate-50 border-slate-300 text-slate-800" : "bg-neutral-950 border-neutral-800 text-neutral-300"
            }`}
          >
            <option value="all">{language === "en" ? "All Activity Types" : "Semua Jenis Aktivitas"}</option>
            <option value="create_call">Panggilan Tiket Baru</option>
            <option value="acknowledge_call">Acknowledge</option>
            <option value="in_progress_call">Mulai Perbaikan</option>
            <option value="resolve_call">Penutupan Tiket</option>
            <option value="master_upload">Upload Master Data</option>
            <option value="login">Sesi Otoritas Login</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className={`border rounded-3xl overflow-hidden shadow-sm transition-colors ${
        isLight ? "bg-white border-slate-200" : "bg-neutral-900 border-neutral-800"
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b text-[11px] font-bold uppercase ${
                isLight ? "border-slate-200 text-slate-500 bg-slate-50" : "border-neutral-800 text-neutral-400 bg-neutral-950/50"
              }`}>
                <th className="py-3 px-4">Waktu (Timestamp)</th>
                <th className="py-3 px-4">Kategori Aksi</th>
                <th className="py-3 px-4">Aktivitas & Keterangan</th>
                <th className="py-3 px-4">Pengguna (Actor)</th>
                <th className="py-3 px-4">Tiket Terkait</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-medium ${isLight ? "divide-slate-200 text-slate-700" : "divide-neutral-800 text-neutral-300"}`}>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 dark:text-neutral-500">
                    {t("noLogsFound")}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const badge = getActionBadge(log.action);
                  const Icon = badge.icon;

                  return (
                    <tr key={log.id} className={isLight ? "hover:bg-slate-50" : "hover:bg-neutral-800/40"}>
                      <td className="py-3 px-4 font-mono text-[11px] whitespace-nowrap">
                        <div className={isLight ? "text-slate-800" : "text-neutral-300"}>{formatTimestamp(log.timestamp)}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${badge.bg}`}>
                          <Icon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className={`font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{log.title}</div>
                        <div className={`text-[11px] mt-0.5 line-clamp-2 ${isLight ? "text-slate-500" : "text-neutral-400"}`}>{log.details}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className={`font-bold ${isLight ? "text-slate-800" : "text-neutral-200"}`}>{log.userName}</span>
                        </div>
                        <div className={`text-[10px] uppercase font-mono ${isLight ? "text-slate-400" : "text-neutral-500"}`}>
                          {log.userRole} {log.userId ? `• ${log.userId}` : ""}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {log.ticketNo ? (
                          <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${
                            isLight ? "bg-slate-100 text-slate-700 border-slate-200" : "bg-neutral-950 text-neutral-300 border-neutral-800"
                          }`}>
                            {log.ticketNo}
                          </span>
                        ) : (
                          <span className={isLight ? "text-slate-400" : "text-neutral-600"}>-</span>
                        )}
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
  );
};
