import { describe, expect, it } from 'vitest';
import { createDetector, paramsForSensitivity, stepDetector, DEFAULT_PARAMS, type DetectorParams } from '../lib/pushups';

const BRIGHT = 200;
const DARK = 40;

function run(lums: number[], params: DetectorParams = DEFAULT_PARAMS, startNow = 0): number {
  let d = createDetector();
  let t = startNow;
  let counts = 0;
  for (const l of lums) {
    t += 33;
    const res = stepDetector(d, l, t, params);
    d = res.state;
    if (res.counted) counts += 1;
  }
  return counts;
}

const bright = (n: number) => Array.from({ length: n }, () => BRIGHT);
const dark = (n: number) => Array.from({ length: n }, () => DARK);

describe('stepDetector', () => {
  it('counts one rep for a full down -> up cycle', () => {
    const lums = [...bright(30), ...dark(20), ...bright(30)];
    expect(run(lums)).toBe(1);
  });

  it('counts multiple reps for repeated cycles', () => {
    const lums = [...bright(30), ...dark(20), ...bright(30), ...dark(20), ...bright(30)];
    expect(run(lums)).toBe(2);
  });

  it('does not count without going dark', () => {
    expect(run(bright(60))).toBe(0);
  });

  it('does not count when contrast is too low (no calibration)', () => {
    // Luminance hovers around 130 with tiny variation: below minDelta.
    const lums = Array.from({ length: 60 }, (_, i) => (i % 2 === 0 ? 130 : 133));
    expect(run(lums)).toBe(0);
  });

  it('respects the cooldown between reps', () => {
    // A very short dark dip right after a rep must not double-count.
    const lums = [...bright(30), ...dark(20), ...bright(30), ...dark(2), ...bright(30)];
    expect(run(lums)).toBe(1);
  });
});

describe('paramsForSensitivity', () => {
  it('lowers minDelta as sensitivity rises', () => {
    expect(paramsForSensitivity(100).minDelta).toBeLessThan(paramsForSensitivity(0).minDelta);
  });

  it('clamps sensitivity to 0..100', () => {
    expect(paramsForSensitivity(-10).minDelta).toBe(paramsForSensitivity(0).minDelta);
    expect(paramsForSensitivity(200).minDelta).toBe(paramsForSensitivity(100).minDelta);
  });
});
