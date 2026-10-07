import type { GameConfig } from '../config';
import { createMatch } from './createMatch';
import { step } from './step';
import type { InputCommands, MatchState, SimEvent } from './types';

const FIXED_STEP_SECONDS = 1 / 60;
const MAX_DELTA_MS = 100;
const EMPTY_INPUT: InputCommands = {
  forward: false,
  rotateLeft: false,
  rotateRight: false,
  fireFront: false,
  fireLeft: false,
  fireRight: false,
};

export class Simulation {
  private state: MatchState;
  private input: InputCommands = { ...EMPTY_INPUT };
  private accumulatorSeconds = 0;
  private events: SimEvent[] = [];
  private readonly config: GameConfig;
  private readonly initialSeed: number;

  public constructor(config: GameConfig, seed: number) {
    this.config = config;
    this.initialSeed = seed;
    this.state = createMatch(config, seed);
  }

  public setInput(commands: InputCommands): void {
    this.input = { ...commands };
  }

  public update(realDeltaMs: number): void {
    if (this.state.status !== 'running') return;
    this.accumulatorSeconds += Math.min(Math.max(0, realDeltaMs), MAX_DELTA_MS) / 1000;
    while (this.accumulatorSeconds >= FIXED_STEP_SECONDS && this.state.status === 'running') {
      step(this.state, this.config, this.input, FIXED_STEP_SECONDS, this.events);
      this.accumulatorSeconds -= FIXED_STEP_SECONDS;
    }
  }

  public pause(): void {
    if (this.state.status === 'running') this.state.status = 'paused';
    this.accumulatorSeconds = 0;
    this.input = { ...EMPTY_INPUT };
  }

  public resume(): void {
    if (this.state.status === 'paused') this.state.status = 'running';
    this.accumulatorSeconds = 0;
    this.input = { ...EMPTY_INPUT };
  }

  public abandon(): void {
    if (this.state.status !== 'running' && this.state.status !== 'paused') return;
    this.state.status = 'ended';
    this.accumulatorSeconds = 0;
    this.input = { ...EMPTY_INPUT };
    this.events = [];
  }

  public restart(seed = this.initialSeed): void {
    this.state = createMatch(this.config, seed);
    this.accumulatorSeconds = 0;
    this.input = { ...EMPTY_INPUT };
    this.events = [];
  }

  public getState(): MatchState {
    return this.state;
  }

  public getConfig(): GameConfig {
    return this.config;
  }

  public drainEvents(): SimEvent[] {
    const events = this.events;
    this.events = [];
    return events;
  }
}