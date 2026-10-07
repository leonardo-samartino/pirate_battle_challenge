import type { MatchStatus } from './sim/types';

export interface HudSnapshot {
  score: number;
  remainingSeconds: number;
  playerHealth: number;
  status: MatchStatus;
}

const EMPTY_SNAPSHOT: HudSnapshot = {
  score: 0,
  remainingSeconds: 0,
  playerHealth: 0,
  status: 'running',
};

let snapshot = EMPTY_SNAPSHOT;
const listeners = new Set<() => void>();

export const hudStore = {
  getSnapshot(): HudSnapshot {
    return snapshot;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  publish(next: HudSnapshot): void {
    if (
      snapshot.score === next.score
      && snapshot.remainingSeconds === next.remainingSeconds
      && snapshot.playerHealth === next.playerHealth
      && snapshot.status === next.status
    ) return;
    snapshot = next;
    listeners.forEach((listener) => listener());
  },
};

export function resetHudStore(): void {
  hudStore.publish(EMPTY_SNAPSHOT);
}

export function publishHudState(
  state: {
    score: number;
    elapsedSeconds: number;
    player: { health: number };
    status: HudSnapshot['status'];
  },
  durationSeconds: number,
): void {
  hudStore.publish({
    score: state.score,
    remainingSeconds: Math.max(0, durationSeconds - state.elapsedSeconds),
    playerHealth: state.player.health,
    status: state.status,
  });
}
