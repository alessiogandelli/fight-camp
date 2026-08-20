import type { RandomConfig, Technique } from '../types';

export type Rng = () => number;

export function randInt(min: number, max: number, rng: Rng = Math.random): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function pick<T>(arr: T[], rng: Rng = Math.random): T {
  return arr[randInt(0, arr.length - 1, rng)];
}

export function shuffle<T>(arr: T[], rng: Rng = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i, rng);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateRandomCombo(cfg: RandomConfig, techniques: Technique[], rng: Rng = Math.random): string[] {
  const pool = techniques.filter(
    (t) => cfg.categories.includes(t.category) && (t.category !== 'defense' || cfg.includeDefense),
  );
  if (pool.length === 0) return [];
  const min = Math.max(1, Math.min(cfg.minTechniques, cfg.maxTechniques));
  const max = Math.max(min, cfg.maxTechniques);
  const len = randInt(min, max, rng);
  const ids: string[] = new Array<string>(len).fill('');
  const positions = shuffle(
    Array.from({ length: len }, (_, i) => i),
    rng,
  );
  let pi = 0;
  const required: Technique[] = [];
  const punches = pool.filter((t) => t.category === 'boxing');
  const kicks = pool.filter((t) => t.category === 'kicks');
  if (cfg.requirePunch && punches.length > 0) required.push(pick(punches, rng));
  if (cfg.requireKick && kicks.length > 0) required.push(pick(kicks, rng));
  for (const t of required) {
    if (pi < positions.length) ids[positions[pi++]] = t.id;
  }
  for (let i = 0; i < len; i++) {
    if (ids[i]) continue;
    const prevId = i > 0 ? ids[i - 1] : null;
    const nextId = i < len - 1 ? ids[i + 1] : null;
    let cands = pool.filter((t) => t.id !== prevId && t.id !== nextId);
    if (cands.length === 0) cands = pool.filter((t) => t.id !== prevId);
    if (cands.length === 0) cands = pool;
    ids[i] = pick(cands, rng).id;
  }
  return ids;
}

export interface GeneratedCombo {
  name: string;
  techniqueIds: string[];
}

export function generateCombos(
  cfg: RandomConfig,
  techniques: Technique[],
  count: number,
  rng: Rng = Math.random,
): GeneratedCombo[] {
  const n = Math.max(1, count);
  const out: GeneratedCombo[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < n; i++) {
    let ids: string[] = [];
    for (let attempt = 0; attempt < 6; attempt++) {
      ids = generateRandomCombo(cfg, techniques, rng);
      const sig = ids.join('.');
      if (ids.length === 0) break;
      if (!seen.has(sig)) {
        seen.add(sig);
        break;
      }
    }
    out.push({ name: String(i + 1), techniqueIds: ids });
  }
  return out;
}
