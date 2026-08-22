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
  HelpCircle,
  Sparkles,
  ShieldAlert,
  RotateCcw
} from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { AndonLine, MasterMachine, MasterWorkstation, UserProfile, UserRole, AppTheme, AppLanguage } from "../types";
import { 
  saveMasterLineInDb, 
  deleteMasterLineInDb, 
  bulkUploadMasterLinesInDb,
  bulkUploadMasterMachinesInDb,
  subscribeMasterMachines,
  clearAllTrialDataInDb,
  clearAllMasterLinesInDb,
  clearAllMasterMachinesInDb,
  logActivity,
  subscribeMasterOperators,
  saveMasterOperatorInDb,
  deleteMasterOperatorInDb,
  clearAllMasterOperatorsInDb,
  bulkUploadMasterOperatorsInDb
} from "../lib/firestoreService";
import { INITIAL_LINES } from "../utils/initialData";
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
  const [activeSubTab, setActiveSubTab] = useState<"lines" | "machines" | "operators" | "templates" | "clean">("lines");
  const [operators, setOperators] = useState<UserProfile[]>([]);
  const [machines, setMachines] = useState<MasterMachine[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanMessage, setCleanMessage] = useState<string | null>(null);

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

  // Custom Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: "danger" | "warning" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    type: "info"
  });

  const t = (key: TranslationKey, params?: Record<string, string | number>) => 
    getTranslation(language, key, params);

  const isLight = theme === "light";
  
  // Open Master Data management functions automatically to make it easy to deploy real factory configurations without blocks
  const canManageMaster = true;

  useEffect(() => {
    const unsubMachines = subscribeMasterMachines((dbMachines) => {
      setMachines(dbMachines);
    });
    return () => unsubMachines();
  }, []);

  useEffect(() => {
    const unsubOperators = subscribeMasterOperators((dbOperators) => {
      setOperators(dbOperators);
    });
    return () => unsubOperators();
  }, []);

  // Robust case-insensitive and bilingual column matching helper
  const getValueByPossibleKeys = (row: any, keys: string[]): string | undefined => {
    for (const k of Object.keys(row)) {
      const normalizedKey = k.toLowerCase().replace(/[\s_\-\/]/g, "");
      for (const targetKey of keys) {
        const normalizedTarget = targetKey.toLowerCase().replace(/[\s_\-\/]/g, "");
        if (normalizedKey === normalizedTarget || k.toLowerCase().includes(targetKey.toLowerCase())) {
          return String(row[k]);
        }
      }
    }
    return undefined;
  };

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
        skipEmptyLines: "greedy",
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

    // Auto-detect target data tab based on columns in first row if uploaded from home/clean tabs
    let targetTab = activeSubTab;
    if (targetTab !== "lines" && targetTab !== "machines" && targetTab !== "operators") {
      const firstRow = data[0];
      const hasMachineKeys = Object.keys(firstRow).some(k => {
        const nk = k.toLowerCase();
        return nk.includes("machine") || nk.includes("mesin") || nk.includes("serial") || nk.includes("model");
      });
      const hasOperatorKeys = Object.keys(firstRow).some(k => {
        const nk = k.toLowerCase();
        return nk.includes("operator") || nk.includes("badge") || nk.includes("npk") || nk.includes("pin");
      });
      targetTab = hasOperatorKeys ? "operators" : hasMachineKeys ? "machines" : "lines";
      setActiveSubTab(targetTab);
    }

    if (targetTab === "operators") {
      const parsedOperators: UserProfile[] = data.map((row: any, idx: number) => {
        const badgeId = (
          getValueByPossibleKeys(row, ["npk", "badgeid", "userid", "user_id", "id", "badge_id", "nomorinduk", "nik"]) || 
          String(row.badgeId || row.npk || row.userId || `OP-${idx + 1000}`)
        ).trim();

        const name = (
          getValueByPossibleKeys(row, ["name", "namaoperator", "nama", "operator_name", "operator", "nama_lengkap"]) || 
          String(row.name || row.nama || `Operator ${idx + 1}`)
        ).trim();

        const roleRaw = (
          getValueByPossibleKeys(row, ["role", "otoritas", "access", "level", "jabatan"]) || 
          String(row.role || "operator")
        ).trim().toLowerCase();

        // Map role string to UserRole
        let role: UserRole = "operator";
        if (roleRaw.includes("admin") || roleRaw.includes("dev")) {
          role = "admin";
        } else if (roleRaw.includes("lead") || roleRaw.includes("tech") || roleRaw.includes("maint") || roleRaw.includes("mekanik")) {
          role = "technician";
        } else if (roleRaw.includes("super") || roleRaw.includes("spv") || roleRaw.includes("foreman") || roleRaw.includes("karu")) {
          role = "supervisor";
        }

        const department = (
          getValueByPossibleKeys(row, ["department", "departemen", "dept", "bagian"]) || 
          String(row.department || "Production")
        ).trim();

        const pin = (
          getValueByPossibleKeys(row, ["password", "pin", "pass", "sandi"]) || 
          String(row.pin || row.password || "1234")
        ).trim();

        return {
          id: `USR-${badgeId}`,
          badgeId,
          name,
          role,
          department,
          pin,
          lineAccess: ["*"]
        };
      });

      // Clear existing master operators first so we don't mix old mock operators
      try {
        await clearAllMasterOperatorsInDb();
      } catch (err) {
        console.warn("Could not pre-clear existing operators, overwriting directly:", err);
      }

      await bulkUploadMasterOperatorsInDb(parsedOperators, currentUser ? {
        name: currentUser.name,
        id: currentUser.badgeId,
        role: currentUser.role
      } : undefined);

      setUploadStatus({
        success: true,
        message: `Berhasil mengunggah ${parsedOperators.length} Master Operator ke Cloud Firestore.`,
      });
    } else if (targetTab === "lines") {
      const parsedLines: AndonLine[] = data.map((row: any, idx: number) => {
        const id = (
          getValueByPossibleKeys(row, ["id", "lineid", "liniid", "kodelini", "line_id"]) || 
          String(row.id || row.ID || row.LineID || `LINE-${idx + 1}`)
        ).trim();

        const name = (
          getValueByPossibleKeys(row, ["name", "linename", "namalini", "nama_lini", "nama"]) || 
          String(row.name || row.Name || row.LineName || `Line ${idx + 1}`)
        ).trim();

        const shortCode = (
          getValueByPossibleKeys(row, ["shortcode", "kodesingkat", "kode", "code", "short_code"]) || 
          String(row.shortCode || row.ShortCode || row.Code || `L${idx + 1}`)
        ).trim();

        const department = (
          getValueByPossibleKeys(row, ["department", "departemen", "dept"]) || 
          String(row.department || row.Department || row.Dept || "Production")
        ).trim();

        const leaderName = (
          getValueByPossibleKeys(row, ["leader", "leadername", "namaleader", "pimpinan", "supervisor"]) || 
          String(row.leaderName || row.Leader || row.LeaderName || "Shift Leader")
        ).trim();

        const targetRaw = getValueByPossibleKeys(row, ["target", "targetdaily", "targetharian", "target_harian"]) || 
          row.targetDaily || row.TargetDaily || row.Target;
        const targetDaily = parseInt(String(targetRaw)) || 500;
        
        let workstations: string[] = [];
        const wsRaw = getValueByPossibleKeys(row, ["workstations", "stations", "stasiun", "daftarstasiun", "stasiunkerja", "work_stations"]) || 
          row.workstations || row.Workstations || row.Stations;
          
        if (typeof wsRaw === "string") {
          workstations = wsRaw.split(/[,;|]/).map((s: string) => s.trim()).filter(Boolean);
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

      // Clean/Wipe existing lines first so that old mock/trial lines are not mixed with real uploaded lines
      try {
        await clearAllMasterLinesInDb();
      } catch (err) {
        console.warn("Could not pre-clear existing lines, overwriting directly:", err);
      }

      await bulkUploadMasterLinesInDb(parsedLines, currentUser ? {
        name: currentUser.name,
        id: currentUser.badgeId,
        role: currentUser.role
      } : undefined);

      setUploadStatus({
        success: true,
        message: `Berhasil mengunggah ${parsedLines.length} Master Lini Produksi ke Cloud Firestore.`,
      });
    } else if (targetTab === "machines") {
      const parsedMachines: MasterMachine[] = data.map((row: any, idx: number) => {
        const id = (
          getValueByPossibleKeys(row, ["id", "machineid", "mesinid", "kodemesin", "machine_id"]) || 
          String(row.id || row.ID || row.MachineID || `MCH-${idx + 1}`)
        ).trim();

        const code = (
          getValueByPossibleKeys(row, ["code", "machinecode", "kode", "kodemesin"]) || 
          String(row.code || row.Code || row.MachineCode || `MC-${idx + 1}`)
        ).trim();

        const name = (
          getValueByPossibleKeys(row, ["name", "machinename", "namamesin", "nama_mesin", "mesin"]) || 
          String(row.name || row.machineName || row.Name || row.MachineName || `Machine ${idx + 1}`)
        ).trim();

        const lineId = (
          getValueByPossibleKeys(row, ["lineid", "idlini", "liniid", "line_id"]) || 
          String(row.lineId || row.LineID || "LINE-1")
        ).trim();

        const lineName = (
          getValueByPossibleKeys(row, ["linename", "namalini", "line_name"]) || 
          String(row.lineName || row.LineName || "Line 1")
        ).trim();

        const workstation = (
          getValueByPossibleKeys(row, ["stationid", "station", "workstation", "stasiun", "stasiunid"]) || 
          String(row.workstation || row.stationId || row.StationID || "OP-10 Station")
        ).trim();

        const modelType = (
          getValueByPossibleKeys(row, ["model", "modeltype", "tipe", "model_type"]) || 
          String(row.modelType || row.model || row.Model || "Industrial CNC")
        ).trim();

        const serialNumber = (
          getValueByPossibleKeys(row, ["serial", "serialnumber", "nomorseri", "sn", "serial_number"]) || 
          String(row.serialNumber || row.Serial || `SN-${idx + 1000}`)
        ).trim();

        return {
          id,
          code,
          name,
          lineId,
          lineName,
          workstation,
          modelType,
          serialNumber,
          status: "active" as const,
        };
      });

      // Clean/Wipe existing machines first so that old mock/trial machines are not mixed with real uploaded machines
      try {
        await clearAllMasterMachinesInDb();
      } catch (err) {
        console.warn("Could not pre-clear existing machines, overwriting directly:", err);
      }

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

  const handleDownloadTemplate = (type: "lines" | "machines" | "operators") => {
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
    } else if (type === "machines") {
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
    } else if (type === "operators") {
      const sample = [
        {
          npk: "OP-1001",
          name: "Ahmad Fauzi",
          role: "operator",
          department: "Production Machining",
          password: "1234",
        },
        {
          npk: "LD-2002",
          name: "Bambang Wijaya",
          role: "technician",
          department: "Maintenance",
          password: "abcd",
        },
        {
          npk: "ADM-9001",
          name: "Siti Rahma",
          role: "admin",
          department: "IT & Admin",
          password: "admin",
        }
      ];
      const csv = Papa.unparse(sample);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "master_operators_template.csv";
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

  // ==========================================
  // OPERATOR CRUD HANDLERS
  // ==========================================
  const [isAddOperatorOpen, setIsAddOperatorOpen] = useState(false);
  const [editingOperatorId, setEditingOperatorId] = useState<string | null>(null);
  const [newOperatorData, setNewOperatorData] = useState<{
    badgeId: string;
    name: string;
    role: UserRole;
    department: string;
    pin: string;
  }>({
    badgeId: "",
    name: "",
    role: "operator",
    department: "Production",
    pin: "1234",
  });

  const handleSaveOperatorForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOperatorData.badgeId || !newOperatorData.name) return;

    const opObj: UserProfile = {
      id: editingOperatorId || `USR-${Date.now()}`,
      badgeId: newOperatorData.badgeId.trim(),
      name: newOperatorData.name.trim(),
      role: newOperatorData.role,
      department: newOperatorData.department.trim() || "Production",
      pin: newOperatorData.pin.trim() || "1234",
      lineAccess: ["*"],
    };

    await saveMasterOperatorInDb(opObj, currentUser ? {
      name: currentUser.name,
      id: currentUser.badgeId,
      role: currentUser.role
    } : undefined);

    setIsAddOperatorOpen(false);
    setEditingOperatorId(null);
    setNewOperatorData({
      badgeId: "",
      name: "",
      role: "operator",
      department: "Production",
      pin: "1234",
    });
  };

  const handleDeleteOperator = (badgeId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Hapus Akun Operator",
      message: `Apakah Anda yakin ingin menghapus akun operator NPK ${badgeId}? Akun ini tidak akan bisa login lagi ke sistem.`,
      type: "danger",
      onConfirm: async () => {
        await deleteMasterOperatorInDb(badgeId, currentUser ? {
          name: currentUser.name,
          id: currentUser.badgeId,
          role: currentUser.role
        } : undefined);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleEditOperator = (op: UserProfile) => {
    setEditingOperatorId(op.id || op.badgeId);
    setNewOperatorData({
      badgeId: op.badgeId,
      name: op.name,
      role: op.role,
      department: op.department || "Production",
      pin: op.pin || "1234",
    });
    setIsAddOperatorOpen(true);
  };

  const handleDeleteLine = (lineId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Hapus Lini Produksi",
      message: `Apakah Anda yakin ingin menghapus data Lini ${lineId}? Semua stasiun kerja pada lini ini akan dinonaktifkan.`,
      type: "danger",
      onConfirm: async () => {
        await deleteMasterLineInDb(lineId, currentUser ? {
          name: currentUser.name,
          id: currentUser.badgeId,
          role: currentUser.role
        } : undefined);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
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

  const handleExecuteCleanTrialData = () => {
    setConfirmModal({
      isOpen: true,
      title: t("cleanTrialDataTitle"),
      message: t("cleanTrialDataConfirm"),
      type: "danger",
      onConfirm: async () => {
        try {
          setIsCleaning(true);
          setCleanMessage(null);
          await clearAllTrialDataInDb(lines.length > 0 ? lines : INITIAL_LINES, currentUser ? {
            name: currentUser.name,
            id: currentUser.badgeId,
            role: currentUser.role
          } : undefined);

          setCleanMessage(t("cleanTrialDataSuccess"));
        } catch (err) {
          console.error("Failed to wipe trial data:", err);
          setCleanMessage("Gagal membersihkan data trial. Silakan periksa koneksi Firestore.");
        } finally {
          setIsCleaning(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      }
    });
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
          onClick={() => setActiveSubTab("operators")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === "operators"
              ? isLight
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-amber-500 text-slate-950 shadow-sm"
              : isLight
              ? "text-slate-600 hover:bg-slate-100"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          {language === "id" ? "Data Operator & Akun" : "Operator Accounts"} ({operators.length})
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
        <button
          onClick={() => setActiveSubTab("clean")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeSubTab === "clean"
              ? "bg-red-600 text-white shadow-sm"
              : isLight
              ? "text-red-600 hover:bg-red-50"
              : "text-red-400 hover:text-red-300 hover:bg-red-950/40"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t("masterCleanTab")}</span>
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
                        <td className={`py-3 px-4 font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{m.name || m.code}</td>
                        <td className="py-3 px-4">
                          <div>{m.lineName || m.lineId}</div>
                          <div className={`text-[10px] ${isLight ? "text-slate-400" : "text-neutral-400"}`}>{m.workstation}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          {m.modelType || "-"} ({m.serialNumber || "-"})
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

      {/* Sub Tab Content: Operators */}
      {activeSubTab === "operators" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`font-black text-sm ${isLight ? "text-slate-800" : "text-neutral-200"}`}>
                {language === "id" ? "Database Akun Operator & Staff Terdaftar" : "Operator & Staff Accounts Database"}
              </h3>
              <p className={`text-[11px] ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                {language === "id" ? "Kelola kredensial login, NPK, dan level hak akses di terminal panggilan." : "Manage login credentials, badge IDs, and role authority levels."}
              </p>
            </div>
            {canManageMaster && (
              <button
                onClick={() => {
                  setEditingOperatorId(null);
                  setNewOperatorData({
                    badgeId: "",
                    name: "",
                    role: "operator",
                    department: "Production",
                    pin: "1234"
                  });
                  setIsAddOperatorOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md flex items-center gap-1 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === "id" ? "Tambah Akun Baru" : "Add New Account"}</span>
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
                    <th className="py-3 px-4">NPK / User ID</th>
                    <th className="py-3 px-4">Nama Lengkap</th>
                    <th className="py-3 px-4">Departemen</th>
                    <th className="py-3 px-4">Otoritas Sesi</th>
                    <th className="py-3 px-4">Password / PIN</th>
                    {canManageMaster && <th className="py-3 px-4 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className={`divide-y font-medium ${isLight ? "divide-slate-200 text-slate-700" : "divide-neutral-800 text-neutral-300"}`}>
                  {operators.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-500">
                        {language === "id" ? "Belum ada akun operator terdaftar. Gunakan tombol 'Tambah' atau unggah file CSV." : "No operator accounts registered. Use 'Add' or upload CSV."}
                      </td>
                    </tr>
                  ) : (
                    operators.map((op) => (
                      <tr key={op.badgeId} className={isLight ? "hover:bg-slate-50" : "hover:bg-neutral-800/40"}>
                        <td className="py-3 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">{op.badgeId}</td>
                        <td className={`py-3 px-4 font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{op.name}</td>
                        <td className="py-3 px-4 text-neutral-500 dark:text-neutral-400">{op.department || "Production"}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            op.role === "admin" 
                              ? "bg-red-500/10 text-red-600 border border-red-500/20" 
                              : op.role === "supervisor"
                              ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                              : op.role === "technician"
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : "bg-slate-500/10 text-slate-600 border border-slate-500/20"
                          }`}>
                            {op.role === "admin" ? "Admin/Developer" : op.role === "supervisor" ? "Leader/SPV" : op.role === "technician" ? "Leader/Tech" : "Operator"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px]">{op.pin || "••••"}</td>
                        {canManageMaster && (
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleEditOperator(op)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  isLight ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100" : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                                }`}
                                title="Edit Akun"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteOperator(op.badgeId)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  isLight ? "text-red-500 hover:text-red-700 hover:bg-red-50" : "text-red-400 hover:text-red-300 hover:bg-red-950/40"
                                }`}
                                title="Hapus Akun"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <div className={`border rounded-3xl p-5 space-y-3 shadow-sm ${
            isLight ? "bg-white border-slate-200" : "bg-neutral-900 border-neutral-800"
          }`}>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-amber-500" />
              <h4 className={`font-black text-sm ${isLight ? "text-slate-900" : "text-white"}`}>
                {language === "id" ? "Template Master Operator" : "Operator Accounts Template"}
              </h4>
            </div>
            <p className={`text-xs ${isLight ? "text-slate-600" : "text-neutral-400"}`}>
              {language === "id" 
                ? "Gunakan spreadsheet ini untuk mengunggah daftar operator, NPK, role, departemen, dan kata sandi." 
                : "Use this spreadsheet to upload operators list, credentials, NPK/badge ID, department, and PINs."}
            </p>
            <button
              onClick={() => handleDownloadTemplate("operators")}
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

      {/* Sub Tab Content: 4. Clean Trial Data / Factory Reset */}
      {activeSubTab === "clean" && (
        <div className="space-y-6 max-w-3xl">
          <div className={`border rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm transition-colors ${
            isLight ? "bg-white border-slate-200" : "bg-neutral-900 border-neutral-800"
          }`}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-600 flex-shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className={`text-base font-black ${isLight ? "text-slate-900" : "text-white"}`}>
                  {t("cleanTrialDataTitle")}
                </h3>
                <p className={`text-xs leading-relaxed ${isLight ? "text-slate-600" : "text-neutral-400"}`}>
                  {t("cleanTrialDataDesc")}
                </p>
              </div>
            </div>

            {/* Checklist of what will be cleaned */}
            <div className={`p-4 rounded-2xl border space-y-2.5 text-xs ${
              isLight ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-neutral-950 border-neutral-800 text-neutral-300"
            }`}>
              <div className="font-bold text-[11px] uppercase tracking-wider text-slate-500">
                Langkah Pembersihan Otomatis (Production Ready State):
              </div>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span><strong>Hapus Seluruh Tiket Panggilan:</strong> Menghapus semua panggilan Andon aktif, dalam perbaikan, dan selesai dari Firestore.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span><strong>Reset Status Lini Produksi:</strong> Mengembalikan seluruh 6 Lini ke status <em>Running</em> (100% Efisiensi, 0 Panggilan Aktif, Output 0).</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span><strong>Purge Log Aktivitas Trial:</strong> Menghapus riwayat audit trail simulasi dan mencatat inisialisasi resmi pabrik.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span><strong>Bersihkan Cache Browser:</strong> Menghapus sisa mock state lokal di perangkat operator & display TV.</span>
                </li>
              </ul>
            </div>

            {cleanMessage && (
              <div className={`p-4 rounded-2xl border flex items-center gap-3 shadow-md ${
                cleanMessage.includes("Gagal")
                  ? isLight ? "bg-red-50 border-red-300 text-red-950" : "bg-red-950/40 border-red-500 text-red-200"
                  : isLight ? "bg-emerald-50 border-emerald-300 text-emerald-950" : "bg-emerald-950/40 border-emerald-500 text-emerald-200"
              }`}>
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <span className="text-xs font-bold">{cleanMessage}</span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                disabled={isCleaning}
                onClick={handleExecuteCleanTrialData}
                className={`px-6 py-3 rounded-2xl font-black text-xs shadow-lg transition-all flex items-center justify-center gap-2 ${
                  isCleaning
                    ? "bg-slate-400 text-slate-200 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-500 text-white shadow-red-500/20 active:scale-95"
                }`}
              >
                {isCleaning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Membersihkan Data...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{t("cleanTrialDataBtn")}</span>
                  </>
                )}
              </button>
            </div>
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

      {/* Add / Edit Operator Account Modal */}
      {isAddOperatorOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl ${
            isLight ? "bg-white border-slate-200 text-slate-900" : "bg-neutral-900 border-neutral-800 text-neutral-100"
          }`}>
            <div className={`flex items-start justify-between border-b pb-3 ${isLight ? "border-slate-200" : "border-neutral-800"}`}>
              <h3 className={`text-base font-black ${isLight ? "text-slate-900" : "text-white"}`}>
                {editingOperatorId ? "Edit Akun Operator/Staff" : "Tambah Akun Operator/Staff"}
              </h3>
              <button
                onClick={() => setIsAddOperatorOpen(false)}
                className={`p-1 font-bold ${isLight ? "text-slate-400 hover:text-slate-900" : "text-neutral-400 hover:text-white"}`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOperatorForm} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`block font-bold mb-1 ${isLight ? "text-slate-700" : "text-neutral-300"}`}>
                    NPK / User ID (Unique) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newOperatorData.badgeId}
                    disabled={!!editingOperatorId}
                    onChange={(e) => setNewOperatorData({ ...newOperatorData, badgeId: e.target.value })}
                    placeholder="Contoh: OP-1001 atau LD-2001"
                    className={`w-full rounded-xl px-3 py-2 border font-mono ${
                      isLight ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white" : "bg-neutral-950 border-neutral-800 text-white focus:bg-neutral-900"
                    }`}
                  />
                </div>
                <div>
                  <label className={`block font-bold mb-1 ${isLight ? "text-slate-700" : "text-neutral-300"}`}>
                    Password / PIN <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newOperatorData.pin}
                    onChange={(e) => setNewOperatorData({ ...newOperatorData, pin: e.target.value })}
                    placeholder="PIN login"
                    className={`w-full rounded-xl px-3 py-2 border font-mono ${
                      isLight ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white" : "bg-neutral-950 border-neutral-800 text-white focus:bg-neutral-900"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block font-bold mb-1 ${isLight ? "text-slate-700" : "text-neutral-300"}`}>
                  Nama Lengkap Operator <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newOperatorData.name}
                  onChange={(e) => setNewOperatorData({ ...newOperatorData, name: e.target.value })}
                  placeholder="Nama Lengkap sesuai Badge"
                  className={`w-full rounded-xl px-3 py-2 border ${
                    isLight ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white" : "bg-neutral-950 border-neutral-800 text-white focus:bg-neutral-900"
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
                    value={newOperatorData.department}
                    onChange={(e) => setNewOperatorData({ ...newOperatorData, department: e.target.value })}
                    className={`w-full rounded-xl px-3 py-2 border ${
                      isLight ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white" : "bg-neutral-950 border-neutral-800 text-white focus:bg-neutral-900"
                    }`}
                  />
                </div>
                <div>
                  <label className={`block font-bold mb-1 ${isLight ? "text-slate-700" : "text-neutral-300"}`}>
                    Otoritas Hak Akses (Role)
                  </label>
                  <select
                    value={newOperatorData.role}
                    onChange={(e) => setNewOperatorData({ ...newOperatorData, role: e.target.value as UserRole })}
                    className={`w-full rounded-xl px-3 py-2 border font-bold ${
                      isLight ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white" : "bg-neutral-950 border-neutral-800 text-white focus:bg-neutral-900"
                    }`}
                  >
                    <option value="operator">Operator (Hanya Panggilan Operator)</option>
                    <option value="technician">Leader / Maintenance (Kecuali Panggilan & Master Data)</option>
                    <option value="supervisor">Supervisor / Leader (Kecuali Panggilan & Master Data)</option>
                    <option value="admin">Admin / Developer (Akses Penuh)</option>
                  </select>
                </div>
              </div>

              <div className={`pt-3 flex items-center justify-end gap-2 border-t ${isLight ? "border-slate-200" : "border-neutral-800"}`}>
                <button
                  type="button"
                  onClick={() => setIsAddOperatorOpen(false)}
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
                  Simpan Akun ke Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`border rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl transition-all scale-100 ${
            isLight ? "bg-white border-slate-200 text-slate-900" : "bg-neutral-900 border-neutral-800 text-neutral-100"
          }`}>
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-2xl ${
                confirmModal.type === "danger" 
                  ? "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400" 
                  : "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
              }`}>
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1 flex-1">
                <h3 className={`text-base font-black ${isLight ? "text-slate-900" : "text-white"}`}>
                  {confirmModal.title}
                </h3>
                <p className={`text-xs leading-relaxed ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                  {confirmModal.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                  isLight 
                    ? "bg-slate-100 hover:bg-slate-200 text-slate-700" 
                    : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                }`}
              >
                {t("cancelBtn") || "Batal"}
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-md transition-all active:scale-95 ${
                  confirmModal.type === "danger"
                    ? "bg-red-600 hover:bg-red-500 shadow-red-500/25"
                    : "bg-amber-500 hover:bg-amber-400 shadow-amber-500/25"
                }`}
              >
                Konfirmasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
