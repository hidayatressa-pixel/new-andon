export type UserRole = "operator" | "technician" | "supervisor" | "admin";

export interface UserProfile {
  id: string;
  name: string;
  badgeId: string;
  role: UserRole;
  department: string;
  lineAccess?: string[]; // All lines if empty or includes "*"
  email?: string;
  pin?: string;
}

export type CallCategory = 
  | 'machine_breakdown' 
  | 'material_shortage' 
  | 'quality_defect' 
  | 'maintenance_tooling' 
  | 'supervisor_call' 
  | 'safety_alert';

export type CallSeverity = 'minor' | 'major' | 'critical_line_stop';

export type CallStatus = 'calling' | 'acknowledged' | 'in_progress' | 'resolved';

export interface AndonCall {
  id: string;
  ticketNo: string;
  lineId: string;
  lineName: string;
  workstation: string;
  category: CallCategory;
  severity: CallSeverity;
  isLineStopped: boolean;
  operatorName: string;
  operatorId: string;
  machineId?: string;
  partNumber?: string;
  description: string;
  timestamp: number;
  acknowledgedAt?: number;
  acknowledgedBy?: string;
  inProgressAt?: number;
  resolvedAt?: number;
  resolvedBy?: string;
  resolutionNotes?: string;
  rootCause?: string;
  fiveWhyAnalysis?: string[];
  status: CallStatus;
  escalated?: boolean;
  escalationLevel?: number; // 1: Leader, 2: SPV, 3: Manager
}

export type LineStatus = 'running' | 'warning' | 'critical' | 'maintenance' | 'qc_hold';

export interface AndonLine {
  id: string;
  name: string;
  shortCode: string;
  department: string;
  status: LineStatus;
  workstations: string[];
  activeCallsCount: number;
  targetDaily: number;
  actualOutput: number;
  efficiency: number;
  leaderName: string;
  currentShift: string;
}

export interface MasterMachine {
  id: string;
  code: string;
  name: string;
  lineId: string;
  lineName: string;
  workstation: string;
  modelType?: string;
  serialNumber?: string;
  status: 'active' | 'under_maintenance' | 'standby';
}

export interface MasterWorkstation {
  id: string;
  lineId: string;
  name: string;
  sequence: number;
  operatorRoleNeeded?: string;
}

export interface ActivityLog {
  id: string;
  action: 
    | 'login' 
    | 'logout' 
    | 'create_call' 
    | 'acknowledge_call' 
    | 'in_progress_call' 
    | 'resolve_call' 
    | 'delete_call' 
    | 'upload_master' 
    | 'update_master' 
    | 'config_change';
  title: string;
  details: string;
  userName: string;
  userId: string;
  userRole: string;
  timestamp: number;
  callId?: string | null;
  lineId?: string | null;
  ticketNo?: string | null;
}

export type AppTheme = "light" | "dark";
export type AppLanguage = "id" | "en";

export interface SoundConfig {
  soundEnabled: boolean;
  volume: number;
  alarmType: 'industrial_siren' | 'two_tone_chime' | 'warning_beeps' | 'gentle_bell';
  voiceAnnouncement: boolean;
  voiceLanguage: 'id-ID' | 'en-US';
  escalationMinutes: number;
}

export type ActiveTab = 
  | 'main_board' 
  | 'operator_call' 
  | 'responder_terminal' 
  | 'plant_map' 
  | 'master_data' 
  | 'activity_logs' 
  | 'analytics_reports';

export interface CategoryMetadata {
  id: CallCategory;
  label: string;
  labelEn: string;
  icon: string;
  color: string;
  bgLight: string;
  borderLight: string;
  badgeBg: string;
  badgeText: string;
  soundPitch: number;
  towerColor: 'red' | 'yellow' | 'blue' | 'purple' | 'orange' | 'white';
}
