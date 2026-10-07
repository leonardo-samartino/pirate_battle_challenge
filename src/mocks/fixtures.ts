import type { MatchConfig, MatchRecord } from '../api/contracts';

export const DEFAULT_FIXTURE_CONFIG: MatchConfig = {
  sessionDurationSeconds: 120,
  enemySpawnIntervalSeconds: 4,
};

const names = ['Captain Flint', 'Red Sparrow', 'Storm Rider', 'Sea Wolf', 'Admiral Tide'];

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
