import type { GameConfig } from '../config';
import type { Island, MatchState, PlayerShip } from './types';

export function createMatch(config: GameConfig, seed: number): MatchState {
  const player: PlayerShip = {
    id: 'player',
    position: { x: config.arena.width / 2, y: config.arena.height / 2 },
    rotation: 0,
    health: config.player.health,
    maxHealth: config.player.health,
    radius: config.radii.player,
    frontCooldownSeconds: 0,
    leftCooldownSeconds: 0,
    rightCooldownSeconds: 0,
  };
  const islands: Island[] = config.islands.map((island) => ({
    id: island.id,
    position: { x: island.x, y: island.y },
    radius: island.radius,
  }));

  return {
    status: 'running',
    elapsedSeconds: 0,
    score: 0,
    player,
    enemies: [],
    projectiles: [],
    islands,
    nextEntityId: 1,
    spawnTimerSeconds: config.enemySpawnIntervalSeconds,
    spawnCount: 0,
    spawnedChaser: false,
    spawnedShooter: false,
    rngState: seed >>> 0,
  };
}