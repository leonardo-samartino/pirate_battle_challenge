// World units are logical pixels. The y axis grows downward as it does in Pixi.
// Rotations are radians: 0 faces +x and positive rotation is clockwise on screen.
// Direction vectors are unit vectors.

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

export interface PlayerShip extends Ship {
  frontCooldownSeconds: number;
  leftCooldownSeconds: number;
  rightCooldownSeconds: number;
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
  ownerId: string;
  position: Vector2;
  direction: Vector2;
  speed: number;
  damage: number;
  radius: number;
  distanceTravelled: number;
  ageSeconds: number;
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
  player: PlayerShip;
  enemies: Enemy[];
  projectiles: Projectile[];
  islands: Island[];
  nextEntityId: number;
  spawnTimerSeconds: number;
  rngState: number;
}

export type SimEvent =
  | { type: 'shotFired'; projectile: Projectile }
  | { type: 'hit'; targetId: string; damage: number; sourceId?: string; position: Vector2 }
  | {
      type: 'shipDestroyed';
      shipId: string;
      owner: ProjectileOwner | 'collision';
      position: Vector2;
    }
  | { type: 'matchEnded'; reason: EndReason };