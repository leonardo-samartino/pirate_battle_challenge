import { useMemo, useState } from 'react';
import { createGameConfigSnapshot } from './game/config';
import { Simulation } from './game/sim/Simulation';
import { GameCanvas } from './ui/GameCanvas';
import './App.css';

function App() {
  const simulation = useMemo(
    () => new Simulation(createGameConfigSnapshot(), Math.floor(Math.random() * 0xffffffff)),
    [],
  );
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | undefined>();
  const [attempt, setAttempt] = useState(0);

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
      {progress < 1 && <p className="loading-label">Loading battle assets… {Math.round(progress * 100)}%</p>}
    </main>
  );
}

export default App;
