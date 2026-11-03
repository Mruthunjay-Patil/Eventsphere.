import React from 'react';
import { useApp } from '../../context/AppContext';
import { Sparkles, Calculator, ListChecks, Store, ArrowRight, CheckCircle2, Heart, Cake, Briefcase, GraduationCap, PartyPopper, Gift } from 'lucide-react';

const QUICK_EVENTS = [
  { name: 'Wedding', icon: Heart }, { name: 'Birthday', icon: Cake }, { name: 'Corporate Event', icon: Briefcase },
  { name: 'College Event', icon: GraduationCap }, { name: 'Engagement', icon: Gift }, { name: 'Party', icon: PartyPopper },
];
const FEATURES = [
  { icon: Calculator, title: 'Smart budget split', text: 'See exactly how much to spend on venue, food, décor and more.' },
  { icon: ListChecks, title: 'Step-by-step timeline', text: 'A week-by-week checklist so nothing gets missed.' },
  { icon: Store, title: 'Verified vendor matches', text: 'Real vendors that fit your city, budget and style.' },
];
const PREVIEW = [
  { label: 'Venue', pct: 35, amount: '₹70,000' }, { label: 'Catering', pct: 30, amount: '₹60,000' },
  { label: 'Décor', pct: 15, amount: '₹30,000' }, { label: 'Photography', pct: 12, amount: '₹24,000' }, { label: 'Music', pct: 8, amount: '₹16,000' },
];

export const AiBannerCTA: React.FC = () => {
  const { navigateTo } = useApp();
  return (
    <section className="py-12 sm:py-16 bg-white border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-rose-200/80 bg-gradient-to-br from-rose-50 via-white to-orange-50 p-6 sm:p-10 shadow-sm">
          <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-rose-200/30 blur-3xl" />
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#E83A59]">
                <Sparkles className="h-3.5 w-3.5" /> AI Event Planner
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight text-stone-900">
                Plan any event with <span className="text-[#E83A59]">AI precision</span>
              </h2>
              <p className="max-w-xl text-sm sm:text-base leading-relaxed text-stone-600">
                Weddings, birthdays, corporate events and more. Tell us your budget, guests and city, and get a tailored plan with vendor picks in seconds.
              </p>

              <div className="grid gap-3 sm:grid-cols-3">
                {FEATURES.map(({ icon: Icon, title, text }) => (
                  <div key={title} className="rounded-2xl border border-stone-200 bg-white/80 p-4">
                    <div className="mb-2 inline-flex rounded-xl bg-rose-50 p-2 text-[#E83A59]"><Icon className="h-4 w-4" /></div>
                    <p className="text-sm font-bold text-stone-900">{title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-stone-500">{text}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-stone-500">What are you planning?</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_EVENTS.map(({ name, icon: Icon }) => (
                    <button key={name} onClick={() => navigateTo('ai-planner', name)} className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 transition hover:border-[#E83A59] hover:text-[#E83A59]">
                      <Icon className="h-3.5 w-3.5" />{name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
                <button id="cta-open-ai-planner-btn" onClick={() => navigateTo('ai-planner')} className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-[#E83A59] px-7 py-4 text-sm font-bold text-white shadow-lg shadow-rose-500/25 transition hover:bg-[#d82352]">
                  <Sparkles className="h-4 w-4" /> Start planning free <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
                <span className="flex items-center gap-1.5 text-xs font-medium text-stone-500"><CheckCircle2 className="h-4 w-4 text-[#E83A59]" /> Free to use • No credit card required</span>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-[0_20px_50px_rgba(232,58,89,.12)]">
                <div className="flex items-center justify-between">
                  <div><p className="text-[10px] font-bold uppercase tracking-wider text-[#E83A59]">Sample plan</p><p className="text-sm font-bold text-stone-900">Birthday · 80 guests · Bangalore</p></div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">₹2,00,000</span>
                </div>
                <div className="mt-4 space-y-3">
                  {PREVIEW.map((row) => (
                    <div key={row.label}>
                      <div className="flex justify-between text-xs"><span className="font-semibold text-stone-700">{row.label} <span className="text-[#E83A59]">{row.pct}%</span></span><span className="font-bold text-stone-900">{row.amount}</span></div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-[#E83A59]" style={{ width: `${row.pct * 2}%` }} /></div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl bg-rose-50 px-3 py-2.5 text-[11px] text-stone-600"><b className="text-stone-900">+ timeline and 5 matched vendors</b> generated for your exact event.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
