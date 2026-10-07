import { describe, expect, it } from 'vitest';
import { createGameConfigSnapshot } from '../config';
import { createMatch } from './createMatch';
import { Simulation } from './Simulation';
import { step } from './step';
import type { InputCommands, Projectile } from './types';

const input = (overrides: Partial<InputCommands> = {}): InputCommands => ({
  forward: false,
  rotateLeft: false,
  rotateRight: false,
  fireFront: false,
  fireLeft: false,
  fireRight: false,
  ...overrides,
});

describe('simulation core', () => {
  const config = createGameConfigSnapshot();

  it('blocks the player at an island', () => {
    const state = createMatch(config, 1);
    state.islands = [{ id: 'test-island', position: { x: state.player.position.x + 30, y: state.player.position.y }, radius: 20 }];
    step(state, config, input({ forward: true }), 1 / 60, []);
    expect(state.player.position.x).toBe(config.arena.width / 2);
  });

  it('prevents a second front shot during cooldown', () => {
    const state = createMatch(config, 1);
    const events = [] as Parameters<typeof step>[4];
    step(state, config, input({ fireFront: true }), 1 / 60, events);
    step(state, config, input({ fireFront: true }), 1 / 60, events);
    expect(state.projectiles).toHaveLength(1);
  });

  it('damages a target once per projectile', () => {
    const state = createMatch(config, 1);
    state.enemies.push({ id: 'enemy-1', position: { x: state.player.position.x + 100, y: state.player.position.y }, rotation: 0, health: 20, maxHealth: 20, radius: 20, type: 'chaser', attackCooldownSeconds: 0 });
    const events = [] as Parameters<typeof step>[4];
    step(state, config, input({ fireFront: true }), 1 / 60, events);
    for (let index = 0; index < 20; index += 1) step(state, config, input(), 1 / 60, events);
    expect(state.enemies[0].health).toBe(10);
    expect(state.projectiles).toHaveLength(0);
  });

  it('freezes while paused and discards accumulated time on resume', () => {
    const simulation = new Simulation(config, 1);
    simulation.setInput(input({ forward: true }));
    simulation.update(16);
    const elapsedBeforePause = simulation.getState().elapsedSeconds;
    simulation.pause();
    simulation.update(100);
    expect(simulation.getState().elapsedSeconds).toBe(elapsedBeforePause);
    simulation.resume();
    simulation.update(1);
    expect(simulation.getState().elapsedSeconds).toBe(elapsedBeforePause);
  });

  it('removes a colliding chaser without awarding score', () => {
    const state = createMatch(config, 1);
    state.enemies.push({
      id: 'chaser-1',
      position: { ...state.player.position },
      rotation: 0,
      health: 20,
      maxHealth: 20,
      radius: config.radii.chaser,
      type: 'chaser',
      attackCooldownSeconds: 0,
    });
    const events = [] as Parameters<typeof step>[4];

    step(state, config, input(), 1 / 60, events);

    expect(state.enemies).toHaveLength(0);
    expect(state.score).toBe(0);
    expect(events).toContainEqual(expect.objectContaining({
      type: 'shipDestroyed',
      shipId: 'chaser-1',
      owner: 'collision',
    }));
  });

  it('fires shooters only in range and respects cooldown', () => {
    const state = createMatch(config, 1);
    state.enemies.push({
      id: 'shooter-1',
      position: { x: state.player.position.x + config.shooterAttackRange + 50, y: state.player.position.y },
      rotation: Math.PI,
      health: 20,
      maxHealth: 20,
      radius: config.radii.shooter,
      type: 'shooter',
      attackCooldownSeconds: 0,
    });
    const events = [] as Parameters<typeof step>[4];

    step(state, config, input(), 1 / 60, events);
    expect(state.projectiles).toHaveLength(0);

    state.enemies[0].position.x = state.player.position.x + config.shooterAttackRange - 1;
    step(state, config, input(), 1 / 60, events);
    expect(state.projectiles).toHaveLength(1);
    step(state, config, input(), 1 / 60, events);
    expect(state.projectiles).toHaveLength(1);
  });

  it('awards exactly one point when a player projectile destroys an enemy', () => {
    const state = createMatch(config, 1);
    state.enemies.push({
      id: 'enemy-1',
      position: { x: state.player.position.x + 20, y: state.player.position.y },
      rotation: 0,
      health: 10,
      maxHealth: 10,
      radius: config.radii.shooter,
      type: 'shooter',
      attackCooldownSeconds: 0,
    });
    const projectile: Projectile = {
      id: 'projectile-test',
      owner: 'player',
      ownerId: state.player.id,
      position: { ...state.player.position },
      direction: { x: 1, y: 0 },
      speed: config.projectile.speed,
      damage: 10,
      radius: config.radii.projectile,
      distanceTravelled: 0,
      ageSeconds: 0,
    };
    state.projectiles.push(projectile);

    step(state, config, input(), 1 / 60, []);
    expect(state.score).toBe(1);
    expect(state.enemies).toHaveLength(0);
  });

  it('produces valid spawn positions for many seeds', () => {
    const spawnConfig = createGameConfigSnapshot({
      sessionDurationSeconds: 120,
      enemySpawnIntervalSeconds: 0.5,
    });
    for (let seed = 0; seed < 200; seed += 1) {
      const state = createMatch(spawnConfig, seed);
      step(state, spawnConfig, input(), 0.5, []);
      expect(state.enemies).toHaveLength(1);
      const enemy = state.enemies[0];
      expect(enemy.position.x - enemy.radius).toBeGreaterThanOrEqual(0);
      expect(enemy.position.x + enemy.radius).toBeLessThanOrEqual(spawnConfig.arena.width);
      expect(enemy.position.y - enemy.radius).toBeGreaterThanOrEqual(0);
      expect(enemy.position.y + enemy.radius).toBeLessThanOrEqual(spawnConfig.arena.height);
      expect(Math.hypot(
        enemy.position.x - state.player.position.x,
        enemy.position.y - state.player.position.y,
      )).toBeGreaterThanOrEqual(spawnConfig.spawn.minDistanceFromPlayer);
      expect(spawnConfig.islands.some((island) => Math.hypot(
        enemy.position.x - island.x,
        enemy.position.y - island.y,
      ) < enemy.radius + island.radius + spawnConfig.spawn.minDistanceFromIslandMargin)).toBe(false);
    }
  });

  it('spawns both enemy types in every standard 60-second match', () => {
    const standardConfig = createGameConfigSnapshot({
      sessionDurationSeconds: 60,
      enemySpawnIntervalSeconds: 4,
    });
    for (let seed = 0; seed < 200; seed += 1) {
      const simulation = new Simulation(standardConfig, seed);
      for (let frame = 0; frame < 60 * 60; frame += 1) {
        simulation.update(1000 / 60);
      }

      expect(simulation.getState().spawnedChaser).toBe(true);
      expect(simulation.getState().spawnedShooter).toBe(true);
    }
  });

  it('is deterministic for the same seed and inputs', () => {
    const first = new Simulation(config, 9876);
    const second = new Simulation(config, 9876);
    const commands = input({ forward: true, rotateRight: true, fireFront: true });
    first.setInput(commands);
    second.setInput(commands);

    for (let frame = 0; frame < 600; frame += 1) {
      first.update(16);
      second.update(16);
    }

    expect(second.getState()).toEqual(first.getState());
  });

  it('freezes permanently after match end', () => {
    const shortConfig = createGameConfigSnapshot({
      sessionDurationSeconds: 60,
      enemySpawnIntervalSeconds: 0.5,
    });
    const state = createMatch(shortConfig, 1);
    state.elapsedSeconds = shortConfig.sessionDurationSeconds - 1 / 120;
    const events = [] as Parameters<typeof step>[4];

    step(state, shortConfig, input({ forward: true, fireFront: true }), 1 / 60, events);
    const endedState = structuredClone(state);
    const eventCount = events.length;
    step(state, shortConfig, input({ forward: true, fireFront: true }), 1, events);

    expect(state).toEqual(endedState);
    expect(events).toHaveLength(eventCount);
    expect(events).toContainEqual({ type: 'matchEnded', reason: 'time' });
  });

  it('restarts with a fresh deterministic state', () => {
    const simulation = new Simulation(config, 42);
    simulation.setInput(input({ forward: true, fireFront: true }));
    simulation.update(100);
    simulation.restart();

    expect(simulation.getState()).toEqual(createMatch(config, 42));
    expect(simulation.drainEvents()).toEqual([]);
  });
});