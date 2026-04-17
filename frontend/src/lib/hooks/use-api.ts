'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>(endpoint: string | null, params?: Record<string, string | number | boolean | undefined>) {
  const [state, setState] = useState<UseApiState<T>>({ data: null, loading: !!endpoint, error: null });

  const fetchData = useCallback(async () => {
    if (!endpoint) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await apiClient.get<T>(endpoint, params);
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: (err as Error).message });
    }
  }, [endpoint, JSON.stringify(params)]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { ...state, refetch: fetchData };
}

export function useMutation<TInput = unknown, TOutput = unknown>(
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  endpoint: string,
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (body?: TInput): Promise<TOutput | null> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.request<TOutput>(endpoint, { method, body });
      setLoading(false);
      return data;
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
      return null;
    }
  }, [method, endpoint]);

  return { mutate, loading, error };
}
