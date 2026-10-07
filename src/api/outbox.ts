import type { QueryClient } from '@tanstack/react-query';
import type { ApiError } from './client';
import { submitMatch } from './client';
import type { MatchRecord } from './contracts';
import { queryClient as defaultQueryClient } from './queryClient';

const STORAGE_KEY = 'pirate-battle:pending-submissions:v1';
export interface PendingSubmission {
  record: MatchRecord;
  attempts: number;
  lastError?: string;
  status?: 'pending' | 'failed';
}

let entries = load();
const inFlight = new Map<string, Promise<MatchRecord>>();

function load(): PendingSubmission[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is PendingSubmission => Boolean(item && typeof item === 'object' && 'record' in item)) : [];
  } catch {
    return [];
  }
}

function persist(): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch { /* best effort */ }
}

export function pendingSubmissions(): PendingSubmission[] {
  return entries.map((entry) => ({ ...entry }));
}

export function isPending(matchId: string): boolean {
  return entries.some((entry) => entry.record.matchId === matchId && entry.status !== 'failed');
}

export function submissionStatus(matchId: string): 'pending' | 'failed' | 'none' {
  return entries.find((entry) => entry.record.matchId === matchId)?.status ?? 'none';
}

export function enqueueMatch(record: MatchRecord): void {
  if (!isPending(record.matchId)) {
    entries = [...entries, { record, attempts: 0 }];
    persist();
  }
}

function remove(matchId: string): void {
  entries = entries.filter((entry) => entry.record.matchId !== matchId);
  persist();
}

export type SubmitRecord = (record: MatchRecord) => Promise<MatchRecord>;

async function send(entry: PendingSubmission, client: QueryClient, submit: SubmitRecord): Promise<MatchRecord> {
  const result = await submit(entry.record);
  remove(entry.record.matchId);
  await client.invalidateQueries({ queryKey: ['ranking'] });
  await client.invalidateQueries({ queryKey: ['history', entry.record.playerId] });
  return result;
}

export function submitPending(
  matchId: string,
  client: QueryClient = defaultQueryClient,
  submit: SubmitRecord = submitMatch,
): Promise<MatchRecord> {
  const existing = inFlight.get(matchId);
  if (existing) return existing;
  const entry = entries.find((candidate) => candidate.record.matchId === matchId);
  if (!entry) return Promise.reject(new Error('This match is not pending.'));
  entry.attempts += 1;
  persist();
  const request = send(entry, client, submit).catch((error: unknown) => {
    const current = entries.find((candidate) => candidate.record.matchId === matchId);
    if (current) {
      current.lastError = error instanceof Error ? error.message : 'Submission failed.';
      if ((error as ApiError).retryable === false) current.status = 'failed';
      persist();
    }
    throw error;
  }).finally(() => inFlight.delete(matchId));
  inFlight.set(matchId, request);
  return request;
}

export async function flushOutbox(client: QueryClient = defaultQueryClient, submit: SubmitRecord = submitMatch): Promise<void> {
  const attempts = entries
    .filter((entry) => entry.status !== 'failed')
    .map(async (entry) => {
      const request = submitPending(entry.record.matchId, client, submit);
      await Promise.race([
        request,
        new Promise<void>((resolve) => setTimeout(resolve, 250)),
      ]);
      if (inFlight.get(entry.record.matchId) === request) inFlight.delete(entry.record.matchId);
    });
  await Promise.allSettled(attempts);
}

export function rehydrateOutbox(): void {
  entries = load();
}

export function resetOutbox(): void {
  entries = [];
  inFlight.clear();
  persist();
}

export type { ApiError };
