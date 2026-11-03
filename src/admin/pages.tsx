import React, { useMemo, useState } from 'react';
import {
  CheckCircle2, XCircle, Store, MapPin, CalendarDays, Users, CreditCard, Star, LifeBuoy, FileDown, IndianRupee, BadgeCheck,
  PauseCircle, PlayCircle, TrendingUp, Clock, Eye, Trash2, Undo2, ShieldCheck, Mail, Phone, Package,
} from 'lucide-react';
import { adminApi } from './api';
import { Badge, Button, Card, Column, Empty, Modal, PageHeader, SearchBox, StatCard, Table, Tabs, fdate, fdatetime, initials, inr } from './ui';

export type Page = 'overview' | 'approvals' | 'vendors' | 'bookings' | 'customers' | 'payments' | 'reviews' | 'complaints' | 'reports' | 'settings';
export type Ctx = {
  services: any[]; vendors: any[]; bookings: any[]; payments: any[]; customers: any[]; reviews: any[]; complaints: any[];
  eventCategories: any[]; vendorCategories: any[]; stats: any;
  reload: () => Promise<void>;
  notify: (message: string, type?: 'success' | 'error') => void;
  confirm: (o: { title: string; message: string; confirmLabel?: string; danger?: boolean }) => Promise<boolean>;
  ask: (o: { title: string; message?: string; label: string; placeholder?: string; confirmLabel?: string; required?: boolean; initial?: string; multiline?: boolean }) => Promise<string | null>;
  go: (p: Page) => void;
};

const run = async (ctx: Ctx, fn: () => Promise<any>, ok: string) => {
  try { await fn(); ctx.notify(ok, 'success'); await ctx.reload(); } catch (e: any) { ctx.notify(e?.message || 'Something went wrong', 'error'); }
};

