import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // AI Root Cause & 5-Why Analyzer for Andon Incidents
  app.post("/api/ai/analyze-incident", async (req, res) => {
    try {
      const { lineName, workstation, category, description, machineId, partNumber, severity } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(200).json({
          success: true,
          isMock: true,
          analysis: {
            possibleCauses: [
              "Sensitivitas sensor proximity mengalami penurunan atau terhalang debu/gram besi.",
              "Fluktuasi tekanan angin pneumatik / hidrolik di bawah ambang batas (6 bar).",
              "Keausan mekanis pada komponen penggerak (bearing / timing belt / guide rail)."
            ],
            fiveWhy: [
              "Why 1: Mengapa mesin berhenti? -> Sensor membaca posisi komponen tidak presisi.",
              "Why 2: Mengapa posisi tidak presisi? -> Silinder pneumatik bergerak terlambat.",
              "Why 3: Mengapa silinder lambat? -> Tekanan supply udara drop pada siklus puncak.",
              "Why 4: Mengapa tekanan drop? -> Filter udara regulator kotor tersumbat uap air.",
              "Why 5: Mengapa filter tersumbat? -> Jadwal kuras tangki kompresor mingguan terlewat."
            ],
            countermeasures: [
              "Tindakan Cepat: Bersihkan filter regulator dan naikkan tekanan sementara ke 6.2 bar.",
              "Tindakan Permanen: Pasang auto-drain valve pada main air receiver.",
              "Standardisasi: Update lembar checklist TPM mandiri operator Shift 1."
            ],
            safetyCaution: "Pastikan LOTO (Lockout/Tagout) terpasang sebelum membuka panel mesin."
          }
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Anda adalah Lead Engineer Manufaktur & Pakar Lean TPM (Total Productive Maintenance).
Analisis panggilan Andon berikut dari lantai produksi pabrik:
- Line: ${lineName || "Line Produksi"}
- Stasiun: ${workstation || "Stasiun Kerja"}
- Mesin: ${machineId || "N/A"}
- Part Number / Model: ${partNumber || "N/A"}
- Kategori Masalah: ${category}
- Tingkat Keparahan: ${severity}
- Deskripsi Masalah: ${description}

Berikan output dalam JSON valid dengan struktur:
{
  "summary": "Ringkasan teknis 1 kalimat",
  "possibleCauses": ["Penyebab 1", "Penyebab 2", "Penyebab 3"],
  "fiveWhy": ["Why 1: ...", "Why 2: ...", "Why 3: ...", "Why 4: ...", "Why 5: ..."],
  "countermeasures": ["Tindakan cepat...", "Tindakan perbaikan permanen...", "Pencegahan terulang..."],
  "safetyCaution": "Peringatan K3 / Safety spesifik untuk kasus ini"
}
Kembalikan HANYA JSON murni tanpa markdown formatting backtick.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const responseText = response.text || "";
      const cleanedText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      
      let parsed;
      try {
        parsed = JSON.parse(cleanedText);
      } catch {
        parsed = {
          summary: "Analisis insiden manufaktur selesai.",
          possibleCauses: ["Periksa koneksi sensor", "Cek level pelumas dan tekanan angin", "Inspeksi keausan tooling"],
          fiveWhy: ["Why 1: Deviasi parameter", "Why 2: Kurang kalibrasi berkala"],
          countermeasures: ["Lakukan kalibrasi ulang", "Catat log sheet TPM"],
          safetyCaution: "Selalu gunakan APD lengkap saat mendekati area mesin aktif."
        };
      }

      return res.json({
        success: true,
        analysis: parsed
      });
    } catch (error: any) {
      console.error("AI Analysis Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to generate AI analysis"
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🏭 Andon Server running on http://localhost:${PORT}`);
  });
}

startServer();
