import { useEffect, useRef } from 'react';
import { Application } from 'pixi.js';
import type { Simulation } from '../game/sim/Simulation';
import { AssetLoader } from '../game/render/AssetLoader';
import { GameRenderer } from '../game/render/GameRenderer';
import { publishHudState } from '../game/hudStore';

interface GameCanvasProps {
  simulation: Simulation;
  onLoadProgress?: (progress: number) => void;
  onLoadError?: (error: Error) => void;
}

export function GameCanvas({ simulation, onLoadProgress, onLoadError }: GameCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let cleanedUp = false;
    let app: Application | undefined;
    let renderer: GameRenderer | undefined;
    let tickerCallback: ((ticker: { deltaMS: number }) => void) | undefined;
    let hudElapsedMs = 0;

    const start = async (): Promise<void> => {
      const loader = new AssetLoader();
      try {
        const assets = await loader.load(onLoadProgress);
        if (cancelled) return;
        const nextApp = new Application();
        await nextApp.init({
          backgroundAlpha: 0,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });
        if (cancelled || cleanedUp) {
          nextApp.destroy(true, { children: true, texture: false, textureSource: false });
          return;
        }
        app = nextApp;
        host.appendChild(app.canvas);
        renderer = new GameRenderer(app, simulation.getConfig(), assets, host);
        tickerCallback = (ticker) => {
          if (cleanedUp || cancelled || !renderer || !app) return;
          simulation.update(ticker.deltaMS);
          const state = simulation.getState();
          renderer.render(state, simulation.drainEvents(), ticker.deltaMS / 1000);
          hudElapsedMs += ticker.deltaMS;
          if (hudElapsedMs >= 100) {
            publishHudState(state, simulation.getConfig().sessionDurationSeconds);
            hudElapsedMs = 0;
          }
        };
        app.ticker.add(tickerCallback);
      } catch (error) {
        if (!cancelled) onLoadError?.(error instanceof Error ? error : new Error(String(error)));
      }
    };

    void start();
    return () => {
      cancelled = true;
      if (cleanedUp) return;
      cleanedUp = true;
      if (app && tickerCallback) {
        app.ticker.remove(tickerCallback);
        tickerCallback = undefined;
      }
      renderer?.destroy();
      renderer = undefined;
      if (app) {
        const canvas = app.canvas;
        app.destroy(true, { children: false, texture: false, textureSource: false });
        if (canvas.parentElement === host) host.removeChild(canvas);
        app = undefined;
      }
    };
  }, [onLoadError, onLoadProgress, simulation]);

  return <div ref={hostRef} className="game-canvas" data-dialog-background />;
}
