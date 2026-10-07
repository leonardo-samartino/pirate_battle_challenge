import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { MatchRecord } from '../api/contracts';
import { server } from './server';
import { allRecords, resetDatabase } from './db';
import { buildRanking } from './rankingRules';
import { reset, setScenario } from './scenarios';
import { enqueueMatch, flushOutbox, pendingSubmissions, rehydrateOutbox, resetOutbox } from '../api/outbox';
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';

const config = { sessionDurationSeconds: 120, enemySpawnIntervalSeconds: 4 };

function record(overrides: Partial<MatchRecord> = {}): MatchRecord {
  return {
    matchId: 'test-match',
    playerId: 'player-test',
    playerName: 'Captain Jack',
    date: '2026-01-01T00:00:00.000Z',
    score: 10,
    durationSeconds: 90,
    endReason: 'time',
    config,
    ...overrides,
  };
}

async function nodeSubmit(match: MatchRecord): Promise<MatchRecord> {
  const response = await fetch('http://localhost/api/matches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(match),
  });
  const body = await response.json() as MatchRecord;
  if (!response.ok) throw Object.assign(new Error('Submission unavailable.'), { retryable: response.status >= 500 });
  return body;
}

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  reset();
  resetOutbox();
});
afterAll(() => server.close());

describe('ranking and history rules', () => {
  it('paginates the deterministic default fixtures', () => {
    const page = buildRanking(allRecords(), {
      page: 3,
      pageSize: 5,
      ...config,
    });

    expect(page.items).toHaveLength(5);
    expect(page.totalPages).toBeGreaterThan(5);
  });

  it('generates stable multi-page fixtures for every requested config', () => {
    const firstConfig = { sessionDurationSeconds: 60, enemySpawnIntervalSeconds: 2 };
    const secondConfig = { sessionDurationSeconds: 180, enemySpawnIntervalSeconds: 8 };
    const first = buildRanking(allRecords(false, firstConfig), { page: 1, pageSize: 5, ...firstConfig });
    const second = buildRanking(allRecords(false, secondConfig), { page: 1, pageSize: 5, ...secondConfig });
    expect(first.totalPages).toBeGreaterThan(1);
    expect(second.totalPages).toBeGreaterThan(1);
    expect(buildRanking(allRecords(false, firstConfig), { page: 1, pageSize: 5, ...firstConfig }).items)
      .toEqual(first.items);
  });

  it('compares only records with the same config', () => {
    const records = [record({ matchId: 'same', score: 10 }), record({
      matchId: 'other-config',
      score: 100,
      config: { sessionDurationSeconds: 60, enemySpawnIntervalSeconds: 2 },
    })];
    const page = buildRanking(records, { page: 1, pageSize: 10, ...config });
    expect(page.items.map((item) => item.matchId)).toEqual(['same']);
  });

  it('uses deterministic score, duration, date, then ID tie-breaks', () => {
    const records = [
      record({ matchId: 'b', durationSeconds: 80 }),
      record({ matchId: 'a', durationSeconds: 80 }),
      record({ matchId: 'c', durationSeconds: 70 }),
    ];
    expect(buildRanking(records, { page: 1, pageSize: 10, ...config }).items.map((item) => item.matchId))
      .toEqual(['c', 'a', 'b']);
  });
});

