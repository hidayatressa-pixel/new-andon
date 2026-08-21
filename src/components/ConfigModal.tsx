import React from "react";
import { 
  Volume2, 
  Settings, 
  Play, 
  Sliders, 
  Radio, 
  Mic, 
  Clock, 
  Check, 
  AlertTriangle,
  Sun,
  Moon,
  Globe,
  Palette,
  CheckCircle2
} from "lucide-react";
import { SoundConfig, AndonLine, AppTheme, AppLanguage } from "../types";
import { playAndonSound, speakAndonCall } from "../utils/audioAlert";
import { getTranslation, TranslationKey } from "../utils/i18n";

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  soundConfig: SoundConfig;
  setSoundConfig: (config: SoundConfig) => void;
  lines: AndonLine[];
  onUpdateLineTarget: (lineId: string, target: number) => void;
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  soundConfig,
  setSoundConfig,
  lines,
  onUpdateLineTarget,
  theme,
  setTheme,
  language,
  setLanguage,
}) => {
  if (!isOpen) return null;

  const t = (key: TranslationKey, params?: Record<string, string | number>) => 
    getTranslation(language, key, params);

  const handleTestSound = (type: SoundConfig["alarmType"]) => {
    playAndonSound(type, "critical_line_stop", soundConfig.volume);
  };

  const handleTestVoice = () => {
    const isId = soundConfig.voiceLanguage === "id-ID";
    speakAndonCall(
      isId ? "Line 1 Machining" : "Line 1 Machining",
      isId ? "Kerusakan Mesin Kritis" : "Critical Machine Breakdown",
      "OP-20 Spot Weld",
      soundConfig.voiceLanguage
    );
  };

  const isLight = theme === "light";

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div 
        className={`border rounded-3xl max-w-2xl w-full p-6 sm:p-7 space-y-6 shadow-2xl relative transition-colors ${
          isLight
            ? "bg-white border-slate-200 text-slate-900"
            : "bg-neutral-900 border-neutral-800 text-neutral-100"
        }`}
      >
        {/* Modal Header */}
        <div className={`flex items-start justify-between border-b pb-4 ${isLight ? "border-slate-200" : "border-neutral-800"}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border ${
              isLight 
                ? "bg-amber-50 text-amber-700 border-amber-200" 
                : "bg-amber-500/20 text-amber-400 border-amber-500/30"
            }`}>
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-lg font-black tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                {t("configModalTitle")}
              </h3>
              <p className={`text-xs ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                {t("configModalSubtitle")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl text-sm font-bold transition-colors ${
              isLight 
                ? "text-slate-400 hover:text-slate-900 hover:bg-slate-100" 
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 text-xs max-h-[70vh] overflow-y-auto pr-1">
          {/* 1. THEME SETTING (2 OPTIONS, LIGHT IS DEFAULT) */}
          <div className={`p-4 rounded-2xl border space-y-3 ${
            isLight ? "bg-slate-50 border-slate-200" : "bg-neutral-950 border-neutral-800"
          }`}>
            <div className="flex items-center gap-2">
              <Palette className={`w-4 h-4 ${isLight ? "text-amber-600" : "text-amber-400"}`} />
              <div>
                <div className={`font-bold text-xs uppercase tracking-wider ${isLight ? "text-slate-800" : "text-neutral-200"}`}>
                  {t("themeSettingTitle")}
                </div>
                <div className={`text-[11px] ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                  {t("themeSettingSubtext")}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Option 1: Light Theme (Default Premium) */}
              <div
                id="theme-light-card"
                onClick={() => setTheme("light")}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all relative flex flex-col justify-between ${
                  theme === "light"
                    ? "bg-white border-amber-500 shadow-md ring-2 ring-amber-500/20"
                    : isLight
                    ? "bg-white/60 border-slate-200 hover:border-slate-300"
                    : "bg-neutral-900 border-neutral-800 hover:border-neutral-700"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600 shadow-sm">
                      <Sun className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <span>{t("themeLightOption")}</span>
                        <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded border border-amber-200">
                          DEFAULT
                        </span>
                      </div>
                    </div>
                  </div>
                  {theme === "light" && (
                    <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                  {t("themeLightOptionDesc")}
                </p>
                {/* Mini Preview Widget */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1 text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Clean Off-White Canvas</span>
                  </div>
                  <span className="font-mono text-amber-700 font-bold">Contrast AA+</span>
                </div>
              </div>

              {/* Option 2: Dark Theme (Industrial Dark) */}
              <div
                id="theme-dark-card"
                onClick={() => setTheme("dark")}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all relative flex flex-col justify-between ${
                  theme === "dark"
                    ? "bg-neutral-900 border-amber-500 shadow-lg ring-2 ring-amber-500/20 text-white"
                    : isLight
                    ? "bg-slate-900 text-white border-slate-800 hover:border-slate-700"
                    : "bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 text-neutral-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-amber-400 shadow-sm">
                      <Moon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white">
                        {t("themeDarkOption")}
                      </div>
                    </div>
                  </div>
                  {theme === "dark" && (
                    <div className="w-5 h-5 rounded-full bg-amber-500 text-neutral-950 flex items-center justify-center shadow">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-neutral-300 mt-2 leading-relaxed">
                  {t("themeDarkOptionDesc")}
                </p>
                {/* Mini Preview Widget */}
                <div className="mt-2.5 pt-2 border-t border-neutral-800 flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1 text-neutral-400">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span>Neon Andon Signals</span>
                  </div>
                  <span className="font-mono text-amber-400 font-bold">Shopfloor TV</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. LANGUAGE SETTING (2 OPTIONS: BAHASA INDONESIA & ENGLISH) */}
          <div className={`p-4 rounded-2xl border space-y-3 ${
            isLight ? "bg-slate-50 border-slate-200" : "bg-neutral-950 border-neutral-800"
          }`}>
            <div className="flex items-center gap-2">
              <Globe className={`w-4 h-4 ${isLight ? "text-cyan-600" : "text-cyan-400"}`} />
              <div>
                <div className={`font-bold text-xs uppercase tracking-wider ${isLight ? "text-slate-800" : "text-neutral-200"}`}>
                  {t("languageSettingTitle")}
                </div>
                <div className={`text-[11px] ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                  {t("languageSettingSubtext")}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Bahasa Indonesia */}
              <div
                id="lang-id-card"
                onClick={() => {
                  setLanguage("id");
                  setSoundConfig({ ...soundConfig, voiceLanguage: "id-ID" });
                }}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                  language === "id"
                    ? isLight
                      ? "bg-white border-cyan-600 shadow-md ring-2 ring-cyan-500/20"
                      : "bg-neutral-900 border-cyan-500 shadow-lg ring-2 ring-cyan-500/20"
                    : isLight
                    ? "bg-white/60 border-slate-200 hover:border-slate-300"
                    : "bg-neutral-900/60 border-neutral-800 hover:border-neutral-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl select-none">🇮🇩</div>
                  <div>
                    <div className={`font-bold text-xs flex items-center gap-1.5 ${isLight ? "text-slate-900" : "text-white"}`}>
                      <span>{t("langIdOption")}</span>
                    </div>
                    <div className={`text-[10px] ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                      {t("langIdOptionDesc")}
                    </div>
                  </div>
                </div>
                {language === "id" && (
                  <div className="w-5 h-5 rounded-full bg-cyan-500 text-white flex items-center justify-center shadow">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </div>

              {/* English */}
              <div
                id="lang-en-card"
                onClick={() => {
                  setLanguage("en");
                  setSoundConfig({ ...soundConfig, voiceLanguage: "en-US" });
                }}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                  language === "en"
                    ? isLight
                      ? "bg-white border-cyan-600 shadow-md ring-2 ring-cyan-500/20"
                      : "bg-neutral-900 border-cyan-500 shadow-lg ring-2 ring-cyan-500/20"
                    : isLight
                    ? "bg-white/60 border-slate-200 hover:border-slate-300"
                    : "bg-neutral-900/60 border-neutral-800 hover:border-neutral-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl select-none">🇺🇸</div>
                  <div>
                    <div className={`font-bold text-xs flex items-center gap-1.5 ${isLight ? "text-slate-900" : "text-white"}`}>
                      <span>{t("langEnOption")}</span>
                    </div>
                    <div className={`text-[10px] ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                      {t("langEnOptionDesc")}
                    </div>
                  </div>
                </div>
                {language === "en" && (
                  <div className="w-5 h-5 rounded-full bg-cyan-500 text-white flex items-center justify-center shadow">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. SOUND MASTER SWITCH & TONE SYNTHESIZER */}
          <div className={`p-4 rounded-2xl border space-y-4 ${
            isLight ? "bg-slate-50 border-slate-200" : "bg-neutral-950 border-neutral-800"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className={`w-4 h-4 ${isLight ? "text-amber-600" : "text-amber-400"}`} />
                <div>
                  <div className={`font-bold text-xs ${isLight ? "text-slate-900" : "text-white"}`}>
                    {t("soundAlarmSetting")}
                  </div>
                  <div className={`text-[11px] ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                    {t("soundAlarmSubtext")}
                  </div>
                </div>
              </div>
              <button
                id="btn-switch-sound"
                onClick={() =>
                  setSoundConfig({
                    ...soundConfig,
                    soundEnabled: !soundConfig.soundEnabled,
                  })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  soundConfig.soundEnabled ? "bg-amber-500" : isLight ? "bg-slate-300" : "bg-neutral-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                    soundConfig.soundEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Tone Selector */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-neutral-800">
              <label className={`block font-bold text-[11px] uppercase tracking-wider ${
                isLight ? "text-slate-700" : "text-neutral-300"
              }`}>
                {t("alarmToneTitle")}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: "industrial_siren", label: t("sirenTone") },
                  { id: "two_tone_chime", label: t("chimeTone") },
                  { id: "warning_beeps", label: t("warningTone") },
                  { id: "gentle_bell", label: t("bellTone") },
                ].map((tone) => (
                  <div
                    key={tone.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      soundConfig.alarmType === tone.id
                        ? isLight
                          ? "bg-white border-amber-500 text-slate-900 shadow-sm"
                          : "bg-neutral-900 border-amber-500 text-white shadow"
                        : isLight
                        ? "bg-white/60 border-slate-200 text-slate-600 hover:border-slate-300"
                        : "bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                    }`}
                    onClick={() =>
                      setSoundConfig({
                        ...soundConfig,
                        alarmType: tone.id as SoundConfig["alarmType"],
                      })
                    }
                  >
                    <span className="font-semibold text-xs">{tone.label}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTestSound(tone.id as SoundConfig["alarmType"]);
                      }}
                      className={`p-1 rounded-lg transition-colors ${
                        isLight
                          ? "bg-slate-100 hover:bg-slate-200 text-amber-700"
                          : "bg-neutral-800 hover:bg-neutral-700 text-amber-400"
                      }`}
                      title={t("testVoiceBtn")}
                    >
                      <Play className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Volume Slider */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-xs">
                <span className={`font-bold ${isLight ? "text-slate-700" : "text-neutral-300"}`}>
                  {t("soundVolumeTitle")}
                </span>
                <span className={`font-mono font-bold ${isLight ? "text-amber-700" : "text-amber-400"}`}>
                  {Math.round(soundConfig.volume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={soundConfig.volume}
                onChange={(e) =>
                  setSoundConfig({
                    ...soundConfig,
                    volume: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          {/* 4. TEXT-TO-SPEECH VOICE ANNOUNCEMENT */}
          <div className={`p-4 rounded-2xl border space-y-3 ${
            isLight ? "bg-slate-50 border-slate-200" : "bg-neutral-950 border-neutral-800"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic className={`w-4 h-4 ${isLight ? "text-emerald-600" : "text-emerald-400"}`} />
                <div>
                  <div className={`font-bold text-xs ${isLight ? "text-slate-900" : "text-white"}`}>
                    {t("voiceTtsTitle")}
                  </div>
                  <div className={`text-[11px] ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                    {t("voiceTtsSubtext")}
                  </div>
                </div>
              </div>
              <button
                onClick={() =>
                  setSoundConfig({
                    ...soundConfig,
                    voiceAnnouncement: !soundConfig.voiceAnnouncement,
                  })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  soundConfig.voiceAnnouncement ? "bg-emerald-500" : isLight ? "bg-slate-300" : "bg-neutral-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                    soundConfig.voiceAnnouncement ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {soundConfig.voiceAnnouncement && (
              <div className={`flex items-center justify-between pt-2 border-t ${
                isLight ? "border-slate-200" : "border-neutral-800/80"
              }`}>
                <div className="flex items-center gap-2">
                  <span className={isLight ? "text-slate-600" : "text-neutral-400"}>
                    {t("voiceLanguageTitle")}
                  </span>
                  <select
                    value={soundConfig.voiceLanguage}
                    onChange={(e) =>
                      setSoundConfig({
                        ...soundConfig,
                        voiceLanguage: e.target.value as SoundConfig["voiceLanguage"],
                      })
                    }
                    className={`rounded-lg px-2 py-1 text-xs border ${
                      isLight
                        ? "bg-white border-slate-300 text-slate-900"
                        : "bg-neutral-900 border-neutral-800 text-white"
                    }`}
                  >
                    <option value="id-ID">Bahasa Indonesia (id-ID)</option>
                    <option value="en-US">English (en-US)</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleTestVoice}
                  className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-colors ${
                    isLight
                      ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300"
                      : "bg-emerald-950/60 hover:bg-emerald-900 text-emerald-400 border border-emerald-500/40"
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>{t("testVoiceBtn")}</span>
                </button>
              </div>
            )}
          </div>

          {/* 5. DAILY OUTPUT TARGETS */}
          <div className={`p-4 rounded-2xl border space-y-2.5 ${
            isLight ? "bg-slate-50 border-slate-200" : "bg-neutral-950 border-neutral-800"
          }`}>
            <div className={`font-bold uppercase tracking-wider text-[11px] ${
              isLight ? "text-slate-800" : "text-neutral-300"
            }`}>
              {t("dailyTargetSettingTitle")}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {lines.map((l) => (
                <div 
                  key={l.id} 
                  className={`flex items-center justify-between p-2 rounded-xl border ${
                    isLight
                      ? "bg-white border-slate-200"
                      : "bg-neutral-900 border-neutral-800"
                  }`}
                >
                  <span className={`font-mono text-[11px] font-bold ${
                    isLight ? "text-slate-700" : "text-neutral-300"
                  }`}>
                    {l.shortCode}:
                  </span>
                  <input
                    type="number"
                    defaultValue={l.targetDaily}
                    onBlur={(e) => onUpdateLineTarget(l.id, parseInt(e.target.value) || l.targetDaily)}
                    className={`w-20 rounded-lg px-2 py-0.5 text-right font-mono text-xs border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                      isLight
                        ? "bg-slate-50 border-slate-300 text-slate-900"
                        : "bg-neutral-950 border-neutral-800 text-white"
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`border-t pt-3.5 flex justify-end ${isLight ? "border-slate-200" : "border-neutral-800"}`}>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{t("saveConfigBtn")}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
