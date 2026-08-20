import type { SessionRecord, UsageRef, NameRef, Lang } from '../types';
import { dateKey } from './format';
import { localeFor } from './messages';

export function computeLoad(durationSec: number, rpe?: number): number {
  if (!rpe || rpe <= 0) return 0;
  return Math.round((durationSec / 60) * rpe);
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x;
}

export function streaks(sessions: SessionRecord[]): { current: number; longest: number } {
  const days = new Set(sessions.map((s) => dateKey(s.date)));
  let longest = 0;
  const sorted = Array.from(days).sort();
  let run = 0;
  let prev: Date | null = null;
  for (const k of sorted) {
    const d = new Date(`${k}T00:00:00`);
    if (prev && d.getTime() - prev.getTime() === 86400000) run += 1;
    else run = 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  let current = 0;
  const cursor = startOfDay(new Date());
  if (!days.has(dateKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dateKey(cursor.getTime()))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { current, longest };
}

export function sessionsPerWeek(sessions: SessionRecord[], windowWeeks = 4): number {
  const cutoff = Date.now() - windowWeeks * 7 * 86400000;
  const n = sessions.filter((s) => s.date >= cutoff).length;
  return Math.round((n / windowWeeks) * 10) / 10;
}

export interface LoadBucket {
  label: string;
  load: number;
  sessions: number;
  minutes: number;
}

export function weeklyBuckets(sessions: SessionRecord[], weeks = 8): LoadBucket[] {
  const out: LoadBucket[] = [];
  const thisWeek = startOfWeek(new Date());
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(thisWeek);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const inRange = sessions.filter((s) => s.date >= start.getTime() && s.date < end.getTime());
    out.push({
      label: `${start.getDate()}/${start.getMonth() + 1}`,
      load: inRange.reduce((a, s) => a + s.load, 0),
      sessions: inRange.length,
      minutes: Math.round(inRange.reduce((a, s) => a + s.duration, 0) / 60),
    });
  }
  return out;
}

export function monthlyBuckets(sessions: SessionRecord[], months = 6, lang: Lang = 'it'): LoadBucket[] {
  const out: LoadBucket[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const inRange = sessions.filter((s) => s.date >= start.getTime() && s.date < end.getTime());
    out.push({
      label: start.toLocaleDateString(localeFor(lang), { month: 'short' }),
      load: inRange.reduce((a, s) => a + s.load, 0),
      sessions: inRange.length,
      minutes: Math.round(inRange.reduce((a, s) => a + s.duration, 0) / 60),
    });
  }
  return out;
}

export interface VolumeStats {
  sessions: number;
  minutes: number;
  rounds: number;
  workSeconds: number;
  load: number;
}

export function volumeStats(sessions: SessionRecord[]): VolumeStats {
  return {
    sessions: sessions.length,
    minutes: Math.round(sessions.reduce((a, s) => a + s.duration, 0) / 60),
    rounds: sessions.reduce((a, s) => a + (s.roundsCompleted ?? 0), 0),
    workSeconds: sessions.reduce((a, s) => a + (s.workDuration ?? 0), 0),
    load: sessions.reduce((a, s) => a + s.load, 0),
  };
}

export function filterSince(sessions: SessionRecord[], days?: number): SessionRecord[] {
  if (!days) return sessions;
  const cutoff = Date.now() - days * 86400000;
  return sessions.filter((s) => s.date >= cutoff);
}

export function comboUsageStats(sessions: SessionRecord[]): (NameRef & { count: number })[] {
  const map = new Map<string, NameRef & { count: number }>();
  for (const s of sessions) {
    for (const c of s.combosUsed ?? []) {
      const cur = map.get(c.id);
      if (cur) cur.count += 1;
      else map.set(c.id, { id: c.id, name: c.name, count: 1 });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

export function techniqueUsageStats(sessions: SessionRecord[]): UsageRef[] {
  const map = new Map<string, UsageRef>();
  for (const s of sessions) {
    for (const t of s.techniqueUsage ?? []) {
      const cur = map.get(t.id);
      if (cur) cur.count += t.count;
      else map.set(t.id, { id: t.id, name: t.name, count: t.count });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

export function bagStats(sessions: SessionRecord[]): { sessions: number; rounds: number; seconds: number } {
  const bag = sessions.filter((s) => s.type === 'heavy-bag');
  return {
    sessions: bag.length,
    rounds: bag.reduce((a, s) => a + (s.roundsCompleted ?? 0), 0),
    seconds: bag.reduce((a, s) => a + (s.workDuration ?? s.duration), 0),
  };
}
