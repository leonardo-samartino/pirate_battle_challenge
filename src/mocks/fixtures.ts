import type { MatchConfig, MatchRecord } from '../api/contracts';

export const DEFAULT_FIXTURE_CONFIG: MatchConfig = {
  sessionDurationSeconds: 120,
  enemySpawnIntervalSeconds: 4,
};

const names = ['Captain Flint', 'Red Sparrow', 'Storm Rider', 'Sea Wolf', 'Admiral Tide'];

function seededValue(config: MatchConfig, index: number): number {
  let value = (config.sessionDurationSeconds * 73856093)
    ^ (Math.round(config.enemySpawnIntervalSeconds * 10) * 19349663)
    ^ (index * 83492791);
  value = Math.imul(value ^ (value >>> 16), 2246822519);
  value = Math.imul(value ^ (value >>> 13), 3266489917);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

export function fixtureRecordsForConfig(config: MatchConfig): MatchRecord[] {
  return Array.from({ length: 30 }, (_, index): MatchRecord => {
    const variation = seededValue(config, index);
    const scoreScale = config.sessionDurationSeconds / Math.max(1, config.enemySpawnIntervalSeconds);
    return {
      matchId: `fixture-${config.sessionDurationSeconds}-${config.enemySpawnIntervalSeconds}-${String(index + 1).padStart(3, '0')}`,
      playerId: `fixture-player-${(index % names.length) + 1}`,
      playerName: names[index % names.length],
      date: `2025-${String((index % 12) + 1).padStart(2, '0')}-${String((index % 28) + 1).padStart(2, '0')}T${String(index % 24).padStart(2, '0')}:00:00.000Z`,
      score: Math.max(1, Math.round(scoreScale * (0.35 + variation * 0.65))),
      durationSeconds: Math.round(config.sessionDurationSeconds * (0.45 + variation * 0.55)),
      endReason: index % 7 === 0 ? 'death' : 'time',
      config,
    };
  });
}

export const fixtureRecords: MatchRecord[] = Array.from({ length: 48 }, (_, index): MatchRecord => ({
  matchId: `fixture-default-${String(index + 1).padStart(3, '0')}`,
  playerId: `fixture-player-${(index % names.length) + 1}`,
  playerName: names[index % names.length],
  date: `2025-01-${String((index % 28) + 1).padStart(2, '0')}T${String(index % 24).padStart(2, '0')}:00:00.000Z`,
  score: 48 - index,
  durationSeconds: 70 + (index % 20),
  endReason: index % 7 === 0 ? 'death' : 'time',
  config: DEFAULT_FIXTURE_CONFIG,
})).concat([
  {
    matchId: 'fixture-fast-001',
    playerId: 'fixture-player-fast',
    playerName: 'Quick Current',
    date: '2025-02-01T12:00:00.000Z',
    score: 99,
    durationSeconds: 60,
    endReason: 'time',
    config: { sessionDurationSeconds: 60, enemySpawnIntervalSeconds: 2 },
  },
  {
    matchId: 'fixture-long-001',
    playerId: 'fixture-player-long',
    playerName: 'Long Wave',
    date: '2025-02-02T12:00:00.000Z',
    score: 12,
    durationSeconds: 180,
    endReason: 'death',
    config: { sessionDurationSeconds: 180, enemySpawnIntervalSeconds: 8 },
  },
]);
