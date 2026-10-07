import { QueryClient } from '@tanstack/react-query';
import type { ApiError } from './client';

const retryDelay = Number(import.meta.env.VITE_QUERY_RETRY_DELAY_MS) || 100;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      refetchOnWindowFocus: true,
      refetchOnMount: 'always',
      retry: (failureCount, error) => {
        const apiError = error as ApiError;
        return Boolean(apiError.retryable) && failureCount < 2;
      },
      retryDelay: (attemptIndex) => retryDelay * 2 ** attemptIndex,
    },
  },
});
