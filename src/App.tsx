import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createGameConfigSnapshot } from './game/config';
import { mergeInputCommands, EMPTY_INPUT, KeyboardInput } from './game/input/KeyboardInput';
import { TouchControls } from './game/input/TouchControls';
import { hudStore, publishHudState, resetHudStore } from './game/hudStore';
import { Simulation } from './game/sim/Simulation';
import { GameCanvas } from './ui/GameCanvas';
import { Hud } from './ui/Hud';
import './App.css';

function App() {
  const simulation = useMemo(
    () => new Simulation(createGameConfigSnapshot(), Math.floor(Math.random() * 0xffffffff)),
    [],
  );
  const snapshot = useSyncExternalStore(hudStore.subscribe, hudStore.getSnapshot);
  const keyboardCommands = useRef(EMPTY_INPUT);
  const touchCommands = useRef(EMPTY_INPUT);
  const keyboard = useRef<KeyboardInput | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | undefined>();
  const [attempt, setAttempt] = useState(0);

  const pause = useCallback((): void => {
    simulation.pause();
    keyboardCommands.current = { ...EMPTY_INPUT };
    touchCommands.current = { ...EMPTY_INPUT };
    simulation.setInput(EMPTY_INPUT);
    keyboard.current?.stop();
    publishHudState(simulation.getState(), simulation.getConfig().sessionDurationSeconds);
  }, [simulation]);

  const resume = useCallback((): void => {
    simulation.resume();
    keyboardCommands.current = { ...EMPTY_INPUT };
    touchCommands.current = { ...EMPTY_INPUT };
    simulation.setInput(EMPTY_INPUT);
    keyboard.current?.start();
    publishHudState(simulation.getState(), simulation.getConfig().sessionDurationSeconds);
  }, [simulation]);

  useEffect(() => {
    keyboard.current = new KeyboardInput(
      (commands) => {
        keyboardCommands.current = commands;
        simulation.setInput(mergeInputCommands(commands, touchCommands.current));
      },
      pause,
    );
    if (snapshot.status === 'running' && progress >= 1) keyboard.current.start();
    return () => keyboard.current?.stop();
  }, [pause, progress, simulation, snapshot.status]);

  useEffect(() => {
    const pauseWhenInactive = (): void => pause();
    const visibilityChange = (): void => {
      if (document.visibilityState === 'hidden') pauseWhenInactive();
    };
    window.addEventListener('blur', pauseWhenInactive);
    document.addEventListener('visibilitychange', visibilityChange);
    return () => {
      window.removeEventListener('blur', pauseWhenInactive);
      document.removeEventListener('visibilitychange', visibilityChange);
    };
  }, [pause]);

  const updateTouch = useCallback((commands: typeof EMPTY_INPUT): void => {
    touchCommands.current = commands;
    simulation.setInput(mergeInputCommands(keyboardCommands.current, commands));
  }, [simulation]);

  const restart = useCallback((): void => {
    simulation.restart();
    keyboardCommands.current = { ...EMPTY_INPUT };
    touchCommands.current = { ...EMPTY_INPUT };
    simulation.setInput(EMPTY_INPUT);
    resetHudStore();
    publishHudState(simulation.getState(), simulation.getConfig().sessionDurationSeconds);
    keyboard.current?.start();
  }, [simulation]);

  if (error) {
    return (
      <main className="game-shell">
        <h1>Unable to load the battle</h1>
        <p>{error.message}</p>
        <button type="button" onClick={() => { setError(undefined); setProgress(0); setAttempt((value) => value + 1); }}>
          Retry
        </button>
      </main>
    );
  }

  return (
    <main className="game-shell">
      <GameCanvas
        key={attempt}
        simulation={simulation}
        onLoadProgress={setProgress}
        onLoadError={setError}
      />
      {progress < 1 && <p className="loading-label">Loading battle assets... {Math.round(progress * 100)}%</p>}
      <Hud onPause={pause} />
      <TouchControls onChange={updateTouch} disabled={progress < 1 || snapshot.status !== 'running'} />
      {snapshot.status === 'paused' && (
        <div className="pause-overlay" role="dialog" aria-label="Game paused">
          <h1>Game paused</h1>
          <button type="button" onClick={resume}>Resume</button>
        </div>
      )}
      {snapshot.status === 'ended' && (
        <div className="pause-overlay" role="dialog" aria-label="Match over">
          <h1>Match over: {simulation.getState().endReason}, score {snapshot.score}</h1>
          <button type="button" onClick={restart}>Play Again</button>
        </div>
      )}
    </main>
  );
}

export default App;
