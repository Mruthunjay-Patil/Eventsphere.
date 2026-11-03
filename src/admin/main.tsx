import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ShieldCheck, LogOut, LayoutDashboard, CheckCircle2, Store, CalendarDays, Users, CreditCard, Star, LifeBuoy, FileDown, Settings, RefreshCw, Menu, X, Bell, CheckCircle, AlertCircle } from 'lucide-react';
import { adminApi } from './api';
import { Button, Modal, initials } from './ui';
import { Ctx, Page, OverviewPage, ApprovalsPage, VendorsPage, BookingsPage, CustomersPage, PaymentsPage, ReviewsPage, ComplaintsPage, ReportsPage, SettingsPage } from './pages';
import './admin.css';

const TOKEN_KEY = 'eventsphere_admin_token';
type Toast = { id: number; message: string; type: 'success' | 'error' };
type Dialog =
  | { kind: 'confirm'; title: string; message: string; confirmLabel?: string; danger?: boolean; resolve: (v: boolean) => void }
  | { kind: 'ask'; title: string; message?: string; label: string; placeholder?: string; confirmLabel?: string; required?: boolean; initial?: string; multiline?: boolean; resolve: (v: string | null) => void };

const NAV: { group: string; items: { id: Page; label: string; icon: React.ElementType }[] }[] = [
  { group: 'Overview', items: [{ id: 'overview', label: 'Dashboard', icon: LayoutDashboard }] },
  { group: 'Marketplace', items: [{ id: 'approvals', label: 'Service approvals', icon: CheckCircle2 }, { id: 'vendors', label: 'Vendors', icon: Store }, { id: 'bookings', label: 'Bookings', icon: CalendarDays }, { id: 'customers', label: 'Customers', icon: Users }] },
  { group: 'Finance', items: [{ id: 'payments', label: 'Payments & refunds', icon: CreditCard }] },
  { group: 'Community', items: [{ id: 'reviews', label: 'Reviews', icon: Star }, { id: 'complaints', label: 'Complaints', icon: LifeBuoy }] },
  { group: 'System', items: [{ id: 'reports', label: 'Reports & export', icon: FileDown }, { id: 'settings', label: 'Settings', icon: Settings }] },
];
const TITLES: Record<Page, string> = { overview: 'Dashboard', approvals: 'Service approvals', vendors: 'Vendors', bookings: 'Bookings', customers: 'Customers', payments: 'Payments & refunds', reviews: 'Reviews', complaints: 'Complaints', reports: 'Reports & export', settings: 'Settings' };

