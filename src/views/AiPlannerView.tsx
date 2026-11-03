import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { BRAND_CONFIG, formatCurrency } from '../config/brand';
import { api } from '../services/api';
import { AiPlanResponse } from '../types';
import {
  Sparkles, CalendarDays, Users, MapPin, Wallet, CheckCircle2, Lightbulb, Save, ArrowRight, Heart, Cake, Briefcase,
  GraduationCap, Gift, PartyPopper, Presentation, Music, Baby, House, Ellipsis, Copy, RefreshCw, Star, IndianRupee, Clock3,
} from 'lucide-react';

const EVENT_TYPES: { name: string; icon: React.ElementType }[] = [
  { name: 'Wedding', icon: Heart }, { name: 'Birthday', icon: Cake }, { name: 'Corporate Event', icon: Briefcase },
  { name: 'College Event', icon: GraduationCap }, { name: 'Engagement', icon: Gift }, { name: 'Anniversary', icon: Heart },
  { name: 'Party', icon: PartyPopper }, { name: 'Conference', icon: Presentation }, { name: 'Concert', icon: Music },
  { name: 'Baby Shower', icon: Baby }, { name: 'Housewarming', icon: House }, { name: 'Other', icon: Ellipsis },
];
const STYLES = ['Traditional', 'Modern', 'Luxury', 'Minimal', 'Royal', 'Boho', 'Outdoor', 'Theme Party'];
const SERVICES = ['Venue', 'Catering', 'Photography', 'Videography', 'Decoration', 'DJ & Music', 'Entertainment', 'Makeup & Styling', 'Invitations', 'Transport', 'Lighting & Sound', 'Event Planning'];
const BUDGET_PRESETS = [50000, 100000, 200000, 500000, 1000000, 2000000];
const budgetLabel = (n: number) => (n >= 10000000 ? `${n / 10000000}Cr` : n >= 100000 ? `${n / 100000}L` : `${n / 1000}K`);

const SCENARIOS: Record<string, { guests: number; budget: number; style: string[]; services: string[]; prompt: string }> = {
  Wedding: { guests: 350, budget: 1500000, style: ['Traditional', 'Royal'], services: ['Venue', 'Catering', 'Photography', 'Decoration', 'DJ & Music'], prompt: 'Traditional wedding with ceremony, reception and family celebrations.' },
  Birthday: { guests: 80, budget: 200000, style: ['Modern', 'Theme Party'], services: ['Venue', 'Catering', 'Decoration', 'DJ & Music', 'Photography'], prompt: '30th birthday party with a modern theme, music, food and a photo experience.' },
  'Corporate Event': { guests: 250, budget: 500000, style: ['Modern', 'Minimal'], services: ['Venue', 'Catering', 'Photography', 'Lighting & Sound', 'Event Planning'], prompt: 'Corporate summit with stage, AV, networking, catering and professional event support.' },
  Engagement: { guests: 150, budget: 600000, style: ['Traditional', 'Luxury'], services: ['Venue', 'Catering', 'Photography', 'Decoration', 'Makeup & Styling'], prompt: 'Elegant engagement ceremony with ring exchange, dinner and photography.' },
  'College Event': { guests: 300, budget: 200000, style: ['Modern', 'Theme Party'], services: ['Venue', 'DJ & Music', 'Lighting & Sound', 'Entertainment'], prompt: 'College fest night with stage, sound, lights and entertainment.' },
  'Baby Shower': { guests: 40, budget: 100000, style: ['Boho', 'Minimal'], services: ['Venue', 'Catering', 'Decoration', 'Photography'], prompt: 'Cosy baby shower with themed décor, games, food and photos.' },
};

const card = 'bg-white border border-stone-200 rounded-2xl shadow-[0_6px_24px_rgba(0,0,0,.04)]';
const label = 'text-[11px] font-bold uppercase tracking-wider text-stone-500';
const field = 'w-full rounded-xl border border-stone-200 bg-white px-3.5 py-3 text-sm text-stone-900 outline-none transition focus:border-[#ef4563] focus:ring-4 focus:ring-[#ef4563]/10';

