import type { ActiveSnapshot, AppData, Technique } from '../types';
import { seedData, SEED_TECHNIQUES } from './seed';

const DATA_KEY = 'combat-training:data:v1';
const ACTIVE_KEY = 'combat-training:active:v1';
const VERSION = 2;

function migrate(data: AppData): AppData {
  if (data.version >= VERSION) return data;
  if (data.version === 1) {
    const shortById = new Map(SEED_TECHNIQUES.map((t) => [t.id, t]));
    const techniques: Technique[] = data.techniques.map((t) => {
      const seed = shortById.get(t.id);
      if (seed && !t.custom) {
        return { ...t, shortName: seed.shortName, shortNameEn: seed.shortNameEn };
      }
      return t;
    });
    return { ...data, version: VERSION, techniques };
  }
  return data;
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (!raw) return seedData();
    const parsed = JSON.parse(raw) as AppData;
    if (!parsed || !Array.isArray(parsed.techniques)) return seedData();
    if (parsed.version !== 1 && parsed.version !== VERSION) return seedData();
    const migrated = migrate(parsed);
    if (migrated.version !== parsed.version) saveData(migrated);
    return migrated;
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