export const exportCsv = (name: string, rows: any[], notify: Ctx['notify']) => {
  if (!rows.length) { notify('There are no records to export.', 'error'); return; }
  const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r).filter((k) => !['_id', 'password', 'passwordHash'].includes(k)))));
  const esc = (v: any) => `"${String(typeof v === 'object' && v !== null ? JSON.stringify(v) : v ?? '').replace(/"/g, '""')}"`;
  const csv = [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = `eventsphere-${name}-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  notify(`Exported ${rows.length} ${name} record${rows.length === 1 ? '' : 's'}.`, 'success');
};

/* ============================================================== Overview */
export const OverviewPage: React.FC<{ ctx: Ctx }> = ({ ctx }) => {
  const { services, vendors, bookings, payments, customers, complaints } = ctx;
  const collected = payments.filter((p) => p.status === 'success').reduce((n, p) => n + Number(p.amount || 0), 0);
  const refunded = payments.filter((p) => p.status === 'refunded').reduce((n, p) => n + Number(p.amount || 0), 0);
  const pending = services.filter((s) => s.status === 'pending');
  const openComplaints = complaints.filter((c) => ['open', 'in_progress'].includes(c.status));
  const unverified = vendors.filter((v) => !v.verified && !v.suspended);

  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return {
        label: d.toLocaleDateString('en-IN', { month: 'short' }),
        bookings: bookings.filter((b) => String(b.createdAt || '').slice(0, 7) === key).length,
        revenue: payments.filter((p) => p.status === 'success' && String(p.paidAt || p.createdAt || '').slice(0, 7) === key).reduce((n, p) => n + Number(p.amount || 0), 0),
      };
    });
  }, [bookings, payments]);
  const maxRev = Math.max(1, ...months.map((m) => m.revenue));

  const statusCounts = useMemo(() => {
    const keys = ['pending', 'confirmed', 'completed', 'cancelled', 'rejected'];
    return keys.map((k) => ({ key: k, count: bookings.filter((b) => b.bookingStatus === k || (k === 'confirmed' && b.bookingStatus === 'in_progress')).length }));
  }, [bookings]);
  const totalBookings = Math.max(1, bookings.length);
  const recentBookings = [...bookings].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 6);
  const recentPayments = [...payments].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 6);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="A live overview of marketplace activity, revenue and items that need your attention." />
      <div className="stats">
        <StatCard label="Revenue collected" value={inr(collected)} icon={<IndianRupee />} tone="green" hint={refunded ? `${inr(refunded)} refunded` : 'Verified payments'} />
        <StatCard label="Total bookings" value={bookings.length} icon={<CalendarDays />} tone="blue" hint={`${bookings.filter((b) => b.bookingStatus === 'pending').length} awaiting vendors`} />
        <StatCard label="Active vendors" value={vendors.filter((v) => !v.suspended).length} icon={<Store />} tone="violet" hint={`${vendors.filter((v) => v.verified).length} verified`} />
        <StatCard label="Customers" value={customers.length} icon={<Users />} tone="rose" />
        <StatCard label="Pending approvals" value={pending.length} icon={<Clock />} tone="amber" hint="Service listings" />
        <StatCard label="Open complaints" value={openComplaints.length} icon={<LifeBuoy />} tone="red" hint="Need a response" />
      </div>

      <div className="grid-2">
        <Card title="Revenue & bookings" subtitle="Last 6 months, based on verified payments">
          <div className="chart">
            {months.map((m) => (
              <div key={m.label} className="chart-col">
                <span className="chart-val">{m.revenue ? inr(m.revenue) : ''}</span>
                <div className="chart-bar-wrap"><div className="chart-bar" style={{ height: `${Math.max(m.revenue ? 6 : 2, (m.revenue / maxRev) * 100)}%`, opacity: m.revenue ? 1 : 0.25 }} /></div>
                <b>{m.label}</b><small>{m.bookings} booking{m.bookings === 1 ? '' : 's'}</small>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Booking status" subtitle={`${bookings.length} total`}>
          <div className="stack-bar">{statusCounts.map((s) => s.count > 0 && <i key={s.key} className={`seg-${s.key}`} style={{ width: `${(s.count / totalBookings) * 100}%` }} title={`${s.key}: ${s.count}`} />)}</div>
          <ul className="legend">{statusCounts.map((s) => <li key={s.key}><i className={`seg-${s.key}`} />{s.key}<b>{s.count}</b></li>)}</ul>
        </Card>
      </div>

      <div className="grid-3">
        <Card title="Needs attention" action={<Button size="sm" onClick={() => ctx.go('approvals')}>Review</Button>}>
          <ul className="todo">
            <li onClick={() => ctx.go('approvals')}><span className="dot dot-amber" />{pending.length} service{pending.length === 1 ? '' : 's'} waiting for approval</li>
            <li onClick={() => ctx.go('vendors')}><span className="dot dot-blue" />{unverified.length} vendor{unverified.length === 1 ? '' : 's'} not yet verified</li>
            <li onClick={() => ctx.go('complaints')}><span className="dot dot-red" />{openComplaints.length} open complaint{openComplaints.length === 1 ? '' : 's'}</li>
            <li onClick={() => ctx.go('payments')}><span className="dot dot-green" />{payments.filter((p) => p.status === 'pending').length} payment{payments.filter((p) => p.status === 'pending').length === 1 ? '' : 's'} awaiting confirmation</li>
          </ul>
        </Card>
        <Card title="Recent bookings" action={<Button size="sm" onClick={() => ctx.go('bookings')}>View all</Button>} className="span-2" pad={false}>
          {recentBookings.length === 0 ? <Empty title="No bookings yet" /> : (
            <div className="mini-list">{recentBookings.map((b) => (
              <div key={b.id} className="mini-row"><div className="avatar">{initials(b.customerName)}</div><div className="grow"><b>{b.customerName}</b><small>{b.vendorName} · {b.packageName}</small></div><div className="right"><b>{inr(b.totalAmount)}</b><Badge>{b.bookingStatus}</Badge></div></div>))}</div>
          )}
        </Card>
      </div>

      <Card title="Recent payments" action={<Button size="sm" onClick={() => ctx.go('payments')}>View all</Button>} pad={false}>
        {recentPayments.length === 0 ? <Empty title="No payments yet" text="Payments appear here as customers pay." /> : (
          <div className="mini-list">{recentPayments.map((p) => (
            <div key={p.id} className="mini-row"><div className="avatar avatar-green"><CreditCard /></div><div className="grow"><b>{p.bookingReference || p.bookingId}</b><small>{p.vendorName || p.vendorId} · {p.provider || 'gateway'} · {fdate(p.paidAt || p.createdAt)}</small></div><div className="right"><b>{inr(p.amount)}</b><Badge>{p.status}</Badge></div></div>))}</div>
        )}
      </Card>
    </>
  );
};

/* ============================================================ Approvals */
export const ApprovalsPage: React.FC<{ ctx: Ctx }> = ({ ctx }) => {
  const [tab, setTab] = useState('pending');
  const [q, setQ] = useState('');
  const vendorName = (id: string) => ctx.vendors.find((v) => v.id === id)?.businessName || id;
  const counts = (s: string) => ctx.services.filter((x) => x.status === s).length;
  const list = ctx.services.filter((s) => (tab === 'all' || s.status === tab) && `${s.serviceName} ${s.categoryName} ${s.city} ${vendorName(s.vendorId)}`.toLowerCase().includes(q.toLowerCase()));

  const approve = (s: any) => run(ctx, () => adminApi.approve(s.id), `“${s.serviceName}” is now live.`);
  const reject = async (s: any) => {
    const reason = await ctx.ask({ title: 'Reject service', message: `Tell ${vendorName(s.vendorId)} what to fix so they can resubmit.`, label: 'Reason', placeholder: 'e.g. Please add clearer photos and the price breakdown.', confirmLabel: 'Reject service', multiline: true });
    if (reason === null) return;
    run(ctx, () => adminApi.reject(s.id, reason || 'Please update the service information and resubmit.'), 'Service rejected. The vendor has been notified.');
  };

  return (
    <>
      <PageHeader title="Service approvals" subtitle="Review listings before they appear to customers." actions={<SearchBox value={q} onChange={setQ} placeholder="Search service, vendor, city" />} />
      <Tabs value={tab} onChange={setTab} items={[{ id: 'pending', label: 'Pending', count: counts('pending') }, { id: 'approved', label: 'Approved', count: counts('approved') }, { id: 'rejected', label: 'Rejected', count: counts('rejected') }, { id: 'all', label: 'All', count: ctx.services.length }]} />
      {list.length === 0 ? <Card><Empty icon={<CheckCircle2 />} title={tab === 'pending' ? 'All caught up' : 'No services here'} text={tab === 'pending' ? 'New vendor submissions will appear here for review.' : 'Try a different filter.'} /></Card> : (
        <div className="svc-grid">{list.map((s) => {
          const imgs = [s.coverImage, ...(s.images || [])].filter(Boolean).slice(0, 4);
          return (
            <article key={s.id} className="svc">
              <div className={`svc-photos n${Math.max(1, imgs.length)}`}>{imgs.length ? imgs.map((img: string, i: number) => <img key={i} src={img} alt={s.serviceName} />) : <div className="svc-noimg">No photos</div>}</div>
              <div className="svc-body">
                <div className="svc-top"><div><Badge>{s.status}</Badge><h3>{s.serviceName}</h3><p className="muted"><Store /> {vendorName(s.vendorId)}</p></div><div className="svc-price">{inr(s.price)}</div></div>
                <p className="svc-desc">{s.description}</p>
                <div className="meta"><span><MapPin />{s.city}</span><span><Package />{s.categoryName}</span></div>
                <div className="chips">{(s.eventTypes || []).slice(0, 6).map((x: string) => <span key={x}>{x}</span>)}</div>
                <p className="included"><b>Included:</b> {(s.includedServices || []).join(', ') || 'Not specified'}</p>
                {s.status === 'rejected' && s.rejectionReason && <p className="note-red">Reason: {s.rejectionReason}</p>}
                {s.status === 'pending' && <div className="svc-actions"><Button variant="success" icon={<CheckCircle2 />} onClick={() => approve(s)}>Approve & publish</Button><Button variant="danger" icon={<XCircle />} onClick={() => reject(s)}>Reject</Button></div>}
              </div>
            </article>
          );
        })}</div>
      )}
    </>
  );
};

/* ============================================================== Vendors */
export const VendorsPage: React.FC<{ ctx: Ctx }> = ({ ctx }) => {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<any | null>(null);
  const [details, setDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const open = async (v: any) => {
    setSelected(v); setDetails(null); setLoadingDetails(true);
    try { setDetails(await adminApi.vendorDetails(v.id)); } catch (e: any) { ctx.notify(e.message || 'Unable to load vendor details', 'error'); } finally { setLoadingDetails(false); }
  };
  const toggleVerify = (v: any) => run(ctx, () => adminApi.verifyVendor(v.id, !v.verified), v.verified ? 'Verification revoked.' : `${v.businessName} is now verified.`);
  const toggleSuspend = async (v: any) => {
    if (v.suspended) return run(ctx, () => adminApi.suspendVendor(v.id, false, ''), `${v.businessName} reactivated.`);
    const reason = await ctx.ask({ title: 'Suspend vendor', message: 'Their listings will be hidden from customers until reactivated.', label: 'Reason', placeholder: 'e.g. Policy review', initial: 'Policy review', confirmLabel: 'Suspend vendor' });
    if (reason === null) return;
    run(ctx, () => adminApi.suspendVendor(v.id, true, reason || 'Admin review'), `${v.businessName} suspended.`);
  };
  const removeService = async (s: any) => {
    if (!(await ctx.confirm({ title: 'Remove service', message: `Remove “${s.serviceName}” from the marketplace? Existing bookings and payment history are kept.`, confirmLabel: 'Remove service', danger: true }))) return;
    try { await adminApi.removeService(s.id); ctx.notify('Service removed.', 'success'); if (selected) await open(selected); await ctx.reload(); } catch (e: any) { ctx.notify(e.message || 'Unable to remove service', 'error'); }
  };

  const rows = ctx.vendors.filter((v) => {
    const text = `${v.businessName} ${v.email} ${v.categoryName} ${v.city}`.toLowerCase().includes(q.toLowerCase());
    const f = filter === 'all' || (filter === 'verified' && v.verified && !v.suspended) || (filter === 'unverified' && !v.verified && !v.suspended) || (filter === 'suspended' && v.suspended);
    return text && f;
  });
  const cols: Column<any>[] = [
    { key: 'name', label: 'Business', sort: (v) => String(v.businessName).toLowerCase(), render: (v) => <div className="cell-user"><div className="avatar">{initials(v.businessName)}</div><div><button className="link" onClick={(e) => { e.stopPropagation(); open(v); }}>{v.businessName}</button><small>{v.email}</small></div></div> },
    { key: 'cat', label: 'Category', sort: (v) => String(v.categoryName), render: (v) => <>{v.categoryName}<small>{v.subcategory}</small></> },
    { key: 'city', label: 'City', sort: (v) => String(v.city), render: (v) => v.city },
    { key: 'rating', label: 'Rating', sort: (v) => Number(v.rating || 0), render: (v) => <span className="rating"><Star />{Number(v.rating || 0).toFixed(1)}<small>({v.reviewCount || 0})</small></span> },
    { key: 'status', label: 'Status', render: (v) => <div className="badges">{v.suspended ? <Badge>suspended</Badge> : <Badge tone="green">active</Badge>}{v.verified ? <Badge tone="blue">verified</Badge> : <Badge tone="amber">unverified</Badge>}</div> },
    { key: 'actions', label: 'Actions', align: 'right', render: (v) => (
      <div className="row-actions" onClick={(e) => e.stopPropagation()}>
        <Button size="sm" icon={<Eye />} onClick={() => open(v)}>View</Button>
        <Button size="sm" icon={v.verified ? <Undo2 /> : <BadgeCheck />} onClick={() => toggleVerify(v)}>{v.verified ? 'Unverify' : 'Verify'}</Button>
        <Button size="sm" variant={v.suspended ? 'success' : 'danger'} icon={v.suspended ? <PlayCircle /> : <PauseCircle />} onClick={() => toggleSuspend(v)}>{v.suspended ? 'Reactivate' : 'Suspend'}</Button>
      </div>) },
  ];

  return (
    <>
      <PageHeader title="Vendors" subtitle="Verify businesses, review earnings and suspend accounts when needed." actions={<SearchBox value={q} onChange={setQ} placeholder="Search name, email, category, city" />} />
      <Tabs value={filter} onChange={setFilter} items={[{ id: 'all', label: 'All', count: ctx.vendors.length }, { id: 'verified', label: 'Verified' }, { id: 'unverified', label: 'Unverified' }, { id: 'suspended', label: 'Suspended' }]} />
      <Card pad={false}><Table rows={rows} columns={cols} onRowClick={open} /></Card>

      <Modal open={!!selected} onClose={() => { setSelected(null); setDetails(null); }} title={selected?.businessName || 'Vendor'} wide>
        {selected && (
          <>
            <div className="vd-head"><div className="avatar avatar-lg">{initials(selected.businessName)}</div><div><h4>{selected.businessName}</h4><p className="muted"><Mail /> {selected.email} {selected.phone && <><Phone /> {selected.phone}</>}</p><p className="muted"><MapPin /> {selected.city} · {selected.categoryName}</p></div></div>
            {loadingDetails ? <p className="muted pad">Loading vendor details…</p> : details && (
              <>
                <div className="stats stats-4">
                  <StatCard label="Services" value={details.summary?.serviceCount || 0} icon={<Package />} tone="violet" />
                  <StatCard label="Bookings" value={details.summary?.bookingCount || 0} icon={<CalendarDays />} tone="blue" />
                  <StatCard label="Collected" value={inr(details.summary?.paymentsCollected)} icon={<TrendingUp />} tone="green" />
                  <StatCard label="Refunded" value={inr(details.summary?.refunded)} icon={<Undo2 />} tone="amber" />
                </div>
                <h4 className="sub">Services & earnings</h4>
                {!(details.services || []).length ? <p className="muted">No services listed for this vendor.</p> : (details.services || []).map((s: any) => (
                  <div key={s.id} className="vd-service">
                    {s.coverImage ? <img src={s.coverImage} alt="" /> : <div className="vd-noimg"><Package /></div>}
                    <div className="grow"><b>{s.serviceName}</b><small>{s.categoryName} · {inr(s.price)} · <Badge>{s.status}</Badge></small><small>{s.bookingCount || 0} bookings · Collected {inr(s.grossCollected)} · Refunds {inr(s.refunds)} · Net {inr(s.netCollected ?? Math.max(0, Number(s.grossCollected || 0) - Number(s.refunds || 0)))}</small></div>
                    {s.status !== 'removed' && <Button size="sm" variant="danger" icon={<Trash2 />} onClick={() => removeService(s)}>Remove</Button>}
                  </div>))}
              </>
            )}
          </>
        )}
      </Modal>
    </>
  );
};

/* ============================================================= Bookings */
export const BookingsPage: React.FC<{ ctx: Ctx }> = ({ ctx }) => {
  const [q, setQ] = useState(''); const [status, setStatus] = useState('all'); const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const rows = ctx.bookings.filter((b) => {
    const d = String(b.createdAt || '').slice(0, 10);
    return (!from || d >= from) && (!to || d <= to) && (status === 'all' || b.bookingStatus === status) && `${b.bookingReference} ${b.customerName} ${b.vendorName} ${b.packageName}`.toLowerCase().includes(q.toLowerCase());
  }).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const cols: Column<any>[] = [
    { key: 'ref', label: 'Reference', sort: (b) => b.bookingReference, render: (b) => <b>{b.bookingReference}</b> },
    { key: 'cust', label: 'Customer', sort: (b) => String(b.customerName), render: (b) => <>{b.customerName}<small>{b.customerEmail}</small></> },
    { key: 'vendor', label: 'Vendor / service', sort: (b) => String(b.vendorName), render: (b) => <>{b.vendorName}<small>{b.packageName}</small></> },
    { key: 'date', label: 'Event date', sort: (b) => String(b.eventDate), render: (b) => <>{fdate(b.eventDate)}<small>{b.startTime || ''}</small></> },
    { key: 'status', label: 'Booking', render: (b) => <Badge>{b.bookingStatus}</Badge> },
    { key: 'pay', label: 'Payment', render: (b) => <Badge>{b.paymentStatus}</Badge> },
    { key: 'amt', label: 'Paid / total', align: 'right', sort: (b) => Number(b.totalAmount || 0), render: (b) => <><b>{inr(b.paidAmount)}</b><small>of {inr(b.totalAmount)}</small></> },
  ];
  return (
    <>
      <PageHeader title="Bookings" subtitle="All customer bookings across the marketplace." actions={<Button icon={<FileDown />} onClick={() => exportCsv('bookings', rows, ctx.notify)}>Export CSV</Button>} />
      <div className="filters">
        <SearchBox value={q} onChange={setQ} placeholder="Search reference, customer, vendor" />
        <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option>{['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select>
        <label>From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label>To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>
      <Card pad={false}><Table rows={rows} columns={cols} /></Card>
    </>
  );
};

/* ============================================================ Customers */
export const CustomersPage: React.FC<{ ctx: Ctx }> = ({ ctx }) => {
  const [q, setQ] = useState('');
  const rows = ctx.customers.filter((c) => `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(q.toLowerCase())).map((c) => {
    const mine = ctx.bookings.filter((b) => b.customerId === c.id);
    return { ...c, bookingCount: mine.length, spent: mine.reduce((n, b) => n + Number(b.paidAmount || 0), 0) };
  });
  const cols: Column<any>[] = [
    { key: 'name', label: 'Customer', sort: (c) => String(c.name).toLowerCase(), render: (c) => <div className="cell-user"><div className="avatar">{initials(c.name)}</div><div><b>{c.name}</b><small>{c.email}</small></div></div> },
    { key: 'phone', label: 'Phone', render: (c) => c.phone || '—' },
    { key: 'joined', label: 'Joined', sort: (c) => String(c.createdAt || ''), render: (c) => fdate(c.createdAt) },
    { key: 'bookings', label: 'Bookings', align: 'center', sort: (c) => c.bookingCount, render: (c) => c.bookingCount },
    { key: 'spent', label: 'Total paid', align: 'right', sort: (c) => c.spent, render: (c) => <b>{inr(c.spent)}</b> },
  ];
  return (
    <>
      <PageHeader title="Customers" subtitle={`${ctx.customers.length} registered customers.`} actions={<><SearchBox value={q} onChange={setQ} placeholder="Search name, email, phone" /><Button icon={<FileDown />} onClick={() => exportCsv('customers', rows, ctx.notify)}>Export CSV</Button></>} />
      <Card pad={false}><Table rows={rows} columns={cols} /></Card>
    </>
  );
};

