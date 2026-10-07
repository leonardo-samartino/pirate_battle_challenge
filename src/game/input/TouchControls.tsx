import { useEffect, useRef } from 'react';
import type { InputCommands } from '../sim/types';
import { EMPTY_INPUT } from './KeyboardInput';

interface TouchControlsProps {
  onChange: (commands: InputCommands) => void;
  disabled?: boolean;
}

const controls: Array<{ command: keyof InputCommands; label: string; className: string }> = [
  { command: 'rotateLeft', label: 'Rotate left', className: 'touch-rotate-left' },
  { command: 'rotateRight', label: 'Rotate right', className: 'touch-rotate-right' },
  { command: 'forward', label: 'Forward', className: 'touch-forward' },
  { command: 'fireLeft', label: 'Fire left broadside', className: 'touch-fire-left' },
  { command: 'fireFront', label: 'Fire front', className: 'touch-fire-front' },
  { command: 'fireRight', label: 'Fire right broadside', className: 'touch-fire-right' },
];

export function TouchControls({ onChange, disabled = false }: TouchControlsProps) {
  const activePointers = useRef(new Map<number, keyof InputCommands>());

  useEffect(() => {
    if (!disabled) return;
    activePointers.current.clear();
    onChange({ ...EMPTY_INPUT });
  }, [disabled, onChange]);

  const emit = (): void => {
    const commands = { ...EMPTY_INPUT };
    activePointers.current.forEach((command) => {
      commands[command] = true;
    });
    onChange(commands);
  };

  const release = (pointerId: number): void => {
    if (!activePointers.current.delete(pointerId)) return;
    emit();
  };

  return (
    <div className="touch-controls" aria-label="Touch controls" data-dialog-background>
      <div className="touch-portrait-message">Rotate your device to landscape.</div>
      {controls.map(({ command, label, className }) => (
        <button
          key={command}
          type="button"
          className={`touch-button ${className}`}
          aria-label={label}
          disabled={disabled}
          onPointerDown={(event) => {
            if (disabled) return;
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            activePointers.current.set(event.pointerId, command);
            emit();
          }}
          onPointerUp={(event) => release(event.pointerId)}
          onPointerCancel={(event) => release(event.pointerId)}
          onPointerLeave={(event) => release(event.pointerId)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
