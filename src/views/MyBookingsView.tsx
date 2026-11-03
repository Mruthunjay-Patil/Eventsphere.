import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays, MapPin, Clock3, ClipboardList, RefreshCw, CheckCircle2, CreditCard, Receipt, Phone, Mail,
  ChevronDown, LifeBuoy, Wallet, BadgeCheck, CircleDashed, XCircle, FileText,
} from 'lucide-react';
import { api } from '../services/api';
import { Booking } from '../types';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../config/brand';

type Filter = 'all' | 'upcoming' | 'due' | 'paid';

const money = (n: unknown) => formatCurrency(Number(n) || 0);
const when = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};
const dateOnly = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
const providerLabel = (p?: string) => (p === 'razorpay' ? 'Razorpay' : p === 'stripe' ? 'Stripe' : p ? p : 'Online payment');

const paymentState = (b: Booking) => {
  const total = Number(b.totalAmount) || 0;
  const paid = Number(b.paidAmount) || 0;
  const balance = Math.max(0, Number(b.balanceAmount ?? total - paid));
  if (b.paymentStatus === 'refunded') return { key: 'refunded', label: 'Refunded', tone: 'bg-stone-100 text-stone-700', total, paid, balance };
  if (balance <= 0 && paid > 0) return { key: 'paid', label: 'Paid in full', tone: 'bg-emerald-50 text-emerald-700', total, paid, balance };
  if (paid > 0) return { key: 'partial', label: 'Partially paid', tone: 'bg-sky-50 text-sky-700', total, paid, balance };
  return { key: 'pending', label: 'Payment pending', tone: 'bg-amber-50 text-amber-700', total, paid, balance };
};

const statusTone = (s: string) =>
  s === 'confirmed' || s === 'completed' ? 'bg-emerald-50 text-emerald-700'
    : s === 'rejected' || s === 'cancelled' ? 'bg-rose-50 text-rose-700'
      : 'bg-amber-50 text-amber-700';

