// Web Audio API & Speech Synthesis for Factory Andon Alarms
import { CallCategory, CallSeverity, SoundConfig } from "../types";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playAndonSound(
  alarmType: SoundConfig['alarmType'] = 'industrial_siren',
  severity: CallSeverity = 'major',
  volume: number = 0.8
) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const gainNode = ctx.createGain();
    const finalVolume = Math.max(0.05, Math.min(1, volume));
    gainNode.gain.setValueAtTime(finalVolume, ctx.currentTime);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;

    if (alarmType === 'industrial_siren' || severity === 'critical_line_stop') {
      // Two-tone rising and falling industrial siren
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.linearRampToValueAtTime(880, now + 0.35);
      osc.frequency.linearRampToValueAtTime(520, now + 0.7);
      osc.frequency.linearRampToValueAtTime(880, now + 1.05);
      osc.frequency.linearRampToValueAtTime(520, now + 1.4);

      gainNode.gain.setValueAtTime(finalVolume * 0.7, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.6);

      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 1.6);

    } else if (alarmType === 'two_tone_chime') {
      // Clean factory two-tone chime (High -> Mid)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      
      osc1.type = 'sine';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(659.25, now); // E5
      osc2.frequency.setValueAtTime(523.25, now + 0.25); // C5

      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();

      gain1.gain.setValueAtTime(finalVolume * 0.8, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      gain2.gain.setValueAtTime(finalVolume * 0.8, now + 0.25);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

      osc1.connect(gain1);
      gain1.connect(gainNode);

      osc2.connect(gain2);
      gain2.connect(gainNode);

      osc1.start(now);
      osc1.stop(now + 0.6);
      osc2.start(now + 0.25);
      osc2.stop(now + 0.9);

    } else if (alarmType === 'warning_beeps') {
      // 3 Rapid Warning Beeps
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const beepGain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now + i * 0.18);

        beepGain.gain.setValueAtTime(finalVolume * 0.4, now + i * 0.18);
        beepGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 0.12);

        osc.connect(beepGain);
        beepGain.connect(gainNode);

        osc.start(now + i * 0.18);
        osc.stop(now + i * 0.18 + 0.12);
      }
    } else {
      // Gentle Bell
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(783.99, now); // G5
      gainNode.gain.setValueAtTime(finalVolume * 0.7, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 1.2);
    }
  } catch (err) {
    console.warn("Audio playback not permitted or failed:", err);
  }
}

export function speakAndonCall(
  lineName: string,
  categoryLabel: string,
  workstation: string,
  language: 'id-ID' | 'en-US' = 'id-ID'
) {
  if (typeof window === "undefined" || !('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel(); // Clear previous speech

    let text = "";
    if (language === 'id-ID') {
      text = `Perhatian. Panggilan Andon di ${lineName}, ${workstation}. Masalah: ${categoryLabel}. Mohon respon segera.`;
    } else {
      text = `Attention. Andon Call at ${lineName}, ${workstation}. Issue: ${categoryLabel}. Immediate assistance required.`;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 0.9;

    // Optional voice picker
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(v => v.lang.startsWith(language.slice(0, 2)));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn("Speech synthesis error:", e);
  }
}
