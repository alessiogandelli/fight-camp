export type Lang = 'it' | 'en';

export type TechniqueCategory = 'boxing' | 'kicks' | 'knees' | 'elbows' | 'defense';

export const TECHNIQUE_CATEGORIES: { id: TechniqueCategory; label: string; labelEn: string }[] = [
  { id: 'boxing', label: 'Pugni', labelEn: 'Boxing' },
  { id: 'kicks', label: 'Calci', labelEn: 'Kicks' },
  { id: 'knees', label: 'Ginocchia', labelEn: 'Knees' },
  { id: 'elbows', label: 'Gomitate', labelEn: 'Elbows' },
  { id: 'defense', label: 'Difesa / Movimento', labelEn: 'Defense / Movement' },
];

export function categoryLabel(id: TechniqueCategory, lang: Lang): string {
  const c = TECHNIQUE_CATEGORIES.find((x) => x.id === id);
  if (!c) return id;
  return lang === 'en' ? c.labelEn : c.label;
}

export interface Technique {
  id: string;
  name: string;
  shortName: string;
  category: TechniqueCategory;
  description?: string;
  nameEn?: string;
  shortNameEn?: string;
  descriptionEn?: string;
  custom?: boolean;
}

export function techniqueName(t: Technique, lang: Lang): string {
  return lang === 'en' ? (t.nameEn ?? t.name) : t.name;
}

export function techniqueShort(t: Technique, lang: Lang): string {
  return lang === 'en' ? (t.shortNameEn ?? t.shortName) : t.shortName;
}

export interface Combination {
  id: string;
  name: string;
  techniqueIds: string[];
  favorite: boolean;
  createdAt: number;
}

export type RoundType = 'combination' | 'sequence' | 'random' | 'free' | 'defense' | 'conditioning' | 'custom';
export type RotationOrder = 'sequential' | 'random';

export const ROUND_TYPES: { id: RoundType; label: string; labelEn: string }[] = [
  { id: 'combination', label: 'Combinazione specifica', labelEn: 'Specific combination' },
  { id: 'sequence', label: 'Sequenza di combinazioni', labelEn: 'Combination sequence' },
  { id: 'random', label: 'Combinazioni casuali', labelEn: 'Random combinations' },
  { id: 'free', label: 'Round libero', labelEn: 'Free round' },
  { id: 'defense', label: 'Difesa', labelEn: 'Defense' },
  { id: 'conditioning', label: 'Condizionamento', labelEn: 'Conditioning' },
  { id: 'custom', label: 'Personalizzato', labelEn: 'Custom' },
];

export function roundTypeLabel(id: RoundType, lang: Lang): string {
  const r = ROUND_TYPES.find((x) => x.id === id);
  if (!r) return id;
  return lang === 'en' ? r.labelEn : r.label;
}

export interface RandomConfig {
  minTechniques: number;
  maxTechniques: number;
  categories: TechniqueCategory[];
  requirePunch: boolean;
  requireKick: boolean;
  includeDefense: boolean;
  count: number;
}

export const DEFAULT_RANDOM: RandomConfig = {
  minTechniques: 3,
  maxTechniques: 5,
  categories: ['boxing', 'kicks', 'knees', 'elbows', 'defense'],
  requirePunch: true,
  requireKick: true,
  includeDefense: false,
  count: 6,
};

export interface RoundBase {
  label?: string;
  duration: number;
  restDuration: number;
  type: RoundType;
  combinationIds: string[];
  rotationInterval: number;
  rotationOrder: RotationOrder;
  randomConfig?: RandomConfig;
}

export interface WorkoutRound extends RoundBase {
  id: string;
}

export type WorkoutType =
  | 'heavy-bag'
  | 'muay-thai'
  | 'tabata'
  | 'intervals'
  | 'running'
  | 'strength'
  | 'conditioning'
  | 'other';

export const WORKOUT_TYPES: { id: WorkoutType; label: string; labelEn: string; icon: string }[] = [
  { id: 'heavy-bag', label: 'Sacco pesante', labelEn: 'Heavy Bag', icon: '🥊' },
  { id: 'muay-thai', label: 'Muay Thai', labelEn: 'Muay Thai', icon: '🥋' },
  { id: 'tabata', label: 'Tabata', labelEn: 'Tabata', icon: '⏱' },
  { id: 'intervals', label: 'Intervalli', labelEn: 'Intervals', icon: '⚡' },
  { id: 'running', label: 'Corsa', labelEn: 'Running', icon: '🏃' },
  { id: 'strength', label: 'Forza', labelEn: 'Strength', icon: '🏋️' },
  { id: 'conditioning', label: 'Condizionamento', labelEn: 'Conditioning', icon: '🪢' },
  { id: 'other', label: 'Altro', labelEn: 'Other', icon: '📝' },
];

export function workoutTypeMeta(id: WorkoutType) {
  return WORKOUT_TYPES.find((t) => t.id === id) ?? WORKOUT_TYPES[WORKOUT_TYPES.length - 1];
}

export function workoutTypeLabel(id: WorkoutType, lang: Lang): string {
  return lang === 'en' ? workoutTypeMeta(id).labelEn : workoutTypeMeta(id).label;
}

export interface Workout {
  id: string;
  name: string;
  type: WorkoutType;
  rounds: WorkoutRound[];
  createdAt: number;
}

export interface TimerPreset {
  id: string;
  name: string;
  rounds: number;
  workDuration: number;
  restDuration: number;
}

export interface LiveConfig {
  name: string;
  type: WorkoutType;
  workoutId?: string;
  prepSeconds: number;
  rounds: RoundBase[];
}

export interface NameRef {
  id: string;
  name: string;
}

export interface UsageRef {
  id: string;
  name: string;
  count: number;
}

export type Feeling = 'great' | 'good' | 'ok' | 'drained';

export interface SessionRecord {
  id: string;
  date: number;
  type: WorkoutType;
  source: 'timer' | 'manual';
  workoutId?: string;
  name: string;
  roundsCompleted?: number;
  totalRounds?: number;
  duration: number;
  workDuration?: number;
  rpe?: number;
  load: number;
  notes?: string;
  energyBefore?: number;
  feelingAfter?: Feeling;
  combosUsed?: NameRef[];
  techniqueUsage?: UsageRef[];
  running?: { distanceKm?: number; paceSecPerKm?: number };
  strength?: { exercise: string; sets: number; reps: number; weightKg?: number }[];
}

export interface WeekPlanItem {
  id: string;
  dateKey: string;
  type: WorkoutType;
  label: string;
  durationMin?: number;
  done: boolean;
}

export interface Settings {
  sound: boolean;
  vibration: boolean;
  prepSeconds: number;
}

export interface AppData {
  version: number;
  techniques: Technique[];
  combinations: Combination[];
  workouts: Workout[];
  sessions: SessionRecord[];
  presets: TimerPreset[];
  plans: WeekPlanItem[];
  settings: Settings;
}

export interface ActiveSnapshot {
  config: LiveConfig;
  totalElapsedMs: number;
  status: 'running' | 'paused';
  savedAt: number;
}

export interface SessionSummary {
  totalRounds: number;
  totalSeconds: number;
  workSeconds: number;
  restSeconds: number;
  combosUsed: NameRef[];
  techniqueUsage: UsageRef[];
}
