import React, { useEffect, useMemo, useState } from 'react';
import { Booking, Vendor, VendorPackage, VendorReview } from '../../types';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../config/brand';
import { BadgeCheck, CreditCard, ImagePlus, LifeBuoy, MessageSquare, Plus, Save, Star, Trash2, TrendingUp, Wallet } from 'lucide-react';

const card = 'bg-white border border-stone-200 rounded-2xl shadow-sm';
const input = 'w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#ef4563] focus:ring-4 focus:ring-[#ef4563]/10';
const lbl = 'text-[11px] font-bold uppercase tracking-wide text-stone-500';
const money = (n: unknown) => formatCurrency(Number(n) || 0);

const resizeImage = (file: File, max = 1200): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = reject;
  reader.onload = () => {
    const img = new Image();
    img.onerror = reject;
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.src = String(reader.result);
  };
  reader.readAsDataURL(file);
});

/* ------------------------------------------------------------------ Earnings */
export const EarningsTab: React.FC<{ bookings: Booking[] }> = ({ bookings }) => {
  const data = useMemo(() => {
    const active = bookings.filter((b) => !['rejected', 'cancelled'].includes(b.bookingStatus));
    const rows = active.flatMap((b) => {
      const list = (b.payments || []).map((p) => ({ key: p.id, booking: b, amount: Number(p.amount) || 0, at: p.paidAt, provider: p.provider, plan: p.plan }));
      if (list.length) return list;
      return Number(b.paidAmount) > 0 ? [{ key: `${b.id}_paid`, booking: b, amount: Number(b.paidAmount), at: b.paymentDate || b.createdAt, provider: b.paymentProvider || '', plan: '' }] : [];
    }).sort((a, b) => String(b.at).localeCompare(String(a.at)));
    const paid = active.reduce((s, b) => s + (Number(b.paidAmount) || 0), 0);
    const total = active.reduce((s, b) => s + (Number(b.totalAmount) || 0), 0);
    const pending = active.filter((b) => b.bookingStatus !== 'pending').reduce((s, b) => s + Math.max(0, Number(b.balanceAmount ?? b.totalAmount) || 0), 0);
    const months: { key: string; label: string; value: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleString('en-IN', { month: 'short' }), value: 0 });
    }
    rows.forEach((r) => { const m = months.find((x) => String(r.at).startsWith(x.key)); if (m) m.value += r.amount; });
    return { rows, paid, total, pending, months, avg: active.length ? total / active.length : 0 };
  }, [bookings]);
  const max = Math.max(1, ...data.months.map((m) => m.value));
  const stats = [
    { label: 'Paid revenue', value: money(data.paid), icon: Wallet, tone: 'text-emerald-600 bg-emerald-50' },
    { label: 'Awaiting from customers', value: money(data.pending), icon: CreditCard, tone: 'text-amber-600 bg-amber-50' },
    { label: 'Total booked value', value: money(data.total), icon: TrendingUp, tone: 'text-indigo-600 bg-indigo-50' },
    { label: 'Average booking', value: money(data.avg), icon: BadgeCheck, tone: 'text-rose-600 bg-rose-50' },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className={`${card} p-5 flex items-center gap-3`}><div className={`rounded-xl p-2.5 ${tone}`}><Icon className="h-5 w-5" /></div><div><p className="text-[11px] font-bold uppercase tracking-wide text-stone-500">{label}</p><p className="text-lg font-black">{value}</p></div></div>
        ))}
      </div>
      <div className={`${card} p-6`}>
        <h2 className="text-lg font-black">Earnings, last 6 months</h2>
        <div className="mt-5 flex items-end gap-3 h-44">
          {data.months.map((m) => (
            <div key={m.key} className="flex-1 flex flex-col items-center justify-end gap-2 h-full">
              <span className="text-[10px] font-semibold text-stone-500">{m.value ? money(m.value) : ''}</span>
              <div className="w-full rounded-t-lg bg-[#ef4563]/85" style={{ height: `${Math.max(m.value ? 6 : 2, (m.value / max) * 100)}%`, opacity: m.value ? 1 : 0.2 }} />
              <span className="text-[11px] font-semibold text-stone-600">{m.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className={`${card} overflow-hidden`}>
        <div className="p-5 border-b border-stone-100"><h2 className="text-lg font-black">Payment history</h2><p className="text-xs text-stone-500 mt-1">Every payment customers have made on your bookings.</p></div>
        {data.rows.length === 0 ? <p className="p-8 text-center text-sm text-stone-500">No payments received yet. They appear here as soon as a customer pays.</p> : (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-stone-50 text-[11px] uppercase tracking-wide text-stone-500"><tr><th className="px-5 py-3 text-left">Date</th><th className="px-5 py-3 text-left">Booking</th><th className="px-5 py-3 text-left">Customer</th><th className="px-5 py-3 text-left">Method</th><th className="px-5 py-3 text-right">Amount</th></tr></thead>
            <tbody>{data.rows.map((r) => (
              <tr key={r.key} className="border-t border-stone-100">
                <td className="px-5 py-3 whitespace-nowrap text-stone-600">{r.at ? new Date(r.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                <td className="px-5 py-3 font-semibold">{r.booking.bookingReference}</td>
                <td className="px-5 py-3 text-stone-600">{r.booking.customerName}</td>
                <td className="px-5 py-3 capitalize text-stone-600">{r.provider || 'online'}{r.plan ? ` · ${r.plan}` : ''}</td>
                <td className="px-5 py-3 text-right font-bold text-emerald-700">{money(r.amount)}</td>
              </tr>))}</tbody></table></div>
        )}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------- Reviews */
export const ReviewsTab: React.FC<{ vendor: Vendor }> = ({ vendor }) => {
  const { showToast } = useApp();
  const [reviews, setReviews] = useState<VendorReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState('');
  useEffect(() => { setLoading(true); api.getReviews(vendor.id).then(setReviews).catch(() => setReviews([])).finally(() => setLoading(false)); }, [vendor.id]);
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const reply = async (id: string) => {
    const comment = (drafts[id] || '').trim();
    if (comment.length < 2) return;
    setBusyId(id);
    try { const updated = await api.replyToReview(id, comment); setReviews((list) => list.map((r) => (r.id === id ? updated : r))); setDrafts((d) => ({ ...d, [id]: '' })); showToast('Reply posted', 'Your reply is now visible on your profile.', 'success'); }
    catch (e: any) { showToast('Could not post reply', e.message, 'error'); } finally { setBusyId(''); }
  };
  return (
    <div className="space-y-5">
      <div className={`${card} p-6 grid sm:grid-cols-3 gap-6 items-center`}>
        <div><p className={lbl}>Average rating</p><p className="mt-1 text-4xl font-black">{avg ? avg.toFixed(1) : '—'}<span className="text-lg text-amber-500"> ★</span></p><p className="text-xs text-stone-500 mt-1">{reviews.length} review{reviews.length === 1 ? '' : 's'}</p></div>
        <div className="sm:col-span-2 space-y-1.5">{[5, 4, 3, 2, 1].map((n) => { const c = reviews.filter((r) => Math.round(r.rating) === n).length; return (
          <div key={n} className="flex items-center gap-3 text-xs"><span className="w-6 font-semibold">{n}★</span><div className="flex-1 h-2 rounded-full bg-stone-100 overflow-hidden"><div className="h-full bg-amber-400" style={{ width: `${reviews.length ? (c / reviews.length) * 100 : 0}%` }} /></div><span className="w-6 text-right text-stone-500">{c}</span></div>); })}</div>
      </div>
      {loading ? <div className={`${card} p-10 text-center text-sm text-stone-500`}>Loading reviews…</div> : reviews.length === 0 ? (
        <div className={`${card} p-12 text-center`}><MessageSquare className="mx-auto h-8 w-8 text-[#ef4563]" /><h3 className="mt-3 font-bold">No reviews yet</h3><p className="text-sm text-stone-500 mt-1">After a booking is completed, customers can review your service.</p></div>
      ) : reviews.map((r) => (
        <div key={r.id} className={`${card} p-5`}>
          <div className="flex items-start justify-between gap-3"><div><p className="font-bold">{r.customerName}</p><p className="text-xs text-stone-500">{r.eventType} · {r.date}</p></div><span className="flex items-center gap-1 text-sm font-bold text-amber-600"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{r.rating}</span></div>
          <p className="mt-3 text-sm text-stone-700">{r.comment}</p>
          {r.vendorReply ? <div className="mt-4 rounded-xl bg-rose-50 border border-rose-100 p-3 text-sm"><p className="text-[11px] font-bold uppercase text-[#ef4563]">Your reply · {r.vendorReply.date}</p><p className="mt-1 text-stone-700">{r.vendorReply.comment}</p></div> : (
            <div className="mt-4 flex gap-2"><input value={drafts[r.id] || ''} onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))} maxLength={1000} placeholder="Write a public reply…" className={input} /><button disabled={busyId === r.id || (drafts[r.id] || '').trim().length < 2} onClick={() => reply(r.id)} className="rounded-xl bg-[#ef4563] px-4 text-xs font-bold text-white disabled:opacity-50">{busyId === r.id ? 'Posting…' : 'Reply'}</button></div>)}
        </div>
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------- Profile */
export const ProfileTab: React.FC<{ vendor: Vendor; onSaved: (v: Vendor) => void }> = ({ vendor, onSaved }) => {
  const { showToast } = useApp();
  const [f, setF] = useState({ businessName: vendor.businessName || '', about: vendor.about || '', phone: vendor.phone || '', email: vendor.email || '', address: vendor.address || '', city: vendor.city || '', pincode: vendor.pincode || '', experienceYears: String(vendor.experienceYears ?? ''), startingPrice: String(vendor.startingPrice ?? ''), serviceRadiusKm: String(vendor.serviceRadiusKm ?? ''), areasServed: (vendor.areasServed || []).join(', '), services: (vendor.services || []).join(', '), coverImage: vendor.coverImage || '', logo: vendor.logo || '' });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }));
  const pick = async (key: 'coverImage' | 'logo', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
    try { set(key, await resizeImage(file, key === 'logo' ? 400 : 1400)); } catch { showToast('Image upload failed', 'Choose a valid image file.', 'error'); }
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      const list = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
      const v = await api.updateVendor(vendor.id, { businessName: f.businessName, about: f.about, phone: f.phone, email: f.email, address: f.address, city: f.city, pincode: f.pincode, experienceYears: Number(f.experienceYears) || 0, startingPrice: Number(f.startingPrice) || 0, serviceRadiusKm: Number(f.serviceRadiusKm) || 0, areasServed: list(f.areasServed), services: list(f.services), coverImage: f.coverImage, logo: f.logo } as any);
      onSaved(v); showToast('Profile saved', 'Customers now see your updated business details.', 'success');
    } catch (err: any) { showToast('Could not save profile', err.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={save} className={`${card} p-6 space-y-6`}>
      <div><h2 className="text-lg font-black">Business profile</h2><p className="text-xs text-stone-500 mt-1">This is what customers see on your public vendor page.</p></div>
      <div className="grid sm:grid-cols-2 gap-5">
        <div><p className={lbl}>Cover photo</p><div className="mt-2 relative h-36 rounded-xl border border-dashed border-stone-300 bg-stone-50 overflow-hidden grid place-items-center">{f.coverImage ? <img src={f.coverImage} alt="Cover" className="h-full w-full object-cover" /> : <span className="text-xs text-stone-400">No cover photo</span>}<label className="absolute bottom-2 right-2 cursor-pointer rounded-lg bg-white/95 px-3 py-1.5 text-xs font-bold shadow"><input type="file" accept="image/*" className="hidden" onChange={(e) => pick('coverImage', e)} />Change</label></div></div>
        <div><p className={lbl}>Logo</p><div className="mt-2 relative h-36 rounded-xl border border-dashed border-stone-300 bg-stone-50 overflow-hidden grid place-items-center">{f.logo ? <img src={f.logo} alt="Logo" className="h-full w-full object-contain" /> : <span className="text-xs text-stone-400">No logo</span>}<label className="absolute bottom-2 right-2 cursor-pointer rounded-lg bg-white/95 px-3 py-1.5 text-xs font-bold shadow"><input type="file" accept="image/*" className="hidden" onChange={(e) => pick('logo', e)} />Change</label></div></div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block space-y-1.5"><span className={lbl}>Business name</span><input required minLength={2} value={f.businessName} onChange={(e) => set('businessName', e.target.value)} className={input} /></label>
        <label className="block space-y-1.5"><span className={lbl}>Starting price (₹)</span><input type="number" min={0} value={f.startingPrice} onChange={(e) => set('startingPrice', e.target.value)} className={input} /></label>
        <label className="block space-y-1.5"><span className={lbl}>Phone</span><input value={f.phone} onChange={(e) => set('phone', e.target.value)} className={input} /></label>
        <label className="block space-y-1.5"><span className={lbl}>Email</span><input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} className={input} /></label>
        <label className="block space-y-1.5"><span className={lbl}>City</span><input value={f.city} onChange={(e) => set('city', e.target.value)} className={input} /></label>
        <label className="block space-y-1.5"><span className={lbl}>Pincode</span><input value={f.pincode} onChange={(e) => set('pincode', e.target.value)} className={input} /></label>
        <label className="block space-y-1.5 sm:col-span-2"><span className={lbl}>Address</span><input value={f.address} onChange={(e) => set('address', e.target.value)} className={input} /></label>
        <label className="block space-y-1.5"><span className={lbl}>Years of experience</span><input type="number" min={0} value={f.experienceYears} onChange={(e) => set('experienceYears', e.target.value)} className={input} /></label>
        <label className="block space-y-1.5"><span className={lbl}>Service radius (km)</span><input type="number" min={0} value={f.serviceRadiusKm} onChange={(e) => set('serviceRadiusKm', e.target.value)} className={input} /></label>
        <label className="block space-y-1.5 sm:col-span-2"><span className={lbl}>Areas you serve (comma separated)</span><input value={f.areasServed} onChange={(e) => set('areasServed', e.target.value)} placeholder="Indiranagar, Koramangala, Whitefield" className={input} /></label>
        <label className="block space-y-1.5 sm:col-span-2"><span className={lbl}>What you offer (comma separated)</span><input value={f.services} onChange={(e) => set('services', e.target.value)} placeholder="Live band, DJ, Sound system" className={input} /></label>
        <label className="block space-y-1.5 sm:col-span-2"><span className={lbl}>About your business</span><textarea rows={4} maxLength={3000} value={f.about} onChange={(e) => set('about', e.target.value)} className={input} /></label>
      </div>
      <button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[#ef4563] px-6 py-3 text-sm font-bold text-white disabled:opacity-60"><Save className="h-4 w-4" />{busy ? 'Saving…' : 'Save profile'}</button>
    </form>
  );
};

/* ------------------------------------------------------------------ Packages */
export const PackagesTab: React.FC<{ vendor: Vendor; onSaved: (v: Vendor) => void }> = ({ vendor, onSaved }) => {
  const { showToast } = useApp();
  const [pkgs, setPkgs] = useState<(VendorPackage & { _inc: string })[]>((vendor.packages || []).map((p) => ({ ...p, _inc: (p.servicesIncluded || []).join(', ') })));
  const [busy, setBusy] = useState(false);
  const update = (i: number, patch: Partial<VendorPackage & { _inc: string }>) => setPkgs((l) => l.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const add = () => setPkgs((l) => (l.length >= 8 ? l : [...l, { id: `pkg_${Date.now()}`, name: 'New package', tier: 'custom', price: 0, description: '', servicesIncluded: [], duration: '4 Hours', staffCount: 1, _inc: '' }]));
  const save = async () => {
    setBusy(true);
    try {
      const packages = pkgs.map(({ _inc, ...p }) => ({ ...p, servicesIncluded: _inc.split(',').map((x) => x.trim()).filter(Boolean) }));
      const v = await api.updateVendor(vendor.id, { packages } as any);
      onSaved(v); showToast('Packages saved', 'Your pricing is updated on your public profile.', 'success');
    } catch (e: any) { showToast('Could not save packages', e.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><h2 className="text-lg font-black">Packages & pricing</h2><p className="text-xs text-stone-500 mt-1">Offer clear options so customers can compare and book faster.</p></div><button onClick={add} className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-bold hover:border-[#ef4563]/40"><Plus className="h-4 w-4" /> Add package</button></div>
      {pkgs.length === 0 && <div className={`${card} p-10 text-center text-sm text-stone-500`}>No packages yet. Add your first one.</div>}
      {pkgs.map((p, i) => (
        <div key={p.id} className={`${card} p-5 space-y-4`}>
          <div className="flex items-center justify-between"><p className="text-sm font-black">{p.name || `Package ${i + 1}`}</p><button onClick={() => setPkgs((l) => l.filter((_, idx) => idx !== i))} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600"><Trash2 className="h-3.5 w-3.5" /> Remove</button></div>
          <div className="grid sm:grid-cols-4 gap-3">
            <label className="block space-y-1.5 sm:col-span-2"><span className={lbl}>Name</span><input value={p.name} onChange={(e) => update(i, { name: e.target.value })} className={input} /></label>
            <label className="block space-y-1.5"><span className={lbl}>Tier</span><select value={p.tier} onChange={(e) => update(i, { tier: e.target.value as VendorPackage['tier'] })} className={input}><option value="basic">Basic</option><option value="standard">Standard</option><option value="premium">Premium</option><option value="custom">Custom</option></select></label>
            <label className="block space-y-1.5"><span className={lbl}>Price (₹)</span><input type="number" min={0} value={p.price} onChange={(e) => update(i, { price: Number(e.target.value) })} className={input} /></label>
            <label className="block space-y-1.5"><span className={lbl}>Duration</span><input value={p.duration} onChange={(e) => update(i, { duration: e.target.value })} className={input} /></label>
            <label className="block space-y-1.5"><span className={lbl}>Team size</span><input type="number" min={0} value={p.staffCount} onChange={(e) => update(i, { staffCount: Number(e.target.value) })} className={input} /></label>
            <label className="block space-y-1.5 sm:col-span-2"><span className={lbl}>Included (comma separated)</span><input value={p._inc} onChange={(e) => update(i, { _inc: e.target.value })} className={input} /></label>
            <label className="block space-y-1.5 sm:col-span-4"><span className={lbl}>Description</span><textarea rows={2} value={p.description} onChange={(e) => update(i, { description: e.target.value })} className={input} /></label>
          </div>
        </div>
      ))}
      <button disabled={busy} onClick={save} className="inline-flex items-center gap-2 rounded-xl bg-[#ef4563] px-6 py-3 text-sm font-bold text-white disabled:opacity-60"><Save className="h-4 w-4" />{busy ? 'Saving…' : 'Save packages'}</button>
    </div>
  );
};

/* ----------------------------------------------------------------- Portfolio */
export const PortfolioTab: React.FC<{ vendor: Vendor; onSaved: (v: Vendor) => void }> = ({ vendor, onSaved }) => {
  const { showToast } = useApp();
  const [items, setItems] = useState(vendor.portfolio || []);
  const [busy, setBusy] = useState(false);
  const add = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = (Array.from(e.target.files || []) as File[]).slice(0, 24 - items.length); e.target.value = '';
    try { const urls = await Promise.all(files.map((f) => resizeImage(f))); setItems((l) => [...l, ...urls.map((url, k) => ({ id: `port_${Date.now()}_${k}`, url, caption: '', eventType: '' }))]); }
    catch { showToast('Photo upload failed', 'Choose valid image files.', 'error'); }
  };
  const save = async () => {
    setBusy(true);
    try { const v = await api.updateVendor(vendor.id, { portfolio: items } as any); onSaved(v); showToast('Portfolio saved', 'Your photos are live on your profile.', 'success'); }
    catch (e: any) { showToast('Could not save portfolio', e.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black">Portfolio</h2><p className="text-xs text-stone-500 mt-1">Photos of your past work help customers trust and book you. Up to 24 photos.</p></div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-bold hover:border-[#ef4563]/40"><ImagePlus className="h-4 w-4" /> Add photos<input type="file" accept="image/*" multiple className="hidden" onChange={add} /></label></div>
      {items.length === 0 ? <div className={`${card} p-12 text-center text-sm text-stone-500`}>No portfolio photos yet.</div> : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{items.map((p, i) => (
          <div key={p.id} className={`${card} overflow-hidden`}><img src={p.url} alt={p.caption || 'Portfolio'} className="h-40 w-full object-cover bg-stone-100" />
            <div className="p-3 space-y-2"><input value={p.caption} onChange={(e) => setItems((l) => l.map((x, idx) => (idx === i ? { ...x, caption: e.target.value } : x)))} placeholder="Caption" className={input} /><button onClick={() => setItems((l) => l.filter((_, idx) => idx !== i))} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600"><Trash2 className="h-3.5 w-3.5" /> Remove</button></div></div>))}</div>)}
      <button disabled={busy} onClick={save} className="inline-flex items-center gap-2 rounded-xl bg-[#ef4563] px-6 py-3 text-sm font-bold text-white disabled:opacity-60"><Save className="h-4 w-4" />{busy ? 'Saving…' : 'Save portfolio'}</button>
    </div>
  );
};

/* ------------------------------------------------------------------- Support */
export const SupportTab: React.FC<{ bookings: Booking[] }> = ({ bookings }) => {
  const { showToast, navigateTo } = useApp();
  const [subject, setSubject] = useState(''); const [message, setMessage] = useState(''); const [bookingId, setBookingId] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { await api.createComplaint({ subject, message, bookingId: bookingId || undefined }); showToast('Support request sent', 'The EventSphere team will get back to you.', 'success'); setSubject(''); setMessage(''); setBookingId(''); }
    catch (err: any) { showToast('Could not send request', err.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <form onSubmit={submit} className={`${card} p-6 space-y-3 lg:col-span-2`}>
        <h2 className="text-lg font-black flex items-center gap-2"><LifeBuoy className="h-5 w-5 text-[#ef4563]" /> Contact EventSphere support</h2>
        <p className="text-xs text-stone-500">Payment not showing, a customer issue, or a listing problem? Send us the details.</p>
        <input required minLength={4} maxLength={160} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className={input} />
        <select value={bookingId} onChange={(e) => setBookingId(e.target.value)} className={input}><option value="">General issue (no booking)</option>{bookings.map((b) => <option key={b.id} value={b.id}>{b.bookingReference} · {b.customerName}</option>)}</select>
        <textarea required minLength={10} maxLength={4000} rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe the issue (at least 10 characters)" className={input} />
        <button disabled={busy} className="rounded-xl bg-[#ef4563] px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{busy ? 'Sending…' : 'Send to support'}</button>
      </form>
      <div className="space-y-4">
        <div className={`${card} p-5`}><h3 className="font-bold">Talk to customers</h3><p className="mt-1 text-xs text-stone-500">Reply to enquiries and booking questions.</p><button onClick={() => navigateTo('messages')} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-bold hover:border-[#ef4563]/40"><MessageSquare className="h-4 w-4" /> Open messages</button></div>
        <div className={`${card} p-5 text-xs text-stone-600 space-y-2`}><h3 className="font-bold text-sm text-stone-900">Quick tips</h3><p>• Accept or decline requests quickly. Fast replies rank higher.</p><p>• Keep availability updated to avoid double bookings.</p><p>• Add portfolio photos and clear packages to win more bookings.</p></div>
      </div>
    </div>
  );
};
