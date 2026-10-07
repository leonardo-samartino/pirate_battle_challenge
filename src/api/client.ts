import axios, { AxiosError, type AxiosInstance } from 'axios';
import type { ApiErrorBody, HistoryQuery, MatchRecord, Page, RankingEntry, RankingQuery } from './contracts';

export interface ApiError extends Error {
  kind: 'timeout' | 'network' | 'http';
  status?: number;
  retryable: boolean;
  code?: string;
}

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS) || 4000,
});

function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorBody>;
    if (axios.isCancel(error)) {
      return Object.assign(new Error('The request was cancelled.'), { kind: 'network' as const, retryable: false, code: 'ERR_CANCELED' });
    }
    if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
      return Object.assign(new Error('The request timed out.'), { kind: 'timeout' as const, retryable: true, code: axiosError.code });
    }
    if (!axiosError.response) {
      return Object.assign(new Error('The network request failed.'), { kind: 'network' as const, retryable: true, code: axiosError.code });
    }
    const status = axiosError.response.status;
    const body = axiosError.response.data;
    return Object.assign(new Error(body?.message ?? `Request failed with status ${status}.`), {
      kind: 'http' as const,
      status,
      retryable: status >= 500,
      code: body?.code,
    });
  }
  return Object.assign(new Error('The request failed.'), { kind: 'network' as const, retryable: true });
}

api.interceptors.response.use(undefined, (error: unknown) => Promise.reject(toApiError(error)));

export async function fetchRanking(query: RankingQuery, signal?: AbortSignal): Promise<Page<RankingEntry>> {
  const { data } = await api.get<Page<RankingEntry>>('/ranking', { params: query, signal });
  return data;
}

export async function fetchHistory(query: HistoryQuery, signal?: AbortSignal): Promise<Page<MatchRecord>> {
  const { data } = await api.get<Page<MatchRecord>>('/history', { params: query, signal });
  return data;
}

export async function submitMatch(record: MatchRecord, signal?: AbortSignal): Promise<MatchRecord> {
  const { data } = await api.post<MatchRecord>('/matches', record, { signal });
  return data;
}

export { api };
