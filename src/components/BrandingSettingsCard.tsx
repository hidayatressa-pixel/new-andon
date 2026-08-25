import React, { useState, useRef, useEffect } from "react";
import { 
  Building2, 
  Upload, 
  Link as LinkIcon, 
  RotateCcw, 
  Check, 
  Sparkles, 
  Image as ImageIcon,
  Type,
  Eye,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { BrandConfig, AppTheme, AppLanguage } from "../types";
import { loadSavedBranding, saveBrandingToStorage, resetBrandingToDefault } from "../utils/branding";
import { AppLogo } from "./Logo";
import { getTranslation, TranslationKey } from "../utils/i18n";

interface BrandingSettingsCardProps {
  theme?: AppTheme;
  language?: AppLanguage;
  onSaved?: () => void;
}

export const BrandingSettingsCard: React.FC<BrandingSettingsCardProps> = ({
  theme = "light",
  language = "id",
  onSaved,
}) => {
  const [config, setConfig] = useState<BrandConfig>(loadSavedBranding);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLight = theme === "light";
  const t = (key: TranslationKey, params?: Record<string, string | number>) => 
    getTranslation(language, key, params);

  // Sync state on external brand change
  useEffect(() => {
    const handleBrandChange = (e: Event) => {
      const customEvent = e as CustomEvent<BrandConfig>;
      if (customEvent.detail) {
        setConfig(customEvent.detail);
      }
    };
    window.addEventListener("andon_brand_change", handleBrandChange);
    return () => window.removeEventListener("andon_brand_change", handleBrandChange);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 2MB for base64 local storage)
    if (file.size > 2 * 1024 * 1024) {
      setUploadError(
        language === "id" 
          ? "Ukuran file terlalu besar (maksimal 2 MB). Silakan gunakan gambar yang lebih kecil."
          : "File size too large (max 2 MB). Please select a smaller image."
      );
      return;
    }

    // Check valid image types
    if (!file.type.startsWith("image/")) {
      setUploadError(
        language === "id" 
          ? "Format file tidak valid. Harap pilih gambar (PNG, JPG, SVG, WebP)." 
          : "Invalid file format. Please choose an image (PNG, JPG, SVG, WebP)."
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const updated: BrandConfig = {
          ...config,
          mode: "custom_image",
          customLogoUrl: reader.result,
        };
        setConfig(updated);
        saveBrandingToStorage(updated);
        triggerSaveSuccess();
      }
    };
    reader.onerror = () => {
      setUploadError(
        language === "id" ? "Gagal membaca file gambar." : "Failed to read image file."
      );
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    saveBrandingToStorage(config);
    triggerSaveSuccess();
  };

  const triggerSaveSuccess = () => {
    setSaveSuccess(true);
    if (onSaved) onSaved();
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  };

  const handleResetToDemo = () => {
    const defaultConf = resetBrandingToDefault();
    setConfig(defaultConf);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    triggerSaveSuccess();
  };

  return (
    <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 transition-colors ${
      isLight ? "bg-slate-50 border-slate-200" : "bg-neutral-950 border-neutral-800"
    }`}>
      {/* Section Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl border ${
            isLight 
              ? "bg-blue-50 text-blue-700 border-blue-200" 
              : "bg-blue-500/20 text-blue-400 border-blue-500/30"
          }`}>
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className={`font-bold text-xs uppercase tracking-wider ${isLight ? "text-slate-800" : "text-neutral-200"}`}>
              {language === "id" ? "Pengaturan Logo & Identitas Perusahaan" : "Company Logo & Brand Identity"}
            </div>
            <div className={`text-[11px] ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
              {language === "id" 
                ? "Gunakan logo demo bawaan atau ganti dengan logo resmi perusahaan Anda kapan saja." 
                : "Use the default demo logo or replace it with your company's official logo anytime."}
            </div>
          </div>
        </div>

        {/* Reset to Demo Button */}
        <button
          type="button"
          onClick={handleResetToDemo}
          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 border transition-all ${
            isLight
              ? "bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-sm"
              : "bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-700"
          }`}
          title={language === "id" ? "Kembalikan ke Logo Demo Bawaan" : "Reset to Default Demo Logo"}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{language === "id" ? "Reset ke Demo" : "Reset to Demo"}</span>
        </button>
      </div>

      {/* Mode Selector (3 Modes) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
        {/* Mode 1: Default Demo */}
        <div
          onClick={() => {
            const updated: BrandConfig = { ...config, mode: "demo" };
            setConfig(updated);
            saveBrandingToStorage(updated);
          }}
          className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
            config.mode === "demo"
              ? isLight
                ? "bg-white border-blue-600 shadow-md ring-2 ring-blue-500/20"
                : "bg-neutral-900 border-blue-500 shadow-lg ring-2 ring-blue-500/20"
              : isLight
              ? "bg-white/60 border-slate-200 hover:border-slate-300 text-slate-700"
              : "bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 text-neutral-400"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span className="font-bold text-xs">
                {language === "id" ? "Logo Demo Bawaan" : "Default Demo Logo"}
              </span>
            </div>
            {config.mode === "demo" && (
              <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
            )}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-neutral-400 mt-2">
            {language === "id" ? "Vektor geometris minimalis modern (assy)" : "Modern geometric minimalist vector (assy)"}
          </p>
        </div>

        {/* Mode 2: Custom Image Logo */}
        <div
          onClick={() => {
            const updated: BrandConfig = { ...config, mode: "custom_image" };
            setConfig(updated);
            saveBrandingToStorage(updated);
          }}
          className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
            config.mode === "custom_image"
              ? isLight
                ? "bg-white border-blue-600 shadow-md ring-2 ring-blue-500/20"
                : "bg-neutral-900 border-blue-500 shadow-lg ring-2 ring-blue-500/20"
              : isLight
              ? "bg-white/60 border-slate-200 hover:border-slate-300 text-slate-700"
              : "bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 text-neutral-400"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-bold text-xs">
                {language === "id" ? "Upload / Gambar Logo" : "Upload / Custom Image"}
              </span>
            </div>
            {config.mode === "custom_image" && (
              <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
            )}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-neutral-400 mt-2">
            {language === "id" ? "Unggah file PNG / SVG / URL gambar resmi" : "Upload PNG / SVG or custom image URL"}
          </p>
        </div>

        {/* Mode 3: Custom Text Logo */}
        <div
          onClick={() => {
            const updated: BrandConfig = { ...config, mode: "custom_text" };
            setConfig(updated);
            saveBrandingToStorage(updated);
          }}
          className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
            config.mode === "custom_text"
              ? isLight
                ? "bg-white border-blue-600 shadow-md ring-2 ring-blue-500/20"
                : "bg-neutral-900 border-blue-500 shadow-lg ring-2 ring-blue-500/20"
              : isLight
              ? "bg-white/60 border-slate-200 hover:border-slate-300 text-slate-700"
              : "bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 text-neutral-400"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-purple-500" />
              <span className="font-bold text-xs">
                {language === "id" ? "Nama Merek (Teks)" : "Brand Name (Text)"}
              </span>
            </div>
            {config.mode === "custom_text" && (
              <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
            )}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-neutral-400 mt-2">
            {language === "id" ? "Badge teks nama perusahaan" : "Typographic company name badge"}
          </p>
        </div>
      </div>

      {/* Image Configuration Inputs (Visible if custom_image selected) */}
      {config.mode === "custom_image" && (
        <div className={`p-3.5 rounded-xl border space-y-3 ${
          isLight ? "bg-white border-slate-200" : "bg-neutral-900 border-neutral-800"
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* File Upload Button */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/svg+xml, image/webp"
                onChange={handleFileUpload}
                className="hidden"
                id="andon-logo-file-input"
              />
              <label
                htmlFor="andon-logo-file-input"
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all ${
                  isLight
                    ? "bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
                    : "bg-blue-950/60 hover:bg-blue-900 text-blue-300 border border-blue-700/50"
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{language === "id" ? "Pilih File Gambar Logo..." : "Choose Logo Image File..."}</span>
              </label>
            </div>

            <span className="text-[11px] text-slate-400 dark:text-neutral-500 font-bold">
              {language === "id" ? "— ATAU MASUKKAN URL —" : "— OR ENTER URL —"}
            </span>

            {/* Direct URL Input */}
            <div className="flex-1 w-full relative">
              <LinkIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="url"
                value={config.customLogoUrl || ""}
                onChange={(e) => {
                  setConfig({ ...config, customLogoUrl: e.target.value });
                }}
                onBlur={handleSave}
                placeholder={language === "id" ? "https://perusahaan.com/logo.png" : "https://company.com/logo.png"}
                className={`w-full rounded-xl pl-9 pr-3 py-1.5 text-xs border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900"
                    : "bg-neutral-950 border-neutral-800 text-white"
                }`}
              />
            </div>
          </div>

          {uploadError && (
            <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      )}

      {/* Text Configuration Input (Visible if custom_text selected) */}
      {config.mode === "custom_text" && (
        <div className={`p-3.5 rounded-xl border space-y-2 ${
          isLight ? "bg-white border-slate-200" : "bg-neutral-900 border-neutral-800"
        }`}>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-neutral-400">
            {language === "id" ? "Nama Brand / Singkatan Perusahaan" : "Brand Name / Company Acronym"}
          </label>
          <input
            type="text"
            value={config.customLogoText || ""}
            onChange={(e) => setConfig({ ...config, customLogoText: e.target.value })}
            onBlur={handleSave}
            placeholder="Contoh: PT INDO TEKNOLOGI / INDO-MFG"
            className={`w-full rounded-xl px-3 py-2 text-xs border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
              isLight
                ? "bg-slate-50 border-slate-300 text-slate-900"
                : "bg-neutral-950 border-neutral-800 text-white"
            }`}
          />
        </div>
      )}

      {/* System Name Customization */}
      <div className={`p-3.5 rounded-xl border space-y-3 ${
        isLight ? "bg-white border-slate-200" : "bg-neutral-900 border-neutral-800"
      }`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-neutral-400 mb-1">
              {language === "id" ? "Judul Sistem Header" : "Header System Title"}
            </label>
            <input
              type="text"
              value={config.customAppName || ""}
              onChange={(e) => setConfig({ ...config, customAppName: e.target.value })}
              onBlur={handleSave}
              placeholder="ANDON SMART FACTORY"
              className={`w-full rounded-xl px-3 py-1.5 text-xs border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                isLight
                  ? "bg-slate-50 border-slate-300 text-slate-900"
                  : "bg-neutral-950 border-neutral-800 text-white"
              }`}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-neutral-400 mb-1">
              {language === "id" ? "Tinggi / Ukuran Logo (Pixel)" : "Logo Height (Pixels)"}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="24"
                max="56"
                step="2"
                value={config.logoHeight || 34}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  const updated: BrandConfig = { ...config, logoHeight: val };
                  setConfig(updated);
                  saveBrandingToStorage(updated);
                }}
                className="flex-1 accent-blue-500 cursor-pointer"
              />
              <span className="font-mono text-xs font-bold text-slate-700 dark:text-neutral-300 w-10 text-right">
                {config.logoHeight || 34}px
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Real-Time Preview Card */}
      <div className={`p-4 rounded-xl border space-y-2 ${
        isLight ? "bg-slate-100/70 border-slate-200" : "bg-neutral-900/60 border-neutral-800"
      }`}>
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-neutral-400 uppercase tracking-wider">
          <Eye className="w-3.5 h-3.5 text-blue-500" />
          <span>{language === "id" ? "Pratinjau Langsung Tampilan Logo" : "Live Logo Appearance Preview"}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Light Theme Preview */}
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AppLogo size={config.logoHeight || 34} theme="light" />
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <div className="font-black text-xs text-slate-900 tracking-tight">
                  {config.customAppName || "ANDON SMART FACTORY"}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  {config.customAppSubtitle || "Live Monitor"}
                </div>
              </div>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              LIGHT
            </span>
          </div>

          {/* Dark Theme Preview */}
          <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 shadow-sm flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <AppLogo size={config.logoHeight || 34} theme="dark" />
              <div className="h-6 w-px bg-neutral-800" />
              <div>
                <div className="font-black text-xs text-white tracking-tight">
                  {config.customAppName || "ANDON SMART FACTORY"}
                </div>
                <div className="text-[10px] text-neutral-400 font-medium">
                  {config.customAppSubtitle || "Live Monitor"}
                </div>
              </div>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
              DARK
            </span>
          </div>
        </div>
      </div>

      {/* Save Success Alert / Action */}
      <div className="flex items-center justify-between pt-1">
        {saveSuccess ? (
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {language === "id" 
                ? "Pengaturan logo berhasil disimpan & diperbarui di seluruh layar!" 
                : "Logo settings saved & updated across all screens!"}
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-slate-500 dark:text-neutral-400">
            {language === "id" 
              ? "Perubahan logo otomatis tersimpan dan aktif secara instan." 
              : "Logo changes are automatically saved and applied instantly."}
          </span>
        )}

        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-1.5"
        >
          <Check className="w-3.5 h-3.5" />
          <span>{language === "id" ? "Simpan Perubahan Logo" : "Save Logo Changes"}</span>
        </button>
      </div>
    </div>
  );
};
