import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ComponentPropsWithoutRef } from 'react';
import { createGameConfigSnapshot, SESSION_DURATION_RANGE, SPAWN_INTERVAL_RANGE, type GameOptions } from './game/config';
import { AssetLoader } from './game/render/AssetLoader';
import { EMPTY_INPUT, mergeInputCommands, KeyboardInput } from './game/input/KeyboardInput';
import { TouchControls } from './game/input/TouchControls';
import { hudStore, publishHudState, resetHudStore } from './game/hudStore';
import { loadGameOptions, saveGameOptions } from './game/settingsStorage';
import { loadLastMatchResult, saveLastMatchResult, type MatchResult } from './game/matchResult';
import { Simulation } from './game/sim/Simulation';
import { CaptainLog } from './ui/CaptainLog';
import { GameCanvas } from './ui/GameCanvas';
import { Hud } from './ui/Hud';
import { uiAssets, type UiAssetName } from './ui/uiAssets';
import { useFocusTrap } from './ui/useFocusTrap';
import { ScenarioPanel } from './ui/ScenarioPanel';
import { PLAYER_NAME, getPlayerId } from './api/player';
import { enqueueMatch, flushOutbox, isPending, submissionStatus, submitPending } from './api/outbox';
import { getScenario, reset as resetScenario } from './mocks/scenarios';
import './App.css';

type Screen = 'loading' | 'menu' | 'options' | 'playing' | 'result' | 'log';
type RecordStatus = 'Saving...' | 'Saved' | 'Pending' | 'Failed';

function UiIcon({ asset, className = '' }: { asset: UiAssetName; className?: string }) {
  return <img className={`ui-icon ${className}`} src={uiAssets[asset]} alt="" aria-hidden="true" />;
}

function MenuButton({ asset, icon, children, ...props }: ComponentPropsWithoutRef<'button'> & { asset: 'buttonPrimary' | 'buttonSecondary'; icon?: UiAssetName }) {
  return <button className={asset === 'buttonPrimary' ? 'gold-button' : 'secondary-button'} {...props}>
    {icon && <UiIcon asset={icon} className="button-icon" />}<span className="button-label">{children}</span>
  </button>;
}

