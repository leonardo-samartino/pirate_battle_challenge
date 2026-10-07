import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MatchConfig, MatchRecord } from './contracts';
import { fetchHistory, fetchRanking, submitMatch } from './client';
import { getPlayerId } from './player';
import { queryKeys } from './queryKeys';

const PAGE_SIZE = 5;

export function useRanking(page: number, config: MatchConfig) {
  const query = { page, pageSize: PAGE_SIZE, ...config };
  return useQuery({ queryKey: queryKeys.ranking(query), queryFn: ({ signal }) => fetchRanking(query, signal), placeholderData: keepPreviousData });
}

export function useHistory(page: number) {
  const query = { playerId: getPlayerId(), page, pageSize: PAGE_SIZE };
  return useQuery({ queryKey: queryKeys.history(query), queryFn: ({ signal }) => fetchHistory(query, signal), placeholderData: keepPreviousData });
}

export function useSubmitMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ record, signal }: { record: MatchRecord; signal?: AbortSignal }) => submitMatch(record, signal),
    onSuccess: async (record) => {
      await queryClient.invalidateQueries({ queryKey: ['ranking'] });
      await queryClient.invalidateQueries({ queryKey: ['history', record.playerId] });
    },
  });
}
