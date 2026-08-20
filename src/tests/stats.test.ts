import { describe, expect, it } from 'vitest';
import { computeLoad, streaks, volumeStats, weeklyBuckets } from '../lib/stats';
import type { SessionRecord } from '../types';

function session(daysAgo: number, durationSec: number, rpe: number): SessionRecord {
  const d = new Date();
  d.setHours(10, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return {
    id: `s-${daysAgo}-${durationSec}`,
    date: d.getTime(),
    type: 'heavy-bag',
    source: 'timer',
    name: 'TEST',
    duration: durationSec,
    rpe,
    load: computeLoad(durationSec, rpe),
  };
}

describe('computeLoad', () => {
  it('multiplies minutes by RPE', () => {
    expect(computeLoad(19 * 60, 8)).toBe(152);
    expect(computeLoad(60 * 60, 10)).toBe(600);
  });
  it('is 0 without RPE', () => {
    expect(computeLoad(600, undefined)).toBe(0);
    expect(computeLoad(600, 0)).toBe(0);
  });
});

describe('streaks', () => {
  it('counts consecutive training days including today', () => {
    const sessions = [session(0, 600, 5), session(1, 600, 5), session(2, 600, 5)];
    const s = streaks(sessions);
    expect(s.current).toBe(3);
    expect(s.longest).toBe(3);
  });

  it('keeps the streak alive when today is not trained yet', () => {
    const sessions = [session(1, 600, 5), session(2, 600, 5)];
    expect(streaks(sessions).current).toBe(2);
  });

  it('breaks the streak after a gap', () => {
    const sessions = [session(0, 600, 5), session(3, 600, 5), session(4, 600, 5)];
    const s = streaks(sessions);
    expect(s.current).toBe(1);
    expect(s.longest).toBe(2);
  });

  it('handles empty history', () => {
    expect(streaks([])).toEqual({ current: 0, longest: 0 });
  });
});

describe('volumeStats', () => {
  it('aggregates sessions', () => {
    const sessions = [
      { ...session(0, 900, 8), roundsCompleted: 5, workDuration: 600 },
      { ...session(1, 300, 6), roundsCompleted: 2, workDuration: 200 },
    ];
    const v = volumeStats(sessions);
    expect(v.sessions).toBe(2);
    expect(v.minutes).toBe(20);
    expect(v.rounds).toBe(7);
    expect(v.workSeconds).toBe(800);
    expect(v.load).toBe(computeLoad(900, 8) + computeLoad(300, 6));
  });
});

describe('weeklyBuckets', () => {
  it('returns the requested number of buckets with totals', () => {
    const sessions = [session(0, 600, 5), session(1, 600, 5)];
    const buckets = weeklyBuckets(sessions, 8);
    expect(buckets).toHaveLength(8);
    const last = buckets[buckets.length - 1];
    expect(last.sessions).toBe(2);
    expect(last.load).toBe(computeLoad(600, 5) * 2);
    expect(buckets[0].sessions).toBe(0);
  });
});
