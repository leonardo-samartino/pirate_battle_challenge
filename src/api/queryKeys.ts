import type { HistoryQuery, MatchConfig, RankingQuery } from './contracts';

export const queryKeys = {
  ranking: (query: RankingQuery) => ['ranking', query.page, query.pageSize, query.sessionDurationSeconds, query.enemySpawnIntervalSeconds] as const,
  history: (query: HistoryQuery) => ['history', query.playerId, query.page, query.pageSize] as const,
};

export function configKey(config: MatchConfig): string {
  return `${config.sessionDurationSeconds}:${config.enemySpawnIntervalSeconds}`;
}
