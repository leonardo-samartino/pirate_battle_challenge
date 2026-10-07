import type { GameConfig } from '../config';
import { circleCircleIntersects, circleIntersectsIsland, clampCircleToArena } from './collision';
import type { InputCommands, MatchState, Projectile, Ship, SimEvent, Vector2 } from './types';

const ZERO_INPUT: InputCommands = {
  forward: false,
  rotateLeft: false,
  rotateRight: false,
  fireFront: false,
  fireLeft: false,
  fireRight: false,
};

function direction(rotation: number): Vector2 {
  return { x: Math.cos(rotation), y: Math.sin(rotation) };
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
      { x: player.position.x + heading.x * config.player.moveSpeed * dt, y: player.position.y + heading.y * config.player.moveSpeed * dt },
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

function damageShip(state: MatchState, ship: Ship, projectile: Projectile, events: SimEvent[]): void {
  ship.health = Math.max(0, ship.health - projectile.damage);
  events.push({ type: 'hit', targetId: ship.id, damage: projectile.damage, sourceId: projectile.ownerId, position: { ...ship.position } });
  if (ship.health > 0) return;

  events.push({ type: 'shipDestroyed', shipId: ship.id, owner: projectile.owner, position: { ...ship.position } });
  if (ship.id === state.player.id) {
    state.status = 'ended';
    state.endReason = 'death';
    events.push({ type: 'matchEnded', reason: 'death' });
  }
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
      damageShip(state, target, projectile, events);
      continue;
    }
    remaining.push(projectile);
  }
  state.projectiles = remaining;
  state.enemies = state.enemies.filter((enemy) => enemy.health > 0);
}

export function step(state: MatchState, config: GameConfig, input: InputCommands, dt: number, events: SimEvent[]): void {
  if (state.status !== 'running') return;

  updatePlayer(state, config, input, dt);
  if (input.fireFront) firePlayerWeapon(state, config, 'front', events);
  if (input.fireLeft) firePlayerWeapon(state, config, 'left', events);
  if (input.fireRight) firePlayerWeapon(state, config, 'right', events);
  updateProjectiles(state, config, dt, events);
  state.elapsedSeconds += dt;

  if (state.status === 'running' && state.elapsedSeconds >= config.sessionDurationSeconds) {
    state.status = 'ended';
    state.endReason = 'time';
    events.push({ type: 'matchEnded', reason: 'time' });
  }
}