import { describe, expect, it } from 'vitest';
import { formatConfidence, formatCount, formatPercentage, formatRelative, shortId } from './format';

describe('format helpers', () => {
  it('formats confidence as a percentage', () => {
    expect(formatConfidence(0.923)).toBe('92%');
    expect(formatConfidence(null)).toBe('—');
  });

  it('formats group percentages with one decimal', () => {
    expect(formatPercentage(16.666)).toBe('16.7%');
    expect(formatPercentage(11.9)).toBe('11.9%');
  });

  it('formats counts', () => {
    expect(formatCount(1284)).toBe('1,284');
  });

  it('shortens ids', () => {
    expect(shortId('11111111-1111-4111-8111-111111111111')).toBe('11111111');
    expect(shortId('abcdefghij', 4)).toBe('abcd');
  });

  it('formats relative time', () => {
    const now = new Date('2026-11-13T12:00:00Z');
    expect(formatRelative('2026-11-13T11:59:40Z', now)).toBe('刚刚');
    expect(formatRelative('2026-11-13T11:50:00Z', now)).toBe('10 分钟前');
    expect(formatRelative('2026-11-13T09:00:00Z', now)).toBe('3 小时前');
  });
});
