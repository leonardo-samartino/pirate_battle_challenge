import * as React from 'react';
import { uiAssets } from './uiAssets';
import { useFocusTrap } from './useFocusTrap';

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
      <button type="button" onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1}>Previous</button>
      <span>PAGE {page} OF {totalPages}</span>
      <button type="button" onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page === totalPages}>Next</button>
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
}

export function CaptainLog({ onClose, lastResult }: CaptainLogProps) {
  const [tab, setTab] = React.useState<'ranking' | 'history'>('ranking');
  const [page, setPage] = React.useState(1);
  const dialogRef = useFocusTrap<HTMLElement>(onClose);
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section ref={dialogRef} className="board-panel log-panel" role="dialog" aria-modal="true" aria-labelledby="captain-log-title" tabIndex={-1}>
        <button className="icon-button close-button" type="button" aria-label="Close Captain's Log" onClick={onClose}><img src={uiAssets.iconClose} alt="" aria-hidden="true" /></button>
        <h2 id="captain-log-title">Captain's Log</h2>
        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'ranking'} onClick={() => { setTab('ranking'); setPage(1); }}>Ranking</button>
          <button type="button" role="tab" aria-selected={tab === 'history'} onClick={() => { setTab('history'); setPage(1); }}>Match History</button>
        </div>
        {tab === 'ranking'
          ? <RankingTable rows={[]} />
          : <HistoryTable rows={lastResult ? [lastResult] : []} />}
        <Pagination page={page} totalPages={1} onChange={setPage} />
      </section>
    </div>
  );
}