/* ============================================================= Payments */
export const PaymentsPage: React.FC<{ ctx: Ctx }> = ({ ctx }) => {
  const [q, setQ] = useState(''); const [status, setStatus] = useState('all');
  const vendorName = (p: any) => p.vendorName || ctx.vendors.find((v) => v.id === p.vendorId)?.businessName || p.vendorId;
  const customerName = (p: any) => ctx.customers.find((c) => c.id === p.customerId)?.name || p.customerId;
  const ok = ctx.payments.filter((p) => p.status === 'success');
  const collected = ok.reduce((n, p) => n + Number(p.amount || 0), 0);
  const refunded = ctx.payments.filter((p) => p.status === 'refunded').reduce((n, p) => n + Number(p.amount || 0), 0);
  const rows = ctx.payments.filter((p) => (status === 'all' || p.status === status) && `${p.bookingReference || p.bookingId} ${vendorName(p)} ${customerName(p)} ${p.provider}`.toLowerCase().includes(q.toLowerCase()));
  const refund = async (p: any) => {
    if (!(await ctx.confirm({ title: 'Issue full refund', message: `Refund ${inr(p.amount)} for ${p.bookingReference || p.bookingId} through ${p.provider}? This cannot be undone.`, confirmLabel: 'Issue refund', danger: true }))) return;
    run(ctx, () => adminApi.refund(p.id), 'Refund issued.');
  };
  const cols: Column<any>[] = [
    { key: 'date', label: 'Date', sort: (p) => String(p.paidAt || p.createdAt || ''), render: (p) => fdatetime(p.paidAt || p.createdAt) },
    { key: 'booking', label: 'Booking', sort: (p) => String(p.bookingReference || ''), render: (p) => <b>{p.bookingReference || p.bookingId}</b> },
    { key: 'cust', label: 'Customer', render: (p) => customerName(p) },
    { key: 'vendor', label: 'Vendor', render: (p) => vendorName(p) },
    { key: 'amount', label: 'Amount', align: 'right', sort: (p) => Number(p.amount || 0), render: (p) => <b>{inr(p.amount)}</b> },
    { key: 'gw', label: 'Gateway', render: (p) => <span className="cap">{p.provider || '—'}</span> },
    { key: 'status', label: 'Status', render: (p) => <Badge>{p.status}</Badge> },
    { key: 'act', label: '', align: 'right', render: (p) => p.status === 'success' && ['stripe', 'razorpay'].includes(p.provider) ? <Button size="sm" variant="danger" icon={<Undo2 />} onClick={() => refund(p)}>Refund</Button> : null },
  ];
  return (
    <>
      <PageHeader title="Payments & refunds" subtitle="Gateway payments recorded against bookings. Refunds are full refunds of that transaction." actions={<Button icon={<FileDown />} onClick={() => exportCsv('payments', rows, ctx.notify)}>Export CSV</Button>} />
      <div className="stats stats-4">
        <StatCard label="Collected" value={inr(collected)} icon={<IndianRupee />} tone="green" />
        <StatCard label="Refunded" value={inr(refunded)} icon={<Undo2 />} tone="violet" />
        <StatCard label="Successful payments" value={ok.length} icon={<CheckCircle2 />} tone="blue" />
        <StatCard label="Pending" value={ctx.payments.filter((p) => p.status === 'pending').length} icon={<Clock />} tone="amber" />
      </div>
      <div className="filters">
        <SearchBox value={q} onChange={setQ} placeholder="Search booking, customer, vendor" />
        <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option>{['success', 'pending', 'failed', 'refunded'].map((s) => <option key={s} value={s}>{s}</option>)}</select>
      </div>
      <Card pad={false}><Table rows={rows} columns={cols} /></Card>
    </>
  );
};

