import type { Simulation } from '../game/sim/Simulation';
import type { MatchState } from '../game/sim/types';
import { hudStore } from '../game/hudStore';

interface E2EController {
  seed?: number;
  advance: (milliseconds: number) => void;
  getState: () => unknown;
  getHud: () => unknown;
}

interface RendererBridge {
  simulation: Simulation;
  render: () => void;
}

let enabled = false;
let manualClock = false;
let bridge: RendererBridge | undefined;

function copyState(state: MatchState): unknown {
  return {
    status: state.status,
    elapsedSeconds: state.elapsedSeconds,
    score: state.score,
    player: {
      position: { ...state.player.position },
      rotation: state.player.rotation,
      health: state.player.health,
      cooldowns: {
        front: state.player.frontCooldownSeconds,
        left: state.player.leftCooldownSeconds,
        right: state.player.rightCooldownSeconds,
      },
    },
    enemies: state.enemies.map((enemy) => ({
      id: enemy.id,
      type: enemy.type,
      position: { ...enemy.position },
      health: enemy.health,
    })),
    projectiles: {
      count: state.projectiles.length,
      owners: state.projectiles.map((projectile) => projectile.owner),
    },
    islands: state.islands.map((island) => ({ id: island.id, position: { ...island.position }, radius: island.radius })),
    endReason: state.endReason,
    spawnTimerSeconds: state.spawnTimerSeconds,
    spawnCount: state.spawnCount,
    spawnedChaser: state.spawnedChaser,
    spawnedShooter: state.spawnedShooter,
    pauseState: state.status === 'paused',
  };
}

export function initializeE2EHooks(): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  enabled = params.get('e2e') === '1';
  manualClock = enabled && params.get('clock') === 'manual';
  if (!enabled) return;
  const seedValue = Number(params.get('seed'));
  const seed = Number.isFinite(seedValue) ? seedValue : undefined;
  const controller: E2EController = {
    seed,
    advance: (milliseconds) => {
      if (!manualClock || !bridge) return;
      let remaining = Math.max(0, milliseconds);
      while (remaining > 0) {
        const step = Math.min(100, remaining);
        bridge.simulation.update(step);
        remaining -= step;
      }
      bridge.render();
    },
    getState: () => (bridge ? copyState(bridge.simulation.getState()) : undefined),
    getHud: () => ({ ...hudStore.getSnapshot() }),
  };
  window.__PIRATE_E2E__ = controller;
  document.documentElement.dataset.e2e = 'true';
}

export function getE2ESeed(): number | undefined {
  return enabled ? window.__PIRATE_E2E__?.seed : undefined;
}

export function isE2EManualClock(): boolean {
  return manualClock;
}

export function registerE2EBridge(next: RendererBridge): void {
  if (enabled) bridge = next;
}

export function unregisterE2EBridge(simulation: Simulation): void {
  if (bridge?.simulation === simulation) bridge = undefined;
}

declare global {
  interface Window {
    __PIRATE_E2E__?: E2EController;
  }
}
