import type { Combination, LiveConfig, RoundType, Technique } from '../types';
import { generateCombos } from '../lib/random';

export type SlotKind = 'free' | 'defense' | 'conditioning' | 'custom' | 'random';

export interface Slot {
  comboId?: string;
  name: string;
  techniqueIds: string[];
  free: boolean;
  kind?: SlotKind;
}

export interface Segment {
  kind: 'prep' | 'work' | 'rest';
  duration: number;
  round: number;
  totalRounds: number;
  label?: string;
  roundType?: RoundType;
  slots: Slot[];
  slotInterval: number;
}

export interface SessionPlan {
  segments: Segment[];
  totalSeconds: number;
  workSeconds: number;
  restSeconds: number;
  rounds: number;
}

function comboToSlot(c: Combination): Slot {
  return { comboId: c.id, name: c.name, techniqueIds: c.techniqueIds.slice(), free: false };
}

function fixedSlot(kind: 'free' | 'defense' | 'conditioning' | 'custom', name = ''): Slot {
  return { name, techniqueIds: [], free: true, kind };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function buildPlan(cfg: LiveConfig, techniques: Technique[], combos: Combination[]): SessionPlan {
  const comboById = new Map(combos.map((c) => [c.id, c]));
  const segments: Segment[] = [];
  const rounds = cfg.rounds.filter((r) => r.duration >= 1);
  const totalRounds = rounds.length;

  if (cfg.prepSeconds > 0 && totalRounds > 0) {
    segments.push({
      kind: 'prep',
      duration: cfg.prepSeconds,
      round: 0,
      totalRounds,
      slots: [],
      slotInterval: cfg.prepSeconds,
    });
  }

  rounds.forEach((r, idx) => {
    const duration = Math.max(1, Math.round(r.duration));
    const restDuration = Math.max(0, Math.round(r.restDuration));
    let slots: Slot[];
    let slotInterval = duration;

    if (r.type === 'free' || r.type === 'defense' || r.type === 'conditioning' || r.type === 'custom') {
      const kind =
        r.type === 'free'
          ? 'free'
          : r.type === 'defense'
            ? 'defense'
            : r.type === 'conditioning'
              ? 'conditioning'
              : 'custom';
      slots = [fixedSlot(kind, r.type === 'custom' ? (r.label ?? '') : '')];
    } else if (r.type === 'random') {
      const rc = r.randomConfig;
      if (rc) {
        const interval = clamp(Math.round(r.rotationInterval) || duration, 5, duration);
        const needed = Math.max(1, Math.ceil(duration / interval));
        const gen = generateCombos(rc, techniques, Math.max(rc.count, needed));
        slots = gen.map((g) => ({ name: g.name, techniqueIds: g.techniqueIds, free: false, kind: 'random' }));
        slotInterval = interval;
        const n = Math.max(1, Math.ceil(duration / interval));
        slots = Array.from({ length: n }, (_, i) => slots[i % slots.length]);
      } else {
        slots = [fixedSlot('free')];
      }
    } else {
      const resolved = r.combinationIds
        .map((id) => comboById.get(id))
        .filter((c): c is Combination => Boolean(c))
        .map(comboToSlot);
      const pool = resolved.length > 0 ? resolved : [fixedSlot('free')];
      const singleCombo = pool.length === 1;
      const interval = singleCombo ? duration : clamp(Math.round(r.rotationInterval) || duration, 5, duration);
      const n = singleCombo ? 1 : Math.max(1, Math.ceil(duration / interval));
      slotInterval = singleCombo ? duration : interval;
      if (r.rotationOrder === 'random' && pool.length > 1) {
        const seq: number[] = [];
        let lastIdx = -1;
        for (let i = 0; i < n; i++) {
          const options = pool.map((_, pi) => pi).filter((pi) => pi !== lastIdx);
          const chosen = options[Math.floor(Math.random() * options.length)] ?? 0;
          seq.push(chosen);
          lastIdx = chosen;
        }
        slots = seq.map((pi) => pool[pi]);
      } else {
        const offset = r.type === 'sequence' ? idx : 0;
        slots = Array.from({ length: n }, (_, i) => pool[(i + offset) % pool.length]);
      }
    }

    segments.push({
      kind: 'work',
      duration,
      round: idx + 1,
      totalRounds,
      label: r.type === 'custom' ? (r.label ?? '') : undefined,
      roundType: r.type,
      slots,
      slotInterval,
    });

    if (restDuration > 0 && idx < totalRounds - 1) {
      segments.push({
        kind: 'rest',
        duration: restDuration,
        round: idx + 1,
        totalRounds,
        slots: [],
        slotInterval: restDuration,
      });
    }
  });

  const workSeconds = segments.filter((s) => s.kind === 'work').reduce((a, s) => a + s.duration, 0);
  const restSeconds = segments.filter((s) => s.kind === 'rest').reduce((a, s) => a + s.duration, 0);
  const prepSeconds = segments.filter((s) => s.kind === 'prep').reduce((a, s) => a + s.duration, 0);

  return {
    segments,
    totalSeconds: workSeconds + restSeconds + prepSeconds,
    workSeconds,
    restSeconds,
    rounds: totalRounds,
  };
}

export function segmentStart(plan: SessionPlan, index: number): number {
  let t = 0;
  for (let i = 0; i < index && i < plan.segments.length; i++) t += plan.segments[i].duration;
  return t;
}
