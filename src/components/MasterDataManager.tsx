import React, { useState, useRef, useEffect } from "react";
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  Layers, 
  Cpu, 
  RefreshCw, 
  FileText,
  HelpCircle
} from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { AndonLine, MasterMachine, MasterWorkstation, UserProfile, AppTheme, AppLanguage } from "../types";
import { 
  saveMasterLineInDb, 
  deleteMasterLineInDb, 
  bulkUploadMasterLinesInDb,
  bulkUploadMasterMachinesInDb,
  subscribeMasterMachines,
  logActivity 
} from "../lib/firestoreService";
import { getTranslation, TranslationKey } from "../utils/i18n";

interface MasterDataManagerProps {
  lines: AndonLine[];
  currentUser: UserProfile | null;
  onRefreshData?: () => void;
  theme?: AppTheme;
  language?: AppLanguage;
}

export const MasterDataManager: React.FC<MasterDataManagerProps> = ({
  lines,
  currentUser,
  theme = "light",
  language = "id",
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"lines" | "machines" | "templates">("lines");
  const [machines, setMachines] = useState<MasterMachine[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ success: boolean; message: string } | null>(null);

  // New Line Form Modal / Inline State
  const [isAddLineOpen, setIsAddLineOpen] = useState(false);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [newLineData, setNewLineData] = useState<{
    id: string;
    name: string;
    shortCode: string;
    department: string;
    workstationsStr: string;
    targetDaily: number;
    leaderName: string;
  }>({
    id: "",
    name: "",
    shortCode: "",
    department: "Assembly",
    workstationsStr: "OP-10 Station, OP-20 Station, OP-30 QC Check",
    targetDaily: 500,
    leaderName: "Supervisor Shift 1",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = (key: TranslationKey, params?: Record<string, string | number>) => 
    getTranslation(language, key, params);

  const isLight = theme === "light";
  const canManageMaster = currentUser?.role === "admin" || currentUser?.role === "supervisor";

  useEffect(() => {
    const unsubMachines = subscribeMasterMachines((dbMachines) => {
      setMachines(dbMachines);
    });
    return () => unsubMachines();
  }, []);

  // Handle CSV / Excel File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus(null);

    const fileName = file.name.toLowerCase();
    const reader = new FileReader();

    if (fileName.endsWith(".csv")) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            await processUploadedData(results.data);
          } catch (err: any) {
            setUploadStatus({
              success: false,
              message: `Gagal memproses CSV: ${err.message || err}`,
            });
          } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }
        },
        error: (err) => {
          setUploadStatus({
            success: false,
            message: `Gagal membaca CSV: ${err.message}`,
          });
          setIsUploading(false);
        },
      });
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          await processUploadedData(jsonData);
        } catch (err: any) {
          setUploadStatus({
            success: false,
            message: `Gagal memproses Excel: ${err.message || err}`,
          });
        } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setUploadStatus({
        success: false,
        message: "Format tidak didukung. Harap unggah file .CSV atau .XLSX (Excel).",
      });
      setIsUploading(false);
    }
  };

  const processUploadedData = async (data: any[]) => {
    if (!data || data.length === 0) {
      throw new Error("File kosong atau tidak ada data yang valid.");
    }

    if (activeSubTab === "lines") {
      const parsedLines: AndonLine[] = data.map((row: any, idx: number) => {
        const id = String(row.id || row.ID || row.LineID || `LINE-${idx + 1}`).trim();
        const name = String(row.name || row.Name || row.LineName || `Line ${idx + 1}`).trim();
        const shortCode = String(row.shortCode || row.ShortCode || row.Code || `L${idx + 1}`).trim();
        const department = String(row.department || row.Department || row.Dept || "Production").trim();
        const leaderName = String(row.leaderName || row.Leader || row.LeaderName || "Shift Leader").trim();
        const targetDaily = parseInt(row.targetDaily || row.TargetDaily || row.Target || 500) || 500;
        
        let workstations: string[] = [];
        const wsRaw = row.workstations || row.Workstations || row.Stations;
        if (typeof wsRaw === "string") {
          workstations = wsRaw.split(",").map((s: string) => s.trim()).filter(Boolean);
        } else if (Array.isArray(wsRaw)) {
          workstations = wsRaw;
        }

        if (workstations.length === 0) {
          workstations = ["OP-10 Station", "OP-20 Station", "OP-30 QC"];
        }

        return {
          id,
          name,
          shortCode,
          department,
          leaderName,
          targetDaily,
          actualOutput: 0,
          efficiency: 100,
          status: "running",
          activeCallsCount: 0,
          currentShift: "Shift 1",
          workstations,
        };
      });

      await bulkUploadMasterLinesInDb(parsedLines, currentUser ? {
        name: currentUser.name,
        id: currentUser.badgeId,
        role: currentUser.role
      } : undefined);

      setUploadStatus({
        success: true,
        message: `Berhasil mengunggah ${parsedLines.length} Master Lini Produksi ke Cloud Firestore.`,
      });
    } else if (activeSubTab === "machines") {
      const parsedMachines: MasterMachine[] = data.map((row: any, idx: number) => ({
        id: String(row.id || row.ID || row.MachineID || `MCH-${idx + 1}`).trim(),
        code: String(row.code || row.Code || row.MachineCode || `MC-${idx + 1}`).trim(),
        name: String(row.name || row.machineName || row.Name || row.MachineName || `Machine ${idx + 1}`).trim(),
        lineId: String(row.lineId || row.LineID || "LINE-1").trim(),
        lineName: String(row.lineName || row.LineName || "Line 1").trim(),
        workstation: String(row.workstation || row.stationId || row.StationID || "OP-10 Station").trim(),
        modelType: String(row.modelType || row.model || row.Model || "Industrial CNC").trim(),
        serialNumber: String(row.serialNumber || row.Serial || `SN-${idx + 1000}`).trim(),
        status: "active",
      }));

      await bulkUploadMasterMachinesInDb(parsedMachines, currentUser ? {
        name: currentUser.name,
        id: currentUser.badgeId,
        role: currentUser.role
      } : undefined);

      setUploadStatus({
        success: true,
        message: `Berhasil mengunggah ${parsedMachines.length} Master Mesin ke Cloud Firestore.`,
      });
    }
  };

  const handleDownloadTemplate = (type: "lines" | "machines") => {
    if (type === "lines") {
      const sample = [
        {
          id: "LINE-1",
          name: "Line 1: Machining Engine Block",
          shortCode: "L1",
          department: "Machining",
          leaderName: "Budi Santoso",
          targetDaily: 600,
          workstations: "OP-10 Milling, OP-20 Drilling, OP-30 QC Inspection",
        },
        {
          id: "LINE-2",
          name: "Line 2: Stamping & Pressing",
          shortCode: "L2",
          department: "Press Shop",
          leaderName: "Rudi Haryanto",
          targetDaily: 800,
          workstations: "OP-10 Uncoiler, OP-20 500T Press, OP-30 Visual Buyoff",
        },
      ];
      const csv = Papa.unparse(sample);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "master_lines_template.csv";
      a.click();
    } else {
      const sample = [
        {
          id: "CNC-01",
          lineId: "LINE-1",
          stationId: "OP-10 Milling",
          machineName: "5-Axis CNC Milling Center",
          model: "Matsuura MX-520",
          serialNumber: "SN-MATS-2024",
        },
        {
          id: "ROBOT-02",
          lineId: "LINE-3",
          stationId: "OP-20 Welding",
          machineName: "Robotic MIG Welder Station",
          model: "Fanuc ArcMate 120iD",
          serialNumber: "SN-FANUC-988",
        },
      ];
      const csv = Papa.unparse(sample);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "master_machines_template.csv";
      a.click();
    }
  };

  const handleSaveLineForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLineData.id || !newLineData.name) return;

    const wsList = newLineData.workstationsStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const lineObj: AndonLine = {
      id: newLineData.id.trim(),
      name: newLineData.name.trim(),
      shortCode: newLineData.shortCode.trim() || newLineData.id.trim(),
      department: newLineData.department.trim() || "Production",
      leaderName: newLineData.leaderName.trim() || "Shift Leader",
      targetDaily: Number(newLineData.targetDaily) || 500,
      actualOutput: 0,
      efficiency: 100,
      status: "running",
      activeCallsCount: 0,
      currentShift: "Shift 1",
      workstations: wsList.length > 0 ? wsList : ["OP-10 Station", "OP-20 Station"],
    };

    await saveMasterLineInDb(lineObj, currentUser ? {
      name: currentUser.name,
      id: currentUser.badgeId,
      role: currentUser.role
    } : undefined);

    setIsAddLineOpen(false);
    setEditingLineId(null);
    setNewLineData({
      id: "",
      name: "",
      shortCode: "",
      department: "Assembly",
      workstationsStr: "OP-10 Station, OP-20 Station, OP-30 QC Check",
      targetDaily: 500,
      leaderName: "Supervisor Shift 1",
    });
  };

  const handleDeleteLine = async (lineId: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data Lini ${lineId}?`)) {
      await deleteMasterLineInDb(lineId, currentUser ? {
        name: currentUser.name,
        id: currentUser.badgeId,
        role: currentUser.role
      } : undefined);
    }
  };

  const handleEditLine = (line: AndonLine) => {
    setEditingLineId(line.id);
    setNewLineData({
      id: line.id,
      name: line.name,
      shortCode: line.shortCode,
      department: line.department,
      workstationsStr: line.workstations.join(", "),
      targetDaily: line.targetDaily,
      leaderName: line.leaderName,
    });
    setIsAddLineOpen(true);
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
              isLight ? "bg-cyan-50 text-cyan-700 border-cyan-200" : "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
            }`}>
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <h2 className={`text-lg sm:text-xl font-black tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                {t("masterDataTitle")}
              </h2>
              <p className={`text-xs ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                {t("masterDataSubtitle")}
              </p>
            </div>
          </div>
        </div>

        {/* Upload Button */}
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv, .xlsx, .xls"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || !canManageMaster}
            className={`px-4 py-2 rounded-2xl font-bold text-xs flex items-center gap-1.5 shadow-md transition-all ${
              canManageMaster
                ? "bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>{isUploading ? t("processingFile") : t("uploadMasterData")}</span>
          </button>
        </div>
      </div>

      {/* Upload Notification Message */}
      {uploadStatus && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 shadow-md ${
          uploadStatus.success
            ? isLight ? "bg-emerald-50 border-emerald-300 text-emerald-950" : "bg-emerald-950/40 border-emerald-500 text-emerald-200"
            : isLight ? "bg-red-50 border-red-300 text-red-950" : "bg-red-950/40 border-red-500 text-red-200"
        }`}>
          {uploadStatus.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          )}
          <span className="text-xs font-semibold">{uploadStatus.message}</span>
        </div>
      )}

      {/* Sub Tabs */}
      <div className={`flex items-center gap-2 border-b pb-2 ${isLight ? "border-slate-200" : "border-neutral-800"}`}>
        <button
          onClick={() => setActiveSubTab("lines")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === "lines"
              ? isLight
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-amber-500 text-slate-950 shadow-sm"
              : isLight
              ? "text-slate-600 hover:bg-slate-100"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          {t("masterLinesTab")} ({lines.length})
        </button>
        <button
          onClick={() => setActiveSubTab("machines")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === "machines"
              ? isLight
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-amber-500 text-slate-950 shadow-sm"
              : isLight
              ? "text-slate-600 hover:bg-slate-100"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          {t("masterMachinesTab")} ({machines.length})
        </button>
        <button
          onClick={() => setActiveSubTab("templates")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === "templates"
              ? isLight
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-amber-500 text-slate-950 shadow-sm"
              : isLight
              ? "text-slate-600 hover:bg-slate-100"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          {t("templateAndGuideTab")}
        </button>
      </div>

      {/* Sub Tab Content: 1. Lines */}
      {activeSubTab === "lines" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className={`font-black text-sm ${isLight ? "text-slate-800" : "text-neutral-200"}`}>
              {t("databaseMasterLinesTitle")}
            </h3>
            {canManageMaster && (
              <button
                onClick={() => {
                  setEditingLineId(null);
                  setNewLineData({
                    id: `LINE-${lines.length + 1}`,
                    name: `Line ${lines.length + 1}: Assembly`,
                    shortCode: `L${lines.length + 1}`,
                    department: "Assembly",
                    workstationsStr: "OP-10 Station, OP-20 Station, OP-30 QC",
                    targetDaily: 500,
                    leaderName: "Leader Shift 1",
                  });
                  setIsAddLineOpen(true);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-all ${
                  isLight 
                    ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300" 
                    : "bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700"
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t("addNewLineBtn")}</span>
              </button>
            )}
          </div>

          <div className={`border rounded-3xl overflow-hidden shadow-sm transition-colors ${
            isLight ? "bg-white border-slate-200" : "bg-neutral-900 border-neutral-800"
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b text-[11px] font-bold uppercase ${
                    isLight ? "border-slate-200 text-slate-500 bg-slate-50" : "border-neutral-800 text-neutral-400 bg-neutral-950/50"
                  }`}>
                    <th className="py-3 px-4">Line Code & ID</th>
                    <th className="py-3 px-4">Nama Lini Manufaktur</th>
                    <th className="py-3 px-4">Departemen & Leader</th>
                    <th className="py-3 px-4">Target Harian</th>
                    <th className="py-3 px-4">Daftar Stasiun Kerja (Workstations)</th>
                    {canManageMaster && <th className="py-3 px-4 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className={`divide-y font-medium ${isLight ? "divide-slate-200 text-slate-700" : "divide-neutral-800 text-neutral-300"}`}>
                  {lines.map((l) => (
                    <tr key={l.id} className={isLight ? "hover:bg-slate-50" : "hover:bg-neutral-800/40"}>
                      <td className="py-3 px-4 font-mono font-bold">
                        <span className={`px-2 py-0.5 rounded border ${
                          isLight ? "bg-slate-100 text-slate-800 border-slate-200" : "bg-neutral-950 text-amber-400 border-neutral-800"
                        }`}>
                          {l.shortCode}
                        </span>
                        <div className={`text-[10px] mt-0.5 ${isLight ? "text-slate-400" : "text-neutral-500"}`}>{l.id}</div>
                      </td>
                      <td className={`py-3 px-4 font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{l.name}</td>
                      <td className="py-3 px-4">
                        <div>{l.department}</div>
                        <div className={`text-[10px] ${isLight ? "text-slate-400" : "text-neutral-400"}`}>Leader: {l.leaderName}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">{l.targetDaily} pcs</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {l.workstations?.map((ws) => (
                            <span
                              key={ws}
                              className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                isLight ? "bg-slate-50 text-slate-700 border-slate-200" : "bg-neutral-950 text-neutral-300 border-neutral-800"
                              }`}
                            >
                              {ws}
                            </span>
                          ))}
                        </div>
                      </td>
                      {canManageMaster && (
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleEditLine(l)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isLight ? "text-slate-500 hover:text-slate-900 hover:bg-slate-100" : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                              }`}
                              title="Edit Lini"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteLine(l.id)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isLight ? "text-red-500 hover:text-red-700 hover:bg-red-50" : "text-red-400 hover:text-red-300 hover:bg-red-950/40"
                              }`}
                              title="Hapus Lini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub Tab Content: 2. Machines */}
      {activeSubTab === "machines" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className={`font-black text-sm ${isLight ? "text-slate-800" : "text-neutral-200"}`}>
              {t("databaseMasterMachinesTitle")}
            </h3>
          </div>

          <div className={`border rounded-3xl overflow-hidden shadow-sm transition-colors ${
            isLight ? "bg-white border-slate-200" : "bg-neutral-900 border-neutral-800"
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b text-[11px] font-bold uppercase ${
                    isLight ? "border-slate-200 text-slate-500 bg-slate-50" : "border-neutral-800 text-neutral-400 bg-neutral-950/50"
                  }`}>
                    <th className="py-3 px-4">Machine ID</th>
                    <th className="py-3 px-4">Nama Mesin</th>
                    <th className="py-3 px-4">Line & Stasiun Terpasang</th>
                    <th className="py-3 px-4">Model & Serial Number</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-medium ${isLight ? "divide-slate-200 text-slate-700" : "divide-neutral-800 text-neutral-300"}`}>
                  {machines.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-neutral-500">
                        {t("noMachineData")}
                      </td>
                    </tr>
                  ) : (
                    machines.map((m) => (
                      <tr key={m.id} className={isLight ? "hover:bg-slate-50" : "hover:bg-neutral-800/40"}>
                        <td className="py-3 px-4 font-mono font-bold">{m.id}</td>
                        <td className={`py-3 px-4 font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{m.machineName}</td>
                        <td className="py-3 px-4">
                          <div>{m.lineId}</div>
                          <div className={`text-[10px] ${isLight ? "text-slate-400" : "text-neutral-400"}`}>{m.stationId}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          {m.model} ({m.serialNumber})
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub Tab Content: 3. Templates & Guidelines */}
      {activeSubTab === "templates" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`border rounded-3xl p-5 space-y-3 shadow-sm ${
            isLight ? "bg-white border-slate-200" : "bg-neutral-900 border-neutral-800"
          }`}>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
              <h4 className={`font-black text-sm ${isLight ? "text-slate-900" : "text-white"}`}>
                {t("templateMasterLinesTitle")}
              </h4>
            </div>
            <p className={`text-xs ${isLight ? "text-slate-600" : "text-neutral-400"}`}>
              {t("templateMasterLinesDesc")}
            </p>
            <button
              onClick={() => handleDownloadTemplate("lines")}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all border ${
                isLight
                  ? "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-300"
                  : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700"
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t("downloadTemplateCsv")}</span>
            </button>
          </div>

          <div className={`border rounded-3xl p-5 space-y-3 shadow-sm ${
            isLight ? "bg-white border-slate-200" : "bg-neutral-900 border-neutral-800"
          }`}>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-cyan-500" />
              <h4 className={`font-black text-sm ${isLight ? "text-slate-900" : "text-white"}`}>
                {t("templateMasterMachinesTitle")}
              </h4>
            </div>
            <p className={`text-xs ${isLight ? "text-slate-600" : "text-neutral-400"}`}>
              {t("templateMasterMachinesDesc")}
            </p>
            <button
              onClick={() => handleDownloadTemplate("machines")}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all border ${
                isLight
                  ? "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-300"
                  : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700"
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t("downloadTemplateCsv")}</span>
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Line Modal */}
      {isAddLineOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl ${
            isLight ? "bg-white border-slate-200 text-slate-900" : "bg-neutral-900 border-neutral-800 text-neutral-100"
          }`}>
            <div className={`flex items-start justify-between border-b pb-3 ${isLight ? "border-slate-200" : "border-neutral-800"}`}>
              <h3 className={`text-base font-black ${isLight ? "text-slate-900" : "text-white"}`}>
                {editingLineId ? t("editLineTitle") : t("addNewLineBtn")}
              </h3>
              <button
                onClick={() => setIsAddLineOpen(false)}
                className={`p-1 font-bold ${isLight ? "text-slate-400 hover:text-slate-900" : "text-neutral-400 hover:text-white"}`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLineForm} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`block font-bold mb-1 ${isLight ? "text-slate-700" : "text-neutral-300"}`}>
                    Line ID (Unique)
                  </label>
                  <input
                    type="text"
                    required
                    value={newLineData.id}
                    disabled={!!editingLineId}
                    onChange={(e) => setNewLineData({ ...newLineData, id: e.target.value })}
                    placeholder="e.g. LINE-1"
                    className={`w-full rounded-xl px-3 py-2 border font-mono ${
                      isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-neutral-950 border-neutral-800 text-white"
                    }`}
                  />
                </div>
                <div>
                  <label className={`block font-bold mb-1 ${isLight ? "text-slate-700" : "text-neutral-300"}`}>
                    Short Code
                  </label>
                  <input
                    type="text"
                    required
                    value={newLineData.shortCode}
                    onChange={(e) => setNewLineData({ ...newLineData, shortCode: e.target.value })}
                    placeholder="e.g. L1"
                    className={`w-full rounded-xl px-3 py-2 border font-mono ${
                      isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-neutral-950 border-neutral-800 text-white"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block font-bold mb-1 ${isLight ? "text-slate-700" : "text-neutral-300"}`}>
                  Nama Lini Manufaktur
                </label>
                <input
                  type="text"
                  required
                  value={newLineData.name}
                  onChange={(e) => setNewLineData({ ...newLineData, name: e.target.value })}
                  placeholder="e.g. Line 1: Machining Engine Block"
                  className={`w-full rounded-xl px-3 py-2 border ${
                    isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-neutral-950 border-neutral-800 text-white"
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`block font-bold mb-1 ${isLight ? "text-slate-700" : "text-neutral-300"}`}>
                    Departemen
                  </label>
                  <input
                    type="text"
                    value={newLineData.department}
                    onChange={(e) => setNewLineData({ ...newLineData, department: e.target.value })}
                    className={`w-full rounded-xl px-3 py-2 border ${
                      isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-neutral-950 border-neutral-800 text-white"
                    }`}
                  />
                </div>
                <div>
                  <label className={`block font-bold mb-1 ${isLight ? "text-slate-700" : "text-neutral-300"}`}>
                    Target Output Harian (pcs)
                  </label>
                  <input
                    type="number"
                    value={newLineData.targetDaily}
                    onChange={(e) => setNewLineData({ ...newLineData, targetDaily: parseInt(e.target.value) || 0 })}
                    className={`w-full rounded-xl px-3 py-2 border font-mono ${
                      isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-neutral-950 border-neutral-800 text-white"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block font-bold mb-1 ${isLight ? "text-slate-700" : "text-neutral-300"}`}>
                  Stasiun Kerja (Pisahkan dengan tanda koma)
                </label>
                <input
                  type="text"
                  value={newLineData.workstationsStr}
                  onChange={(e) => setNewLineData({ ...newLineData, workstationsStr: e.target.value })}
                  placeholder="OP-10 Milling, OP-20 Drilling, OP-30 QC Inspection"
                  className={`w-full rounded-xl px-3 py-2 border ${
                    isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-neutral-950 border-neutral-800 text-white"
                  }`}
                />
              </div>

              <div className={`pt-3 flex items-center justify-end gap-2 border-t ${isLight ? "border-slate-200" : "border-neutral-800"}`}>
                <button
                  type="button"
                  onClick={() => setIsAddLineOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                    isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                  }`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md"
                >
                  Simpan Lini ke Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
