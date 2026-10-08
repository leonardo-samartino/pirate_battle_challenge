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
| Browser | TODO |
| Resolution | TODO |
| Match | 180 seconds, fixed seed, documented options |
| FPS (`avgFps`) | TODO |
| p95 frame time | TODO ms |
| p99 frame time | TODO ms |
| Frames over 16.7 ms | TODO |
| Maximum entities | TODO |
| Average entities | TODO |

### Memory cycles

| Cycle | Heap after start/play/exit (MB) |
| ---: | ---: |
| 1 | TODO |
| 2 | TODO |
| 3 | TODO |
| 4 | TODO |
| 5 | TODO |

Limitations: these are manual measurements, browser scheduling and GPU drivers vary, the probe caps samples at 20,000 frames, and no claim should be made until the TODO cells are replaced with captured results.
