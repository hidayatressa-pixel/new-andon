import React, { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header";
import { MainAndonBoard } from "./components/MainAndonBoard";
import { OperatorTerminal } from "./components/OperatorTerminal";
import { ResponderDashboard } from "./components/ResponderDashboard";
import { PlantLayoutMap } from "./components/PlantLayoutMap";
import { AnalyticsReports } from "./components/AnalyticsReports";
import { MasterDataManager } from "./components/MasterDataManager";
import { ActivityLogsViewer } from "./components/ActivityLogsViewer";
import { AdminDashboard } from "./components/AdminDashboard";
import { LoginScreen } from "./components/LoginScreen";
import { LoginModal } from "./components/LoginModal";
import { ConfigModal } from "./components/ConfigModal";
import { CallDetailModal } from "./components/CallDetailModal";
import { 
  ActiveTab, 
  AndonCall, 
  AndonLine, 
  CallStatus, 
  SoundConfig,
  UserProfile,
  ActivityLog,
  AppTheme,
  AppLanguage
} from "./types";
import { 
  loadSavedLines, 
  loadSoundConfig, 
  saveSoundConfig,
  loadSavedTheme,
  saveThemeToStorage,
  loadSavedLanguage,
  saveLanguageToStorage,
  generateTicketNo 
} from "./utils/storage";
import { loadCurrentSession, clearSession } from "./utils/auth";
import { 
  subscribeAndonCalls, 
  subscribeMasterLines, 
  subscribeActivityLogs,
  createAndonCallInDb, 
  updateAndonCallInDb, 
  deleteAndonCallInDb,
  saveMasterLineInDb,
  logActivity
} from "./lib/firestoreService";
import { playAndonSound, speakAndonCall } from "./utils/audioAlert";
import { CATEGORIES_DATA } from "./utils/categories";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const session = loadCurrentSession();
    if (session) {
      return session.role === "operator" ? "operator_call" : "main_board";
    }
    return "main_board";
  });
  const [lines, setLines] = useState<AndonLine[]>(loadSavedLines);
  const [calls, setCalls] = useState<AndonCall[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [soundConfig, setSoundConfig] = useState<SoundConfig>(loadSoundConfig);
  const [selectedLineId, setSelectedLineId] = useState<string>("LINE-1");

  // Theme & Language state (Defaults: Premium Light & Indonesian)
  const [theme, setTheme] = useState<AppTheme>(loadSavedTheme);
  const [language, setLanguage] = useState<AppLanguage>(loadSavedLanguage);

  // User Authority Session
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(loadCurrentSession());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Modals
  const [inspectedCall, setInspectedCall] = useState<AndonCall | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);

  // Initialize and update theme class on HTML element
  useEffect(() => {
    saveThemeToStorage(theme);
  }, [theme]);

  // Persist language changes
  useEffect(() => {
    saveLanguageToStorage(language);
  }, [language]);

  // Real-time Firestore Subscriptions for Calls, Master Lines & Logs
  useEffect(() => {
    const unsubCalls = subscribeAndonCalls((dbCalls) => {
      setCalls(dbCalls);
    });

    const unsubLines = subscribeMasterLines((dbLines) => {
      if (dbLines && dbLines.length > 0) {
        setLines(dbLines);
        if (!selectedLineId || !dbLines.some(l => l.id === selectedLineId)) {
          setSelectedLineId(dbLines[0].id);
        }
      }
    });

    const unsubLogs = subscribeActivityLogs((dbLogs) => {
      setActivityLogs(dbLogs);
    });

    return () => {
      unsubCalls();
      unsubLines();
      unsubLogs();
    };
  }, []);

  useEffect(() => {
    saveSoundConfig(soundConfig);
  }, [soundConfig]);

  // Recalculate Line Status based on active calls
  const recalculateLineStatuses = useCallback((currentCalls: AndonCall[]) => {
    setLines((prevLines) =>
      prevLines.map((line) => {
        const lineActiveCalls = currentCalls.filter(
          (c) => c.lineId === line.id && c.status !== "resolved"
        );
        const hasStop = lineActiveCalls.some((c) => c.isLineStopped);
        const hasWarning = lineActiveCalls.length > 0;

        let status: AndonLine["status"] = "running";
        if (hasStop) {
          status = "critical";
        } else if (hasWarning) {
          status = "warning";
        }

        return {
          ...line,
          status,
          activeCallsCount: lineActiveCalls.length,
        };
      })
    );
  }, []);

  useEffect(() => {
    recalculateLineStatuses(calls);
  }, [calls, recalculateLineStatuses]);

  // Submit a new Andon Call from Operator Terminal to Cloud Firestore
  const handleCreateCall = async (
    callData: Omit<AndonCall, "id" | "ticketNo" | "timestamp" | "status">
  ) => {
    const newCall: AndonCall = {
      ...callData,
      id: `call-${Date.now()}`,
      ticketNo: generateTicketNo(),
      timestamp: Date.now(),
      status: "calling",
      escalated: false,
      escalationLevel: 1,
    };

    // Save to Firestore with Audit Logging
    await createAndonCallInDb(newCall, currentUser ? {
      name: currentUser.name,
      id: currentUser.badgeId,
      role: currentUser.role
    } : undefined);

    // Audio & Speech Alerts
    if (soundConfig.soundEnabled) {
      playAndonSound(soundConfig.alarmType, newCall.severity, soundConfig.volume);
    }
    if (soundConfig.soundEnabled && soundConfig.voiceAnnouncement) {
      const catLabel = language === "en" 
        ? (CATEGORIES_DATA[newCall.category]?.labelEn || newCall.category) 
        : (CATEGORIES_DATA[newCall.category]?.label || newCall.category);
      speakAndonCall(
        newCall.lineName,
        catLabel,
        newCall.workstation,
        language === "en" ? "en-US" : soundConfig.voiceLanguage
      );
    }
  };

  // Update Call Status (Acknowledge, In Progress, Resolve) in Cloud Firestore
  const handleUpdateCallStatus = async (
    callId: string,
    status: CallStatus,
    extra?: Partial<AndonCall>
  ) => {
    await updateAndonCallInDb(callId, status, extra, currentUser ? {
      name: currentUser.name,
      id: currentUser.badgeId,
      role: currentUser.role
    } : undefined);

    // If inspected modal is open with this call, keep in sync
    if (inspectedCall && inspectedCall.id === callId) {
      setInspectedCall({
        ...inspectedCall,
        status,
        ...extra,
      });
    }
  };

  // Cancel / Delete call in Firestore
  const handleCancelCall = async (callId: string) => {
    await deleteAndonCallInDb(callId, currentUser ? {
      name: currentUser.name,
      id: currentUser.badgeId,
      role: currentUser.role
    } : undefined);
  };

  // Update line target in Firestore
  const handleUpdateLineTarget = async (lineId: string, targetDaily: number) => {
    const targetLine = lines.find((l) => l.id === lineId);
    if (targetLine) {
      await saveMasterLineInDb({ ...targetLine, targetDaily }, currentUser ? {
        name: currentUser.name,
        id: currentUser.badgeId,
        role: currentUser.role
      } : undefined);
    }
  };

  // User Auth Handlers
  const handleLogout = () => {
    if (currentUser) {
      logActivity(
        "login",
        `User Logout: ${currentUser.name}`,
        `User session logged out.`,
        { name: currentUser.name, id: currentUser.badgeId, role: currentUser.role }
      );
    }
    clearSession();
    setCurrentUser(null);
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    
    // Auto load selected line from storage if exists
    const storedLineId = localStorage.getItem("andon_active_login_line_id");
    if (storedLineId) {
      setSelectedLineId(storedLineId);
    }

    if (user.role === "operator") {
      setActiveTab("operator_call");
    } else {
      setActiveTab("main_board");
    }
  };

  // Simulate Emergency Call for Demo
  const handleSimulateEmergency = () => {
    const randomLine = lines[Math.floor(Math.random() * lines.length)] || lines[0];
    const randomStation =
      randomLine.workstations[
        Math.floor(Math.random() * randomLine.workstations.length)
      ] || "OP-20 Station";

    handleCreateCall({
      lineId: randomLine.id,
      lineName: randomLine.name,
      workstation: randomStation,
      category: "machine_breakdown",
      severity: "critical_line_stop",
      isLineStopped: true,
      operatorName: currentUser ? currentUser.name : "Alex Operator (Demo)",
      operatorId: currentUser ? currentUser.badgeId : "OP-9901",
      machineId: "ROBOT-SIM-01",
      partNumber: "DEMO-PART-2026",
      description: "Optical sensor detects clamping position deviation. Conveyor auto line stop.",
    });
  };

  const isLight = theme === "light";

  if (!currentUser) {
    return (
      <LoginScreen
        onLoginSuccess={handleLoginSuccess}
        theme={theme}
        language={language}
        setLanguage={setLanguage}
        lines={lines}
      />
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans antialiased selection:bg-amber-500 selection:text-slate-950 transition-colors duration-200 ${
      isLight ? "bg-slate-100 text-slate-900" : "bg-neutral-950 text-neutral-100"
    }`}>
      {/* Top Main Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeCalls={calls}
        soundConfig={soundConfig}
        setSoundConfig={setSoundConfig}
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        onOpenConfig={() => setIsConfigOpen(true)}
        onSimulateEmergency={handleSimulateEmergency}
        theme={theme}
        setTheme={setTheme}
        language={language}
        setLanguage={setLanguage}
      />

      {/* Main Container View Switcher */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === "main_board" && (
          <MainAndonBoard
            lines={lines}
            calls={calls}
            onSelectCall={(call) => setInspectedCall(call)}
            onNavigateToCall={(lineId) => {
              setSelectedLineId(lineId);
              setActiveTab("operator_call");
            }}
            theme={theme}
            language={language}
          />
        )}

        {activeTab === "operator_call" && (
          <OperatorTerminal
            lines={lines}
            activeCalls={calls}
            selectedLineId={selectedLineId}
            setSelectedLineId={setSelectedLineId}
            onSubmitCall={handleCreateCall}
            onCancelCall={handleCancelCall}
            currentUser={currentUser}
            theme={theme}
            language={language}
          />
        )}

        {activeTab === "responder_terminal" && (
          <ResponderDashboard
            calls={calls}
            onUpdateCallStatus={handleUpdateCallStatus}
            currentUser={currentUser}
            theme={theme}
            language={language}
          />
        )}

        {activeTab === "plant_map" && (
          <PlantLayoutMap
            lines={lines}
            activeCalls={calls}
            onSelectLine={(lineId) => {
              setSelectedLineId(lineId);
              setActiveTab("operator_call");
            }}
            onSelectCall={(call) => setInspectedCall(call)}
            theme={theme}
            language={language}
          />
        )}

        {activeTab === "master_data" && (
          <MasterDataManager
            lines={lines}
            currentUser={currentUser}
            theme={theme}
            language={language}
          />
        )}

        {activeTab === "admin_dashboard" && (
          <AdminDashboard
            lines={lines}
            calls={calls}
            currentUser={currentUser}
            theme={theme}
            language={language}
          />
        )}

        {activeTab === "activity_logs" && (
          <ActivityLogsViewer
            logs={activityLogs}
            currentUser={currentUser}
            theme={theme}
            language={language}
          />
        )}

        {activeTab === "analytics_reports" && (
          <AnalyticsReports 
            calls={calls} 
            lines={lines} 
            activityLogs={activityLogs}
            theme={theme}
            language={language}
          />
        )}
      </main>

      {/* Inspected Call Detail Modal */}
      <CallDetailModal
        call={inspectedCall}
        onClose={() => setInspectedCall(null)}
        onUpdateStatus={handleUpdateCallStatus}
        theme={theme}
        language={language}
      />

      {/* Audio & Factory System Config Modal */}
      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        soundConfig={soundConfig}
        setSoundConfig={setSoundConfig}
        lines={lines}
        onUpdateLineTarget={handleUpdateLineTarget}
        theme={theme}
        setTheme={setTheme}
        language={language}
        setLanguage={setLanguage}
        currentUser={currentUser}
      />

      {/* Quick Switch User Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={(user) => {
          handleLoginSuccess(user);
          setIsLoginModalOpen(false);
        }}
        theme={theme}
        language={language}
      />
    </div>
  );
}
