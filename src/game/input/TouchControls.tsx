import { useEffect, useRef } from 'react';
import type { InputCommands } from '../sim/types';
import { EMPTY_INPUT } from './KeyboardInput';
import { uiAssets } from '../../ui/uiAssets';

interface TouchControlsProps {
  onChange: (commands: InputCommands) => void;
  heading?: number;
  disabled?: boolean;
}

const fireControls = [
  { command: 'fireLeft' as const, label: 'Fire left broadside', className: 'touch-fire-left', icon: uiAssets.iconFireLeft },
  { command: 'fireFront' as const, label: 'Fire front', className: 'touch-fire-front', icon: uiAssets.iconFireFront },
  { command: 'fireRight' as const, label: 'Fire right broadside', className: 'touch-fire-right', icon: uiAssets.iconFireRight },
];

const DEADZONE = 0.2;

export function TouchControls({ onChange, heading = 0, disabled = false }: TouchControlsProps) {
  const activeFires = useRef(new Map<number, keyof InputCommands>());
  const joystickPointer = useRef<number | undefined>(undefined);
  const joystickBase = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!disabled) return;
    activeFires.current.clear();
    joystickPointer.current = undefined;
    if (knobRef.current) knobRef.current.style.transform = 'translate(-50%, -50%)';
    onChange({ ...EMPTY_INPUT });
  }, [disabled, onChange]);

  const emit = (joystick?: { x: number; y: number }): void => {
    const commands = { ...EMPTY_INPUT };
    activeFires.current.forEach((command) => { commands[command] = true; });
    if (joystick) {
      const magnitude = Math.hypot(joystick.x, joystick.y);
      if (magnitude > DEADZONE) {
        commands.forward = true;
        const desiredHeading = Math.atan2(joystick.y, joystick.x);
        let angleError = desiredHeading - heading;
        while (angleError > Math.PI) angleError -= Math.PI * 2;
        while (angleError < -Math.PI) angleError += Math.PI * 2;
        if (Math.abs(angleError) > 0.12) {
          commands.rotateLeft = angleError < 0;
          commands.rotateRight = angleError > 0;
        }
      }
    }
    onChange(commands);
  };

  const updateJoystick = (event: React.PointerEvent<HTMLDivElement>): void => {
    const base = joystickBase.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const radius = rect.width / 2;
    const hasCoordinates = event.clientX !== 0 || event.clientY !== 0;
    const x = hasCoordinates ? (event.clientX - (rect.left + radius)) / radius : 0;
    const y = hasCoordinates ? (event.clientY - (rect.top + radius)) / radius : -1;
    const magnitude = Math.hypot(x, y);
    const scale = Math.min(1, magnitude);
    const normalized = magnitude > 0 ? { x: x / magnitude * scale, y: y / magnitude * scale } : { x: 0, y: 0 };
    if (knobRef.current) knobRef.current.style.transform = `translate(calc(-50% + ${normalized.x * 50}px), calc(-50% + ${normalized.y * 50}px))`;
    emit(normalized);
  };

  const releaseJoystick = (pointerId: number): void => {
    if (joystickPointer.current !== pointerId) return;
    joystickPointer.current = undefined;
    if (knobRef.current) knobRef.current.style.transform = 'translate(-50%, -50%)';
    emit();
  };

  const releaseFire = (pointerId: number): void => {
    if (!activeFires.current.delete(pointerId)) return;
    emit();
  };

  return (
    <div className="touch-controls" aria-label="Touch controls" data-dialog-background>
      <div className="touch-portrait-message">Rotate your device to landscape.</div>
      <div
        ref={joystickBase}
        className="touch-joystick"
        role="application"
        aria-label="Movement joystick"
        onPointerDown={(event) => {
          if (disabled) return;
          event.preventDefault();
          joystickPointer.current = event.pointerId;
          if (event.isTrusted) event.currentTarget.setPointerCapture(event.pointerId);
          emit({ x: 0, y: -1 });
          updateJoystick(event);
        }}
        onPointerMove={(event) => {
          if (joystickPointer.current === event.pointerId) updateJoystick(event);
        }}
        onPointerUp={(event) => releaseJoystick(event.pointerId)}
        onPointerCancel={(event) => releaseJoystick(event.pointerId)}
      >
        <span ref={knobRef} className="touch-joystick-knob" />
      </div>
      {fireControls.map(({ command, label, className, icon }) => (
        <button
          key={command}
          type="button"
          className={`touch-button ${className}`}
          aria-label={label}
          disabled={disabled}
          onPointerDown={(event) => {
            if (disabled) return;
            event.preventDefault();
            if (event.isTrusted) event.currentTarget.setPointerCapture(event.pointerId);
            activeFires.current.set(event.pointerId, command);
            emit();
          }}
          onPointerUp={(event) => releaseFire(event.pointerId)}
          onPointerCancel={(event) => releaseFire(event.pointerId)}
        >
          <img src={icon} alt="" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
