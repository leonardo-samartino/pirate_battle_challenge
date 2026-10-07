import type { ApiErrorBody, MatchRecord } from '../api/contracts';
import { fixtureRecords } from './fixtures';

const STORAGE_KEY = 'pirate-battle:confirmed-records:v1';
let confirmedRecords: MatchRecord[] = loadRecords();

function loadRecords(): MatchRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as MatchRecord[] : [];
  } catch {
    return [];
  }
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(confirmedRecords));
  } catch {
    // Persistence is best effort; the in-memory API remains available.
  }
}

export function allRecords(empty = false): MatchRecord[] {
  return empty ? [] : [...fixtureRecords, ...confirmedRecords];
}

export function findConfirmed(matchId: string): MatchRecord | undefined {
  return confirmedRecords.find((record) => record.matchId === matchId);
}

export function saveRecord(record: MatchRecord): { record?: MatchRecord; status: 201 | 200; error?: ApiErrorBody } {
  const existing = findConfirmed(record.matchId);
  if (existing) {
    return JSON.stringify(existing) === JSON.stringify(record)
      ? { record: existing, status: 200 }
      : { status: 200, error: { code: 'conflict', message: 'The match ID already contains a different record.' } };
  }
  confirmedRecords.push(record);
  persist();
  return { record, status: 201 };
}

export function resetDatabase(): void {
  confirmedRecords = [];
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Persistence is best effort.
  }
}
