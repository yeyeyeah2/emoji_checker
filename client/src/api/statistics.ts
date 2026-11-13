import { request } from './client';
import type { DataEnvelope, Statistics } from './types';

export type StatisticsQuery = {
  session_id?: string;
  course_id?: string;
  user_id?: string;
  emoji_type?: string;
  source?: string;
  from?: string;
  to?: string;
  group_by?: string;
  bucket?: 'hour' | 'day';
};

export const statisticsApi = {
  async get(query: StatisticsQuery, signal?: AbortSignal): Promise<Statistics> {
    const response = await request<DataEnvelope<Statistics>>('/statistics', {
      query: { ...query },
      signal,
    });
    return response.data;
  },
};
