import type { EndReason } from './sim/types';
import type { GameOptions } from './config';

export interface MatchResult {
  matchId: string;
  playerId: string;
  date: string;
  score: number;
  durationSeconds: number;
  endReason: EndReason;
  config: Pick<GameOptions, 'sessionDurationSeconds' | 'enemySpawnIntervalSeconds'>;
}

const STORAGE_KEY = 'pirate-battle:last-result:v1';

export function loadLastMatchResult(): MatchResult | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const result: unknown = JSON.parse(raw);
    if (!result || typeof result !== 'object') return undefined;
    const candidate = result as Partial<MatchResult>;
    if (
      typeof candidate.matchId !== 'string'
      || typeof candidate.playerId !== 'string'
      || typeof candidate.date !== 'string'
      || typeof candidate.score !== 'number'
      || typeof candidate.durationSeconds !== 'number'
      || (candidate.endReason !== 'time' && candidate.endReason !== 'death')
      || !candidate.config
    ) return undefined;
    return result as MatchResult;
  } catch {
    return undefined;
  }
}

export function saveLastMatchResult(result: MatchResult): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
}
