import type { GameConfig } from '../game/config';
import type { MatchState } from '../game/sim/types';

const MAX_SAMPLES = 20_000;

interface PerfReport {
  frames: number;
  avgFps: number;
  p95FrameTimeMs: number;
  p99FrameTimeMs: number;
  framesOver16_7Ms: number;
  maxEntities: number;
  avgEntities: number;
  userAgent: string;
  viewport: { width: number; height: number };
  devicePixelRatio: number;
  matchConfig?: {
    sessionDurationSeconds: number;
    enemySpawnIntervalSeconds: number;
  };
}

interface PerfController {
  reset: () => void;
  report: () => PerfReport;
}

const frameTimes = new Float64Array(MAX_SAMPLES);
const entityCounts = new Uint32Array(MAX_SAMPLES);
let sampleCount = 0;
let config: PerfReport['matchConfig'];
let enabled = false;

function percentile(values: Float64Array, count: number, fraction: number): number {
  if (count === 0) return 0;
  const sorted = Array.from(values.subarray(0, count)).sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)] ?? 0;
}

function reset(): void {
  sampleCount = 0;
  config = undefined;
}

function report(): PerfReport {
  const totalFrameTime = frameTimes.subarray(0, sampleCount).reduce((sum, value) => sum + value, 0);
  const averageFrameTime = sampleCount > 0 ? totalFrameTime / sampleCount : 0;
  const totalEntities = entityCounts.subarray(0, sampleCount).reduce((sum, value) => sum + value, 0);
  return {
    frames: sampleCount,
    avgFps: averageFrameTime > 0 ? 1000 / averageFrameTime : 0,
    p95FrameTimeMs: percentile(frameTimes, sampleCount, 0.95),
    p99FrameTimeMs: percentile(frameTimes, sampleCount, 0.99),
    framesOver16_7Ms: frameTimes.subarray(0, sampleCount).filter((value) => value > 16.7).length,
    maxEntities: sampleCount > 0 ? Math.max(...entityCounts.subarray(0, sampleCount)) : 0,
    avgEntities: sampleCount > 0 ? totalEntities / sampleCount : 0,
    userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent,
    viewport: {
      width: typeof window === 'undefined' ? 0 : window.innerWidth,
      height: typeof window === 'undefined' ? 0 : window.innerHeight,
    },
    devicePixelRatio: typeof window === 'undefined' ? 1 : window.devicePixelRatio,
    matchConfig: config,
  };
}

export function initializePerfProbe(): void {
  if (typeof window === 'undefined') return;
  enabled = new URLSearchParams(window.location.search).get('perf') === '1';
  if (!enabled) return;
  const controller: PerfController = { reset, report };
  window.__PIRATE_PERF__ = controller;
}

export function recordPerfFrame(deltaMs: number, state: MatchState, gameConfig: GameConfig): void {
  if (!enabled || sampleCount >= MAX_SAMPLES) return;
  frameTimes[sampleCount] = Math.max(0, deltaMs);
  entityCounts[sampleCount] = state.enemies.length + state.projectiles.length + state.islands.length + 1;
  sampleCount += 1;
  config = {
    sessionDurationSeconds: gameConfig.sessionDurationSeconds,
    enemySpawnIntervalSeconds: gameConfig.enemySpawnIntervalSeconds,
  };
}

declare global {
  interface Window {
    __PIRATE_PERF__?: PerfController;
  }
}