function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [progress, setProgress] = useState(0);
  const [loadError, setLoadError] = useState<Error>();
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [options, setOptions] = useState<GameOptions>(loadGameOptions);
  const [simulation, setSimulation] = useState<Simulation>();
  const [lastResult, setLastResult] = useState<MatchResult | undefined>(loadLastMatchResult);
  const [recordStatus, setRecordStatus] = useState<RecordStatus>(() => {
    const saved = loadLastMatchResult();
    if (!saved) return 'Pending';
    return submissionStatus(saved.matchId) === 'failed' ? 'Failed' : isPending(saved.matchId) ? 'Pending' : 'Saved';
  });
  const snapshot = useSyncExternalStore(hudStore.subscribe, hudStore.getSnapshot);
  const matchIds = useRef(new WeakMap<Simulation, string>());
  const completedMatches = useRef(new WeakSet<Simulation>());
  const keyboardCommands = useRef(EMPTY_INPUT);
  const touchCommands = useRef(EMPTY_INPUT);
  const keyboard = useRef<KeyboardInput | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loader = new AssetLoader();
    void loader.load(setProgress).then(() => {
      if (!cancelled) setScreen('menu');
    }).catch((error: unknown) => {
      if (!cancelled) setLoadError(error instanceof Error ? error : new Error(String(error)));
    });
    return () => { cancelled = true; };
  }, [loadAttempt]);

  const pauseMatch = useCallback((): void => {
    if (!simulation) return;
    simulation.pause();
    keyboard.current?.stop();
    keyboardCommands.current = { ...EMPTY_INPUT };
    touchCommands.current = { ...EMPTY_INPUT };
    simulation.setInput(EMPTY_INPUT);
    publishHudState(simulation.getState(), simulation.getConfig().sessionDurationSeconds);
  }, [simulation]);

  const resumeMatch = useCallback((): void => {
    if (!simulation) return;
    simulation.resume();
    keyboard.current?.start();
    publishHudState(simulation.getState(), simulation.getConfig().sessionDurationSeconds);
  }, [simulation]);

  useEffect(() => {
    if (screen !== 'playing' || !simulation) return;
    keyboard.current = new KeyboardInput(
      (commands) => {
        keyboardCommands.current = commands;
        simulation.setInput(mergeInputCommands(commands, touchCommands.current));
      },
      pauseMatch,
    );
    keyboard.current.start();
    const pauseOnBlur = (): void => pauseMatch();
    const pauseOnVisibility = (): void => {
      if (document.visibilityState === 'hidden') pauseMatch();
    };
    const abandonOnUnload = (): void => simulation.abandon();
    window.addEventListener('blur', pauseOnBlur);
    document.addEventListener('visibilitychange', pauseOnVisibility);
    window.addEventListener('beforeunload', abandonOnUnload);
    return () => {
      keyboard.current?.stop();
      simulation.setInput(EMPTY_INPUT);
      window.removeEventListener('blur', pauseOnBlur);
      document.removeEventListener('visibilitychange', pauseOnVisibility);
      window.removeEventListener('beforeunload', abandonOnUnload);
    };
  }, [pauseMatch, screen, simulation]);

  const startMatch = useCallback(() => {
    const config = createGameConfigSnapshot(options);
    const next = new Simulation(config, Math.floor(Math.random() * 0xffffffff));
    matchIds.current.set(next, crypto.randomUUID());
    setSimulation(next);
    resetHudStore();
    publishHudState(next.getState(), config.sessionDurationSeconds);
    setScreen('playing');
  }, [options]);

  const finishMatch = useCallback((current: Simulation): void => {
    const state = current.getState();
    if (state.status !== 'ended' || completedMatches.current.has(current)) return;
    completedMatches.current.add(current);
    const result: MatchResult = {
      matchId: matchIds.current.get(current) ?? crypto.randomUUID(),
      playerId: getPlayerId(),
      date: new Date().toISOString(),
      score: state.score,
      durationSeconds: state.elapsedSeconds,
      endReason: state.endReason ?? 'time',
      config: {
        sessionDurationSeconds: current.getConfig().sessionDurationSeconds,
        enemySpawnIntervalSeconds: current.getConfig().enemySpawnIntervalSeconds,
      },
    };
    saveLastMatchResult(result);
    setLastResult(result);
    enqueueMatch({ ...result, playerName: PLAYER_NAME });
    setRecordStatus('Saving...');
    void submitPending(result.matchId).then(() => setRecordStatus('Saved')).catch((error: unknown) => {
      setRecordStatus((error as { retryable?: boolean }).retryable === false ? 'Failed' : 'Pending');
    });
    setScreen('result');
  }, []);

  useEffect(() => {
    if (screen === 'playing' && simulation?.getState().status === 'ended') finishMatch(simulation);
  }, [finishMatch, screen, simulation, snapshot.status]);

  if (screen === 'loading') {
    return <main className="game-shell center-screen"><section className="board-panel"><h1>Pirate Battle</h1><p>Loading assets... {Math.round(progress * 100)}%</p>{loadError && <><p role="alert">{loadError.message}</p><button className="gold-button" type="button" onClick={() => { setLoadError(undefined); setProgress(0); setLoadAttempt((value) => value + 1); }}>Retry</button></>}</section></main>;
  }

  if (screen === 'menu') {
    return <main className="game-shell center-screen"><section className="board-panel menu-panel">
      <img className="menu-title" src={uiAssets.titlePirateBattle} alt="Pirate Battle" />
      <p className="subtitle">Command your ship. Survive the waves.</p>
      <MenuButton asset="buttonPrimary" icon="iconPlay" type="button" onClick={startMatch}>Play</MenuButton>
      <MenuButton asset="buttonPrimary" icon="iconSettings" type="button" onClick={() => setScreen('options')}>Options</MenuButton>
      <div className="controls-help"><strong>Controls</strong><span>W / Arrow keys: move and turn</span><span>Space: front fire · Q/E: broadsides</span><span>Touch controls are available on mobile.</span></div>
      {lastResult && <p>Last match: {lastResult.score} points, {lastResult.endReason === 'time' ? 'time up' : 'defeated'}.</p>}
      <MenuButton asset="buttonSecondary" icon="iconScore" type="button" onClick={() => setScreen('log')}>Captain's Log</MenuButton>
      <ScenarioBanner /><ScenarioPanel />
    </section></main>;
  }

  if (screen === 'options') {
    return <OptionsScreen options={options} onSave={(next) => { setOptions(next); saveGameOptions(next); setScreen('menu'); }} onBack={() => setScreen('menu')} />;
  }

  if (screen === 'log') {
    return <CaptainLog options={options} onClose={() => setScreen('menu')} lastResult={lastResult ? { date: lastResult.date, score: lastResult.score, durationSeconds: lastResult.durationSeconds, endReason: lastResult.endReason === 'time' ? 'Time up' : 'Defeated' } : undefined} />;
  }

  if (screen === 'result' && lastResult) {
    return <ResultScreen lastResult={lastResult} recordStatus={recordStatus} onRetry={() => { setRecordStatus('Saving...'); void submitPending(lastResult.matchId).then(() => setRecordStatus('Saved')).catch(() => setRecordStatus('Pending')); }} onPlayAgain={startMatch} onMenu={() => setScreen('menu')} />;
  }

  function ResultScreen({ lastResult, recordStatus, onRetry, onPlayAgain, onMenu }: { lastResult: MatchResult; recordStatus: RecordStatus; onRetry: () => void; onPlayAgain: () => void; onMenu: () => void }) {
    const dialogRef = useFocusTrap<HTMLElement>(onMenu);
    return <main className="game-shell center-screen"><section ref={dialogRef} className="board-panel result-panel" role="dialog" aria-modal="true" aria-labelledby="result-title" tabIndex={-1}><h1 id="result-title">Match complete</h1><p>Score: {lastResult.score}</p><p>Time played: {Math.ceil(lastResult.durationSeconds)} seconds</p><p>Result: {lastResult.endReason === 'time' ? 'Time up' : 'Defeated'}</p><p role="status">Record status: {recordStatus}</p>{recordStatus === 'Pending' && <><p>This record is pending and will retry when the connection returns.</p><button type="button" onClick={onRetry}>Retry</button></>}<MenuButton asset="buttonPrimary" icon="iconRestart" type="button" onClick={onPlayAgain}>Play Again</MenuButton><MenuButton asset="buttonSecondary" icon="iconHome" type="button" onClick={onMenu}>Main Menu</MenuButton></section></main>;
  }

  if (!simulation) return null;
  return <main className="game-shell">
    <GameCanvas simulation={simulation} onLoadProgress={setProgress} onLoadError={setLoadError} />
    <Hud onPause={pauseMatch} />
    <TouchControls onChange={(commands) => { touchCommands.current = commands; simulation.setInput(mergeInputCommands(keyboardCommands.current, commands)); }} disabled={snapshot.status !== 'running'} />
    {snapshot.status === 'paused' && <PauseOverlay onResume={resumeMatch} onOptions={() => { simulation.abandon(); setScreen('options'); }} onMenu={() => { simulation.abandon(); setScreen('menu'); }} />}
  </main>;
}

