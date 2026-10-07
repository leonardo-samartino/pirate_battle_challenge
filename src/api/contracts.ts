/**
 * Mock REST API:
 * GET /api/ranking?page&pageSize&sessionDurationSeconds&enemySpawnIntervalSeconds
 * GET /api/history?playerId&page&pageSize
 * POST /api/matches with a MatchRecord JSON body.
 */
export interface MatchConfig {
  sessionDurationSeconds: number;
  enemySpawnIntervalSeconds: number;
}

export type MatchEndReason = 'time' | 'death';

export interface MatchRecord {
  matchId: string;
  playerId: string;
  playerName: string;
  date: string;
  score: number;
  durationSeconds: number;
  endReason: MatchEndReason;
  config: MatchConfig;
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface RankingEntry extends MatchRecord {
  rank: number;
}

export interface RankingQuery {
  page: number;
  pageSize: number;
  sessionDurationSeconds: number;
  enemySpawnIntervalSeconds: number;
}

export interface HistoryQuery {
  playerId: string;
  page: number;
  pageSize: number;
}

export interface ApiErrorBody {
  code: string;
  message: string;
}
