export const SESSION_DURATION_RANGE = Object.freeze({ min: 60, max: 180 });

// Spawn intervals are active-game seconds and intentionally stay within 0.5-30 seconds.
export const SPAWN_INTERVAL_RANGE = Object.freeze({ min: 0.5, max: 30 });

export interface GameOptions {
  sessionDurationSeconds: number;
  enemySpawnIntervalSeconds: number;
}

export interface SpawnDistribution {
  readonly chaserWeight: number;
  readonly shooterWeight: number;
}

export interface IslandConfig {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

export interface GameConfig {
  readonly sessionDurationSeconds: number;
  readonly enemySpawnIntervalSeconds: number;
  readonly arena: { readonly width: number; readonly height: number };
  readonly islands: readonly IslandConfig[];
  readonly radii: {
    readonly player: number;
    readonly chaser: number;
    readonly shooter: number;
    readonly projectile: number;
  };
  readonly spawn: {
    readonly minDistanceFromPlayer: number;
    readonly minDistanceFromIslandMargin: number;
    readonly guaranteeBothTypesBySpawnIndex: number;
  };
  readonly spawnDistribution: SpawnDistribution;
  readonly player: {
    readonly health: number;
    readonly moveSpeed: number;
    readonly rotationSpeed: number;
  };
  readonly enemy: {
    readonly chaserHealth: number;
    readonly shooterHealth: number;
    readonly chaserMoveSpeed: number;
    readonly shooterMoveSpeed: number;
    readonly chaserRotationSpeed: number;
    readonly shooterRotationSpeed: number;
    readonly shooterCooldownSeconds: number;
    readonly shooterPreferredDistance: number;
  };
  readonly damage: {
    readonly playerProjectile: number;
    readonly enemyProjectile: number;
    readonly chaserCollision: number;
  };
  readonly projectile: {
    readonly speed: number;
    readonly range: number;
    readonly lifetimeSeconds: number;
  };
  readonly weaponCooldown: {
    readonly frontSeconds: number;
    readonly sideSeconds: number;
  };
  readonly weapon: { readonly sideSpacing: number };
  readonly shooterAttackRange: number;
}

type BalanceConfig = Omit<
  GameConfig,
  'sessionDurationSeconds' | 'enemySpawnIntervalSeconds'
>;

const DEFAULT_BALANCE: BalanceConfig = {
  arena: { width: 1280, height: 720 },
  islands: [
    { id: 'island-1', x: 280, y: 180, radius: 70 },
    { id: 'island-2', x: 1000, y: 540, radius: 85 },
  ],
  radii: { player: 24, chaser: 22, shooter: 24, projectile: 5 },
  spawn: {
    minDistanceFromPlayer: 260,
    minDistanceFromIslandMargin: 30,
    guaranteeBothTypesBySpawnIndex: 3,
  },
  spawnDistribution: { chaserWeight: 3, shooterWeight: 1 },
  player: { health: 100, moveSpeed: 180, rotationSpeed: 3.2 },
  enemy: {
    chaserHealth: 30,
    shooterHealth: 45,
    chaserMoveSpeed: 85,
    shooterMoveSpeed: 55,
    chaserRotationSpeed: 2.4,
    shooterRotationSpeed: 2,
    shooterCooldownSeconds: 1.5,
    shooterPreferredDistance: 300,
  },
  damage: { playerProjectile: 10, enemyProjectile: 8, chaserCollision: 25 },
  projectile: { speed: 360, range: 520, lifetimeSeconds: 2 },
  weaponCooldown: { frontSeconds: 0.35, sideSeconds: 0.8 },
  weapon: { sideSpacing: 18 },
  shooterAttackRange: 420,
};

export const DEFAULT_GAME_OPTIONS: GameOptions = Object.freeze({
  sessionDurationSeconds: 120,
  enemySpawnIntervalSeconds: 4,
});

export function createGameConfigSnapshot(
  options: GameOptions = DEFAULT_GAME_OPTIONS,
): GameConfig {
  if (
    !Number.isInteger(options.sessionDurationSeconds) ||
    options.sessionDurationSeconds < SESSION_DURATION_RANGE.min ||
    options.sessionDurationSeconds > SESSION_DURATION_RANGE.max
  ) {
    throw new RangeError(
      `sessionDurationSeconds must be an integer from ${SESSION_DURATION_RANGE.min} to ${SESSION_DURATION_RANGE.max}.`,
    );
  }

  if (
    !Number.isFinite(options.enemySpawnIntervalSeconds) ||
    options.enemySpawnIntervalSeconds < SPAWN_INTERVAL_RANGE.min ||
    options.enemySpawnIntervalSeconds > SPAWN_INTERVAL_RANGE.max
  ) {
    throw new RangeError(
      `enemySpawnIntervalSeconds must be from ${SPAWN_INTERVAL_RANGE.min} to ${SPAWN_INTERVAL_RANGE.max}.`,
    );
  }

  return Object.freeze({
    ...DEFAULT_BALANCE,
    sessionDurationSeconds: options.sessionDurationSeconds,
    enemySpawnIntervalSeconds: options.enemySpawnIntervalSeconds,
    arena: Object.freeze({ ...DEFAULT_BALANCE.arena }),
    islands: Object.freeze(
      DEFAULT_BALANCE.islands.map((island) => Object.freeze({ ...island })),
    ),
    radii: Object.freeze({ ...DEFAULT_BALANCE.radii }),
    spawn: Object.freeze({ ...DEFAULT_BALANCE.spawn }),
    spawnDistribution: Object.freeze({ ...DEFAULT_BALANCE.spawnDistribution }),
    player: Object.freeze({ ...DEFAULT_BALANCE.player }),
    enemy: Object.freeze({ ...DEFAULT_BALANCE.enemy }),
    damage: Object.freeze({ ...DEFAULT_BALANCE.damage }),
    projectile: Object.freeze({ ...DEFAULT_BALANCE.projectile }),
    weaponCooldown: Object.freeze({ ...DEFAULT_BALANCE.weaponCooldown }),
    weapon: Object.freeze({ ...DEFAULT_BALANCE.weapon }),
  });
}