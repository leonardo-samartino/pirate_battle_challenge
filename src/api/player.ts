const PLAYER_ID_KEY = 'pirate-battle:player-id:v1';
const FALLBACK_PLAYER_ID = 'player-local';

export function getPlayerId(): string {
  try {
    const current = localStorage.getItem(PLAYER_ID_KEY);
    if (current) return current;
    const playerId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : FALLBACK_PLAYER_ID;
    localStorage.setItem(PLAYER_ID_KEY, playerId);
    return playerId;
  } catch {
    return FALLBACK_PLAYER_ID;
  }
}

export const PLAYER_NAME = 'Captain Jack';
