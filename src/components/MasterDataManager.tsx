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
  RotateCcw,
  Building2
} from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { AndonLine, MasterMachine, UserProfile, UserRole, AppTheme, AppLanguage } from "../types";
import { BrandingSettingsCard } from "./BrandingSettingsCard";
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
  bulkUploadMasterOperatorsInDb,
  IS_DEMO_MODE
} from "../lib/firestoreService";
import { INITIAL_LINES } from "../utils/initialData";
import { getTranslation, TranslationKey } from "../utils/i18n";
import { canManageMasterData } from "../utils/permissions";

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
  const [activeSubTab, setActiveSubTab] = useState<"lines" | "machines" | "operators" | "templates" | "branding" | "clean">("lines");
  const [operators, setOperators] = useState<UserProfile[]>([]);
  const [machines, setMachines] = useState<MasterMachine[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ 
    success: boolean; 
    message: string;
    summary?: {
      total: number;
      created: number;
      skipped: number;
      failed: number;
      errors: string[];
    };
  } | null>(null);
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
    requiresResetWord?: boolean;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    type: "info"
  });

  const [resetWord, setResetWord] = useState("");

  const t = (key: TranslationKey, params?: Record<string, string | number>) => 
    getTranslation(language, key, params);

  const isLight = theme === "light";
  
  // Open Master Data management functions for authorized administrators
  const canManageMaster = canManageMasterData(currentUser);

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
  const getValueByPossibleKeys = (row: Record<string, unknown>, keys: string[]): string | undefined => {
    for (const k of Object.keys(row)) {
      const normalizedKey = k.toLowerCase().replace(/[\s_\-\/]/g, "");
      for (const targetKey of keys) {
        const normalizedTarget = targetKey.toLowerCase().replace(/[\s_\-\/]/g, "");
        if (normalizedKey === normalizedTarget || k.toLowerCase().includes(targetKey.toLowerCase())) {
          return row[k] !== undefined && row[k] !== null ? String(row[k]) : undefined;
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
            await processUploadedData(results.data as Record<string, unknown>[]);
          } catch (err: unknown) {
            setUploadStatus({
              success: false,
              message: `Gagal memproses CSV: ${err instanceof Error ? err.message : String(err)}`,
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
          const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);
          await processUploadedData(jsonData);
        } catch (err: unknown) {
          setUploadStatus({
            success: false,
            message: `Gagal memproses Excel: ${err instanceof Error ? err.message : String(err)}`,
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

  const processUploadedData = async (data: Record<string, unknown>[]) => {
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
      let createdOrUpdatedCount = 0;
      let skippedCount = 0;
      let failedCount = 0;
      const validationErrors: string[] = [];
      const seenBadgeIds = new Set<string>();
      const seenEmails = new Set<string>();
      const validatedOperators: UserProfile[] = [];

      data.forEach((row: Record<string, unknown>, idx: number) => {
        try {
          const badgeId = (
            getValueByPossibleKeys(row, ["npk", "badgeid", "userid", "user_id", "id", "badge_id", "nomorinduk", "nik"]) || 
            String(row.badgeId || row.npk || row.userId || "")
          ).trim();

          const name = (
            getValueByPossibleKeys(row, ["name", "namaoperator", "nama", "operator_name", "operator", "nama_lengkap"]) || 
            String(row.name || row.nama || "")
          ).trim();

          const email = (
            getValueByPossibleKeys(row, ["email", "surel", "mail"]) || 
            String(row.email || "")
          ).trim();

          const roleRaw = (
            getValueByPossibleKeys(row, ["role", "otoritas", "access", "level", "jabatan"]) || 
            String(row.role || "operator")
          ).trim().toLowerCase();

          const department = (
            getValueByPossibleKeys(row, ["department", "departemen", "dept", "bagian"]) || 
            String(row.department || "Production")
          ).trim();

          // 1. Validate required fields
          if (!badgeId || !name) {
            failedCount++;
            validationErrors.push(`Baris ${idx + 1}: NPK/Badge ID dan Nama wajib diisi.`);
            return;
          }

          // 2. Validate email format if provided
          if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            failedCount++;
            validationErrors.push(`Baris ${idx + 1}: Format email tidak valid (${email}).`);
            return;
          }

          // 3. Prevent duplicate badge ID within import sheet
          if (seenBadgeIds.has(badgeId)) {
            skippedCount++;
            validationErrors.push(`Baris ${idx + 1}: Badge ID ganda (${badgeId}) dalam file, baris dilewati.`);
            return;
          }
          seenBadgeIds.add(badgeId);

          // 4. Prevent duplicate email within import sheet
          if (email) {
            if (seenEmails.has(email)) {
              skippedCount++;
              validationErrors.push(`Baris ${idx + 1}: Email ganda (${email}) dalam file, baris dilewati.`);
              return;
            }
            seenEmails.add(email);
          }

          // Map and validate roles
          let role: UserRole = "operator";
          if (roleRaw.includes("admin") || roleRaw.includes("dev")) {
            role = "admin";
          } else if (roleRaw.includes("lead") || roleRaw.includes("tech") || roleRaw.includes("maint") || roleRaw.includes("mekanik")) {
            role = "technician";
          } else if (roleRaw.includes("super") || roleRaw.includes("spv") || roleRaw.includes("foreman") || roleRaw.includes("karu")) {
            role = "supervisor";
          }

          // Construct user profile object (no pin, password, pass, or sandi columns imported)
          const opObj: UserProfile = {
            id: `USR-${badgeId}`,
            badgeId,
            name,
            role,
            department,
            email: email || undefined,
            lineAccess: ["*"]
          };

          // In Demo Mode, attach a safe mock PIN '1234' for local auth simulation
          if (IS_DEMO_MODE) {
            opObj.pin = "1234";
          }

          validatedOperators.push(opObj);
          createdOrUpdatedCount++;
        } catch (err) {
          failedCount++;
          validationErrors.push(`Baris ${idx + 1}: Gagal memproses data (${err instanceof Error ? err.message : "input rusak"}).`);
        }
      });

      if (validatedOperators.length === 0) {
        setUploadStatus({
          success: false,
          message: `Gagal mengimpor operator. Seluruh baris tidak valid atau dilewati.`,
          summary: {
            total: data.length,
            created: 0,
            skipped: skippedCount,
            failed: failedCount,
            errors: validationErrors
          }
        });
        return;
      }

      // Clear existing master operators first so we don't mix old mock operators
      try {
        await clearAllMasterOperatorsInDb();
      } catch (err) {
        console.warn("Could not pre-clear existing operators, overwriting directly:", err);
      }

      await bulkUploadMasterOperatorsInDb(validatedOperators, currentUser ? {
        name: currentUser.name,
        id: currentUser.badgeId,
        role: currentUser.role
      } : undefined);

      setUploadStatus({
        success: true,
        message: `Impor operator selesai: ${createdOrUpdatedCount} berhasil, ${skippedCount} dilewati, ${failedCount} gagal.`,
        summary: {
          total: data.length,
          created: createdOrUpdatedCount,
          skipped: skippedCount,
          failed: failedCount,
          errors: validationErrors
        }
      });
    } else if (targetTab === "lines") {
      const parsedLines: AndonLine[] = data.map((row: Record<string, unknown>, idx: number) => {
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
          workstations = wsRaw as string[];
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
      const parsedMachines: MasterMachine[] = data.map((row: Record<string, unknown>, idx: number) => {
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
          name: "Line 1: Machining & CNC Milling",
          shortCode: "L1-MCN",
          department: "Machining",
          leaderName: "Bambang Sutrisno",
          targetDaily: 450,
          workstations: "OP-10 Rough Cut; OP-20 CNC Mill; OP-30 CNC Lathe; OP-40 Deburring; OP-50 CMM Check",
        },
        {
          id: "LINE-2",
          name: "Line 2: Stamping & Heavy Press",
          shortCode: "L2-STP",
          department: "Stamping",
          leaderName: "Hendra Wijaya",
          targetDaily: 800,
          workstations: "OP-10 Decoiler Feed; OP-20 500T Press; OP-30 Piercing Station; OP-40 Flange Trimming; OP-50 Visual Check",
        },
        {
          id: "LINE-3",
          name: "Line 3: Robotic Welding & Jig",
          shortCode: "L3-WLD",
          department: "Welding",
          leaderName: "Dedi Kusuma",
          targetDaily: 350,
          workstations: "OP-10 Clamping Jig; OP-20 Robot Arm 1 Spot; OP-30 Robot Arm 2 MIG; OP-40 Manual Touch; OP-50 NDT Check",
        },
        {
          id: "LINE-4",
          name: "Line 4: Electrostatic Paint & Oven",
          shortCode: "L4-PNT",
          department: "Painting",
          leaderName: "Surya Tanoto",
          targetDaily: 500,
          workstations: "OP-10 Chemical Degreasing; OP-20 Primer Dip; OP-30 Top Coat Spray; OP-40 Curing Oven 180C; OP-50 Gloss QC",
        },
        {
          id: "LINE-5",
          name: "Line 5: Main Final Assembly A",
          shortCode: "L5-ASM",
          department: "Assembly",
          leaderName: "Ahmad Fauzi",
          targetDaily: 600,
          workstations: "OP-10 Sub-assembly Base; OP-20 Wire Harness Route; OP-30 Torque Tightening; OP-40 PCB & Sensor Fit; OP-50 Final Casing",
        },
        {
          id: "LINE-6",
          name: "Line 6: Testing QC & Packaging",
          shortCode: "L6-PKG",
          department: "Packaging",
          leaderName: "Rian Pratama",
          targetDaily: 600,
          workstations: "OP-10 Electrical Test; OP-20 Functional Benchmark; OP-30 Barcode & Serial Label; OP-40 Box Packing; OP-50 Palletizing Robot",
        },
      ];
      const csv = Papa.unparse(sample);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "template_lines.csv";
      a.click();
    } else if (type === "machines") {
      const sample = [
        {
          id: "MCH-001",
          code: "CNC-MILL-01",
          name: "5-Axis CNC Milling Center",
          lineId: "LINE-1",
          lineName: "Line 1: Machining & CNC Milling",
          workstation: "OP-20 CNC Mill",
          modelType: "Matsuura MX-520 High Speed",
          serialNumber: "SN-MATS-2024-001",
        },
        {
          id: "MCH-002",
          code: "CNC-LATHE-01",
          name: "High Precision CNC Lathe",
          lineId: "LINE-1",
          lineName: "Line 1: Machining & CNC Milling",
          workstation: "OP-30 CNC Lathe",
          modelType: "Mazak Quick Turn 250",
          serialNumber: "SN-MZK-8921-002",
        },
        {
          id: "MCH-003",
          code: "PRESS-500T-A",
          name: "Komatsu 500T Stamping Press",
          lineId: "LINE-2",
          lineName: "Line 2: Stamping & Heavy Press",
          workstation: "OP-20 500T Press",
          modelType: "Komatsu E2P500 Mechanical",
          serialNumber: "SN-KMTS-500-A",
        },
        {
          id: "MCH-004",
          code: "ROBOT-WELD-A1",
          name: "Fanuc 6-Axis Spot Welding Arm",
          lineId: "LINE-3",
          lineName: "Line 3: Robotic Welding & Jig",
          workstation: "OP-20 Robot Arm 1 Spot",
          modelType: "Fanuc ArcMate 120iD",
          serialNumber: "SN-FNC-ARC-120",
        },
        {
          id: "MCH-005",
          code: "OVEN-CURING-01",
          name: "Continuous Thermal Curing Oven",
          lineId: "LINE-4",
          lineName: "Line 4: Electrostatic Paint & Oven",
          workstation: "OP-40 Curing Oven 180C",
          modelType: "ThermaPro Conveyorized Oven",
          serialNumber: "SN-OVEN-180-44",
        },
        {
          id: "MCH-006",
          code: "TORQUE-TX4-01",
          name: "Atlas Copco Digital Nutrunner",
          lineId: "LINE-5",
          lineName: "Line 5: Main Final Assembly A",
          workstation: "OP-30 Torque Tightening",
          modelType: "Power Focus 6000 Controller",
          serialNumber: "SN-AC-PF6K-09",
        },
        {
          id: "MCH-007",
          code: "LEAK-TEST-01",
          name: "Helium Vacuum Leak Tester",
          lineId: "LINE-6",
          lineName: "Line 6: Testing QC & Packaging",
          workstation: "OP-20 Functional Benchmark",
          modelType: "Pfeiffer ASM 340",
          serialNumber: "SN-LK-PFF-340",
        },
      ];
      const csv = Papa.unparse(sample);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "template_machines.csv";
      a.click();
    } else if (type === "operators") {
      const sample = [
        {
          badgeId: "OP-1001",
          name: "Agus Pratama",
          role: "operator",
          department: "Machining",
          email: "agus.pratama@factory.local",
        },
        {
          badgeId: "OP-1002",
          name: "Budi Santoso",
          role: "operator",
          department: "Stamping",
          email: "budi.santoso@factory.local",
        },
        {
          badgeId: "TECH-2001",
          name: "Rudi Hermawan",
          role: "technician",
          department: "Maintenance & Tooling",
          email: "rudi.maint@factory.local",
        },
        {
          badgeId: "SPV-3001",
          name: "Hartono Mulyadi",
          role: "supervisor",
          department: "Production Operations",
          email: "hartono.spv@factory.local",
        },
        {
          badgeId: "ADMIN-99",
          name: "Siti Rahayu",
          role: "admin",
          department: "Plant Engineering & IT",
          email: "admin.it@factory.local",
        },
      ];
      const csv = Papa.unparse(sample);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "template_operators.csv";
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
    setResetWord("");
    setConfirmModal({
      isOpen: true,
      title: t("cleanTrialDataTitle"),
      message: t("cleanTrialDataConfirm"),
      type: "danger",
      requiresResetWord: !IS_DEMO_MODE,
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
        <div className={`p-5 rounded-2xl border flex flex-col gap-3 shadow-md transition-all ${
          uploadStatus.success
            ? isLight ? "bg-emerald-50 border-emerald-300 text-emerald-950" : "bg-emerald-950/40 border-emerald-500 text-emerald-200"
            : isLight ? "bg-red-50 border-red-300 text-red-950" : "bg-red-950/40 border-red-500 text-red-200"
        }`}>
          <div className="flex items-start gap-3">
            {uploadStatus.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 space-y-1">
              <p className="text-xs font-black">{uploadStatus.message}</p>
              {uploadStatus.summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[10px] font-bold uppercase tracking-wider">
                  <div className={`p-2 rounded-xl border ${isLight ? "bg-white/60 border-slate-200" : "bg-black/30 border-neutral-800"}`}>
                    Total: <span className="font-black">{uploadStatus.summary.total}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    Berhasil: <span className="font-black">{uploadStatus.summary.created}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                    Dilewati: <span className="font-black">{uploadStatus.summary.skipped}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
                    Gagal: <span className="font-black">{uploadStatus.summary.failed}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {uploadStatus.summary && uploadStatus.summary.errors.length > 0 && (
            <div className={`mt-2 border-t pt-2 text-xs ${isLight ? "border-slate-200" : "border-neutral-800"}`}>
              <details className="outline-none cursor-pointer">
                <summary className="font-bold text-[10px] uppercase tracking-wider select-none hover:opacity-85">
                  Lihat Detail Log Validasi ({uploadStatus.summary.errors.length} Pesan)
                </summary>
                <ul className={`mt-2 max-h-40 overflow-y-auto p-3 rounded-xl border font-mono text-[10px] space-y-1.5 list-disc pl-5 ${
                  isLight ? "bg-white/80 border-slate-200 text-slate-700" : "bg-black/40 border-neutral-800 text-neutral-300"
                }`}>
                  {uploadStatus.summary.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </details>
            </div>
          )}
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
          onClick={() => setActiveSubTab("branding")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeSubTab === "branding"
              ? isLight
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-amber-500 text-slate-950 shadow-sm"
              : isLight
              ? "text-slate-600 hover:bg-slate-100"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>{language === "id" ? "Identitas & Logo" : "Logo & Branding"}</span>
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

      {/* Sub Tab Content: Branding & Logo */}
      {activeSubTab === "branding" && (
        <div className="space-y-4">
          <BrandingSettingsCard theme={theme} language={language} />
        </div>
      )}

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
                    <th className="py-3 px-4">{language === "en" ? "Line Code & ID" : "Kode & ID Lini"}</th>
                    <th className="py-3 px-4">{language === "en" ? "Manufacturing Line Name" : "Nama Lini Manufaktur"}</th>
                    <th className="py-3 px-4">{language === "en" ? "Department & Leader" : "Departemen & Leader"}</th>
                    <th className="py-3 px-4">{language === "en" ? "Daily Target" : "Target Harian"}</th>
                    <th className="py-3 px-4">{language === "en" ? "Workstations List" : "Daftar Stasiun Kerja (Workstations)"}</th>
                    {canManageMaster && <th className="py-3 px-4 text-right">{language === "en" ? "Actions" : "Aksi"}</th>}
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
                    <th className="py-3 px-4">{language === "en" ? "Machine ID" : "ID Mesin"}</th>
                    <th className="py-3 px-4">{language === "en" ? "Machine Name" : "Nama Mesin"}</th>
                    <th className="py-3 px-4">{language === "en" ? "Installed Line & Station" : "Line & Stasiun Terpasang"}</th>
                    <th className="py-3 px-4">{language === "en" ? "Model & Serial Number" : "Model & Serial Number"}</th>
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
                    <th className="py-3 px-4">{language === "en" ? "Badge ID / User ID" : "NPK / User ID"}</th>
                    <th className="py-3 px-4">{language === "en" ? "Full Name" : "Nama Lengkap"}</th>
                    <th className="py-3 px-4">{language === "en" ? "Department" : "Departemen"}</th>
                    <th className="py-3 px-4">{language === "en" ? "Role Authority" : "Otoritas Sesi"}</th>
                    <th className="py-3 px-4">{language === "en" ? "Password / PIN" : "Password / PIN"}</th>
                    {canManageMaster && <th className="py-3 px-4 text-right">{language === "en" ? "Actions" : "Aksi"}</th>}
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
                {language === "en" ? "Automated Purge Steps (Production Ready State):" : "Langkah Pembersihan Otomatis (Production Ready State):"}
              </div>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>
                    <strong>{language === "en" ? "Delete All Call Work Orders (WOs):" : "Hapus Seluruh Work Order (WO) Panggilan:"}</strong>{" "}
                    {language === "en" 
                      ? "Removes all active, in-repair, and completed Andon calls from Firestore database." 
                      : "Menghapus semua panggilan Andon aktif, dalam perbaikan, dan selesai dari Firestore."}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>
                    <strong>{language === "en" ? "Reset Production Lines Status:" : "Reset Status Lini Produksi:"}</strong>{" "}
                    {language === "en"
                      ? "Returns all lines to Running status (100% Efficiency, 0 Active Calls, 0 Output)."
                      : "Mengembalikan seluruh lini ke status Running (100% Efisiensi, 0 Panggilan Aktif, Output 0)."}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>
                    <strong>{language === "en" ? "Purge Trial Activity Logs:" : "Purge Log Aktivitas Trial:"}</strong>{" "}
                    {language === "en"
                      ? "Clears trial simulation audit trail history and records official factory initialization."
                      : "Menghapus riwayat audit trail simulasi dan mencatat inisialisasi resmi pabrik."}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>
                    <strong>{language === "en" ? "Clear Local Cache:" : "Bersihkan Cache Browser:"}</strong>{" "}
                    {language === "en"
                      ? "Removes lingering local state on operator tablets & TV displays."
                      : "Menghapus sisa mock state lokal di perangkat operator & display TV."}
                  </span>
                </li>
              </ul>
            </div>

            {cleanMessage && (
              <div className={`p-4 rounded-2xl border flex items-center gap-3 shadow-md ${
                cleanMessage.includes("Gagal") || cleanMessage.includes("Failed")
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
                    <span>{language === "en" ? "Purging Data..." : "Membersihkan Data..."}</span>
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
            
            {confirmModal.requiresResetWord && (
              <div className="space-y-2">
                <label className={`block text-xs font-bold ${isLight ? "text-slate-700" : "text-neutral-300"}`}>
                  Silakan ketik <span className="text-red-500 font-black">RESET</span> untuk melakukan konfirmasi tindakan destruktif ini:
                </label>
                <input
                  type="text"
                  value={resetWord}
                  onChange={(e) => setResetWord(e.target.value)}
                  placeholder="Ketik RESET di sini"
                  className={`w-full rounded-xl px-3 py-2 border font-mono text-center text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-1 ${
                    isLight 
                      ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:ring-red-500" 
                      : "bg-neutral-950 border-neutral-800 text-white focus:bg-neutral-900 focus:ring-red-500"
                  }`}
                />
              </div>
            )}

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
                disabled={confirmModal.requiresResetWord && resetWord.trim().toUpperCase() !== "RESET"}
                onClick={confirmModal.onConfirm}
                className={`px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-md transition-all active:scale-95 ${
                  confirmModal.requiresResetWord && resetWord.trim().toUpperCase() !== "RESET"
                    ? "bg-slate-300 dark:bg-neutral-800 text-slate-400 dark:text-neutral-600 cursor-not-allowed"
                    : confirmModal.type === "danger"
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
