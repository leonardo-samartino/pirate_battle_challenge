import { DEFAULT_GAME_OPTIONS, type GameOptions } from './config';

const STORAGE_KEY = 'pirate-battle:settings:v1';

function isValid(value: unknown): value is GameOptions {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<GameOptions>;
  const sessionDurationSeconds = candidate.sessionDurationSeconds;
  const enemySpawnIntervalSeconds = candidate.enemySpawnIntervalSeconds;
  return typeof sessionDurationSeconds === 'number'
    && Number.isInteger(sessionDurationSeconds)
    && sessionDurationSeconds >= 60
    && sessionDurationSeconds <= 180
    && typeof enemySpawnIntervalSeconds === 'number'
    && Number.isFinite(enemySpawnIntervalSeconds)
    && enemySpawnIntervalSeconds >= 0.5
    && enemySpawnIntervalSeconds <= 30;
}

export function loadGameOptions(): GameOptions {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_GAME_OPTIONS };
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? { ...parsed } : { ...DEFAULT_GAME_OPTIONS };
  } catch {
    return { ...DEFAULT_GAME_OPTIONS };
  }
}

export function saveGameOptions(options: GameOptions): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
}
