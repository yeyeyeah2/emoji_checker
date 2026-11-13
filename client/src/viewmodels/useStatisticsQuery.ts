import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage, isAbortError } from '../api/errors';
import { statisticsApi } from '../api/statistics';
import type { Statistics } from '../api/types';
import { resolveRange, type RangePreset } from '../lib/range';

export type StatisticsFilters = {
  range: RangePreset;
  courseId: string;
  groupBy: string;
  bucket: '' | 'hour' | 'day';
};

export const DEFAULT_STATISTICS_FILTERS: StatisticsFilters = {
  range: '7d',
  courseId: '',
  groupBy: 'emoji_type',
  bucket: '',
};

interface StatisticsState {
  data: Statistics | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

const initialState: StatisticsState = {
  data: null,
  loading: true,
  refreshing: false,
  error: null,
};

export function useStatisticsQuery() {
  const [filters, setFiltersState] = useState<StatisticsFilters>(DEFAULT_STATISTICS_FILTERS);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<StatisticsState>(initialState);

  const setFilters = useCallback((patch: Partial<StatisticsFilters>) => {
    setFiltersState((previous) => ({ ...previous, ...patch }));
  }, []);

  const resetFilters = useCallback(() => setFiltersState(DEFAULT_STATISTICS_FILTERS), []);
  const refresh = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    const range = resolveRange(filters.range);

    setState((previous) => ({
      ...previous,
      loading: previous.data === null,
      refreshing: previous.data !== null,
      error: null,
    }));

    statisticsApi
      .get(
        {
          course_id: filters.courseId || undefined,
          group_by: filters.groupBy,
          bucket: filters.bucket || undefined,
          ...range,
        },
        controller.signal,
      )
      .then((data) => {
        setState({ data, loading: false, refreshing: false, error: null });
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
  }, [filters, reloadKey]);

  return {
    ...state,
    filters,
    setFilters,
    resetFilters,
    refresh,
  };
}