export const MyBookingsView: React.FC = () => {
  const { currentUser, navigateTo, showToast, openCheckoutModal, openInvoiceModal } = useApp();
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [justPaid, setJustPaid] = useState<{ amount: number; ref: string } | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportBookingId, setSupportBookingId] = useState('');
  const [supportBusy, setSupportBusy] = useState(false);
  const confirmedOnce = useRef(false);
  // showToast is recreated on every render by the app context, so keep it in a ref to avoid re-running effects.
  const toastRef = useRef(showToast);
  toastRef.current = showToast;

  const submitSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupportBusy(true);
    try {
      await api.createComplaint({ subject: supportSubject, message: supportMessage, bookingId: supportBookingId || undefined });
      showToast('Support request sent', 'The EventSphere admin team has been notified.', 'success');
      setSupportOpen(false); setSupportSubject(''); setSupportMessage(''); setSupportBookingId('');
    } catch (error: any) {
      showToast('Could not send support request', error.message, 'error');
    } finally { setSupportBusy(false); }
  };

  const loadBookings = useCallback((silent = false) => {
    if (!currentUser) { setLoading(false); return Promise.resolve(); }
    if (!silent) setLoading(true);
    return api.getBookings().then(setItems).catch((e: any) => toastRef.current('Could not load bookings', e.message, 'error')).finally(() => setLoading(false));
  }, [currentUser]);

  // When the customer comes back from Stripe, confirm the payment with Stripe directly so it is recorded
  // immediately (no webhook required), then refresh and show a success banner.
  useEffect(() => {
    if (!currentUser || confirmedOnce.current) return;
    const params = new URLSearchParams(window.location.search);
    const state = params.get('payment');
    if (!state) return;
    confirmedOnce.current = true;
    const cleanUrl = () => window.history.replaceState(window.history.state, '', '/?view=my-bookings');
    if (state === 'cancelled') { toastRef.current('Payment cancelled', 'No money was taken. You can try again any time.', 'error'); cleanUrl(); return; }
    const sessionId = params.get('session_id') || undefined;
    (async () => {
      try {
        const before = await api.getBookings().catch(() => [] as Booking[]);
        const beforePaid = before.reduce((sum, b) => sum + (Number(b.paidAmount) || 0), 0);
        if (sessionId) await api.confirmStripePayments(sessionId);
        const after = await api.getBookings();
        setItems(after);
        setLoading(false);
        const afterPaid = after.reduce((sum, b) => sum + (Number(b.paidAmount) || 0), 0);
        if (afterPaid > beforePaid || state === 'success') {
          const latest = [...after].filter((b) => (b.payments || []).length).sort((a, b) => String(b.paymentDate).localeCompare(String(a.paymentDate)))[0];
          setJustPaid({ amount: afterPaid - beforePaid > 0 ? afterPaid - beforePaid : Number(latest?.paidAmount) || 0, ref: latest?.bookingReference || '' });
          if (latest) setOpenId(latest.id);
          toastRef.current('Payment successful', 'Your payment has been recorded.', 'success');
        } else {
          toastRef.current('Payment is being verified', 'It can take a few seconds. Use Refresh statuses if it does not update.', 'error');
        }
      } catch (error: any) {
        toastRef.current('Could not confirm payment', error?.message || 'Please tap Refresh statuses.', 'error');
      } finally { cleanUrl(); }
    })();
  }, [currentUser]);

  useEffect(() => {
    loadBookings();
    const onFocus = () => loadBookings(true);
    const onVisible = () => { if (document.visibilityState === 'visible') loadBookings(true); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(() => loadBookings(true), 20000);
    return () => { window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onVisible); window.clearInterval(timer); };
  }, [loadBookings]);

  const refresh = async () => {
    try { await api.confirmStripePayments(); } catch { /* best effort */ }
    await loadBookings();
  };

  const totals = useMemo(() => {
    const active = items.filter((b) => !['cancelled', 'rejected'].includes(b.bookingStatus));
    return {
      count: items.length,
      paid: active.reduce((s, b) => s + (Number(b.paidAmount) || 0), 0),
      due: active.reduce((s, b) => s + Math.max(0, Number(b.balanceAmount ?? b.totalAmount) || 0), 0),
    };
  }, [items]);

  const today = new Date().toISOString().slice(0, 10);
  const visible = items.filter((b) => {
    const ps = paymentState(b);
    if (filter === 'upcoming') return b.eventDate >= today && !['cancelled', 'rejected', 'completed'].includes(b.bookingStatus);
    if (filter === 'due') return ps.balance > 0 && !['cancelled', 'rejected'].includes(b.bookingStatus);
    if (filter === 'paid') return ps.key === 'paid';
    return true;
  });

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: `All (${items.length})` },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'due', label: 'Payment due' },
    { id: 'paid', label: 'Paid' },
  ];

  const timelineSteps = (b: Booking) => {
    const ps = paymentState(b);
    const cancelled = ['cancelled', 'rejected'].includes(b.bookingStatus);
    return [
      { label: 'Requested', done: true, note: dateOnly(b.createdAt) },
      { label: cancelled ? (b.bookingStatus === 'rejected' ? 'Declined' : 'Cancelled') : 'Confirmed', done: cancelled || ['confirmed', 'in_progress', 'completed'].includes(b.bookingStatus), failed: cancelled, note: '' },
      { label: ps.key === 'paid' ? 'Paid in full' : ps.paid > 0 ? 'Advance paid' : 'Payment', done: ps.paid > 0, note: ps.paid > 0 ? money(ps.paid) : 'Pending' },
      { label: 'Event day', done: b.bookingStatus === 'completed', note: dateOnly(b.eventDate) },
    ];
  };

  return (
    <div className="min-h-screen bg-[#fafafa] py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <button onClick={() => navigateTo('home')} className="text-sm text-[#ef4563] mb-4">← Back to EventSphere</button>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">My Bookings</h1>
            <p className="text-sm text-stone-500 mt-2">Track booking progress, verified payments, amount paid and remaining balance.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={refresh} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-xs font-semibold text-stone-600"><RefreshCw className="h-3.5 w-3.5" /> Refresh statuses</button>
            <button onClick={() => setSupportOpen((v) => !v)} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-xs font-semibold text-[#78283F]"><LifeBuoy className="h-3.5 w-3.5" /> Contact support</button>
          </div>
        </div>

        {justPaid && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 flex items-start gap-4">
            <div className="rounded-full bg-emerald-500 p-2 text-white"><CheckCircle2 className="h-6 w-6" /></div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-emerald-900">Payment successful</h2>
              <p className="text-sm text-emerald-800 mt-1">
                {justPaid.amount > 0 ? <>We received <b>{money(justPaid.amount)}</b>{justPaid.ref ? <> for booking <b>{justPaid.ref}</b></> : null}. </> : null}
                Your vendor and the EventSphere team can now see this payment. A receipt is available on the booking below.
              </p>
            </div>
            <button onClick={() => setJustPaid(null)} className="text-emerald-700 text-xs font-semibold">Dismiss</button>
          </div>
        )}

        {supportOpen && (
          <form onSubmit={submitSupport} className="mt-4 rounded-2xl border border-[#F04468]/25 bg-white p-4 sm:p-5 space-y-3">
            <h2 className="font-semibold">Report an issue</h2>
            <input required minLength={4} maxLength={160} value={supportSubject} onChange={(e) => setSupportSubject(e.target.value)} placeholder="Subject" className="w-full rounded-xl border px-3 py-2.5 text-sm" />
            <select value={supportBookingId} onChange={(e) => setSupportBookingId(e.target.value)} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm">
              <option value="">General issue (no booking)</option>
              {items.map((b) => <option key={b.id} value={b.id}>{b.bookingReference} · {b.packageName}</option>)}
            </select>
            <textarea required minLength={10} maxLength={4000} value={supportMessage} onChange={(e) => setSupportMessage(e.target.value)} placeholder="Describe the issue (at least 10 characters)" className="min-h-28 w-full rounded-xl border px-3 py-2.5 text-sm" />
            <button disabled={supportBusy} className="rounded-xl bg-[#ef4563] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{supportBusy ? 'Sending...' : 'Send to support'}</button>
          </form>
        )}

        {!loading && items.length > 0 && (
          <>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-stone-200 bg-white p-4 flex items-center gap-3"><div className="rounded-xl bg-rose-50 p-2.5 text-[#ef4563]"><ClipboardList className="h-5 w-5" /></div><div><p className="text-xs text-stone-500">Total bookings</p><p className="text-xl font-bold">{totals.count}</p></div></div>
              <div className="rounded-2xl border border-stone-200 bg-white p-4 flex items-center gap-3"><div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600"><BadgeCheck className="h-5 w-5" /></div><div><p className="text-xs text-stone-500">Total paid</p><p className="text-xl font-bold text-emerald-700">{money(totals.paid)}</p></div></div>
              <div className="rounded-2xl border border-stone-200 bg-white p-4 flex items-center gap-3"><div className="rounded-xl bg-amber-50 p-2.5 text-amber-600"><Wallet className="h-5 w-5" /></div><div><p className="text-xs text-stone-500">Balance to pay</p><p className="text-xl font-bold text-stone-800">{money(totals.due)}</p></div></div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {filters.map((f) => (
                <button key={f.id} onClick={() => setFilter(f.id)} className={`rounded-full px-4 py-1.5 text-xs font-semibold border ${filter === f.id ? 'bg-[#ef4563] border-[#ef4563] text-white' : 'bg-white border-stone-200 text-stone-600 hover:border-[#ef4563]/40'}`}>{f.label}</button>
              ))}
            </div>
          </>
        )}

        {loading ? (
          <div className="mt-8 bg-white border rounded-2xl p-10 text-center text-stone-500">Loading your bookings…</div>
        ) : items.length === 0 ? (
          <div className="mt-8 bg-white border border-stone-200 rounded-2xl p-12 text-center">
            <ClipboardList className="w-10 h-10 mx-auto text-[#ef4563]" />
            <h2 className="font-semibold text-lg mt-3">No bookings yet</h2>
            <p className="text-sm text-stone-500 mt-1">When you reserve a service, it will appear here.</p>
            <button onClick={() => navigateTo('vendors')} className="mt-5 bg-[#ef4563] text-white rounded-xl px-5 py-3 text-sm font-semibold">Explore services</button>
          </div>
        ) : visible.length === 0 ? (
          <div className="mt-6 bg-white border border-stone-200 rounded-2xl p-10 text-center text-sm text-stone-500">No bookings match this filter.</div>
        ) : (
          <div className="mt-5 space-y-4">
            {visible.map((b) => {
              const ps = paymentState(b);
              const pct = ps.total > 0 ? Math.min(100, Math.round((ps.paid / ps.total) * 100)) : 0;
              const open = openId === b.id;
              const canPay = ps.balance > 0 && !['cancelled', 'rejected', 'completed'].includes(b.bookingStatus);
              const history = b.payments || [];
              return (
                <article key={b.id} className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
                  <div className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-semibold text-lg">{b.packageName}</h2>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusTone(b.bookingStatus)}`}>{b.bookingStatus.replace('_', ' ')}</span>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ps.tone}`}>{ps.label}</span>
                      </div>
                      <p className="text-sm text-stone-600 mt-1">{b.vendorName}{b.vendorCategory ? ` · ${b.vendorCategory}` : ''}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-stone-500 mt-3">
                        <span className="flex items-center gap-1"><CalendarDays className="w-4 h-4" />{dateOnly(b.eventDate)}</span>
                        <span className="flex items-center gap-1"><Clock3 className="w-4 h-4" />{b.startTime || 'Time pending'}{b.endTime ? `–${b.endTime}` : ''}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{b.serviceAddress || 'Location not added'}</span>
                      </div>
                    </div>
                    <div className="sm:text-right shrink-0">
                      <p className="text-xl font-semibold text-[#ef4563]">{money(b.totalAmount)}</p>
                      <p className="text-xs text-stone-500 mt-1">Ref. {b.bookingReference}</p>
                      {canPay && <button onClick={() => openCheckoutModal(b)} className="mt-3 rounded-xl bg-[#F04468] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#D93256]">{ps.paid > 0 ? 'Pay balance' : 'Pay now'}</button>}
                    </div>
                  </div>

                  <div className="px-5 pb-5">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-lg bg-stone-50 p-3"><p className="text-stone-500">Total</p><p className="mt-1 font-bold text-stone-800">{money(ps.total)}</p></div>
                      <div className="rounded-lg bg-emerald-50 p-3"><p className="text-emerald-700/80">Amount paid</p><p className="mt-1 font-bold text-emerald-700">{money(ps.paid)}</p></div>
                      <div className="rounded-lg bg-stone-50 p-3"><p className="text-stone-500">Balance due</p><p className="mt-1 font-bold text-stone-800">{money(ps.balance)}</p></div>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-[11px] text-stone-500 mb-1"><span>Payment progress</span><span>{pct}% paid</span></div>
                      <div className="h-2 rounded-full bg-stone-100 overflow-hidden"><div className={`h-full rounded-full ${ps.key === 'paid' ? 'bg-emerald-500' : 'bg-[#ef4563]'}`} style={{ width: `${pct}%` }} /></div>
                    </div>
                    <button onClick={() => setOpenId(open ? null : b.id)} className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#ef4563]">
                      {open ? 'Hide details' : 'View payment & booking details'} <ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {open && (
                    <div className="border-t border-stone-100 bg-stone-50/60 p-5 space-y-5">
                      {ps.paid > 0 && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
                          <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                          <div className="text-sm">
                            <p className="font-bold text-emerald-900">{ps.key === 'paid' ? 'Payment complete' : 'Payment received'}</p>
                            <p className="text-emerald-800">{money(ps.paid)} paid{b.paymentDate ? ` on ${when(b.paymentDate)}` : ''}{b.paymentProvider ? ` via ${providerLabel(b.paymentProvider)}` : ''}.{ps.balance > 0 ? ` ${money(ps.balance)} still to pay.` : ''}</p>
                          </div>
                        </div>
                      )}

                      <div>
                        <h3 className="text-sm font-bold flex items-center gap-2"><Receipt className="h-4 w-4 text-[#ef4563]" /> Payment history</h3>
                        {history.length === 0 ? (
                          <p className="mt-2 text-sm text-stone-500">{ps.paid > 0 ? `${money(ps.paid)} recorded${b.paymentReference ? ` · Ref ${b.paymentReference}` : ''}.` : 'No payments yet.'}</p>
                        ) : (
                          <div className="mt-2 overflow-hidden rounded-xl border border-stone-200 bg-white">
                            {history.map((p) => (
                              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm border-b last:border-b-0 border-stone-100">
                                <div className="flex items-center gap-3"><CreditCard className="h-4 w-4 text-stone-400" /><div><p className="font-semibold">{money(p.amount)} <span className="font-normal text-stone-500 capitalize">· {p.plan === 'advance' ? 'advance' : p.plan === 'balance' ? 'balance' : 'full payment'}</span></p><p className="text-xs text-stone-500">{when(p.paidAt)} · {providerLabel(p.provider)}</p></div></div>
                                <div className="text-right text-xs text-stone-500"><p className="font-semibold text-emerald-700">Success</p>{p.reference && <p className="max-w-[180px] truncate" title={p.reference}>ID {p.reference}</p>}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <h3 className="text-sm font-bold">Booking progress</h3>
                        <ol className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {timelineSteps(b).map((step: any, i) => (
                            <li key={i} className="flex items-start gap-2">
                              {step.failed ? <XCircle className="h-5 w-5 text-rose-500 shrink-0" /> : step.done ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" /> : <CircleDashed className="h-5 w-5 text-stone-300 shrink-0" />}
                              <div><p className={`text-xs font-semibold ${step.done ? 'text-stone-800' : 'text-stone-400'}`}>{step.label}</p>{step.note && <p className="text-[11px] text-stone-500">{step.note}</p>}</div>
                            </li>
                          ))}
                        </ol>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4 text-sm">
                        <div className="rounded-xl bg-white border border-stone-200 p-4">
                          <h3 className="text-sm font-bold">Vendor</h3>
                          <p className="mt-1 font-semibold">{b.vendorName}</p>
                          <div className="mt-2 space-y-1.5 text-stone-600">
                            {b.vendorPhone && <a href={`tel:${b.vendorPhone}`} className="flex items-center gap-2 hover:text-[#ef4563]"><Phone className="h-4 w-4" />{b.vendorPhone}</a>}
                            {b.vendorEmail && <a href={`mailto:${b.vendorEmail}`} className="flex items-center gap-2 hover:text-[#ef4563]"><Mail className="h-4 w-4" />{b.vendorEmail}</a>}
                            {!b.vendorPhone && !b.vendorEmail && <p className="text-stone-500">Contact details appear once the vendor confirms.</p>}
                          </div>
                        </div>
                        <div className="rounded-xl bg-white border border-stone-200 p-4">
                          <h3 className="text-sm font-bold">Event details</h3>
                          <dl className="mt-2 space-y-1 text-stone-600">
                            {b.eventTitle && <div className="flex justify-between gap-3"><dt>Event</dt><dd className="font-medium text-stone-800 text-right">{b.eventTitle}</dd></div>}
                            <div className="flex justify-between gap-3"><dt>Date</dt><dd className="font-medium text-stone-800">{dateOnly(b.eventDate)}</dd></div>
                            <div className="flex justify-between gap-3"><dt>Booked on</dt><dd className="font-medium text-stone-800">{dateOnly(b.createdAt)}</dd></div>
                            {b.specialRequirements && <div><dt>Notes</dt><dd className="mt-0.5 font-medium text-stone-800">{b.specialRequirements}</dd></div>}
                          </dl>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {ps.paid > 0 && <button onClick={() => openInvoiceModal(b)} className="inline-flex items-center gap-2 rounded-xl bg-white border border-stone-200 px-4 py-2.5 text-xs font-semibold text-stone-700 hover:border-[#ef4563]/40"><FileText className="h-4 w-4" /> View invoice / receipt</button>}
                        {canPay && <button onClick={() => openCheckoutModal(b)} className="inline-flex items-center gap-2 rounded-xl bg-[#F04468] px-4 py-2.5 text-xs font-semibold text-white"><CreditCard className="h-4 w-4" /> {ps.paid > 0 ? 'Pay balance' : 'Pay now'}</button>}
                        <button onClick={() => { setSupportBookingId(b.id); setSupportSubject(`Help with booking ${b.bookingReference}`); setSupportOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="inline-flex items-center gap-2 rounded-xl bg-white border border-stone-200 px-4 py-2.5 text-xs font-semibold text-[#78283F]"><LifeBuoy className="h-4 w-4" /> Report an issue</button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