describe('match handlers', () => {
  it('serves the first ranking page through the node server', async () => {
    setScenario('success');
    const response = await fetch('http://localhost/api/ranking?page=1&pageSize=5');
    expect(response.status).toBe(200);
    const body = await response.json() as { items: MatchRecord[] };
    expect(body.items).toHaveLength(5);
  });

  describe('Part 6B outbox behavior', () => {
    it('submits once, invalidates both query families, and appears in both lists once', async () => {
      const match = record({ matchId: 'outbox-success' });
      const client = new QueryClient();
      client.setQueryData(queryKeys.ranking({ page: 1, pageSize: 5, ...config }), []);
      client.setQueryData(queryKeys.history({ playerId: match.playerId, page: 1, pageSize: 5 }), []);
      enqueueMatch(match);
      await flushOutbox(client, nodeSubmit);
      expect(client.getQueryState(queryKeys.ranking({ page: 1, pageSize: 5, ...config }))?.isInvalidated).toBe(true);
      expect(client.getQueryState(queryKeys.history({ playerId: match.playerId, page: 1, pageSize: 5 }))?.isInvalidated).toBe(true);
      const ranking = await fetch(`http://localhost/api/ranking?page=1&pageSize=100&sessionDurationSeconds=${config.sessionDurationSeconds}&enemySpawnIntervalSeconds=${config.enemySpawnIntervalSeconds}`).then((response) => response.json()) as { items: MatchRecord[] };
      const history = await fetch(`http://localhost/api/history?playerId=${match.playerId}&page=1&pageSize=100`).then((response) => response.json()) as { items: MatchRecord[] };
      expect(ranking.items.filter((item) => item.matchId === match.matchId)).toHaveLength(1);
      expect(history.items.filter((item) => item.matchId === match.matchId)).toHaveLength(1);
      client.clear();
    });

    it('recovers timeout-after-save through the outbox without duplication', async () => {
      setScenario('timeout-after-save');
      const match = record({ matchId: 'outbox-timeout' });
      enqueueMatch(match);
      await flushOutbox(undefined, nodeSubmit);
      expect(pendingSubmissions()).toHaveLength(1);
      setScenario('success');
      await flushOutbox(undefined, nodeSubmit);
      expect(pendingSubmissions()).toHaveLength(0);
      expect(allRecords().filter((item) => item.matchId === match.matchId)).toHaveLength(1);
    });

    it('keeps unavailable submissions pending and flushes after recovery', async () => {
      setScenario('submit-unavailable-then-recovers');
      const match = record({ matchId: 'outbox-recovery' });
      enqueueMatch(match);
      await flushOutbox(undefined, nodeSubmit);
      expect(pendingSubmissions()).toHaveLength(1);
      await flushOutbox(undefined, nodeSubmit);
      expect(pendingSubmissions()).toHaveLength(1);
      await flushOutbox(undefined, nodeSubmit);
      expect(pendingSubmissions()).toHaveLength(0);
    });

    it('rehydrates pending submissions after a simulated reload', () => {
      const storage = new Map<string, string>();
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: {
          getItem: (key: string) => storage.get(key) ?? null,
          setItem: (key: string, value: string) => storage.set(key, value),
          removeItem: (key: string) => storage.delete(key),
        },
      });
      const match = record({ matchId: 'outbox-reload' });
      enqueueMatch(match);
      rehydrateOutbox();
      expect(pendingSubmissions().map((entry) => entry.record.matchId)).toEqual(['outbox-reload']);
    });

    it('does not queue an abandoned match', () => {
      expect(pendingSubmissions()).toHaveLength(0);
    });

    it('keeps page one and page two data isolated for stale responses', async () => {
      const pageOne = new Promise<string[]>((resolve) => setTimeout(() => resolve(['page-one']), 30));
      const pageTwo = Promise.resolve(['page-two']);
      const client = new QueryClient();
      await client.fetchQuery({ queryKey: ['ranking', 2, 5, 120, 4], queryFn: () => pageTwo });
      await client.fetchQuery({ queryKey: ['ranking', 1, 5, 120, 4], queryFn: () => pageOne });
      expect(client.getQueryData(['ranking', 2, 5, 120, 4])).toEqual(['page-two']);
      expect(client.getQueryData(['ranking', 1, 5, 120, 4])).toEqual(['page-one']);
      client.clear();
    });
  });

  it('stores a POST idempotently and exposes one record in ranking and history', async () => {
    const match = record();
    const first = await fetch('http://localhost/api/matches', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(match) });
    const second = await fetch('http://localhost/api/matches', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(match) });
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);

    const ranking = await fetch(`http://localhost/api/ranking?page=1&pageSize=100&sessionDurationSeconds=${config.sessionDurationSeconds}&enemySpawnIntervalSeconds=${config.enemySpawnIntervalSeconds}`);
    const rankingBody = await ranking.json() as { items: MatchRecord[] };
    expect(rankingBody.items.filter((item) => item.matchId === match.matchId)).toHaveLength(1);
    const history = await fetch(`http://localhost/api/history?playerId=${match.playerId}&page=1&pageSize=100`);
    const historyBody = await history.json() as { items: MatchRecord[] };
    expect(historyBody.items.filter((item) => item.matchId === match.matchId)).toHaveLength(1);
  });

  it('returns 409 for a conflicting payload', async () => {
    const match = record();
    await fetch('http://localhost/api/matches', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(match) });
    const response = await fetch('http://localhost/api/matches', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...match, score: 99 }) });
    expect(response.status).toBe(409);
  });

  it('persists before timeout and returns the existing record on retry', async () => {
    setScenario('timeout-after-save');
    const match = record({ matchId: 'timeout-match' });
    const controller = new AbortController();
    const request = fetch('http://localhost/api/matches', { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(match) });
    await new Promise((resolve) => setTimeout(resolve, 50));
    controller.abort();
    await expect(request).rejects.toBeTruthy();
    const retry = await fetch('http://localhost/api/matches', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(match) });
    expect(retry.status).toBe(200);
    expect(allRecords().filter((item) => item.matchId === match.matchId)).toHaveLength(1);
  });

  it('reset clears confirmed records while retaining fixtures', async () => {
    const match = record({ matchId: 'reset-match' });
    await fetch('http://localhost/api/matches', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(match) });
    reset();
    expect(allRecords().some((item) => item.matchId === match.matchId)).toBe(false);
    expect(allRecords().length).toBeGreaterThan(0);
    resetDatabase();
  });
});
