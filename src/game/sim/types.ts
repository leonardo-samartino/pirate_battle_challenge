export interface Vector2 {
  x: number;
  y: number;
}

export interface Ship {
  id: string;
  position: Vector2;
  rotation: number;
  health: number;
  maxHealth: number;
  radius: number;
}

export type EnemyType = 'chaser' | 'shooter';

export interface Enemy extends Ship {
  type: EnemyType;
  attackCooldownSeconds: number;
}

export type ProjectileOwner = 'player' | 'enemy';

export interface Projectile {
  id: string;
  owner: ProjectileOwner;
  position: Vector2;
  direction: Vector2;
  speed: number;
  damage: number;
  distanceTravelled: number;
  lifetimeSeconds: number;
}

export interface Island {
  id: string;
  position: Vector2;
  radius: number;
}

export type MatchStatus = 'running' | 'paused' | 'ended';
export type EndReason = 'time' | 'death';

export interface InputCommands {
  forward: boolean;
  rotateLeft: boolean;
  rotateRight: boolean;
  fireFront: boolean;
  fireLeft: boolean;
  fireRight: boolean;
}

export interface MatchState {
  status: MatchStatus;
  endReason?: EndReason;
  elapsedSeconds: number;
  score: number;
  player: Ship;
  enemies: Enemy[];
  projectiles: Projectile[];
  islands: Island[];
}

export type SimEvent =
  | { type: 'shotFired'; projectile: Projectile }
  | { type: 'hit'; targetId: string; damage: number; sourceId?: string }
  | { type: 'shipDestroyed'; shipId: string; owner: ProjectileOwner | 'collision' }
  | { type: 'matchEnded'; reason: EndReason };