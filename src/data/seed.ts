import type { AppData, Combination, Technique, TimerPreset, Workout } from '../types';
import { DEFAULT_RANDOM } from '../types';

const T = (
  id: string,
  name: string,
  shortName: string,
  category: Technique['category'],
  description?: string,
  nameEn?: string,
  shortNameEn?: string,
  descriptionEn?: string,
): Technique => ({ id, name, shortName, category, description, nameEn, shortNameEn, descriptionEn });

export const SEED_TECHNIQUES: Technique[] = [
  T('t-jab', 'Jab', 'JAB', 'boxing', 'Pugno diretto della mano avanti', 'Jab', 'JAB', 'Lead-hand straight punch'),
  T('t-cross', 'Diretto', 'DIRETTO', 'boxing', 'Pugno diretto della mano dietro', 'Cross', 'CROSS', 'Rear-hand straight punch'),
  T('t-lead-hook', 'Gancio sinistro', 'GANCIO SX', 'boxing', undefined, 'Lead Hook', 'LEAD HOOK'),
  T('t-rear-hook', 'Gancio destro', 'GANCIO DX', 'boxing', undefined, 'Rear Hook', 'REAR HOOK'),
  T('t-lead-uppercut', 'Montante sinistro', 'MONTANTE SX', 'boxing', undefined, 'Lead Uppercut', 'LEAD UPPERCUT'),
  T('t-rear-uppercut', 'Montante destro', 'MONTANTE DX', 'boxing', undefined, 'Rear Uppercut', 'REAR UPPERCUT'),
  T('t-jab-body', 'Jab al corpo', 'JAB CORPO', 'boxing', 'Jab al corpo', 'Jab to Body', 'JAB BODY', 'Jab to the body'),
  T('t-cross-body', 'Diretto al corpo', 'DIRETTO CORPO', 'boxing', 'Diretto al corpo', 'Cross to Body', 'CROSS BODY', 'Cross to the body'),
  T('t-lead-hook-body', 'Gancio sinistro al corpo', 'GANCIO SX CORPO', 'boxing', undefined, 'Lead Hook to Body', 'LEAD HOOK BODY'),
  T('t-rear-hook-body', 'Gancio destro al corpo', 'GANCIO DX CORPO', 'boxing', undefined, 'Rear Hook to Body', 'REAR HOOK BODY'),
  T('t-lead-teep', 'Teep sinistro', 'TEEP SX', 'kicks', 'Calcio spinta con la gamba avanti', 'Lead Teep', 'LEAD TEEP', 'Lead push kick'),
  T('t-rear-teep', 'Teep destro', 'TEEP DX', 'kicks', 'Calcio spinta con la gamba dietro', 'Rear Teep', 'REAR TEEP', 'Rear push kick'),
  T('t-lead-round', 'Calcio sinistro', 'CALCIO SX', 'kicks', undefined, 'Lead Round Kick', 'LEAD KICK'),
  T('t-rear-round', 'Calcio destro', 'CALCIO DX', 'kicks', undefined, 'Rear Round Kick', 'REAR KICK'),
  T('t-lead-low', 'Calcio basso sinistro', 'CALCIO BASSO SX', 'kicks', undefined, 'Lead Low Kick', 'LEAD LOW KICK'),
  T('t-rear-low', 'Calcio basso destro', 'CALCIO BASSO DX', 'kicks', undefined, 'Rear Low Kick', 'REAR LOW KICK'),
  T('t-straight-knee', 'Ginocchio dritto', 'GINOCCHIO DRITTO', 'knees', 'Ginocchio dritto in avanti', 'Straight Knee', 'STRAIGHT KNEE', 'Straight knee'),
  T('t-lead-knee', 'Ginocchio laterale sinistro', 'GINOCCHIO LAT SX', 'knees', 'Ginocchio laterale dal clinch', 'Lead Knee', 'LEAD KNEE', 'Side knee from clinch'),
  T('t-rear-knee', 'Ginocchio laterale destro', 'GINOCCHIO LAT DX', 'knees', 'Ginocchio laterale dal clinch', 'Rear Knee', 'REAR KNEE', 'Side knee from clinch'),
  T('t-upward-elbow', 'Gomito verso l\'alto', 'GOMITO SU', 'elbows', 'Gomito dal basso verso l\'alto', 'Upward Elbow', 'UPWARD ELBOW'),
  T('t-lead-elbow', 'Gomito verso il basso', 'GOMITO GIÙ', 'elbows', 'Gomito dall\'alto verso il basso', 'Downward Elbow', 'DOWNWARD ELBOW'),
  T('t-horizontal-elbow', 'Gomito laterale', 'GOMITO LAT', 'elbows', 'Gomito orizzontale', 'Horizontal Elbow', 'HORIZ ELBOW'),
  T('t-slip-left', 'Schivata sinistra', 'SCHIVATA SX', 'defense', undefined, 'Slip Left', 'SLIP LEFT'),
  T('t-slip-right', 'Schivata destra', 'SCHIVATA DX', 'defense', undefined, 'Slip Right', 'SLIP RIGHT'),
  T('t-roll', 'Roll', 'ROLL', 'defense', undefined, 'Roll', 'ROLL'),
  T('t-pull-back', 'Arretramento', 'ARRETRAMENTO', 'defense', undefined, 'Pull Back', 'PULL BACK'),
  T('t-check', 'Parata', 'PARATA', 'defense', undefined, 'Check', 'CHECK'),
  T('t-step-left', 'Passo a sinistra', 'PASSO SX', 'defense', undefined, 'Step Left', 'STEP LEFT'),
  T('t-step-right', 'Passo a destra', 'PASSO DX', 'defense', undefined, 'Step Right', 'STEP RIGHT'),
  T('t-pivot', 'Pivot', 'PIVOT', 'defense', undefined, 'Pivot', 'PIVOT'),
];

