import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { hudStore } from '../game/hudStore';
import { uiAssets } from './uiAssets';

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
    <div className="hud" aria-label="Game status" data-dialog-background>
      <div className="hud-counter"><img src={uiAssets.counterPanel} alt="" aria-hidden="true" /><span><img src={uiAssets.iconScore} alt="" aria-hidden="true" />{snapshot.score}</span></div>
      <div className="hud-counter"><img src={uiAssets.counterPanel} alt="" aria-hidden="true" /><span><img src={uiAssets.iconTime} alt="" aria-hidden="true" />{formatTime(snapshot.remainingSeconds)}</span></div>
      <div className={`health-widget health-${snapshot.playerHealth > 50 ? 'green' : snapshot.playerHealth > 20 ? 'amber' : 'red'}`}><img className="health-fill" src={uiAssets[snapshot.playerHealth > 50 ? 'healthFillGreen' : snapshot.playerHealth > 20 ? 'healthFillAmber' : 'healthFillRed']} alt="" aria-hidden="true" style={{ clipPath: `inset(0 ${Math.max(0, 1 - snapshot.playerHealth / 100) * 196}px 0 0)` }} /><img className="health-frame" src={uiAssets.healthFrame} alt="" aria-hidden="true" /><span><img src={uiAssets.iconHeart} alt="" aria-hidden="true" />{Math.max(0, Math.ceil(snapshot.playerHealth))}</span></div>
      {snapshot.status === 'running' && <button className="round-button" type="button" onClick={onPause} aria-label="Pause"><img src={uiAssets.iconPause} alt="" aria-hidden="true" /></button>}
      <span className="sr-only" aria-live="polite">{announcement}</span>
    </div>
  );
}
