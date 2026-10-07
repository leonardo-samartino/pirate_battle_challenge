import { delay, http, HttpResponse } from 'msw';
import type { ApiErrorBody, HistoryQuery, MatchRecord, RankingQuery } from '../api/contracts';
import { allRecords, saveRecord } from './db';
import { buildHistory, buildRanking } from './rankingRules';
import {
  getScenario,
  isLatencyEnabled,
  nextAttempt,
  responseDelay,
  submitAttempt,
  type ScenarioName,
} from './scenarios';

function errorResponse(status: number, body: ApiErrorBody): HttpResponse<ApiErrorBody> {
  return HttpResponse.json(body, { status });
}

async function applyDelay(endpoint: string): Promise<void> {
  const scenario = getScenario();
  if (scenario === 'timeout') await delay('infinite');
  const ms = responseDelay(endpoint);
  if (ms > 0) await delay(ms);
}

function queryNumber(value: string | null, fallback: number): number {
  if (value === null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function scenarioFails(scenario: ScenarioName, endpoint: 'ranking' | 'history'): HttpResponse<ApiErrorBody> | undefined {
  if (scenario === 'network-error') return HttpResponse.error();
  if (scenario === 'http-4xx') return errorResponse(400, { code: 'bad-request', message: 'The request was rejected.' });
  if (scenario === 'http-5xx') return errorResponse(500, { code: 'server-error', message: 'The mock server failed.' });
  if (scenario === `${endpoint}-fails`) return errorResponse(503, { code: `${endpoint}-unavailable`, message: `${endpoint} is temporarily unavailable.` });
  return undefined;
}

function isMatchRecord(value: unknown): value is MatchRecord {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<MatchRecord>;
  const config = candidate.config;
  return typeof candidate.matchId === 'string'
    && typeof candidate.playerId === 'string'
    && typeof candidate.playerName === 'string'
    && typeof candidate.date === 'string'
    && !Number.isNaN(Date.parse(candidate.date))
    && Number.isFinite(candidate.score)
    && Number.isFinite(candidate.durationSeconds)
    && (candidate.endReason === 'time' || candidate.endReason === 'death')
    && !!config
    && Number.isFinite(config.sessionDurationSeconds)
    && Number.isFinite(config.enemySpawnIntervalSeconds);
}

export const handlers = [
  http.get('*/api/ranking', async ({ request }) => {
    const endpoint = 'ranking';
    const scenario = getScenario();
    nextAttempt(endpoint);
    await applyDelay(endpoint);
    const failure = scenarioFails(scenario, 'ranking');
    if (failure) return failure;
    const url = new URL(request.url);
    const query: RankingQuery = {
      page: queryNumber(url.searchParams.get('page'), 1),
      pageSize: queryNumber(url.searchParams.get('pageSize'), 5),
      sessionDurationSeconds: queryNumber(url.searchParams.get('sessionDurationSeconds'), 120),
      enemySpawnIntervalSeconds: queryNumber(url.searchParams.get('enemySpawnIntervalSeconds'), 4),
    };
    return HttpResponse.json(buildRanking(allRecords(scenario === 'empty'), query));
  }),
  http.get('*/api/history', async ({ request }) => {
    const endpoint = 'history';
    const scenario = getScenario();
    nextAttempt(endpoint);
    await applyDelay(endpoint);
    const failure = scenarioFails(scenario, 'history');
    if (failure) return failure;
    const url = new URL(request.url);
    const query: HistoryQuery = {
      playerId: url.searchParams.get('playerId') ?? '',
      page: queryNumber(url.searchParams.get('page'), 1),
      pageSize: queryNumber(url.searchParams.get('pageSize'), 5),
    };
    return HttpResponse.json(buildHistory(allRecords(scenario === 'empty'), query));
  }),
  http.post('*/api/matches', async ({ request }) => {
    const scenario = getScenario();
    const body = await request.json().catch(() => undefined);
    if (!isMatchRecord(body)) return errorResponse(400, { code: 'invalid-body', message: 'The body must be a valid match record.' });
    const record = body as MatchRecord;
    const attempt = submitAttempt(record.matchId);
    if (scenario === 'timeout-after-save' && attempt === 1) {
      const result = saveRecord(record);
      if (result.error) return errorResponse(409, result.error);
      await delay('infinite');
    }
    if (scenario === 'submit-unavailable-then-recovers' && attempt <= 2) {
      return errorResponse(503, { code: 'submit-unavailable', message: 'Submission is temporarily unavailable.' });
    }
    if (scenario === 'timeout') await delay('infinite');
    if (scenario === 'network-error') return HttpResponse.error();
    if (scenario === 'http-4xx') return errorResponse(400, { code: 'bad-request', message: 'The request was rejected.' });
    if (scenario === 'http-5xx') return errorResponse(500, { code: 'server-error', message: 'The mock server failed.' });
    if (scenario === 'submit-unavailable-then-recovers' && !isLatencyEnabled()) {
      // Keep the recovery sequence deterministic when tests disable latency.
    }
    const result = saveRecord(record);
    if (result.error) return errorResponse(409, result.error);
    return HttpResponse.json(result.record, { status: result.status });
  }),
];
