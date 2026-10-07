import type { GameConfig } from '../config';
import { circleCircleIntersects, circleIntersectsIsland, clampCircleToArena } from './collision';
import { nextRandom } from './rng';
import type {
  Enemy,
  EnemyType,
  InputCommands,
  MatchState,
  Projectile,
  Ship,
  SimEvent,
  Vector2,
} from './types';

const ZERO_INPUT: InputCommands = {
  forward: false,
  rotateLeft: false,
  rotateRight: false,
  fireFront: false,
  fireLeft: false,
  fireRight: false,
};
const SPAWN_ATTEMPTS = 40;

function direction(rotation: number): Vector2 {
  return { x: Math.cos(rotation), y: Math.sin(rotation) };
}

function turnTowards(current: number, target: number, maxTurn: number): number {
  let difference = target - current;
  while (difference > Math.PI) difference -= Math.PI * 2;
  while (difference < -Math.PI) difference += Math.PI * 2;
  return current + Math.max(-maxTurn, Math.min(maxTurn, difference));
}

function createProjectile(
  state: MatchState,
  config: GameConfig,
  owner: 'player' | 'enemy',
  ownerId: string,
  position: Vector2,
  projectileDirection: Vector2,
  damage: number,
): Projectile {
  return {
    id: `projectile-${state.nextEntityId++}`,
    owner,
    ownerId,
    position: { ...position },
    direction: projectileDirection,
    speed: config.projectile.speed,
    damage,
    radius: config.radii.projectile,
    distanceTravelled: 0,
    ageSeconds: 0,
  };
}

function firePlayerWeapon(
  state: MatchState,
  config: GameConfig,
  side: 'front' | 'left' | 'right',
  events: SimEvent[],
): void {
  const player = state.player;
  const heading = direction(player.rotation);
  const perpendicular = side === 'left'
    ? { x: heading.y, y: -heading.x }
    : { x: -heading.y, y: heading.x };
  const isSideWeapon = side !== 'front';
  const projectileDirection = isSideWeapon ? perpendicular : heading;
  const offsets = isSideWeapon ? [-1, 0, 1] : [0];
  const cooldownKey = side === 'front'
    ? 'frontCooldownSeconds'
    : side === 'left' ? 'leftCooldownSeconds' : 'rightCooldownSeconds';

  if (player[cooldownKey] > 0) return;
  for (const offset of offsets) {
    const position = {
      x: player.position.x + heading.x * offset * config.weapon.sideSpacing,
      y: player.position.y + heading.y * offset * config.weapon.sideSpacing,
    };
    const projectile = createProjectile(
      state,
      config,
      'player',
      player.id,
      position,
      projectileDirection,
      config.damage.playerProjectile,
    );
    state.projectiles.push(projectile);
    events.push({ type: 'shotFired', projectile });
  }
  player[cooldownKey] = isSideWeapon
    ? config.weaponCooldown.sideSeconds
    : config.weaponCooldown.frontSeconds;
}

function updatePlayer(state: MatchState, config: GameConfig, input: InputCommands, dt: number): void {
  const player = state.player;
  const commands = input ?? ZERO_INPUT;
  const rotationDirection = (commands.rotateRight ? 1 : 0) - (commands.rotateLeft ? 1 : 0);
  player.rotation += rotationDirection * config.player.rotationSpeed * dt;

  if (commands.forward) {
    const heading = direction(player.rotation);
    const proposed = clampCircleToArena(
      {
        x: player.position.x + heading.x * config.player.moveSpeed * dt,
        y: player.position.y + heading.y * config.player.moveSpeed * dt,
      },
      player.radius,
      config.arena.width,
      config.arena.height,
    );
    if (!state.islands.some((island) => circleIntersectsIsland(proposed, player.radius, island))) {
      player.position = proposed;
    }
  }

  player.frontCooldownSeconds = Math.max(0, player.frontCooldownSeconds - dt);
  player.leftCooldownSeconds = Math.max(0, player.leftCooldownSeconds - dt);
  player.rightCooldownSeconds = Math.max(0, player.rightCooldownSeconds - dt);
}

function endMatch(state: MatchState, reason: 'time' | 'death', events: SimEvent[]): void {
  if (state.status !== 'running') return;
  state.status = 'ended';
  state.endReason = reason;
  events.push({ type: 'matchEnded', reason });
}

