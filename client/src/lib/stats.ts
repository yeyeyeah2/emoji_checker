import type { ClassSession, StatisticsGroup } from '../api/types';
import { emojiOption } from './emoji';
import { formatDateTime, shortId } from './format';

export function groupDimensions(groupBy: string): string[] {
  return groupBy
    .split(',')
    .map((dimension) => dimension.trim())
    .filter(Boolean);
}

export function groupLabel(
  group: StatisticsGroup,
  dimensions: string[],
  sessionById: Map<string, ClassSession>,
): string {
  const parts: string[] = [];

  for (const dimension of dimensions) {
    if (dimension === 'emoji_type' && group.emoji_type) {
      parts.push(emojiOption(group.emoji_type).label);
    } else if (dimension === 'source' && group.source) {
      parts.push(group.source === 'MANUAL' ? '人工记录' : 'AI 记录');
    } else if (dimension === 'course' && group.course) {
      parts.push(group.course);
    } else if (dimension === 'class' && group.class) {
      parts.push(group.class);
    } else if (dimension === 'session' && group.session) {
      const session = sessionById.get(group.session);
      parts.push(session ? session.class_name : `课堂 ${shortId(group.session)}`);
    }
  }

  if (group.period) {
    parts.push(formatDateTime(group.period));
  }

  return parts.length > 0 ? parts.join(' · ') : '全部记录';
}

export function sortStatisticsGroups(groups: StatisticsGroup[]): StatisticsGroup[] {
  return [...groups].sort((a, b) => b.record_count - a.record_count);
}
