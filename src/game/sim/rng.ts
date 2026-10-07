export interface RandomResult {
  value: number;
  state: number;
}

export function nextRandom(state: number): RandomResult {
  const nextState = (state + 0x6d2b79f5) | 0;
  let value = Math.imul(nextState ^ (nextState >>> 15), nextState | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

  return {
    value: ((value ^ (value >>> 14)) >>> 0) / 4294967296,
    state: nextState >>> 0,
  };
}