function App() {
  const [logged, setLogged] = useState(!!sessionStorage.getItem(TOKEN_KEY));
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(''); const [signingIn, setSigningIn] = useState(false);
  const [page, setPage] = useState<Page>(() => (location.hash.replace('#', '') as Page) || 'overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [data, setData] = useState<any>({ services: [], vendors: [], bookings: [], payments: [], customers: [], reviews: [], complaints: [], eventCategories: [], vendorCategories: [], stats: {} });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [dialogText, setDialogText] = useState('');
  const loadedOnce = useRef(false);

  const notify = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), type === 'error' ? 6000 : 3500);
  }, []);
  const logout = useCallback(() => { sessionStorage.removeItem(TOKEN_KEY); setLogged(false); loadedOnce.current = false; }, []);

  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const [services, vendors, bookings, payments, customers, reviews, complaints, eventCategories, vendorCategories, stats] = await Promise.all([
        adminApi.services('all'), adminApi.vendors(), adminApi.bookings(), adminApi.payments(), adminApi.customers(), adminApi.reviews(), adminApi.complaints(),
        adminApi.eventCategories(), adminApi.vendorCategories(), adminApi.stats(),
      ]);
      setData({ services, vendors, bookings, payments, customers, reviews, complaints, eventCategories, vendorCategories, stats });
      loadedOnce.current = true;
    } catch (e: any) {
      const msg = String(e?.message || 'Unable to load admin records');
      if (/log in|admin access|unauthor/i.test(msg)) { logout(); setLoginError('Your session expired. Please sign in again.'); return; }
      setLoadError(msg);
    } finally { setLoading(false); }
  }, [logout]);

  useEffect(() => { if (logged) load(); }, [logged, load]);
  useEffect(() => { if (logged) location.hash = page; }, [page, logged]);
  useEffect(() => { const onHash = () => { const h = location.hash.replace('#', '') as Page; if (TITLES[h]) setPage(h); }; window.addEventListener('hashchange', onHash); return () => window.removeEventListener('hashchange', onHash); }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault(); setSigningIn(true); setLoginError('');
    try { const r = await adminApi.login(email, password); sessionStorage.setItem(TOKEN_KEY, r.token); setLogged(true); setPassword(''); }
    catch (err: any) { setLoginError(err.message || 'Sign in failed'); } finally { setSigningIn(false); }
  };

  const confirm = useCallback((o: { title: string; message: string; confirmLabel?: string; danger?: boolean }) => new Promise<boolean>((resolve) => setDialog({ kind: 'confirm', ...o, resolve })), []);
  const ask = useCallback((o: any) => new Promise<string | null>((resolve) => { setDialogText(o.initial || ''); setDialog({ kind: 'ask', ...o, resolve }); }), []);
  const closeDialog = (value: boolean | string | null) => { if (dialog) (dialog.resolve as any)(dialog.kind === 'confirm' ? !!value : (value as string | null)); setDialog(null); };

  const ctx: Ctx = useMemo(() => ({ ...data, reload: load, notify, confirm, ask, go: (p: Page) => { setPage(p); setMenuOpen(false); window.scrollTo({ top: 0 }); } }), [data, load, notify, confirm, ask]);
  const badgeFor = (id: Page) => id === 'approvals' ? data.services.filter((s: any) => s.status === 'pending').length : id === 'complaints' ? data.complaints.filter((c: any) => ['open', 'in_progress'].includes(c.status)).length : 0;

  if (!logged) {
    return (
      <div className="login-page">
        <div className="login-side"><div className="login-brand"><div className="logo"><ShieldCheck /></div><b>EventSphere</b></div><h2>Run your marketplace with confidence</h2><p>Approve vendors, track bookings and payments, and resolve issues, all in one place.</p><ul><li><CheckCircle /> Service approvals and vendor verification</li><li><CheckCircle /> Live payments, refunds and reporting</li><li><CheckCircle /> Support tickets and review moderation</li></ul></div>
        <div className="login-form-wrap"><form className="login-card" onSubmit={login}>
          <h1>Admin sign in</h1><p className="muted">Use the admin account configured on your server.</p>
          {loginError && <div className="form-error"><AlertCircle />{loginError}</div>}
          <label>Email<input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" required /></label>
          <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required /></label>
          <Button variant="primary" disabled={signingIn} className="wide">{signingIn ? 'Signing in…' : 'Sign in'}</Button>
          <p className="hint">Credentials come from ADMIN_EMAIL / ADMIN_PASSWORD in your server environment.</p>
        </form></div>
      </div>
    );
  }

  const pageEl = {
    overview: <OverviewPage ctx={ctx} />, approvals: <ApprovalsPage ctx={ctx} />, vendors: <VendorsPage ctx={ctx} />, bookings: <BookingsPage ctx={ctx} />, customers: <CustomersPage ctx={ctx} />,
    payments: <PaymentsPage ctx={ctx} />, reviews: <ReviewsPage ctx={ctx} />, complaints: <ComplaintsPage ctx={ctx} />, reports: <ReportsPage ctx={ctx} />, settings: <SettingsPage ctx={ctx} />,
  }[page] || <OverviewPage ctx={ctx} />;
  const attention = badgeFor('approvals') + badgeFor('complaints');

  return (
    <div className="shell">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="side-brand"><div className="logo"><ShieldCheck /></div><div><b>EventSphere</b><span>Admin console</span></div><button className="side-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X /></button></div>
        <nav>{NAV.map((g) => (
          <div key={g.group} className="nav-group"><span>{g.group}</span>
            {g.items.map(({ id, label, icon: Icon }) => { const n = badgeFor(id); return (
              <button key={id} className={page === id ? 'active' : ''} onClick={() => ctx.go(id)}><Icon /><em>{label}</em>{n > 0 && <i className="count">{n}</i>}</button>); })}
          </div>))}</nav>
        <div className="side-foot"><div className="avatar">{initials('Admin')}</div><div><b>Administrator</b><span>EventSphere</span></div><button onClick={logout} title="Sign out" aria-label="Sign out"><LogOut /></button></div>
      </aside>
      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} />}
      <div className="main">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu /></button>
          <div className="crumbs"><span>Admin</span><b>{TITLES[page]}</b></div>
          <div className="top-actions">
            {attention > 0 && <button className="bell" onClick={() => ctx.go(badgeFor('approvals') ? 'approvals' : 'complaints')} title={`${attention} items need attention`}><Bell /><i>{attention}</i></button>}
            <Button icon={<RefreshCw className={loading ? 'spin' : ''} />} onClick={load} disabled={loading}>{loading ? 'Refreshing' : 'Refresh'}</Button>
            <Button icon={<LogOut />} onClick={logout} className="hide-sm">Sign out</Button>
          </div>
        </header>
        <main className="content">
          {loadError && <div className="banner-error"><AlertCircle /><div><b>Couldn’t load admin data</b><p>{loadError}</p></div><Button size="sm" onClick={load}>Try again</Button></div>}
          {!loadedOnce.current && loading ? <div className="skeleton-page"><div className="sk sk-title" /><div className="sk-row">{[1, 2, 3, 4].map((i) => <div key={i} className="sk sk-card" />)}</div><div className="sk sk-block" /></div> : pageEl}
        </main>
      </div>

      <div className="toasts" aria-live="polite">{toasts.map((t) => <div key={t.id} className={`toast ${t.type}`}>{t.type === 'success' ? <CheckCircle /> : <AlertCircle />}<span>{t.message}</span></div>)}</div>

      <Modal open={!!dialog} onClose={() => closeDialog(dialog?.kind === 'confirm' ? false : null)} title={dialog?.title || ''}
        footer={dialog && <><Button onClick={() => closeDialog(dialog.kind === 'confirm' ? false : null)}>Cancel</Button>
          <Button variant={dialog.kind === 'confirm' && dialog.danger ? 'danger' : 'primary'} disabled={dialog.kind === 'ask' && !!dialog.required && !dialogText.trim()} onClick={() => closeDialog(dialog.kind === 'confirm' ? true : dialogText.trim())}>{dialog.confirmLabel || 'Confirm'}</Button></>}>
        {dialog?.kind === 'confirm' && <p className="dialog-text">{dialog.message}</p>}
        {dialog?.kind === 'ask' && <div className="form">{dialog.message && <p className="dialog-text">{dialog.message}</p>}<label>{dialog.label}{dialog.multiline ? <textarea rows={4} autoFocus value={dialogText} onChange={(e) => setDialogText(e.target.value)} placeholder={dialog.placeholder} /> : <input autoFocus value={dialogText} onChange={(e) => setDialogText(e.target.value)} placeholder={dialog.placeholder} />}</label></div>}
      </Modal>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