export const AiPlannerView: React.FC = () => {
  const { currentCity, navigateTo, refreshEvents, setActiveEventId, showToast, triggerCelebration, viewParam } = useApp();
  const [eventType, setEventType] = useState('Birthday');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState(currentCity || 'Bangalore');
  const [guests, setGuests] = useState(100);
  const [budget, setBudget] = useState(200000);
  const [style, setStyle] = useState<string[]>(['Modern']);
  const [services, setServices] = useState<string[]>(['Venue', 'Catering', 'Photography', 'Decoration']);
  const [prompt, setPrompt] = useState('A memorable celebration with great food, photography, décor and entertainment.');
  const [loading, setLoading] = useState(false);
  const [aiPlan, setAiPlan] = useState<AiPlanResponse | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const toggle = (list: string[], value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) =>
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const applyScenario = (type: string) => {
    setEventType(type);
    const data = SCENARIOS[type];
    if (data) { setGuests(data.guests); setBudget(data.budget); setStyle(data.style); setServices(data.services); setPrompt(data.prompt); }
  };

  // Opening the planner from the home page with an event type (e.g. "Wedding") pre-selects it.
  useEffect(() => {
    const wanted = typeof viewParam === 'string' ? viewParam : '';
    if (wanted && EVENT_TYPES.some((t) => t.name === wanted)) applyScenario(wanted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewParam]);

  const perGuest = useMemo(() => (guests > 0 ? Math.round(budget / guests) : 0), [budget, guests]);
  const budgetHint = perGuest < 600 ? { tone: 'text-amber-700 bg-amber-50 border-amber-200', text: 'Tight budget per guest. Expect basic options; the plan will prioritise essentials.' }
    : perGuest < 2500 ? { tone: 'text-emerald-700 bg-emerald-50 border-emerald-200', text: 'A comfortable budget for a well-rounded event.' }
      : { tone: 'text-sky-700 bg-sky-50 border-sky-200', text: 'Premium budget. You can upgrade venue, décor and experiences.' };

  const handleGenerate = async () => {
    if (!guests || guests < 1 || !budget || budget < 1000) { showToast('Check your details', 'Enter at least 1 guest and a budget of ₹1,000 or more.', 'error'); return; }
    const activePrompt = `${eventType} in ${location}${date ? ` on ${date}` : ''} for ${guests} guests with a budget of ₹${budget.toLocaleString('en-IN')}. Style: ${style.join(', ') || 'Flexible'}. Required services: ${services.join(', ') || 'General event services'}. Details: ${prompt}`;
    setLoading(true);
    try {
      const response = await api.planEventWithAi({ prompt: activePrompt, budget, guests, location, eventType });
      setAiPlan(response);
      triggerCelebration();
      showToast('AI Event Plan Generated', 'Your budget, timeline and vendor matches are ready.');
      window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    } catch (e: any) {
      showToast('AI Generation Failed', e.message || 'Please try again in a moment.', 'error');
    } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!aiPlan) return;
    try {
      const evt = await api.createEvent({ title: aiPlan.eventName || `${eventType} Plan`, eventType: aiPlan.eventType || eventType, eventCategorySlug: 'custom', date: date || '2026-11-15', time: '18:00', locationCity: location, guestCount: guests, totalBudget: aiPlan.recommendedBudget || budget, requiredServices: aiPlan.budgetBreakdown.map((b) => b.category) });
      await refreshEvents(); setActiveEventId(evt.id); showToast('Event saved', 'Your AI blueprint is now in the dashboard.'); navigateTo('events');
    } catch (e: any) { showToast('Could not save event', e.message, 'error'); }
  };

  const copyPlan = async () => {
    if (!aiPlan) return;
    const text = [
      `${aiPlan.eventName} (${eventType}, ${guests} guests, ${location})`,
      `Recommended budget: ${formatCurrency(aiPlan.recommendedBudget)}`, '',
      'Budget breakdown:', ...aiPlan.budgetBreakdown.map((b) => `- ${b.category}: ${formatCurrency(b.allocatedAmount)} (${b.percentage}%)`), '',
      'Timeline:', ...aiPlan.timelineChecklist.flatMap((p) => [`${p.phase} (${p.timeframe})`, ...p.tasks.map((t) => `  - ${t}`)]),
    ].join('\n');
    try { await navigator.clipboard.writeText(text); showToast('Plan copied', 'Paste it into a note or message to share.'); }
    catch { showToast('Could not copy', 'Your browser blocked clipboard access.', 'error'); }
  };

  const chip = (active: boolean) => `rounded-full px-4 py-2 text-xs font-semibold border transition ${active ? 'border-[#ef4563] bg-[#fff1f3] text-[#ef4563]' : 'border-stone-200 bg-white text-stone-600 hover:border-[#ef4563]/40'}`;

  return (
    <div className="min-h-screen bg-[#fafafa] py-8 sm:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <section className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ef4563]/25 bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[#ef4563]"><Sparkles className="h-4 w-4" /> AI Event Planner</div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-stone-900">Plan your event with <span className="text-[#ef4563]">AI precision</span></h1>
          <p className="text-sm sm:text-base text-stone-500">Tell us what you are planning. EventSphere builds a practical budget split, a step-by-step timeline, a service checklist and matches real verified vendors.</p>
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            {['Smart budget split', 'Week-by-week timeline', 'Verified vendor matches', 'Free to use'].map((t) => <span key={t} className="inline-flex items-center gap-1.5 rounded-full bg-white border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600"><CheckCircle2 className="h-3.5 w-3.5 text-[#ef4563]" />{t}</span>)}
          </div>
        </section>

        <div className="grid lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-5">
            <section className={`${card} p-5 sm:p-6`}>
              <p className={`${label} mb-3`}>1. What are you planning?</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {EVENT_TYPES.map(({ name, icon: Icon }) => (
                  <button key={name} onClick={() => applyScenario(name)} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-semibold transition ${eventType === name ? 'border-[#ef4563] bg-[#fff1f3] text-[#ef4563]' : 'border-stone-200 bg-white text-stone-700 hover:border-[#ef4563]/40'}`}>
                    <Icon className="h-4 w-4 shrink-0" />{name}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-stone-400">Picking a type pre-fills sensible guests, budget, style and services. You can change anything.</p>
            </section>

            <section className={`${card} p-5 sm:p-6`}>
              <p className={`${label} mb-3`}>2. Describe your event</p>
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} maxLength={600} placeholder="Example: Modern birthday party for 100 guests in Bangalore with a ₹2 lakh budget…" className={`${field} resize-none`} />
              <div className="mt-2 flex items-center justify-between text-[11px] text-stone-400"><span>The more detail you add, the better the plan.</span><span>{prompt.length}/600</span></div>
            </section>

            <section className={`${card} p-5 sm:p-6 space-y-5`}>
              <p className={label}>3. Budget, guests and date</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="block space-y-2"><span className="flex items-center gap-2 text-xs font-semibold text-stone-600"><Wallet className="h-3.5 w-3.5 text-[#ef4563]" /> Total budget</span>
                  <div className="relative"><IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" /><input type="number" min={1000} step={5000} value={budget || ''} onChange={(e) => setBudget(Number(e.target.value))} className={`${field} pl-9`} /></div>
                  <div className="flex flex-wrap gap-1.5">{BUDGET_PRESETS.map((b) => <button type="button" key={b} onClick={() => setBudget(b)} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${budget === b ? 'border-[#ef4563] bg-[#fff1f3] text-[#ef4563]' : 'border-stone-200 text-stone-500 hover:border-[#ef4563]/40'}`}>₹{budgetLabel(b)}</button>)}</div>
                </label>
                <label className="block space-y-2"><span className="flex items-center gap-2 text-xs font-semibold text-stone-600"><Users className="h-3.5 w-3.5 text-[#ef4563]" /> Guests</span>
                  <div className="flex items-stretch gap-2"><button type="button" onClick={() => setGuests(Math.max(1, guests - 10))} className="rounded-xl border border-stone-200 px-3.5 text-lg font-bold text-stone-500 hover:border-[#ef4563]/40">−</button><input type="number" min={1} value={guests || ''} onChange={(e) => setGuests(Number(e.target.value))} className={`${field} text-center`} /><button type="button" onClick={() => setGuests(guests + 10)} className="rounded-xl border border-stone-200 px-3.5 text-lg font-bold text-stone-500 hover:border-[#ef4563]/40">+</button></div>
                </label>
                <label className="block space-y-2"><span className="flex items-center gap-2 text-xs font-semibold text-stone-600"><MapPin className="h-3.5 w-3.5 text-[#ef4563]" /> City</span>
                  <select value={location} onChange={(e) => setLocation(e.target.value)} className={field}>{BRAND_CONFIG.popularCities.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}</select></label>
                <label className="block space-y-2"><span className="flex items-center gap-2 text-xs font-semibold text-stone-600"><CalendarDays className="h-3.5 w-3.5 text-[#ef4563]" /> Event date</span>
                  <input type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => setDate(e.target.value)} className={field} /></label>
              </div>
              <div className={`rounded-xl border px-4 py-3 text-xs ${budgetHint.tone}`}><b>About {formatCurrency(perGuest)} per guest.</b> {budgetHint.text}</div>
            </section>

            <section className={`${card} p-5 sm:p-6`}>
              <p className={`${label} mb-3`}>4. Style / theme</p>
              <div className="flex flex-wrap gap-2">{STYLES.map((v) => <button key={v} onClick={() => toggle(style, v, setStyle)} className={chip(style.includes(v))}>{v}</button>)}</div>
            </section>

            <section className={`${card} p-5 sm:p-6`}>
              <div className="flex items-center justify-between mb-3"><p className={label}>5. Services required</p>
                <button onClick={() => setServices(services.length === SERVICES.length ? [] : [...SERVICES])} className="text-[11px] font-semibold text-[#ef4563]">{services.length === SERVICES.length ? 'Clear all' : 'Select all'}</button></div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{SERVICES.map((v) => { const on = services.includes(v); return (
                <button key={v} onClick={() => toggle(services, v, setServices)} className={`flex items-center gap-2.5 rounded-xl border px-3 py-3 text-left text-xs font-medium transition ${on ? 'border-[#ef4563] bg-[#fff1f3] text-stone-900' : 'border-stone-200 bg-white text-stone-600 hover:border-[#ef4563]/40'}`}>
                  <span className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] text-white ${on ? 'border-[#ef4563] bg-[#ef4563]' : 'border-stone-300'}`}>{on && '✓'}</span>{v}</button>); })}</div>
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 space-y-4">
            <section className={`${card} p-5`}>
              <h2 className="font-bold text-stone-900 flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#ef4563]" /> Your plan summary</h2>
              <dl className="mt-4 space-y-2.5 text-sm">
                {[['Event', eventType], ['City', location], ['Date', date || 'Flexible'], ['Guests', String(guests || 0)], ['Budget', formatCurrency(budget || 0)], ['Per guest', formatCurrency(perGuest)]].map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-stone-500">{k}</dt><dd className="font-semibold text-stone-900 text-right">{v}</dd></div>)}
              </dl>
              {style.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{style.map((s) => <span key={s} className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-600">{s}</span>)}</div>}
              <p className="mt-3 text-xs text-stone-500">{services.length} service{services.length === 1 ? '' : 's'} selected</p>
              <button onClick={handleGenerate} disabled={loading} className="mt-5 w-full rounded-xl bg-[#ef4563] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#ef4563]/25 transition hover:bg-[#d93256] disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <><RefreshCw className="h-4 w-4 animate-spin" /> Generating…</> : <><Sparkles className="h-4 w-4" /> {aiPlan ? 'Regenerate plan' : 'Generate event plan'}</>}
              </button>
              <p className="mt-2 text-center text-[11px] text-stone-400">Free to use • No credit card required</p>
            </section>
            <section className="rounded-2xl border border-[#ef4563]/20 bg-[#fff7f8] p-5 text-xs text-stone-600 space-y-2">
              <p className="font-bold text-stone-900 text-sm">What you will get</p>
              {['Budget split across every service', 'Phase-wise timeline and checklist', 'Matching verified vendors', 'Save it to your dashboard'].map((t) => <p key={t} className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-[#ef4563]" />{t}</p>)}
            </section>
          </aside>
        </div>

        {loading && (
          <section className={`${card} p-12 text-center`}>
            <div className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-[#ef4563] border-t-transparent animate-spin" />
            <h2 className="text-lg font-bold text-stone-900">AI is building your event blueprint</h2>
            <p className="mt-2 text-sm text-stone-500">Matching budget, services and marketplace providers in {location}.</p>
          </section>
        )}

        <div ref={resultRef} />
        {aiPlan && !loading && (
          <div className="space-y-6">
            <section className={`${card} p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5`}>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#ef4563]">Your AI blueprint is ready</p>
                <h2 className="mt-1 text-2xl sm:text-3xl font-black text-stone-900">{aiPlan.eventName}</h2>
                <p className="mt-2 text-sm text-stone-500">{eventType} • {guests} guests • {location}{date ? ` • ${date}` : ''} • Recommended budget <b className="text-stone-800">{formatCurrency(aiPlan.recommendedBudget)}</b></p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={copyPlan} className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-xs font-bold text-stone-700 flex items-center gap-2 hover:border-[#ef4563]/40"><Copy className="h-4 w-4" /> Copy plan</button>
                <button onClick={() => window.print()} className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-xs font-bold text-stone-700 hover:border-[#ef4563]/40">Print / PDF</button>
                <button onClick={handleSave} className="rounded-xl bg-[#ef4563] px-5 py-3 text-xs font-bold text-white flex items-center gap-2 hover:bg-[#d93256]"><Save className="h-4 w-4" /> Save to dashboard</button>
              </div>
            </section>

            <section className="grid md:grid-cols-2 gap-6">
              <div className={`${card} p-6`}>
                <div className="flex justify-between items-center mb-5"><h3 className="font-bold text-stone-900">Budget breakdown</h3><span className="font-bold text-[#ef4563]">{formatCurrency(aiPlan.recommendedBudget)}</span></div>
                <div className="space-y-4">{aiPlan.budgetBreakdown.map((b, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between text-sm"><span className="font-semibold text-stone-800">{b.category} <span className="text-[#ef4563] text-xs">{b.percentage}%</span></span><span className="font-bold">{formatCurrency(b.allocatedAmount)}</span></div>
                    <div className="mt-1.5 h-2 rounded-full bg-stone-100 overflow-hidden"><div className="h-full rounded-full bg-[#ef4563]" style={{ width: `${Math.min(100, Math.max(2, b.percentage))}%` }} /></div>
                    <p className="mt-1 text-[11px] text-stone-500">{b.rationale}</p>
                  </div>))}</div>
              </div>
              <div className={`${card} p-6`}>
                <h3 className="font-bold text-stone-900 mb-5 flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#ef4563]" /> Timeline</h3>
                <div className="space-y-5">{aiPlan.timelineChecklist.map((p, i) => (
                  <div key={i} className="relative pl-5 border-l-2 border-[#ef4563]/25">
                    <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-[#ef4563]" />
                    <p className="text-xs font-bold text-[#ef4563]">{p.phase} · {p.timeframe}</p>
                    <ul className="mt-2 space-y-1.5">{p.tasks.map((t, j) => <li key={j} className="text-xs text-stone-600 flex gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />{t}</li>)}</ul>
                  </div>))}</div>
              </div>
            </section>

            <section className={`${card} p-6 sm:p-8`}>
              <div className="flex items-center justify-between gap-3 mb-5">
                <div><h3 className="font-bold text-stone-900">Recommended vendors</h3><p className="text-xs text-stone-500 mt-1">Verified marketplace matches based on your event requirements.</p></div>
                <button onClick={() => navigateTo('vendors')} className="text-xs text-[#ef4563] font-bold flex items-center gap-1">View all <ArrowRight className="h-3.5 w-3.5" /></button>
              </div>
              {aiPlan.vendorRecommendations.length === 0 ? <p className="text-sm text-stone-500">No exact matches yet. Browse all vendors to find options for your event.</p> :
                <div className="grid md:grid-cols-2 gap-3">{aiPlan.vendorRecommendations.map((v) => (
                  <div key={v.vendorId} className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase text-[#ef4563] flex items-center gap-1">{v.category} · <Star className="h-3 w-3 fill-current" /> {v.matchScore}% match</p>
                      <h4 className="mt-1 text-sm font-bold text-stone-900">{v.vendorName}</h4>
                      <p className="mt-1 text-[11px] text-stone-500">{v.matchReason}</p>
                      <p className="mt-2 text-xs font-bold text-stone-800">From {formatCurrency(v.startingPrice)}</p>
                    </div>
                    <button onClick={() => navigateTo('vendor-profile', v.vendorId)} className="shrink-0 rounded-lg bg-[#ef4563] px-4 py-2 text-xs font-bold text-white hover:bg-[#d93256]">View</button>
                  </div>))}</div>}
            </section>

            <section className="grid md:grid-cols-2 gap-6">
              <div className={`${card} p-6`}>
                <h3 className="font-bold text-stone-900 mb-4 flex gap-2 items-center"><Lightbulb className="h-4 w-4 text-[#ef4563]" /> AI tips</h3>
                <div className="space-y-2">{aiPlan.proTips.map((tip, i) => <p key={i} className="rounded-xl bg-stone-50 border border-stone-200 p-3 text-xs text-stone-600">{tip}</p>)}</div>
              </div>
              <div className={`${card} p-6`}>
                <h3 className="font-bold text-stone-900 mb-3">Next step</h3>
                <p className="text-sm text-stone-500">Open a recommended vendor, send an enquiry, compare providers, or save this blueprint to your dashboard to track tasks and spending.</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button onClick={() => navigateTo('vendors')} className="rounded-xl bg-[#ef4563] px-4 py-3 text-xs font-bold text-white flex items-center gap-2 hover:bg-[#d93256]">Explore vendors <ArrowRight className="h-4 w-4" /></button>
                  <button onClick={handleSave} className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-xs font-bold text-stone-700 hover:border-[#ef4563]/40">Save plan</button>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};
