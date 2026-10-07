import type { InputCommands } from '../sim/types';

export const EMPTY_INPUT: InputCommands = {
  forward: false,
  rotateLeft: false,
  rotateRight: false,
  fireFront: false,
  fireLeft: false,
  fireRight: false,
};

const GAME_KEYS = new Set([
  'KeyW',
  'ArrowUp',
  'KeyA',
  'ArrowLeft',
  'KeyD',
  'ArrowRight',
  'Space',
  'KeyQ',
  'KeyE',
]);

export function mergeInputCommands(
  keyboard: InputCommands,
  touch: InputCommands,
): InputCommands {
  return {
    forward: keyboard.forward || touch.forward,
    rotateLeft: keyboard.rotateLeft || touch.rotateLeft,
    rotateRight: keyboard.rotateRight || touch.rotateRight,
    fireFront: keyboard.fireFront || touch.fireFront,
    fireLeft: keyboard.fireLeft || touch.fireLeft,
    fireRight: keyboard.fireRight || touch.fireRight,
  };
}

function commandForKey(code: string): keyof InputCommands | undefined {
  if (code === 'KeyW' || code === 'ArrowUp') return 'forward';
  if (code === 'KeyA' || code === 'ArrowLeft') return 'rotateLeft';
  if (code === 'KeyD' || code === 'ArrowRight') return 'rotateRight';
  if (code === 'Space') return 'fireFront';
  if (code === 'KeyQ') return 'fireLeft';
  if (code === 'KeyE') return 'fireRight';
  return undefined;
}

export class KeyboardInput {
  private readonly pressed = new Set<string>();
  private readonly onChange: (commands: InputCommands) => void;
  private readonly onPause: () => void;
  private active = false;

  public constructor(
    onChange: (commands: InputCommands) => void,
    onPause: () => void,
  ) {
    this.onChange = onChange;
    this.onPause = onPause;
  }

  public start(): void {
    if (this.active) return;
    this.active = true;
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.reset);
  }

  public stop(): void {
    if (!this.active) return;
    this.active = false;
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.reset);
    this.reset();
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.active) return;
    if (event.code === 'Escape') {
      event.preventDefault();
      this.onPause();
      return;
    }
    if (!GAME_KEYS.has(event.code)) return;
    event.preventDefault();
    this.pressed.add(event.code);
    this.emit();
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    if (!this.active || !GAME_KEYS.has(event.code)) return;
    event.preventDefault();
    this.pressed.delete(event.code);
    this.emit();
  };

  private readonly reset = (): void => {
    this.pressed.clear();
    this.emit();
  };

  private emit(): void {
    const commands = { ...EMPTY_INPUT };
    this.pressed.forEach((code) => {
      const command = commandForKey(code);
      if (command) commands[command] = true;
    });
    this.onChange(commands);
  }
}
