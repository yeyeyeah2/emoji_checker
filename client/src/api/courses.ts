import { request } from './client';
import type { Course, Page } from './types';

const PAGE_SIZE = 100;
const MAX_ITEMS = 500;

export const coursesApi = {
  async listAll(signal?: AbortSignal): Promise<Course[]> {
    const first = await request<Page<Course>>('/courses', {
      query: { limit: PAGE_SIZE, offset: 0 },
      signal,
    });
    const items = [...first.data];
    while (items.length < first.meta.total && items.length < MAX_ITEMS) {
      const next = await request<Page<Course>>('/courses', {
        query: { limit: PAGE_SIZE, offset: items.length },
        signal,
      });
      if (next.data.length === 0) break;
      items.push(...next.data);
    }
    return items;
  },
};
