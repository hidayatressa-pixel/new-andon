import React, { useState, useEffect } from "react";
import { BrandConfig } from "../types";
import { loadSavedBranding } from "../utils/branding";

interface LogoProps {
  className?: string;
  size?: number; // Total height of the logo component in pixels
  theme?: "light" | "dark";
  showCustomText?: boolean;
}

/**
 * Komponen Logo Bawaan Demo: Ultra-Minimalis ASSY
 * Menggunakan ikon huruf "A" geometris murni tanpa lekukan rumit 
 * dikombinasikan dengan gradasi biru safir yang premium.
 */
export const AssyUltraMinimalistLogo: React.FC<LogoProps> = ({ 
  className = "", 
  size = 44,
  theme = "light"
}) => {
  const isLight = theme === "light";

  return (
    <div 
      className={`flex items-center inline-flex select-none gap-3 ${className}`} 
      style={{ height: size }}
    >
      <svg 
        height="100%" 
        viewBox="0 0 260 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-auto h-full"
      >
        <defs>
          {/* Gradasi Biru Safir Premium untuk Ikon Geometris */}
          <linearGradient id="assySapphireGradient" x1="15" y1="85" x2="75" y2="15" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#004cd9" />
            <stop offset="100%" stopColor="#2e8eff" />
          </linearGradient>
        </defs>
        
        {/* ================= IKON LOGO: HURUF "A" GEOMETRIS MURNI ================= */}
        <g id="Minimal-A-Icon">
          {/* Kaki Kiri Huruf A */}
          <path 
            d="M 15 85 L 42 15 L 58 15 L 31 85 Z" 
            fill="url(#assySapphireGradient)" 
          />

          {/* Kaki Kanan & Garis Tengah Terintegrasi */}
          <path 
            d="M 46 15 L 75 85 L 59 85 L 50 62 L 32 62 L 29 52 L 54 52 L 42 24 Z" 
            fill="url(#assySapphireGradient)" 
          />
        </g>

        {/* ================= TULISAN BRAND: "assy" ================= */}
        <text
          x="105"
          y="70"
          fill={isLight ? "#111827" : "#ffffff"}
          fontWeight="300"
          letterSpacing="4"
          style={{
            fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            fontSize: "64px",
          }}
        >
          assy
        </text>
      </svg>
    </div>
  );
};

/**
 * Komponen Logo Utama Terpadu (AppLogo / AjiLogoWithText)
 * Secara cerdas mendeteksi apakah pengguna memakai logo demo bawaan
 * atau telah mengonfigurasi logo kustom (melalui URL gambar, upload file, atau teks nama brand).
 */
export const AppLogo: React.FC<LogoProps> = ({
  className = "",
  size = 44,
  theme = "light",
  showCustomText = true,
}) => {
  const [branding, setBranding] = useState<BrandConfig>(loadSavedBranding);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    // Listen to real-time branding changes from Settings / Master Data
    const handleBrandChange = (e: Event) => {
      const customEvent = e as CustomEvent<BrandConfig>;
      if (customEvent.detail) {
        setBranding(customEvent.detail);
        setImageError(false);
      } else {
        setBranding(loadSavedBranding());
      }
    };

    window.addEventListener("andon_brand_change", handleBrandChange);
    return () => {
      window.removeEventListener("andon_brand_change", handleBrandChange);
    };
  }, []);

  const isLight = theme === "light";

  // 1. Jika mode adalah custom image dan ada URL / Base64 gambar valid
  if (branding.mode === "custom_image" && branding.customLogoUrl && !imageError) {
    return (
      <div 
        className={`inline-flex items-center gap-2 select-none ${className}`}
        style={{ height: size }}
      >
        <img
          src={branding.customLogoUrl}
          alt={branding.customAppName || "Company Logo"}
          className="w-auto h-full object-contain max-h-full rounded-sm"
          onError={() => setImageError(true)}
          referrerPolicy="no-referrer"
        />
        {showCustomText && branding.customLogoText && branding.customLogoText.trim() !== "" && (
          <span 
            className={`font-bold tracking-tight text-sm uppercase ${
              isLight ? "text-slate-900" : "text-white"
            }`}
          >
            {branding.customLogoText}
          </span>
        )}
      </div>
    );
  }

  // 2. Jika mode adalah custom text brand
  if (branding.mode === "custom_text" && branding.customLogoText) {
    return (
      <div 
        className={`inline-flex items-center gap-2 select-none ${className}`}
        style={{ height: size }}
      >
        <div className={`px-2.5 py-1 rounded-lg border font-black text-xs uppercase tracking-wider ${
          isLight
            ? "bg-blue-50 border-blue-200 text-blue-700"
            : "bg-blue-950/60 border-blue-700/50 text-sky-400"
        }`}>
          {branding.customLogoText}
        </div>
      </div>
    );
  }

  // 3. Default: Render logo minimalis demo bawaan ("assy")
  return <AssyUltraMinimalistLogo className={className} size={size} theme={theme} />;
};

/**
 * Backward compatibility wrapper
 */
export const AjiLogoWithText: React.FC<LogoProps & { hideTextOnMobile?: boolean }> = (props) => {
  return <AppLogo {...props} />;
};
