import * as React from 'react';
import { uiAssets } from './uiAssets';
import { useFocusTrap } from './useFocusTrap';
import { useHistory, useRanking } from '../api/hooks';
import type { GameOptions } from '../game/config';
import { getPlayerId } from '../api/player';
import { getScenario, reset as resetScenario } from '../mocks/scenarios';
import { flushOutbox } from '../api/outbox';

interface PageProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export interface RankingRow {
  name: string;
  score: number;
  isYou?: boolean;
}

export interface HistoryRow {
  date: string;
  score: number;
  durationSeconds: number;
  endReason: string;
}

export function Pagination({ page, totalPages, onChange }: PageProps) {
  return (
    <div className="pagination">
      <button className="pagination-button" type="button" aria-label="Previous page" onClick={() => onChange(Math.max(1, page - 1))} disabled={totalPages <= 1 || page === 1}><img src={uiAssets.iconTurnLeft} alt="" aria-hidden="true" /></button>
      <span>PAGE {page} OF {totalPages}</span>
      <button className="pagination-button" type="button" aria-label="Next page" onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={totalPages <= 1 || page === totalPages}><img src={uiAssets.iconTurnRight} alt="" aria-hidden="true" /></button>
    </div>
  );
}

export function RankingTable({ rows }: { rows: RankingRow[] }) {
  if (rows.length === 0) return <EmptyState label="No ranking entries yet." />;
  return (
    <table className="log-table">
      <caption className="sr-only">Ranking</caption>
      <thead><tr><th>Rank</th><th>Captain</th><th>Score</th></tr></thead>
      <tbody>{rows.map((row, index) => <tr key={`${row.name}-${index}`} className={row.isYou ? 'you-row' : undefined}><td>{index + 1}</td><td>{row.name}{row.isYou ? ' (YOU)' : ''}</td><td>{row.score}</td></tr>)}</tbody>
    </table>
  );
}

export function HistoryTable({ rows }: { rows: HistoryRow[] }) {
  if (rows.length === 0) return <EmptyState label="No completed matches yet." />;
  return (
    <table className="log-table">
      <caption className="sr-only">Match history</caption>
      <thead><tr><th>Date</th><th>Score</th><th>Duration</th><th>Result</th></tr></thead>
      <tbody>{rows.map((row) => <tr key={`${row.date}-${row.score}`}><td>{new Date(row.date).toLocaleDateString()}</td><td>{row.score}</td><td>{Math.ceil(row.durationSeconds)}s</td><td>{row.endReason}</td></tr>)}</tbody>
    </table>
  );
}

export function EmptyState({ label }: { label: string }) {
  return <p className="empty-state">{label}</p>;
}

interface CaptainLogProps {
  onClose: () => void;
  lastResult?: HistoryRow;
  options: GameOptions;
}

export function CaptainLog({ onClose, lastResult, options }: CaptainLogProps) {
  const [tab, setTab] = React.useState<'ranking' | 'history'>('ranking');
  const [page, setPage] = React.useState(1);
  const [scenario, setScenario] = React.useState(getScenario);
  const dialogRef = useFocusTrap<HTMLElement>(onClose);
  const ranking = useRanking(page, options);
  const history = useHistory(page);
  const activeQuery = tab === 'ranking' ? ranking : history;
  const refetchActive = tab === 'ranking' ? ranking.refetch : history.refetch;
  const totalPages = activeQuery.data?.totalPages ?? 1;
  React.useEffect(() => {
    void refetchActive();
  }, [refetchActive, tab]);
  React.useEffect(() => {
    const timer = window.setInterval(() => setScenario(getScenario()), 250);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section ref={dialogRef} className="board-panel log-panel" role="dialog" aria-modal="true" aria-labelledby="captain-log-title" tabIndex={-1}>
        <button className="icon-button close-button" type="button" aria-label="Close Captain's Log" onClick={onClose}><img src={uiAssets.iconClose} alt="" aria-hidden="true" /></button>
        <h2 id="captain-log-title">Captain's Log</h2>
        {scenario !== 'success' && <p className="scenario-banner" role="status">Network scenario: {scenario}<button type="button" onClick={() => { resetScenario(); void flushOutbox(); setScenario('success'); }}>Reset</button></p>}
        {tab === 'ranking' && <p className="log-subtitle">{options.sessionDurationSeconds} SECOND BATTLES · {options.enemySpawnIntervalSeconds} SECOND SPAWN INTERVAL</p>}
        <div className="tabs" role="tablist">
          <button className={`log-tab ${tab === 'ranking' ? 'log-tab-active' : ''}`} type="button" role="tab" aria-selected={tab === 'ranking'} onClick={() => { setTab('ranking'); setPage(1); }}>Ranking</button>
          <button className={`log-tab ${tab === 'history' ? 'log-tab-active' : ''}`} type="button" role="tab" aria-selected={tab === 'history'} onClick={() => { setTab('history'); setPage(1); }}>Match History</button>
        </div>
        {activeQuery.isLoading ? <p role="status">Loading...</p>
          : activeQuery.isError ? <p role="alert">Unable to load records. <button type="button" onClick={() => void activeQuery.refetch()}>Retry</button></p>
          : tab === 'ranking'
            ? <RankingTable rows={(ranking.data?.items ?? []).map((row) => ({ name: row.playerName, score: row.score, isYou: row.playerId === getPlayerId() }))} />
            : <HistoryTable rows={history.data?.items.length
              ? history.data.items.map((row) => ({ date: row.date, score: row.score, durationSeconds: row.durationSeconds, endReason: row.endReason === 'time' ? 'Time up' : 'Defeated' }))
              : (lastResult ? [lastResult] : [])} />}
        {activeQuery.isFetching && !activeQuery.isLoading && <span role="status">Refreshing...</span>}
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </section>
    </div>
  );
}
