import { describe, expect, it } from 'vitest';
import { buildPlan } from '../engine/plan';
import { eventsBetween, resolvePlan } from '../engine/resolve';
import type { Combination, LiveConfig, Technique } from '../types';

const tech = (id: string): Technique => ({ id, name: id, shortName: id.toUpperCase(), category: 'boxing' });
const TECHS = [tech('a'), tech('b'), tech('c'), tech('d')];
const combo = (id: string, ids: string[]): Combination => ({
  id,
  name: id.toUpperCase(),
  techniqueIds: ids,
  favorite: false,
  createdAt: 0,
});
const COMBOS = [combo('c1', ['a', 'b']), combo('c2', ['c', 'd'])];

function basicConfig(prep: number): LiveConfig {
  return {
    name: 'TEST',
    type: 'heavy-bag',
    prepSeconds: prep,
    rounds: [
      {
        duration: 20,
        restDuration: 10,
        type: 'combination',
        combinationIds: ['c1'],
        rotationInterval: 20,
        rotationOrder: 'sequential',
      },
      {
        duration: 20,
        restDuration: 10,
        type: 'combination',
        combinationIds: ['c2'],
        rotationInterval: 20,
        rotationOrder: 'sequential',
      },
    ],
  };
}

describe('buildPlan', () => {
  it('builds prep, work and rest segments and skips rest after the last round', () => {
    const plan = buildPlan(basicConfig(5), TECHS, COMBOS);
    expect(plan.segments.map((s) => s.kind)).toEqual(['prep', 'work', 'rest', 'work']);
    expect(plan.totalSeconds).toBe(5 + 20 + 10 + 20);
    expect(plan.workSeconds).toBe(40);
    expect(plan.restSeconds).toBe(10);
    expect(plan.rounds).toBe(2);
  });

  it('omits prep when prepSeconds is 0', () => {
    const plan = buildPlan(basicConfig(0), TECHS, COMBOS);
    expect(plan.segments[0].kind).toBe('work');
    expect(plan.totalSeconds).toBe(50);
  });

  it('builds rotation slots for sequence rounds', () => {
    const cfg = basicConfig(0);
    cfg.rounds = [
      {
        duration: 60,
        restDuration: 0,
        type: 'sequence',
        combinationIds: ['c1', 'c2'],
        rotationInterval: 30,
        rotationOrder: 'sequential',
      },
    ];
    const plan = buildPlan(cfg, TECHS, COMBOS);
    const seg = plan.segments[0];
    expect(seg.slots).toHaveLength(2);
    expect(seg.slots[0].comboId).toBe('c1');
    expect(seg.slots[1].comboId).toBe('c2');
    expect(seg.slotInterval).toBe(30);
  });

  it('falls back to FREE when combinations were deleted', () => {
    const cfg = basicConfig(0);
    cfg.rounds[0].combinationIds = ['missing'];
    const plan = buildPlan(cfg, TECHS, COMBOS);
    expect(plan.segments[0].slots[0].free).toBe(true);
  });

  it('keeps a single slot for a single-combination round', () => {
    const plan = buildPlan(basicConfig(0), TECHS, COMBOS);
    expect(plan.segments[0].slots).toHaveLength(1);
  });
});

describe('resolvePlan', () => {
  const plan = buildPlan(basicConfig(5), TECHS, COMBOS);

  it('resolves prep at t=0', () => {
    const st = resolvePlan(plan, 0);
    expect(st.segment?.kind).toBe('prep');
    expect(st.segRemaining).toBe(5);
  });

  it('moves to work exactly at the boundary', () => {
    const st = resolvePlan(plan, 5);
    expect(st.segment?.kind).toBe('work');
    expect(st.segment?.round).toBe(1);
    expect(st.segRemaining).toBe(20);
  });

  it('resolves rest between rounds', () => {
    const st = resolvePlan(plan, 27);
    expect(st.segment?.kind).toBe('rest');
    expect(st.segRemaining).toBeCloseTo(8, 5);
  });

  it('reports done at the end', () => {
    const st = resolvePlan(plan, plan.totalSeconds);
    expect(st.done).toBe(true);
  });

  it('resolves slot index inside a rotating round', () => {
    const cfg = basicConfig(0);
    cfg.rounds = [
      {
        duration: 60,
        restDuration: 0,
        type: 'sequence',
        combinationIds: ['c1', 'c2'],
        rotationInterval: 30,
        rotationOrder: 'sequential',
      },
    ];
    const p = buildPlan(cfg, TECHS, COMBOS);
    expect(resolvePlan(p, 10).slotIndex).toBe(0);
    expect(resolvePlan(p, 31).slotIndex).toBe(1);
    expect(resolvePlan(p, 59).slotIndex).toBe(1);
  });
});

describe('eventsBetween', () => {
  const plan = buildPlan(basicConfig(5), TECHS, COMBOS);

  it('fires segment events when crossing boundaries', () => {
    const evs = eventsBetween(plan, 4.9, 5.1);
    expect(evs.some((e) => e.type === 'segment' && e.kind === 'work')).toBe(true);
  });

  it('fires warn at 10 seconds remaining', () => {
    const evs = eventsBetween(plan, 14.9, 15.1);
    expect(evs.some((e) => e.type === 'warn')).toBe(true);
  });

  it('fires 3-2-1 counts before segment end', () => {
    const evs = eventsBetween(plan, 21.5, 25);
    const counts = evs.filter((e) => e.type === 'count').map((e) => (e as { n: number }).n);
    expect(counts).toEqual([3, 2, 1]);
  });

  it('fires done at the end of the plan', () => {
    const evs = eventsBetween(plan, plan.totalSeconds - 0.2, plan.totalSeconds + 0.1);
    expect(evs.some((e) => e.type === 'done')).toBe(true);
  });

  it('fires slot change events in rotating rounds', () => {
    const cfg = basicConfig(0);
    cfg.rounds = [
      {
        duration: 60,
        restDuration: 0,
        type: 'sequence',
        combinationIds: ['c1', 'c2'],
        rotationInterval: 30,
        rotationOrder: 'sequential',
      },
    ];
    const p = buildPlan(cfg, TECHS, COMBOS);
    const evs = eventsBetween(p, 29.9, 30.1);
    expect(evs.some((e) => e.type === 'slot')).toBe(true);
  });

  it('returns nothing when time does not advance', () => {
    expect(eventsBetween(plan, 10, 10)).toEqual([]);
  });
});
