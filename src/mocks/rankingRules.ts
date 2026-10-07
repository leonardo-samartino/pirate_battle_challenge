import type { HistoryQuery, MatchConfig, MatchRecord, Page, RankingEntry, RankingQuery } from '../api/contracts';

function sameConfig(left: MatchConfig, right: MatchConfig): boolean {
  return left.sessionDurationSeconds === right.sessionDurationSeconds
    && left.enemySpawnIntervalSeconds === right.enemySpawnIntervalSeconds;
}

function pageOf<T>(items: T[], page: number, pageSize: number): Page<T> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);
  return {
    items: items.slice((safePage - 1) * safePageSize, safePage * safePageSize),
    page: safePage,
    pageSize: safePageSize,
    totalItems: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / safePageSize)),
  };
}

export function buildRanking(records: MatchRecord[], query: RankingQuery): Page<RankingEntry> {
  const sorted = records
    .filter((record) => sameConfig(record.config, query))
    .sort((left, right) => right.score - left.score
      || left.durationSeconds - right.durationSeconds
      || left.date.localeCompare(right.date)
      || left.matchId.localeCompare(right.matchId));
  return pageOf(sorted.map((record, index) => ({ ...record, rank: index + 1 })), query.page, query.pageSize);
}

export function buildHistory(records: MatchRecord[], query: HistoryQuery): Page<MatchRecord> {
  const sorted = records
    .filter((record) => record.playerId === query.playerId)
    .sort((left, right) => right.date.localeCompare(left.date) || right.matchId.localeCompare(left.matchId));
  return pageOf(sorted, query.page, query.pageSize);
}
