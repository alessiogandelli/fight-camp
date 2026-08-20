import { describe, expect, it } from 'vitest';
import { fmtClock, parseTimeInput } from '../lib/format';

describe('fmtClock', () => {
  it('formats minutes and seconds with padding', () => {
    expect(fmtClock(0)).toBe('00:00');
    expect(fmtClock(59)).toBe('00:59');
    expect(fmtClock(60)).toBe('01:00');
    expect(fmtClock(137)).toBe('02:17');
  });
  it('includes hours when needed', () => {
    expect(fmtClock(3600)).toBe('1:00:00');
    expect(fmtClock(3671)).toBe('1:01:11');
  });
  it('never goes negative', () => {
    expect(fmtClock(-5)).toBe('00:00');
  });
});

describe('parseTimeInput', () => {
  it('parses plain seconds', () => {
    expect(parseTimeInput('90')).toBe(90);
    expect(parseTimeInput('0')).toBe(0);
  });
  it('parses m:ss', () => {
    expect(parseTimeInput('3:00')).toBe(180);
    expect(parseTimeInput('0:30')).toBe(30);
    expect(parseTimeInput('12:5')).toBe(725);
  });
  it('parses h:mm:ss', () => {
    expect(parseTimeInput('1:00:00')).toBe(3600);
    expect(parseTimeInput('1:02:03')).toBe(3723);
  });
  it('rejects garbage', () => {
    expect(parseTimeInput('')).toBeNull();
    expect(parseTimeInput('abc')).toBeNull();
    expect(parseTimeInput('1:2:3:4')).toBeNull();
    expect(parseTimeInput('12x')).toBeNull();
    expect(parseTimeInput(':30')).toBeNull();
  });
});
