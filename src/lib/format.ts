import type { Lang } from '../types';
import { localeFor } from './messages';

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function fmtClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${pad2(m)}:${pad2(sec)}`;
  return `${pad2(m)}:${pad2(sec)}`;
}

export function fmtMinutes(totalSec: number): string {
  const m = Math.round(totalSec / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}h ${pad2(m % 60)}m`;
}

export function parseTimeInput(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) {
    const v = parseInt(s, 10);
    return Number.isFinite(v) ? v : null;
  }
  const parts = s.split(':');
  if (parts.length < 2 || parts.length > 3) return null;
  if (!parts.every((p) => /^\d{1,2}$/.test(p))) return null;
  const nums = parts.map((p) => parseInt(p, 10));
  if (nums.some((n) => !Number.isFinite(n))) return null;
  if (parts.length === 2) return nums[0] * 60 + nums[1];
  return nums[0] * 3600 + nums[1] * 60 + nums[2];
}

export function dateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function dayLabel(ts: number, lang: Lang = 'it'): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(ts);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - day.getTime()) / 86400000);
  const locale = localeFor(lang);
  if (diff === 0) return lang === 'en' ? 'TODAY' : 'OGGI';
  if (diff === 1) return lang === 'en' ? 'YESTERDAY' : 'IERI';
  if (diff > 1 && diff < 7) {
    return day.toLocaleDateString(locale, { weekday: 'long' }).toUpperCase();
  }
  return day.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
}

export function fmtDistance(km?: number): string {
  if (km == null || !Number.isFinite(km)) return '';
  return `${km.toFixed(1)} km`;
}

export function fmtPace(secPerKm?: number): string {
  if (!secPerKm || !Number.isFinite(secPerKm)) return '';
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${pad2(s)} /km`;
}
