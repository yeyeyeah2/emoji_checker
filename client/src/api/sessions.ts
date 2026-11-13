import { request } from './client';
import type { ClassSession, DataEnvelope, Page, RosterStudent } from './types';

const PAGE_SIZE = 100;
const MAX_ITEMS = 500;

export const sessionsApi = {
  async listAll(signal?: AbortSignal): Promise<ClassSession[]> {
    const first = await request<Page<ClassSession>>('/sessions', {
      query: { limit: PAGE_SIZE, offset: 0 },
      signal,
    });
    const items = [...first.data];
    while (items.length < first.meta.total && items.length < MAX_ITEMS) {
      const next = await request<Page<ClassSession>>('/sessions', {
        query: { limit: PAGE_SIZE, offset: items.length },
        signal,
      });
      if (next.data.length === 0) break;
      items.push(...next.data);
    }
    return items;
  },

  async roster(sessionId: string, signal?: AbortSignal): Promise<RosterStudent[]> {
    const response = await request<DataEnvelope<RosterStudent[]>>(`/sessions/${sessionId}/schedule`, { signal });
    return response.data;
  },
};
