import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { hudStore } from '../game/hudStore';

interface HudProps {
  onPause: () => void;
}

function formatTime(seconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

export function Hud({ onPause }: HudProps) {
  const snapshot = useSyncExternalStore(hudStore.subscribe, hudStore.getSnapshot);
  const previous = useRef(snapshot);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    const old = previous.current;
    if (old.score !== snapshot.score) setAnnouncement(`Score: ${snapshot.score}`);
    else if (old.status !== snapshot.status) {
      setAnnouncement(snapshot.status === 'paused' ? 'Game paused.' : snapshot.status === 'ended' ? 'Match ended.' : 'Game resumed.');
    }
    previous.current = snapshot;
  }, [snapshot, setAnnouncement]);

  return (
    <div className="hud" aria-label="Game status">
      <span>Score: {snapshot.score}</span>
      <span>Time: {formatTime(snapshot.remainingSeconds)}</span>
      <span>Health: {Math.max(0, Math.ceil(snapshot.playerHealth))}</span>
      {snapshot.status === 'running' && <button type="button" onClick={onPause}>Pause</button>}
      <span className="sr-only" aria-live="polite">{announcement}</span>
    </div>
  );
}
