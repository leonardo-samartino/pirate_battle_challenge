import { describe, expect, it } from 'vitest';
import { createGameConfigSnapshot } from '../config';
import { createMatch } from './createMatch';
import { Simulation } from './Simulation';
import { step } from './step';
import type { InputCommands } from './types';

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
});