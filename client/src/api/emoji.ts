import { request } from './client';
import type { DataEnvelope, EmojiRecord, EmojiType, Page } from './types';

export type CreateEmojiInput = {
  session_id: string;
  emoji_type: EmojiType;
};

export type HistoryQuery = {
  session_id?: string;
  course_id?: string;
  user_id?: string;
  emoji_type?: string;
  source?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

export const emojiApi = {
  async create(input: CreateEmojiInput, signal?: AbortSignal): Promise<EmojiRecord> {
    const response = await request<DataEnvelope<EmojiRecord>>('/emoji', {
      method: 'POST',
      body: input,
      signal,
    });
    return response.data;
  },

  history(query: HistoryQuery, signal?: AbortSignal): Promise<Page<EmojiRecord>> {
    return request<Page<EmojiRecord>>('/emoji/history', { query, signal });
  },
};
