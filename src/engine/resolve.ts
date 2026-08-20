import type { Segment, SessionPlan, Slot } from './plan';
import { segmentStart } from './plan';

export interface ResolvedState {
  done: boolean;
  segIndex: number;
  segment: Segment | null;
  segElapsed: number;
  segRemaining: number;
  slotIndex: number;
  slotRemaining: number;
  totalElapsed: number;
}

export function resolvePlan(plan: SessionPlan, t: number): ResolvedState {
  const time = Math.max(0, t);
  let acc = 0;
  for (let i = 0; i < plan.segments.length; i++) {
    const s = plan.segments[i];
    if (time < acc + s.duration) {
      const segElapsed = time - acc;
      const segRemaining = s.duration - segElapsed;
      let slotIndex = 0;
      let slotRemaining = segRemaining;
      if (s.kind === 'work' && s.slots.length > 0) {
        const iv = Math.max(1, s.slotInterval);
        slotIndex = Math.min(Math.floor(segElapsed / iv), s.slots.length - 1);
        const slotEnd = Math.min(acc + (slotIndex + 1) * iv, acc + s.duration);
        slotRemaining = slotEnd - time;
      }
      return {
        done: false,
        segIndex: i,
        segment: s,
        segElapsed,
        segRemaining,
        slotIndex,
        slotRemaining,
        totalElapsed: time,
      };
    }
    acc += s.duration;
  }
  const last = plan.segments.length > 0 ? plan.segments[plan.segments.length - 1] : null;
  return {
    done: true,
    segIndex: Math.max(0, plan.segments.length - 1),
    segment: last,
    segElapsed: last ? last.duration : 0,
    segRemaining: 0,
    slotIndex: last && last.slots.length > 0 ? last.slots.length - 1 : 0,
    slotRemaining: 0,
    totalElapsed: time,
  };
}

export type CueEvent =
  | { type: 'segment'; kind: 'prep' | 'work' | 'rest'; round: number; index: number }
  | { type: 'slot'; index: number }
  | { type: 'warn' }
  | { type: 'count'; n: number }
  | { type: 'done' };

export function eventsBetween(plan: SessionPlan, from: number, to: number): CueEvent[] {
  if (to <= from) return [];
  const events: CueEvent[] = [];
  let acc = 0;
  for (let i = 0; i < plan.segments.length; i++) {
    const s = plan.segments[i];
    const start = acc;
    const end = acc + s.duration;
    acc = end;
    if (end <= from) continue;
    if (start >= to) break;
    if (start > from) events.push({ type: 'segment', kind: s.kind, round: s.round, index: i });
    if (s.duration >= 10) {
      const warnT = end - 10;
      if (warnT > from && warnT <= to) events.push({ type: 'warn' });
    }
    for (const n of [3, 2, 1]) {
      const ct = end - n;
      if (ct > from && ct <= to && ct >= start) events.push({ type: 'count', n });
    }
    if (s.kind === 'work' && s.slots.length > 1) {
      const iv = Math.max(1, s.slotInterval);
      for (let k = 1; k < s.slots.length; k++) {
        const st = start + k * iv;
        if (st >= end) break;
        if (st > from && st <= to) events.push({ type: 'slot', index: k });
      }
    }
  }
  if (plan.totalSeconds > from && to >= plan.totalSeconds) events.push({ type: 'done' });
  return events;
}

export function nextSlotPreview(plan: SessionPlan, segIndex: number, slotIndex: number): {
  slot?: Slot;
  round?: number;
  kind: 'slot' | 'round' | 'none';
} {
  const seg = plan.segments[segIndex];
  if (!seg) return { kind: 'none' };
  if (seg.kind === 'work' && seg.slots.length > 1 && slotIndex < seg.slots.length - 1) {
    return { kind: 'slot', slot: seg.slots[slotIndex + 1] };
  }
  for (let i = segIndex + 1; i < plan.segments.length; i++) {
    const s = plan.segments[i];
    if (s.kind === 'work') {
      return { kind: 'round', round: s.round, slot: s.slots[0] };
    }
  }
  return { kind: 'none' };
}

export function currentSegmentStart(plan: SessionPlan, segIndex: number): number {
  return segmentStart(plan, segIndex);
}
