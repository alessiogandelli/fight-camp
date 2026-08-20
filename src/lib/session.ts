import type { Combination, Lang, LiveConfig, NameRef, SessionSummary, Technique, UsageRef, Workout } from '../types';
import { techniqueName } from '../types';
import type { SessionPlan } from '../engine/plan';
import { fmtClock } from './format';
import { translate } from './messages';

export function configFromWorkout(w: Workout, prepSeconds: number): LiveConfig {
  return {
    name: w.name,
    type: w.type,
    workoutId: w.id,
    prepSeconds,
    rounds: w.rounds.map((r) => ({
      label: r.label,
      duration: r.duration,
      restDuration: r.restDuration,
      type: r.type,
      combinationIds: r.combinationIds.slice(),
      rotationInterval: r.rotationInterval,
      rotationOrder: r.rotationOrder,
      randomConfig: r.randomConfig,
    })),
  };
}

export function summarizeWorkout(w: Workout, lang: Lang = 'it'): string {
  if (w.rounds.length === 0) return translate(lang, 'session.noRounds');
  const durs = w.rounds.map((r) => r.duration);
  const uniform = durs.every((d) => d === durs[0]);
  const rest = w.rounds.find((r) => r.restDuration > 0)?.restDuration ?? 0;
  const base = uniform ? `${w.rounds.length} × ${fmtClock(durs[0])}` : translate(lang, 'session.nRounds', { n: w.rounds.length });
  return rest > 0 ? `${base} · ${fmtClock(rest)} ${translate(lang, 'session.rest')}` : base;
}

export function workoutTotals(w: Workout): { work: number; rest: number; total: number } {
  const work = w.rounds.reduce((a, r) => a + r.duration, 0);
  const rest = w.rounds.reduce((a, r, i) => a + (i < w.rounds.length - 1 ? r.restDuration : 0), 0);
  return { work, rest, total: work + rest };
}

export function buildSummary(
  plan: SessionPlan,
  seenComboIds: Set<string>,
  combos: Combination[],
  techniques: Technique[],
  lang: Lang = 'it',
): SessionSummary {
  const comboById = new Map(combos.map((c) => [c.id, c]));
  const techById = new Map(techniques.map((t) => [t.id, t]));
  const combosUsed: NameRef[] = [];
  const usage = new Map<string, UsageRef>();
  const seenSlots = new Map<string, string[]>();
  for (const seg of plan.segments) {
    for (const slot of seg.slots) {
      if (slot.comboId && !seenSlots.has(slot.comboId)) seenSlots.set(slot.comboId, slot.techniqueIds);
    }
  }
  for (const id of seenComboIds) {
    const slotIds = seenSlots.get(id);
    const combo = comboById.get(id);
    const name = combo?.name ?? translate(lang, 'session.deletedCombo');
    combosUsed.push({ id, name });
    const techIds = slotIds ?? combo?.techniqueIds ?? [];
    for (const tid of techIds) {
      const cur = usage.get(tid);
      const tech = techById.get(tid);
      const tname = tech ? techniqueName(tech, lang) : translate(lang, 'session.unknown');
      if (cur) cur.count += 1;
      else usage.set(tid, { id: tid, name: tname, count: 1 });
    }
  }
  return {
    totalRounds: plan.rounds,
    totalSeconds: plan.totalSeconds,
    workSeconds: plan.workSeconds,
    restSeconds: plan.restSeconds,
    combosUsed,
    techniqueUsage: Array.from(usage.values()),
  };
}
