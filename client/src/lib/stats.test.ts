import { describe, expect, it } from 'vitest';
import type { ClassSession, StatisticsGroup } from '../api/types';
import { groupDimensions, groupLabel, sortStatisticsGroups } from './stats';

const sessionById = new Map<string, ClassSession>([
  [
    'session-1',
    {
      id: 'session-1',
      course_id: 'course-1',
      class_name: '软工 2301',
      starts_at: '2026-11-13T10:00:00Z',
      ends_at: '2026-11-13T11:00:00Z',
      status: 'SCHEDULED',
      created_at: '2026-11-01T00:00:00Z',
    },
  ],
]);

function group(overrides: Partial<StatisticsGroup>): StatisticsGroup {
  return {
    record_count: 1,
    percentage: 100,
    manual_count: 1,
    ai_count: 0,
    student_count: 1,
    ...overrides,
  };
}

describe('groupDimensions', () => {
  it('splits and trims dimensions', () => {
    expect(groupDimensions('course, class')).toEqual(['course', 'class']);
  });

  it('drops empty parts', () => {
    expect(groupDimensions('emoji_type,,source')).toEqual(['emoji_type', 'source']);
  });
});

describe('groupLabel', () => {
  it('labels an emoji group without duplicating the icon', () => {
    expect(groupLabel(group({ emoji_type: 'HAPPY' }), ['emoji_type'], sessionById)).toBe('开心');
  });

  it('labels source groups', () => {
    expect(groupLabel(group({ source: 'AI' }), ['source'], sessionById)).toBe('AI 记录');
  });

  it('combines course and class', () => {
    expect(
      groupLabel(group({ course: 'SE101', class: '软工 2301' }), ['course', 'class'], sessionById),
    ).toBe('SE101 · 软工 2301');
  });

  it('resolves session names and periods', () => {
    expect(
      groupLabel(
        group({ session: 'session-1', period: '2026-11-13T10:00:00.000Z' }),
        ['session'],
        sessionById,
      ),
    ).toContain('软工 2301');
  });

  it('falls back when no dimensions match', () => {
    expect(groupLabel(group({}), [], sessionById)).toBe('全部记录');
  });
});

describe('sortStatisticsGroups', () => {
  it('sorts by record count descending without mutating the input', () => {
    const input = [group({ record_count: 2 }), group({ record_count: 9 }), group({ record_count: 4 })];
    const sorted = sortStatisticsGroups(input);
    expect(sorted.map((item) => item.record_count)).toEqual([9, 4, 2]);
    expect(input.map((item) => item.record_count)).toEqual([2, 9, 4]);
  });
});
