import type { ActiveSnapshot, AppData } from '../types';
import { seedData } from './seed';

const DATA_KEY = 'combat-training:data:v1';
const ACTIVE_KEY = 'combat-training:active:v1';

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (!raw) return seedData();
    const parsed = JSON.parse(raw) as AppData;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.techniques)) return seedData();
    return parsed;
  } catch {
    return seedData();
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota errors */
  }
}

export function loadActive(): ActiveSnapshot | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveSnapshot;
    if (!parsed || !parsed.config || !Array.isArray(parsed.config.rounds)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveActive(snapshot: ActiveSnapshot): void {
  try {
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore */
  }
}

export function clearActive(): void {
  try {
    localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}