function damageShip(
  state: MatchState,
  ship: Ship,
  damage: number,
  owner: 'player' | 'enemy' | 'collision',
  sourceId: string | undefined,
  events: SimEvent[],
): void {
  if (ship.health <= 0) return;
  ship.health = Math.max(0, ship.health - damage);
  events.push({
    type: 'hit',
    targetId: ship.id,
    damage,
    ...(sourceId ? { sourceId } : {}),
    position: { ...ship.position },
  });
  if (ship.health > 0) return;

  events.push({ type: 'shipDestroyed', shipId: ship.id, owner, position: { ...ship.position } });
  if (ship.id === state.player.id) endMatch(state, 'death', events);
  else if (owner === 'player') state.score += 1;
}

function updateEnemies(state: MatchState, config: GameConfig, dt: number, events: SimEvent[]): void {
  const remaining: Enemy[] = [];
  for (const enemy of state.enemies) {
    if (state.status !== 'running') break;
    if (enemy.health <= 0) continue;
    const dx = state.player.position.x - enemy.position.x;
    const dy = state.player.position.y - enemy.position.y;
    const distance = Math.hypot(dx, dy);
    const targetRotation = Math.atan2(dy, dx);
    const rotationSpeed = enemy.type === 'chaser'
      ? config.enemy.chaserRotationSpeed
      : config.enemy.shooterRotationSpeed;
    enemy.rotation = turnTowards(enemy.rotation, targetRotation, rotationSpeed * dt);

    const shouldMove = enemy.type === 'chaser' || distance > config.enemy.shooterPreferredDistance;
    if (shouldMove && distance > 0) {
      const speed = enemy.type === 'chaser'
        ? config.enemy.chaserMoveSpeed
        : config.enemy.shooterMoveSpeed;
      const heading = direction(enemy.rotation);
      const proposed = clampCircleToArena(
        {
          x: enemy.position.x + heading.x * speed * dt,
          y: enemy.position.y + heading.y * speed * dt,
        },
        enemy.radius,
        config.arena.width,
        config.arena.height,
      );
      if (!state.islands.some((island) => circleIntersectsIsland(proposed, enemy.radius, island))) {
        enemy.position = proposed;
      }
    }

    if (enemy.type === 'chaser' && circleCircleIntersects(
      enemy.position,
      enemy.radius,
      state.player.position,
      state.player.radius,
    )) {
      damageShip(state, state.player, config.damage.chaserCollision, 'collision', enemy.id, events);
      events.push({ type: 'shipDestroyed', shipId: enemy.id, owner: 'collision', position: { ...enemy.position } });
      continue;
    }

    enemy.attackCooldownSeconds = Math.max(0, enemy.attackCooldownSeconds - dt);
    if (
      enemy.type === 'shooter'
      && distance <= config.shooterAttackRange
      && enemy.attackCooldownSeconds <= 0
    ) {
      const length = Math.hypot(dx, dy) || 1;
      const projectile = createProjectile(
        state,
        config,
        'enemy',
        enemy.id,
        enemy.position,
        { x: dx / length, y: dy / length },
        config.damage.enemyProjectile,
      );
      state.projectiles.push(projectile);
      events.push({ type: 'shotFired', projectile });
      enemy.attackCooldownSeconds = config.enemy.shooterCooldownSeconds;
    }
    remaining.push(enemy);
  }
  state.enemies = remaining;
}

function updateProjectiles(state: MatchState, config: GameConfig, dt: number, events: SimEvent[]): void {
  const remaining: Projectile[] = [];
  for (const projectile of state.projectiles) {
    projectile.position = {
      x: projectile.position.x + projectile.direction.x * projectile.speed * dt,
      y: projectile.position.y + projectile.direction.y * projectile.speed * dt,
    };
    projectile.distanceTravelled += projectile.speed * dt;
    projectile.ageSeconds += dt;

    const outsideArena = projectile.position.x < 0 || projectile.position.x > config.arena.width
      || projectile.position.y < 0 || projectile.position.y > config.arena.height;
    const expired = projectile.distanceTravelled >= config.projectile.range
      || projectile.ageSeconds >= config.projectile.lifetimeSeconds;
    const hitIsland = state.islands.some((island) => circleIntersectsIsland(projectile.position, projectile.radius, island));
    if (outsideArena || expired || hitIsland) continue;

    const targets: Ship[] = projectile.owner === 'player' ? state.enemies : [state.player];
    const target = targets.find((ship) => ship.id !== projectile.ownerId
      && ship.health > 0
      && circleCircleIntersects(projectile.position, projectile.radius, ship.position, ship.radius));
    if (target) {
      damageShip(state, target, projectile.damage, projectile.owner, projectile.ownerId, events);
      continue;
    }
    remaining.push(projectile);
  }
  state.projectiles = remaining;
  state.enemies = state.enemies.filter((enemy) => enemy.health > 0);
}