/* ============================================================== Reviews */
export const ReviewsPage: React.FC<{ ctx: Ctx }> = ({ ctx }) => {
  const [rating, setRating] = useState('all'); const [q, setQ] = useState('');
  const vendorName = (id: string) => ctx.vendors.find((v) => v.id === id)?.businessName || id;
  const list = ctx.reviews.filter((r) => (rating === 'all' || Math.round(r.rating) === Number(rating)) && `${r.customerName} ${r.comment} ${vendorName(r.vendorId)}`.toLowerCase().includes(q.toLowerCase()));
  const remove = async (r: any) => {
    if (!(await ctx.confirm({ title: 'Remove review', message: 'Permanently remove this review? The vendor rating will be recalculated.', confirmLabel: 'Remove review', danger: true }))) return;
    run(ctx, () => adminApi.removeReview(r.id), 'Review removed.');
  };
  return (
    <>
      <PageHeader title="Reviews" subtitle="Moderate customer reviews and remove abusive or irrelevant content." actions={<SearchBox value={q} onChange={setQ} placeholder="Search reviews" />} />
      <Tabs value={rating} onChange={setRating} items={[{ id: 'all', label: 'All', count: ctx.reviews.length }, ...[5, 4, 3, 2, 1].map((n) => ({ id: String(n), label: `${n}★` }))]} />
      {list.length === 0 ? <Card><Empty icon={<Star />} title="No reviews" text="Customer reviews will appear here." /></Card> : (
        <div className="stack">{list.map((r) => (
          <Card key={r.id}>
            <div className="review">
              <div className="avatar">{initials(r.customerName)}</div>
              <div className="grow"><div className="review-top"><b>{r.customerName}</b><span className="stars">{'★'.repeat(Math.max(0, Math.min(5, Math.round(r.rating))))}<i>{'★'.repeat(5 - Math.max(0, Math.min(5, Math.round(r.rating))))}</i></span><small>{r.date}</small></div>
                <p>{r.comment}</p><small className="muted">For {vendorName(r.vendorId)}{r.eventType ? ` · ${r.eventType}` : ''}</small>
                {r.vendorReply && <div className="reply"><b>Vendor reply</b><p>{r.vendorReply.comment}</p></div>}</div>
              <Button size="sm" variant="danger" icon={<Trash2 />} onClick={() => remove(r)}>Remove</Button>
            </div>
          </Card>))}</div>
      )}
    </>
  );
};

