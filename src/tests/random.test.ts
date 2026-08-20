import { describe, expect, it } from 'vitest';
import { generateCombos, generateRandomCombo } from '../lib/random';
import type { RandomConfig, Technique } from '../types';

const T = (id: string, category: Technique['category']): Technique => ({
  id,
  name: id,
  shortName: id.toUpperCase(),
  category,
});

const TECHS: Technique[] = [
  T('jab', 'boxing'),
  T('cross', 'boxing'),
  T('hook', 'boxing'),
  T('kick', 'kicks'),
  T('lowkick', 'kicks'),
  T('knee', 'knees'),
  T('elbow', 'elbows'),
  T('slip', 'defense'),
  T('pivot', 'defense'),
];

const CFG: RandomConfig = {
  minTechniques: 3,
  maxTechniques: 5,
  categories: ['boxing', 'kicks', 'knees', 'elbows', 'defense'],
  requirePunch: true,
  requireKick: true,
  includeDefense: false,
  count: 6,
};

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('generateRandomCombo', () => {
  it('respects min/max length over many draws', () => {
    for (let i = 0; i < 300; i++) {
      const ids = generateRandomCombo(CFG, TECHS, seededRng(i + 1));
      expect(ids.length).toBeGreaterThanOrEqual(3);
      expect(ids.length).toBeLessThanOrEqual(5);
    }
  });

  it('always contains at least one punch and one kick when required', () => {
    for (let i = 0; i < 300; i++) {
      const ids = generateRandomCombo(CFG, TECHS, seededRng(i + 1000));
      const cats = ids.map((id) => TECHS.find((t) => t.id === id)!.category);
      expect(cats).toContain('boxing');
      expect(cats).toContain('kicks');
    }
  });

  it('never repeats the same technique back to back', () => {
    for (let i = 0; i < 300; i++) {
      const ids = generateRandomCombo(CFG, TECHS, seededRng(i + 2000));
      for (let j = 1; j < ids.length; j++) {
        expect(ids[j]).not.toBe(ids[j - 1]);
      }
    }
  });

  it('excludes defense when includeDefense is false', () => {
    for (let i = 0; i < 200; i++) {
      const ids = generateRandomCombo(CFG, TECHS, seededRng(i + 3000));
      for (const id of ids) {
        expect(TECHS.find((t) => t.id === id)!.category).not.toBe('defense');
      }
    }
  });

  it('only uses allowed categories', () => {
    const cfg: RandomConfig = { ...CFG, categories: ['boxing'], requireKick: false };
    for (let i = 0; i < 100; i++) {
      const ids = generateRandomCombo(cfg, TECHS, seededRng(i + 4000));
      for (const id of ids) {
        expect(TECHS.find((t) => t.id === id)!.category).toBe('boxing');
      }
    }
  });

  it('returns empty for an empty pool', () => {
    const cfg: RandomConfig = { ...CFG, categories: [] };
    expect(generateRandomCombo(cfg, TECHS)).toEqual([]);
  });
});

describe('generateCombos', () => {
  it('generates the requested number of distinct combos when possible', () => {
    const out = generateCombos(CFG, TECHS, 5, seededRng(42));
    expect(out).toHaveLength(5);
    const sigs = new Set(out.map((c) => c.techniqueIds.join('.')));
    expect(sigs.size).toBeGreaterThan(1);
    for (const c of out) {
      expect(c.name).toMatch(/^\d+$/);
    }
  });
});
