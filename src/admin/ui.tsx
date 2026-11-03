import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpDown, Search, X, Inbox } from 'lucide-react';

export const inr = (n: unknown) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;
export const fdate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
export const fdatetime = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};
export const initials = (name?: string) => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

type Tone = 'green' | 'red' | 'amber' | 'blue' | 'gray' | 'rose' | 'violet';
const STATUS_TONE: Record<string, Tone> = {
  approved: 'green', confirmed: 'green', completed: 'green', success: 'green', verified: 'green', fully_paid: 'green', resolved: 'green', active: 'green',
  pending: 'amber', open: 'amber', advance_paid: 'blue', in_progress: 'blue', processing: 'blue',
  rejected: 'red', cancelled: 'red', failed: 'red', suspended: 'red', removed: 'red',
  refunded: 'violet', closed: 'gray',
};
export const Badge: React.FC<{ tone?: Tone; children: React.ReactNode }> = ({ tone, children }) => {
  const key = String(children ?? '').toLowerCase().replace(/\s+/g, '_');
  const t = tone || STATUS_TONE[key] || 'gray';
  return <span className={`badge badge-${t}`}>{String(children ?? '').replace(/_/g, ' ')}</span>;
};

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'success' | 'soft'; size?: 'sm' | 'md'; icon?: React.ReactNode }> = ({ variant = 'ghost', size = 'md', icon, children, className = '', ...rest }) => (
  <button {...rest} className={`btn btn-${variant} btn-${size} ${className}`}>{icon}{children}</button>
);

export const Card: React.FC<{ title?: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; pad?: boolean; className?: string }> = ({ title, subtitle, action, children, pad = true, className = '' }) => (
  <section className={`card ${className}`}>
    {(title || action) && <div className="card-head"><div>{title && <h3>{title}</h3>}{subtitle && <p>{subtitle}</p>}</div>{action}</div>}
    <div className={pad ? 'card-body' : ''}>{children}</div>
  </section>
);

export const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; tone?: Tone; hint?: string }> = ({ label, value, icon, tone = 'rose', hint }) => (
  <div className="stat">
    <div className={`stat-icon tone-${tone}`}>{icon}</div>
    <div className="stat-text"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</div>
  </div>
);

export const Empty: React.FC<{ title: string; text?: string; icon?: React.ReactNode }> = ({ title, text, icon }) => (
  <div className="empty"><div className="empty-icon">{icon || <Inbox />}</div><h4>{title}</h4>{text && <p>{text}</p>}</div>
);

export const SearchBox: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string }> = ({ value, onChange, placeholder }) => (
  <label className="searchbox"><Search /><input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || 'Search…'} />{value && <button type="button" onClick={() => onChange('')} aria-label="Clear"><X /></button>}</label>
);

export const Modal: React.FC<{ open: boolean; title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }> = ({ open, title, onClose, children, footer, wide }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-label={title}>
        <div className="modal-head"><h3>{title}</h3><button onClick={onClose} aria-label="Close"><X /></button></div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
};

export type Column<T> = { key: string; label: string; render: (row: T) => React.ReactNode; sort?: (row: T) => string | number; align?: 'right' | 'center'; width?: string };
export function Table<T extends { id?: string }>({ rows, columns, pageSize = 10, empty, onRowClick }: { rows: T[]; columns: Column<T>[]; pageSize?: number; empty?: React.ReactNode; onRowClick?: (row: T) => void }) {
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  useEffect(() => setPage(0), [rows.length]);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sort) return rows;
    return [...rows].sort((a, b) => {
      const x = col.sort!(a), y = col.sort!(b);
      return (x > y ? 1 : x < y ? -1 : 0) * sort.dir;
    });
  }, [rows, sort, columns]);
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pages - 1);
  const slice = sorted.slice(current * pageSize, current * pageSize + pageSize);
  if (!rows.length) return <>{empty || <Empty title="No records found" text="Try changing your search or filters." />}</>;
  return (
    <div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr>{columns.map((c) => (
            <th key={c.key} style={{ width: c.width, textAlign: c.align }} className={c.sort ? 'sortable' : ''} onClick={() => c.sort && setSort((s) => (s?.key === c.key ? { key: c.key, dir: (s.dir * -1) as 1 | -1 } : { key: c.key, dir: 1 }))}>
              <span>{c.label}{c.sort && <ArrowUpDown />}</span>
            </th>))}</tr></thead>
          <tbody>{slice.map((row, i) => (
            <tr key={row.id || i} className={onRowClick ? 'clickable' : ''} onClick={() => onRowClick?.(row)}>
              {columns.map((c) => <td key={c.key} style={{ textAlign: c.align }}>{c.render(row)}</td>)}
            </tr>))}</tbody>
        </table>
      </div>
      {sorted.length > pageSize && (
        <div className="pager"><span>Showing {current * pageSize + 1}–{Math.min(sorted.length, current * pageSize + pageSize)} of {sorted.length}</span>
          <div><button disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Previous page"><ChevronLeft /></button><b>{current + 1} / {pages}</b><button disabled={current >= pages - 1} onClick={() => setPage(current + 1)} aria-label="Next page"><ChevronRight /></button></div></div>
      )}
    </div>
  );
}

export const Tabs: React.FC<{ value: string; onChange: (v: string) => void; items: { id: string; label: string; count?: number }[] }> = ({ value, onChange, items }) => (
  <div className="seg">{items.map((i) => <button key={i.id} className={value === i.id ? 'on' : ''} onClick={() => onChange(i.id)}>{i.label}{i.count !== undefined && <em>{i.count}</em>}</button>)}</div>
);

export const PageHeader: React.FC<{ title: string; subtitle?: string; actions?: React.ReactNode }> = ({ title, subtitle, actions }) => (
  <div className="page-head"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{actions && <div className="page-actions">{actions}</div>}</div>
);
