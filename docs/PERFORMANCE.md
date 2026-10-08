# Performance

## Methodology

Build with `npm run build`, serve with `npm run preview`, and open the production preview with `?perf=1`. Start a match using a fixed configuration and seed, play for 180 seconds of simulated time, then run:

```js
window.__PIRATE_PERF__.reset()
// play the 180-second match
window.__PIRATE_PERF__.report()
```

The probe records every Pixi ticker delta and the number of player, enemy, projectile, and island entities. It uses preallocated typed arrays and is inert unless `?perf=1`. For memory, repeat start -> play -> exit five times in a fresh browser context, record the browser task-manager or DevTools heap after each cycle, and note whether memory returns toward the starting level.

## Measurement template

| Field | Measurement |
| --- | --- |
| Hardware | Ryzen 5 7600X, RX 9060 XT, 16 GB RAM, Windows 11 |
| Browser | Chrome 152 on desktop with DevTools Pixel-profile emulation |
| Resolution | 1070x799, devicePixelRatio 2 |
| Match | 180-second session, 4-second spawn interval, real time, production build via Vite preview |
| FPS (`avgFps`) | 179.9 |
| p95 frame time | 5.60 ms |
| p99 frame time | 5.70 ms |
| Frames over 16.7 ms | 2 |
| Maximum entities | 15 |
| Average entities | 7.74 |

### Memory cycles

| Cycle | Heap after start/play/exit (MB) |
| ---: | ---: |
| 1 | Not captured within the time limit |
| 2 | Not captured within the time limit |
| 3 | Not captured within the time limit |
| 4 | Not captured within the time limit |
| 5 | Not captured within the time limit |

The measured heap trend cannot be classified as flat or growing because memory values were not captured within the time limit.

Limitations: these are manual measurements; DevTools device emulation was enabled; the probe sample covers only the first approximately 111 seconds of the 181-second match because of the 20,000-frame cap; this is a single run; and the high-refresh monitor makes the recorded frame times low. Browser scheduling and GPU drivers vary. Heap growth cannot be assessed from this run.