/* =========================================================== Complaints */
export const ComplaintsPage: React.FC<{ ctx: Ctx }> = ({ ctx }) => {
  const [tab, setTab] = useState('open');
  const [edit, setEdit] = useState<any | null>(null);
  const [status, setStatus] = useState('open'); const [note, setNote] = useState(''); const [busy, setBusy] = useState(false);
  const count = (s: string) => ctx.complaints.filter((c) => c.status === s).length;
  const list = ctx.complaints.filter((c) => tab === 'all' || c.status === tab);
  const openEdit = (c: any) => { setEdit(c); setStatus(c.status); setNote(c.adminNote || ''); };
  const save = async () => {
    if (!edit) return; setBusy(true);
    try { await adminApi.updateComplaint(edit.id, status, note); ctx.notify('Complaint updated.', 'success'); setEdit(null); await ctx.reload(); } catch (e: any) { ctx.notify(e.message || 'Could not update complaint', 'error'); } finally { setBusy(false); }
  };
  return (
    <>
      <PageHeader title="Complaints & support" subtitle="Tickets raised by customers and vendors." />
      <Tabs value={tab} onChange={setTab} items={[{ id: 'open', label: 'Open', count: count('open') }, { id: 'in_progress', label: 'In progress', count: count('in_progress') }, { id: 'resolved', label: 'Resolved', count: count('resolved') }, { id: 'closed', label: 'Closed', count: count('closed') }, { id: 'all', label: 'All', count: ctx.complaints.length }]} />
      {list.length === 0 ? <Card><Empty icon={<LifeBuoy />} title="No tickets here" text="Nothing to review in this view." /></Card> : (
        <div className="stack">{list.map((c) => (
          <Card key={c.id}>
            <div className="ticket">
              <div className="grow">
                <div className="ticket-top"><b>{c.subject}</b><Badge>{c.status}</Badge><Badge tone={c.userRole === 'vendor' ? 'violet' : 'blue'}>{c.userRole}</Badge></div>
                <p>{c.message}</p>
                <small className="muted">{c.userName} · {c.userEmail} · {fdatetime(c.createdAt)}{c.bookingId ? ` · Booking ${c.bookingId}` : ''}</small>
                {c.adminNote && <div className="reply"><b>Admin note</b><p>{c.adminNote}</p></div>}
              </div>
              <Button size="sm" onClick={() => openEdit(c)}>Update</Button>
            </div>
          </Card>))}</div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Update ticket" footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save changes'}</Button></>}>
        {edit && <div className="form">
          <p className="muted"><b>{edit.subject}</b></p>
          <label>Status<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></label>
          <label>Admin note<textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Internal note or resolution summary" /></label>
        </div>}
      </Modal>
    </>
  );
};

/* ============================================================== Reports */
export const ReportsPage: React.FC<{ ctx: Ctx }> = ({ ctx }) => {
  const items = [
    { name: 'bookings', label: 'Bookings', rows: ctx.bookings, icon: <CalendarDays /> },
    { name: 'payments', label: 'Payments', rows: ctx.payments, icon: <CreditCard /> },
    { name: 'customers', label: 'Customers', rows: ctx.customers, icon: <Users /> },
    { name: 'vendors', label: 'Vendors', rows: ctx.vendors, icon: <Store /> },
    { name: 'reviews', label: 'Reviews', rows: ctx.reviews, icon: <Star /> },
    { name: 'complaints', label: 'Complaints', rows: ctx.complaints, icon: <LifeBuoy /> },
  ];
  return (
    <>
      <PageHeader title="Reports & export" subtitle="Download records as CSV for spreadsheets and reporting." />
      <div className="export-grid">{items.map((i) => (
        <div key={i.name} className="export-card"><div className="stat-icon tone-rose">{i.icon}</div><div className="grow"><b>{i.label}</b><small>{i.rows.length} record{i.rows.length === 1 ? '' : 's'}</small></div><Button icon={<FileDown />} onClick={() => exportCsv(i.name, i.rows, ctx.notify)}>CSV</Button></div>))}</div>
    </>
  );
};

/* ============================================================= Settings */
export const SettingsPage: React.FC<{ ctx: Ctx }> = ({ ctx }) => {
  const [names, setNames] = useState<Record<string, string>>({});
  const save = (kind: 'events' | 'vendors', c: any) => run(ctx, () => adminApi.updateCategory(kind, c.id, names[`${kind}:${c.id}`] ?? c.name), 'Category saved.');
  const block = (title: string, kind: 'events' | 'vendors', list: any[]) => (
    <Card title={title} subtitle="Rename how categories appear across the marketplace.">
      <div className="cat-list">{list.map((c) => (
        <div key={c.id} className="cat-row"><div className="grow"><b>{c.name}</b><small>{c.id}</small></div>
          <input aria-label={`Name for ${c.name}`} value={names[`${kind}:${c.id}`] ?? c.name} onChange={(e) => setNames((o) => ({ ...o, [`${kind}:${c.id}`]: e.target.value }))} />
          <Button size="sm" variant="primary" disabled={(names[`${kind}:${c.id}`] ?? c.name).trim().length < 2 || (names[`${kind}:${c.id}`] ?? c.name) === c.name} onClick={() => save(kind, c)}>Save</Button></div>))}</div>
    </Card>
  );
  return (
    <>
      <PageHeader title="Settings" subtitle="Marketplace configuration." />
      <div className="note"><ShieldCheck /><div><b>Security reminder</b><p>Gateway keys, JWT secret and admin credentials stay in server environment variables. Never place secrets in frontend code or commit your .env file.</p></div></div>
      <div className="grid-2">{block('Event categories', 'events', ctx.eventCategories)}{block('Vendor categories', 'vendors', ctx.vendorCategories)}</div>
      <Card title="Marketplace summary"><div className="summary"><div><b>{ctx.stats.totalUsers || ctx.customers.length}</b><span>Users</span></div><div><b>{ctx.stats.totalVendors || ctx.vendors.length}</b><span>Vendors</span></div><div><b>{ctx.stats.totalBookings || ctx.bookings.length}</b><span>Bookings</span></div><div><b>{ctx.services.length}</b><span>Service listings</span></div></div></Card>
    </>
  );
};

