import { useCallback, useEffect, useState } from 'react';
import { emojiApi } from '../api/emoji';
import { getErrorMessage, isAbortError } from '../api/errors';
import type { EmojiRecord, EmojiType, PageMeta, RecordSource } from '../api/types';
import { resolveRange, type RangePreset } from '../lib/range';

export type HistoryFilters = {
  courseId: string;
  sessionId: string;
  emojiType: EmojiType | '';
  source: RecordSource | '';
  range: RangePreset;
};

export const EMPTY_HISTORY_FILTERS: HistoryFilters = {
  courseId: '',
  sessionId: '',
  emojiType: '',
  source: '',
  range: 'all',
};

interface HistoryState {
  records: EmojiRecord[];
  meta: PageMeta | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

const initialState: HistoryState = {
  records: [],
  meta: null,
  loading: true,
  refreshing: false,
  error: null,
};

export function useHistoryQuery(limit = 10) {
  const [filters, setFiltersState] = useState<HistoryFilters>(EMPTY_HISTORY_FILTERS);
  const [offset, setOffset] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<HistoryState>(initialState);

  const setFilters = useCallback((patch: Partial<HistoryFilters>) => {
    setFiltersState((previous) => ({ ...previous, ...patch }));
    setOffset(0);
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(EMPTY_HISTORY_FILTERS);
    setOffset(0);
  }, []);

  const refresh = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    const range = resolveRange(filters.range);

    setState((previous) => ({
      ...previous,
      loading: previous.records.length === 0,
      refreshing: previous.records.length > 0,
      error: null,
    }));

    emojiApi
      .history(
        {
          course_id: filters.courseId || undefined,
          session_id: filters.sessionId || undefined,
          emoji_type: filters.emojiType || undefined,
          source: filters.source || undefined,
          ...range,
          limit,
          offset,
        },
        controller.signal,
      )
      .then((page) => {
        setState({
          records: page.data,
          meta: page.meta,
          loading: false,
          refreshing: false,
          error: null,
        });
      })
      .catch((caught) => {
        if (isAbortError(caught)) return;
        setState((previous) => ({
          ...previous,
          loading: false,
          refreshing: false,
          error: getErrorMessage(caught),
        }));
      });

    return () => controller.abort();
  }, [filters, offset, limit, reloadKey]);

  const total = state.meta?.total ?? 0;
  const pageIndex = offset / limit + 1;
  const pageCount = Math.max(Math.ceil(total / limit), 1);

  return {
    ...state,
    filters,
    setFilters,
    resetFilters,
    refresh,
    total,
    offset,
    limit,
    pageIndex,
    pageCount,
    hasPrevious: offset > 0,
    hasNext: offset + limit < total,
    setPage: setOffset,
    previousPage: () => setOffset((current) => Math.max(current - limit, 0)),
    nextPage: () => setOffset((current) => current + limit),
  };
}