function ScenarioBanner() {
  const [scenario, setScenario] = useState(getScenario);
  useEffect(() => {
    const timer = window.setInterval(() => setScenario(getScenario()), 250);
    return () => window.clearInterval(timer);
  }, []);
  if (scenario === 'success') return null;
  return <div className="scenario-banner" role="status">Network scenario: {scenario} <button type="button" onClick={() => { resetScenario(); void flushOutbox(); setScenario('success'); }}>Reset</button></div>;
}

function OptionsScreen({ options, onSave, onBack }: { options: GameOptions; onSave: (options: GameOptions) => void; onBack: () => void }) {
  const [draft, setDraft] = useState(options);
  const [error, setError] = useState('');
  const dialogRef = useFocusTrap<HTMLElement>(onBack);
  const update = (key: keyof GameOptions, value: number) => setDraft((current) => ({ ...current, [key]: value }));
  const validate = (): void => {
    if (!Number.isInteger(draft.sessionDurationSeconds) || draft.sessionDurationSeconds < SESSION_DURATION_RANGE.min || draft.sessionDurationSeconds > SESSION_DURATION_RANGE.max) {
      setError(`Game session time must be between ${SESSION_DURATION_RANGE.min} and ${SESSION_DURATION_RANGE.max} seconds.`); return;
    }
    if (!Number.isFinite(draft.enemySpawnIntervalSeconds) || draft.enemySpawnIntervalSeconds < SPAWN_INTERVAL_RANGE.min || draft.enemySpawnIntervalSeconds > SPAWN_INTERVAL_RANGE.max) {
      setError(`Enemy spawn time must be between ${SPAWN_INTERVAL_RANGE.min} and ${SPAWN_INTERVAL_RANGE.max} seconds.`); return;
    }
    setError(''); onSave(draft);
  };
  return <main className="game-shell center-screen"><section ref={dialogRef} className="board-panel options-panel" role="dialog" aria-modal="true" aria-labelledby="options-title" tabIndex={-1}><h1 id="options-title">Options</h1><label htmlFor="session-time">Game session time</label><div className="number-control"><button type="button" aria-label="Decrease session time" onClick={() => update('sessionDurationSeconds', Math.max(60, draft.sessionDurationSeconds - 10))}><UiIcon asset="iconMinus" /></button><input id="session-time" type="number" min={60} max={180} step={10} value={draft.sessionDurationSeconds} onChange={(event) => update('sessionDurationSeconds', Number(event.target.value))} aria-invalid={Boolean(error)} aria-describedby="options-error" /><button type="button" aria-label="Increase session time" onClick={() => update('sessionDurationSeconds', Math.min(180, draft.sessionDurationSeconds + 10))}><UiIcon asset="iconPlus" /></button></div><label htmlFor="spawn-time">Enemy spawn time</label><div className="number-control"><button type="button" aria-label="Decrease spawn time" onClick={() => update('enemySpawnIntervalSeconds', Math.max(0.5, draft.enemySpawnIntervalSeconds - 0.5))}><UiIcon asset="iconMinus" /></button><input id="spawn-time" type="number" min={0.5} max={30} step={0.5} value={draft.enemySpawnIntervalSeconds} onChange={(event) => update('enemySpawnIntervalSeconds', Number(event.target.value))} aria-invalid={Boolean(error)} aria-describedby="options-error" /><button type="button" aria-label="Increase spawn time" onClick={() => update('enemySpawnIntervalSeconds', Math.min(30, draft.enemySpawnIntervalSeconds + 0.5))}><UiIcon asset="iconPlus" /></button></div>{error && <p id="options-error" role="alert">{error}</p>}<MenuButton asset="buttonPrimary" type="button" onClick={validate}>Save</MenuButton><MenuButton asset="buttonSecondary" icon="iconHome" type="button" onClick={onBack}>Back</MenuButton></section></main>;
}

function PauseOverlay({ onResume, onOptions, onMenu }: { onResume: () => void; onOptions: () => void; onMenu: () => void }) {
  const dialogRef = useFocusTrap<HTMLElement>(onResume, { inertSelector: '[data-dialog-background]' });
  return <div className="pause-overlay"><section ref={dialogRef} className="board-panel" role="dialog" aria-modal="true" aria-labelledby="pause-title" tabIndex={-1}><h1 id="pause-title">Game paused</h1><MenuButton asset="buttonPrimary" icon="iconPlay" type="button" onClick={onResume}>Resume</MenuButton><MenuButton asset="buttonSecondary" icon="iconSettings" type="button" onClick={onOptions}>Options</MenuButton><MenuButton asset="buttonSecondary" icon="iconHome" type="button" onClick={onMenu}>Main Menu</MenuButton></section></div>;
}

export default App;