const C = (id: string, name: string, techniqueIds: string[], favorite = false): Combination => ({
  id,
  name,
  techniqueIds,
  favorite,
  createdAt: 0,
});

export const SEED_COMBINATIONS: Combination[] = [
  C('combo-01', 'COMBO 01', ['t-jab', 't-cross', 't-lead-hook', 't-rear-low'], true),
  C('combo-02', 'COMBO 02', ['t-jab', 't-cross', 't-rear-knee'], true),
  C('combo-03', 'COMBO 03', ['t-lead-teep', 't-cross', 't-lead-hook', 't-rear-round']),
  C('combo-04', 'COMBO 04', ['t-jab', 't-cross', 't-lead-hook', 't-rear-knee']),
  C('combo-05', 'COMBO 05', ['t-cross', 't-lead-hook', 't-rear-low']),
  C('combo-06', 'COMBO 06', ['t-lead-teep', 't-cross', 't-rear-round']),
  C('combo-07', 'COMBO 07', ['t-jab', 't-lead-hook', 't-rear-uppercut', 't-rear-low']),
  C('combo-08', 'COMBO 08', ['t-jab', 't-cross-body', 't-lead-hook-body', 't-rear-low']),
];

const round = (
  id: string,
  duration: number,
  restDuration: number,
  type: Workout['rounds'][number]['type'],
  combinationIds: string[] = [],
  rotationInterval = 30,
): Workout['rounds'][number] => ({
  id,
  duration,
  restDuration,
  type,
  combinationIds,
  rotationInterval,
  rotationOrder: 'sequential',
});

export const SEED_WORKOUTS: Workout[] = [
  {
    id: 'workout-basics',
    name: 'HEAVY BAG BASICS',
    type: 'heavy-bag',
    createdAt: 0,
    rounds: [
      round('wb-r1', 180, 60, 'combination', ['combo-01']),
      round('wb-r2', 180, 60, 'combination', ['combo-02']),
      round('wb-r3', 180, 60, 'combination', ['combo-03']),
      round('wb-r4', 180, 60, 'sequence', ['combo-01', 'combo-02', 'combo-03', 'combo-04', 'combo-05'], 30),
      round('wb-r5', 180, 0, 'free'),
    ],
  },
  {
    id: 'workout-tabata',
    name: 'TABATA BLITZ',
    type: 'tabata',
    createdAt: 0,
    rounds: Array.from({ length: 8 }, (_, i) => ({
      ...round(`wt-r${i + 1}`, 20, i < 7 ? 10 : 0, 'sequence', ['combo-01', 'combo-05', 'combo-02'], 20),
    })),
  },
  {
    id: 'workout-sharp',
    name: '30/30 SHARPENING',
    type: 'intervals',
    createdAt: 0,
    rounds: Array.from({ length: 10 }, (_, i) => ({
      ...round(`ws-r${i + 1}`, 30, i < 9 ? 30 : 0, 'random', [], 30),
      randomConfig: { ...DEFAULT_RANDOM },
    })),
  },
];

export const SEED_PRESETS: TimerPreset[] = [
  { id: 'preset-3030', name: '30/30 × 10', rounds: 10, workDuration: 30, restDuration: 30 },
  { id: 'preset-4515', name: '45/15 × 8', rounds: 8, workDuration: 45, restDuration: 15 },
  { id: 'preset-31', name: '3:00/1:00 × 5', rounds: 5, workDuration: 180, restDuration: 60 },
  { id: 'preset-tabata', name: 'TABATA 20/10 × 8', rounds: 8, workDuration: 20, restDuration: 10 },
];

export function seedData(): AppData {
  const now = Date.now();
  return {
    version: 2,
    techniques: SEED_TECHNIQUES,
    combinations: SEED_COMBINATIONS.map((c) => ({ ...c, createdAt: now })),
    workouts: SEED_WORKOUTS.map((w) => ({ ...w, createdAt: now })),
    sessions: [],
    presets: SEED_PRESETS,
    plans: [],
    settings: { sound: true, vibration: true, prepSeconds: 10 },
  };
}
