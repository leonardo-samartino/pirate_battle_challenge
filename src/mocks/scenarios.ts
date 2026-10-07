export const SCENARIOS = [
  'success',
  'empty',
  'multiple-pages',
  'slow',
  'variable-latency',
  'out-of-order',
  'timeout',
  'network-error',
  'http-4xx',
  'http-5xx',
  'ranking-fails',
  'history-fails',
  'timeout-after-save',
  'submit-unavailable-then-recovers',
] as const;

export type ScenarioName = typeof SCENARIOS[number];

let scenario: ScenarioName = 'success';
let seed = 1;
let latencyEnabled = true;
const endpointCounts = new Map<string, number>();
const submittedAttempts = new Map<string, number>();

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function seededRandom(): number {
  seed = (seed + 0x6d2b79f5) | 0;
  let value = Math.imul(seed ^ (seed >>> 15), seed | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

export function configureFromUrl(): void {
  const params = new URLSearchParams(window.location.search);
  const urlScenario = params.get('scenario');
  const storedScenario = readStorage('pirate-battle:scenario:v1');
  setScenario(SCENARIOS.includes(urlScenario as ScenarioName)
    ? urlScenario as ScenarioName
    : SCENARIOS.includes(storedScenario as ScenarioName) ? storedScenario as ScenarioName : 'success');
  const urlSeed = Number(params.get('seed'));
  seed = Number.isFinite(urlSeed) ? urlSeed : 1;
  latencyEnabled = params.get('latency') !== 'off';
}

export function setScenario(next: ScenarioName): void {
  scenario = next;
  endpointCounts.clear();
  submittedAttempts.clear();
  try {
    localStorage.setItem('pirate-battle:scenario:v1', next);
  } catch {
    // Runtime scenario selection remains available without storage.
  }
}

export function getScenario(): ScenarioName {
  return scenario;
}

export function resetScenarioState(): void {
  scenario = 'success';
  seed = 1;
  latencyEnabled = true;
  endpointCounts.clear();
  submittedAttempts.clear();
  try {
    localStorage.removeItem('pirate-battle:scenario:v1');
  } catch {
    // Best effort.
  }
}

export function reset(): void {
  resetScenarioState();
  resetDatabase();
}

export function nextAttempt(key: string): number {
  const attempt = (endpointCounts.get(key) ?? 0) + 1;
  endpointCounts.set(key, attempt);
  return attempt;
}

export function submitAttempt(matchId: string): number {
  const attempt = (submittedAttempts.get(matchId) ?? 0) + 1;
  submittedAttempts.set(matchId, attempt);
  return attempt;
}

export function responseDelay(endpoint: string): number {
  if (!latencyEnabled) return 0;
  if (scenario === 'slow') return 2000;
  if (scenario === 'variable-latency') return 250 + Math.floor(seededRandom() * 750);
  if (scenario === 'out-of-order') {
    const attempt = endpointCounts.get(endpoint) ?? 1;
    return attempt === 1 ? 800 : 100;
  }
  return 0;
}

export function isLatencyEnabled(): boolean {
  return latencyEnabled;
}
import { resetDatabase } from './db';
