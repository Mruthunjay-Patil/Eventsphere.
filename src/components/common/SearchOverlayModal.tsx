import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, MapPin, Sparkles, X, ArrowRight, Star, CheckCircle, Clock3, TrendingUp, LayoutGrid } from 'lucide-react';
import { BRAND_CONFIG, formatCurrency } from '../../config/brand';
import { Vendor } from '../../types';
import { api } from '../../services/api';

interface SearchOverlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RECENT_KEY = 'eventsphere_recent_searches';
const readRecent = (): string[] => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').slice(0, 6); } catch { return []; } };
const writeRecent = (list: string[]) => { try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 6))); } catch { /* storage unavailable */ } };

export const SearchOverlayModal: React.FC<SearchOverlayModalProps> = ({ isOpen, onClose }) => {
  const { currentCity, setCurrentCity, navigateTo, vendorCategories } = useApp();
  const [query, setQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState(currentCity);
  const [results, setResults] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) { setQuery(''); setResults([]); setLoading(false); setError(''); return; }
    setRecent(readRecent());
    setSelectedCity(currentCity);
    window.setTimeout(() => inputRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  // Debounced live search. Stale responses are ignored and the loading flag is always cleared,
  // so the popup can never get stuck on "Searching…".
  useEffect(() => {
    const term = query.trim();
    if (!term) { setResults([]); setLoading(false); setError(''); return; }
    let active = true;
    setLoading(true);
    setError('');
    const timer = window.setTimeout(async () => {
      try {
        const timeout = new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('Search is taking too long. Please try again.')), 12000));
        const list = await Promise.race([api.getVendors({ q: term, city: selectedCity === 'All Cities' ? undefined : selectedCity }), timeout]);
        if (active) setResults(list.slice(0, 6));
      } catch (e: any) {
        if (active) { setResults([]); setError(e?.message || 'Could not search right now.'); }
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query, selectedCity]);

  if (!isOpen) return null;

  const cityLabel = selectedCity === 'All Cities' ? 'your city' : selectedCity;
  const quickSearches = [
    `Wedding photographers in ${cityLabel}`,
    'Mandap decorators under ₹1,00,000',
    'Catering with live chaat counters',
    'DJ and sound systems for Sangeet',
    'Bridal HD airbrush makeup artist',
    'Banquet hall for 300 guests',
  ];

  const remember = (term: string) => {
    const t = term.trim();
    if (!t) return;
    const next = [t, ...readRecent().filter((x) => x.toLowerCase() !== t.toLowerCase())];
    writeRecent(next);
    setRecent(next.slice(0, 6));
  };
  const goToDirectory = (term?: string) => {
    if (term) remember(term);
    onClose();
    navigateTo('vendors', term || undefined);
  };
  const openVendor = (v: Vendor) => { remember(query); onClose(); navigateTo('vendor-profile', v.id); };
  const clearRecent = () => { writeRecent([]); setRecent([]); };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-stone-900/60 backdrop-blur-sm flex items-start justify-center pt-16 px-4 pb-8" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-label="Search vendors" className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
        <form onSubmit={(e) => { e.preventDefault(); if (query.trim()) goToDirectory(query.trim()); }} className="p-4 sm:p-5 border-b border-stone-200 bg-white flex items-center gap-3">
          <Search className="w-6 h-6 text-[#E83A59] shrink-0" />
          <input
            id="spotlight-search-input" ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search photographers, decorators, banquets, caterers, DJs..."
            className="w-full text-base sm:text-lg bg-transparent border-none outline-none text-stone-900 placeholder:text-stone-400"
          />
          {query && <button type="button" aria-label="Clear search" onClick={() => setQuery('')} className="text-stone-400 hover:text-stone-700 p-1 rounded-full"><X className="w-4 h-4" /></button>}
          <div className="hidden sm:flex items-center gap-1 pl-3 border-l border-stone-200 shrink-0">
            <MapPin className="w-4 h-4 text-[#E83A59]" />
            <select value={selectedCity} onChange={(e) => { setSelectedCity(e.target.value); setCurrentCity(e.target.value); }} className="text-xs font-medium text-stone-700 bg-transparent border-none outline-none cursor-pointer pr-1">
              <option value="All Cities">All Cities</option>
              {BRAND_CONFIG.popularCities.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <button type="button" aria-label="Close search" onClick={onClose} className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"><X className="w-5 h-5" /></button>
        </form>

        <div className="p-5 max-h-[70vh] overflow-y-auto bg-[#fafafa]">
          {loading && <div className="py-8 text-center text-sm text-stone-500">Searching verified vendors{selectedCity !== 'All Cities' ? ` in ${selectedCity}` : ''}…</div>}

          {!loading && error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
          )}

          {!loading && !error && results.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
                <span>Matching verified vendors ({results.length})</span>
                <button onClick={() => goToDirectory(query.trim())} className="text-[#E83A59] hover:underline flex items-center gap-1 font-semibold normal-case tracking-normal"><span>View all results</span><ArrowRight className="w-3 h-3" /></button>
              </div>
              <div className="space-y-2.5">
                {results.map((v) => (
                  <div key={v.id} id={`search-result-${v.id}`} onClick={() => openVendor(v)} className="p-3.5 bg-white rounded-xl border border-stone-200 hover:border-[#E83A59] hover:shadow-md transition-all cursor-pointer flex items-center gap-4">
                    <img src={v.coverImage} alt={v.businessName} className="w-16 h-16 rounded-lg object-cover shrink-0 bg-stone-100" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-stone-900 truncate">{v.businessName}</h4>
                        {v.verified && <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5 truncate">{v.categoryName} • {v.subcategory} • {v.city}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs">
                        <span className="flex items-center text-amber-700 font-medium"><Star className="w-3 h-3 fill-amber-400 text-amber-400 mr-1" />{v.rating} ({v.reviewCount})</span>
                        <span className="text-stone-300">•</span>
                        <span className="text-stone-800 font-semibold">From {formatCurrency(v.startingPrice)}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-stone-400 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && !error && query.trim() && results.length === 0 && (
            <div className="text-center py-10">
              <p className="text-stone-800 font-medium text-sm">No vendors found for “{query}”{selectedCity !== 'All Cities' ? ` in ${selectedCity}` : ''}.</p>
              <p className="text-stone-500 text-xs mt-1">Try a broader term like “Photography” or “Catering”, or switch to All Cities.</p>
              <div className="mt-4 flex justify-center gap-2">
                {selectedCity !== 'All Cities' && <button onClick={() => { setSelectedCity('All Cities'); setCurrentCity('All Cities'); }} className="px-4 py-2 text-xs font-semibold border border-stone-200 bg-white rounded-lg hover:border-[#E83A59]">Search all cities</button>}
                <button onClick={() => goToDirectory()} className="px-4 py-2 text-xs font-semibold bg-[#E83A59] text-white rounded-lg hover:bg-[#d82352]">Browse all vendors</button>
              </div>
            </div>
          )}

          {!query.trim() && (
            <div className="space-y-6">
              {recent.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1.5"><Clock3 className="w-3.5 h-3.5" /> Recent searches</span>
                    <button onClick={clearRecent} className="text-[11px] font-semibold text-stone-400 hover:text-[#E83A59]">Clear</button>
                  </div>
                  <div className="flex flex-wrap gap-2">{recent.map((r) => <button key={r} onClick={() => setQuery(r)} className="px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-700 hover:border-[#E83A59] hover:text-[#E83A59] transition-colors">{r}</button>)}</div>
                </div>
              )}

              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1.5 mb-2.5"><TrendingUp className="w-3.5 h-3.5" /> Popular searches</span>
                <div className="flex flex-wrap gap-2">{quickSearches.map((qs) => <button key={qs} onClick={() => setQuery(qs)} className="px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-700 hover:border-[#E83A59] hover:text-[#E83A59] transition-colors text-left">{qs}</button>)}</div>
              </div>

              {vendorCategories?.length > 0 && (
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1.5 mb-2.5"><LayoutGrid className="w-3.5 h-3.5" /> Browse by category</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {vendorCategories.slice(0, 9).map((c: any) => (
                      <button key={c.id} onClick={() => goToDirectory(c.name)} className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-left text-xs font-semibold text-stone-700 hover:border-[#E83A59] hover:text-[#E83A59] transition-colors">{c.name}</button>
                    ))}
                  </div>
                </div>
              )}

              <div onClick={() => { onClose(); navigateTo('ai-planner'); }} className="p-4 rounded-xl bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-200 cursor-pointer hover:shadow-md transition-all flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-white text-[#E83A59] flex items-center justify-center shrink-0 border border-rose-200"><Sparkles className="w-5 h-5" /></div>
                  <div>
                    <h5 className="text-sm font-semibold text-stone-900">Need a personalised event budget and vendor plan?</h5>
                    <p className="text-xs text-stone-600 mt-0.5">Use the AI Event Planner for a custom timeline and pricing for your exact budget.</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#E83A59] shrink-0 ml-3" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