function chooseEnemyType(state: MatchState, config: GameConfig): EnemyType {
  if (
    state.spawnCount >= config.spawn.guaranteeBothTypesBySpawnIndex
    && !state.spawnedShooter
  ) {
    return 'shooter';
  }
  if (
    state.spawnCount >= config.spawn.guaranteeBothTypesBySpawnIndex
    && !state.spawnedChaser
  ) {
    return 'chaser';
  }
  const random = nextRandom(state.rngState);
  state.rngState = random.state;
  const totalWeight = config.spawnDistribution.chaserWeight + config.spawnDistribution.shooterWeight;
  return random.value * totalWeight < config.spawnDistribution.chaserWeight ? 'chaser' : 'shooter';
}

function spawnEnemy(state: MatchState, config: GameConfig): void {
  const type = chooseEnemyType(state, config);
  const radius = type === 'chaser' ? config.radii.chaser : config.radii.shooter;
  for (let attempt = 0; attempt < SPAWN_ATTEMPTS; attempt += 1) {
    const xRandom = nextRandom(state.rngState);
    state.rngState = xRandom.state;
    const yRandom = nextRandom(state.rngState);
    state.rngState = yRandom.state;
    const position = {
      x: radius + xRandom.value * (config.arena.width - radius * 2),
      y: radius + yRandom.value * (config.arena.height - radius * 2),
    };
    if (Math.hypot(position.x - state.player.position.x, position.y - state.player.position.y)
      < config.spawn.minDistanceFromPlayer) continue;
    if (state.islands.some((island) => Math.hypot(position.x - island.position.x, position.y - island.position.y)
      < radius + island.radius + config.spawn.minDistanceFromIslandMargin)) continue;
    if (state.enemies.some((enemy) => circleCircleIntersects(position, radius, enemy.position, enemy.radius))) continue;

    const enemy: Enemy = {
      id: `enemy-${state.nextEntityId++}`,
      position,
      rotation: 0,
      health: type === 'chaser' ? config.enemy.chaserHealth : config.enemy.shooterHealth,
      maxHealth: type === 'chaser' ? config.enemy.chaserHealth : config.enemy.shooterHealth,
      radius,
      type,
      attackCooldownSeconds: 0,
    };
    state.enemies.push(enemy);
    state.spawnCount += 1;
    state.spawnedChaser ||= type === 'chaser';
    state.spawnedShooter ||= type === 'shooter';
    return;
  }
}

function updateSpawner(state: MatchState, config: GameConfig, dt: number): void {
  state.spawnTimerSeconds -= dt;
  while (state.spawnTimerSeconds <= 0) {
    state.spawnTimerSeconds += config.enemySpawnIntervalSeconds;
    spawnEnemy(state, config);
  }
}

export function step(state: MatchState, config: GameConfig, input: InputCommands, dt: number, events: SimEvent[]): void {
  if (state.status !== 'running') return;

  const commands = input ?? ZERO_INPUT;
  updatePlayer(state, config, commands, dt);
  updateEnemies(state, config, dt, events);
  if (state.status !== 'running') return;
  if (commands.fireFront) firePlayerWeapon(state, config, 'front', events);
  if (commands.fireLeft) firePlayerWeapon(state, config, 'left', events);
  if (commands.fireRight) firePlayerWeapon(state, config, 'right', events);
  updateProjectiles(state, config, dt, events);
  if (state.status !== 'running') return;
  state.elapsedSeconds += dt;
  if (state.elapsedSeconds >= config.sessionDurationSeconds) {
    endMatch(state, 'time', events);
    return;
  }
  updateSpawner(state, config, dt);
}
