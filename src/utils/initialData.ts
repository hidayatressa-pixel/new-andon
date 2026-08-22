import { AndonLine, AndonCall, SoundConfig, MasterMachine, MasterWorkstation, UserProfile } from "../types";

// Empty initial calls (Clean slate as requested by user)
export const INITIAL_CALLS: AndonCall[] = [];

// Clean initial lines template for initial deployment
export const INITIAL_LINES: AndonLine[] = [
  {
    id: "LINE-1",
    name: "Line 1: Machining & CNC Milling",
    shortCode: "L1-MCN",
    department: "Machining",
    status: "running",
    workstations: ["OP-10 Rough Cut", "OP-20 CNC Mill", "OP-30 CNC Lathe", "OP-40 Deburring", "OP-50 CMM Check"],
    activeCallsCount: 0,
    targetDaily: 450,
    actualOutput: 0,
    efficiency: 100,
    leaderName: "Leader Shift 1",
    currentShift: "Shift 1 (Pagi)"
  },
  {
    id: "LINE-2",
    name: "Line 2: Stamping & Heavy Press",
    shortCode: "L2-STP",
    department: "Stamping",
    status: "running",
    workstations: ["OP-10 Decoiler Feed", "OP-20 500T Press", "OP-30 Piercing Station", "OP-40 Flange Trimming", "OP-50 Visual Check"],
    activeCallsCount: 0,
    targetDaily: 800,
    actualOutput: 0,
    efficiency: 100,
    leaderName: "Leader Shift 1",
    currentShift: "Shift 1 (Pagi)"
  },
  {
    id: "LINE-3",
    name: "Line 3: Robotic Welding & Jig",
    shortCode: "L3-WLD",
    department: "Welding",
    status: "running",
    workstations: ["OP-10 Clamping Jig", "OP-20 Robot Arm 1 Spot", "OP-30 Robot Arm 2 MIG", "OP-40 Manual Touch", "OP-50 NDT Check"],
    activeCallsCount: 0,
    targetDaily: 350,
    actualOutput: 0,
    efficiency: 100,
    leaderName: "Leader Shift 1",
    currentShift: "Shift 1 (Pagi)"
  },
  {
    id: "LINE-4",
    name: "Line 4: Electrostatic Paint & Oven",
    shortCode: "L4-PNT",
    department: "Painting",
    status: "running",
    workstations: ["OP-10 Chemical Degreasing", "OP-20 Primer Dip", "OP-30 Top Coat Spray", "OP-40 Curing Oven 180C", "OP-50 Gloss & Thickness QC"],
    activeCallsCount: 0,
    targetDaily: 500,
    actualOutput: 0,
    efficiency: 100,
    leaderName: "Leader Shift 1",
    currentShift: "Shift 1 (Pagi)"
  },
  {
    id: "LINE-5",
    name: "Line 5: Main Final Assembly A",
    shortCode: "L5-ASM",
    department: "Assembly",
    status: "running",
    workstations: ["OP-10 Sub-assembly Base", "OP-20 Wire Harness Route", "OP-30 Torque Tightening", "OP-40 PCB & Sensor Fit", "OP-50 Final Casing"],
    activeCallsCount: 0,
    targetDaily: 600,
    actualOutput: 0,
    efficiency: 100,
    leaderName: "Leader Shift 1",
    currentShift: "Shift 1 (Pagi)"
  },
  {
    id: "LINE-6",
    name: "Line 6: Testing, QC & Packaging",
    shortCode: "L6-PKG",
    department: "Packaging",
    status: "running",
    workstations: ["OP-10 Electrical Test", "OP-20 Functional Benchmark", "OP-30 Barcode & Serial Label", "OP-40 Box Packing & Seal", "OP-50 Palletizing Robot"],
    activeCallsCount: 0,
    targetDaily: 600,
    actualOutput: 0,
    efficiency: 100,
    leaderName: "Leader Shift 1",
    currentShift: "Shift 1 (Pagi)"
  }
];

export const INITIAL_MACHINES: MasterMachine[] = [
  { id: "MCH-001", code: "CNC-MILL-01", name: "5-Axis CNC Milling Center", lineId: "LINE-1", lineName: "Line 1: Machining", workstation: "OP-20 CNC Mill", status: "active" },
  { id: "MCH-002", code: "CNC-LATHE-01", name: "High Precision CNC Lathe", lineId: "LINE-1", lineName: "Line 1: Machining", workstation: "OP-30 CNC Lathe", status: "active" },
  { id: "MCH-003", code: "PRESS-500T-A", name: "Komatsu 500T Stamping Press", lineId: "LINE-2", lineName: "Line 2: Stamping", workstation: "OP-20 500T Press", status: "active" },
  { id: "MCH-004", code: "ROBOT-WELD-A1", name: "Fanuc 6-Axis Spot Welding Arm", lineId: "LINE-3", lineName: "Line 3: Welding", workstation: "OP-20 Robot Arm 1 Spot", status: "active" },
  { id: "MCH-005", code: "OVEN-CURING-01", name: "Continuous Thermal Curing Oven", lineId: "LINE-4", lineName: "Line 4: Painting", workstation: "OP-40 Curing Oven 180C", status: "active" },
  { id: "MCH-006", code: "TORQUE-TX4-01", name: "Atlas Copco Digital Nutrunner", lineId: "LINE-5", lineName: "Line 5: Assembly", workstation: "OP-30 Torque Tightening", status: "active" },
];

export const INITIAL_OPERATORS: UserProfile[] = [
  {
    id: "OP-1001",
    name: "Agus Pratama",
    badgeId: "OP-1001",
    role: "operator",
    department: "Machining",
    pin: "1234",
    lineAccess: ["LINE-1", "LINE-2"],
    email: "agus.op@factory.local"
  },
  {
    id: "TECH-2001",
    name: "Rudi Hermawan (Teknisi Maintenance)",
    badgeId: "TECH-2001",
    role: "technician",
    department: "Maintenance & Tooling",
    pin: "1234",
    lineAccess: ["*"],
    email: "rudi.tech@factory.local"
  },
  {
    id: "SPV-3001",
    name: "Budi Santoso (Production Supervisor)",
    badgeId: "SPV-3001",
    role: "supervisor",
    department: "Production Control",
    pin: "1234",
    lineAccess: ["*"],
    email: "budi.spv@factory.local"
  },
  {
    id: "USR-ressa20",
    name: "Ressa Hidayat (Administrator)",
    badgeId: "ressa20",
    role: "admin",
    department: "Plant Management & IT",
    pin: "020420",
    lineAccess: ["*"],
    email: "hidayatressa@gmail.com"
  }
];

export const DEFAULT_SOUND_CONFIG: SoundConfig = {
  soundEnabled: true,
  volume: 0.8,
  alarmType: "industrial_siren",
  voiceAnnouncement: true,
  voiceLanguage: "id-ID",
  escalationMinutes: 5
};
