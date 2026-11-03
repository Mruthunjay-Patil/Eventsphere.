import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Vendor, VendorService } from '../types';
import { api } from '../services/api';
import { BRAND_CONFIG, formatCurrency } from '../config/brand';
import { Search, SlidersHorizontal, Heart, Star, MapPin, X, LayoutGrid, List, ShieldCheck, CalendarDays } from 'lucide-react';

const normalizeCity = (value: string) => { const city = value.trim().toLowerCase(); return city === 'bangalore' || city === 'bengaluru' ? 'bengaluru' : city; };

const eventCategoryMap: Record<string, string[]> = {
  Wedding: ['wedding','bridal','venue','catering','decoration','floral','photograph','makeup','mehendi','music','planner','jewellery','invitation'],
  Birthday: ['birthday','cake','balloon','party','catering','photograph','entertainment','decoration','venue','dj'],
  'Corporate Event': ['corporate','conference','av','sound','stage','catering','venue','photograph','event planner','lighting'],
  'College Event': ['college','concert','dj','sound','stage','photograph','catering','lighting','entertainment'],
  Engagement: ['engagement','bridal','venue','catering','decoration','floral','photograph','makeup','jewellery'],
  Anniversary: ['anniversary','venue','catering','decoration','floral','photograph','cake','music'],
  Party: ['party','dj','music','catering','cake','balloon','venue','decoration','photograph','entertainment'],
  Conference: ['conference','av','sound','stage','venue','catering','photograph','lighting'],
  Concert: ['concert','dj','music','sound','stage','lighting','venue','security','photograph'],
  'Baby Shower': ['baby','shower','decoration','balloon','cake','catering','photograph','venue'],
  Housewarming: ['housewarming','decoration','catering','photograph','floral','puja','venue'],
  Graduation: ['graduation','photograph','venue','catering','decoration','stage','dj'],
};

export const VendorDiscoveryView: React.FC = () => {
  const { currentCity, setCurrentCity, vendorCategories, navigateTo, viewParam, favoriteVendorIds, toggleFavorite, openReserveModal } = useApp();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [services, setServices] = useState<VendorService[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState(viewParam || '');
  const [category, setCategory] = useState('all');
  const [eventType, setEventType] = useState('');
  const [city, setCity] = useState(currentCity || 'All Cities');
  const [rating, setRating] = useState<number | undefined>();
  const [maxPrice, setMaxPrice] = useState(500000);
  const [sort, setSort] = useState('featured');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [mobileFilters, setMobileFilters] = useState(false);

  useEffect(() => {
    const raw = String(viewParam || '');
    if (raw.startsWith('event:')) { setEventType(raw.slice(6)); setCategory('all'); setQuery(''); return; }
    setEventType('');
    const match = vendorCategories.find(c => c.id === viewParam || c.name.toLowerCase() === raw.toLowerCase());
    if (match) { setCategory(match.id); setQuery(''); } else if (viewParam) setQuery(viewParam);
  }, [viewParam, vendorCategories]);

  useEffect(() => {
    let active = true;
    const loadMarketplace = () => {
      const timeout = new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('The server took too long to respond. Please check that it is running and connected to MongoDB.')), 20000));
      Promise.race([Promise.all([
        api.getVendors({ city: city === 'All Cities' ? undefined : city, rating, maxPrice, sort }),
        api.getServices('approved'),
      ]), timeout]).then(([v, s]) => { if (active) { setVendors(v); setServices(s); setLoadError(''); } })
        .catch((e: any) => { if (active) { setVendors([]); setServices([]); setLoadError(e?.message || 'Could not load services.'); } })
        .finally(() => active && setLoading(false));
    };
    setLoading(true);
    loadMarketplace();
    const refresh = () => loadMarketplace();
    window.addEventListener('focus', refresh);
    const interval = window.setInterval(loadMarketplace, 15000);
    return () => { active = false; window.removeEventListener('focus', refresh); window.clearInterval(interval); };
  }, [city, rating, maxPrice, sort]);

  const cards = useMemo(() => {
    const vendorById = new Map(vendors.map(v => [v.id, v]));
    let rows = services.map(service => ({ service, vendor: vendorById.get(service.vendorId) })).filter(x => x.vendor);
    if (category !== 'all') rows = rows.filter(x => x.service.categoryId === category || x.service.categoryName.toLowerCase() === category.toLowerCase());
    if (eventType) { const related = eventCategoryMap[eventType] || []; rows = rows.filter(x => (x.service.eventTypes || []).some(t => t.toLowerCase() === eventType.toLowerCase()) || related.some(k => `${x.service.categoryName} ${x.service.subcategory} ${x.service.serviceName}`.toLowerCase().includes(k))); }
    if (city !== 'All Cities') rows = rows.filter(x => normalizeCity(x.service.city) === normalizeCity(city));
    if (query) {
      const q = query.toLowerCase();
      rows = rows.filter(x => `${x.service.serviceName} ${x.service.description} ${x.service.categoryName} ${x.vendor?.businessName || ''} ${x.service.includedServices.join(' ')}`.toLowerCase().includes(q));
    }
    rows = rows.filter(x => x.service.price <= maxPrice);
    if (rating) rows = rows.filter(x => (x.vendor?.rating || 0) >= rating);
    if (sort === 'rating') rows.sort((a,b)=>(b.vendor?.rating||0)-(a.vendor?.rating||0));
    if (sort === 'price_asc') rows.sort((a,b)=>a.service.price-b.service.price);
    if (sort === 'price_desc') rows.sort((a,b)=>b.service.price-a.service.price);
    if (sort === 'reviews') rows.sort((a,b)=>(b.vendor?.reviewCount||0)-(a.vendor?.reviewCount||0));
    return rows;
  }, [services, vendors, category, city, query, maxPrice, rating, sort, eventType]);

  const title = useMemo(() => eventType ? `${eventType} Services` : (vendorCategories.find(v => v.id === category)?.name || (query || 'Event Vendors & Services')), [category, query, vendorCategories, eventType]);
  const reset = () => { setQuery(''); setCategory('all'); setEventType(''); setCity(currentCity || 'All Cities'); setRating(undefined); setMaxPrice(500000); setSort('featured'); };

  const Filters = () => (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,.05)] space-y-6">
      <div className="flex items-center justify-between border-b border-stone-100 pb-4"><div className="flex items-center gap-2 font-bold text-sm"><SlidersHorizontal className="w-4 h-4 text-[#ef4563]"/>Filter criteria</div><button onClick={reset} className="text-xs text-stone-500 hover:text-[#ef4563]">Reset</button></div>
      <div><label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Search keywords</label><div className="relative mt-2"><Search className="absolute left-3 top-3 w-4 h-4 text-stone-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Photographer, DJ, Decorator..." className="w-full rounded-xl border border-stone-200 py-2.5 pl-9 pr-8 text-sm outline-none focus:border-[#ef4563]"/>{query&&<button onClick={()=>setQuery('')} className="absolute right-3 top-3"><X className="w-4 h-4 text-stone-400"/></button>}</div></div>
      <div><label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Service category</label><div className="mt-2 space-y-1 max-h-64 overflow-auto"><button onClick={()=>setCategory('all')} className={`w-full rounded-lg px-3 py-2 text-left text-sm ${category==='all'?'bg-[#fff0f3] text-[#ef4563] font-bold':'hover:bg-stone-50'}`}>All categories</button>{vendorCategories.map(c=><button key={c.id} onClick={()=>setCategory(c.id)} className={`w-full rounded-lg px-3 py-2 text-left text-sm ${category===c.id?'bg-[#fff0f3] text-[#ef4563] font-bold':'hover:bg-stone-50'}`}>{c.name}</button>)}</div></div>
      <div><label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">City</label><select value={city} onChange={e=>{setCity(e.target.value);setCurrentCity(e.target.value)}} className="mt-2 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none"><option>All Cities</option>{BRAND_CONFIG.popularCities.map(c=><option key={c.name}>{c.name}</option>)}</select></div>
      <div><label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Minimum rating</label><div className="grid grid-cols-3 gap-2 mt-2">{[undefined,4.5,4.8].map(r=><button key={String(r)} onClick={()=>setRating(r)} className={`rounded-lg border py-2 text-xs ${rating===r?'border-[#ef4563] bg-[#fff0f3] text-[#ef4563] font-bold':'border-stone-200'}`}>{r?`${r}+`:'Any'}</button>)}</div></div>
      <div><label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Maximum starting price</label><div className="mt-2 text-sm font-bold">{formatCurrency(maxPrice)}</div><input type="range" min="10000" max="500000" step="10000" value={maxPrice} onChange={e=>setMaxPrice(Number(e.target.value))} className="w-full accent-[#ef4563]"/></div>
    </div>
  );

  return <div className="min-h-screen bg-[#fafafa] text-stone-900">
    <section className="bg-white border-b border-stone-200"><div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-7 sm:py-10"><div className="text-[11px] text-stone-500"><button onClick={()=>navigateTo('home')} className="text-[#ef4563]">Home</button><span className="mx-1">/</span>Services</div><div className="mt-6 flex flex-col md:flex-row md:items-end justify-between gap-4"><div><h1 className="text-3xl sm:text-4xl font-black tracking-tight">{title}</h1><p className="mt-2 text-sm text-stone-500 max-w-3xl">Explore approved event services with real portfolios, starting prices, verified vendors and live reservation slots.</p></div><div className="text-sm font-bold text-stone-600">{cards.length} services</div></div></div></section>
    <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-8"><div className="lg:hidden mb-4"><button onClick={()=>setMobileFilters(true)} className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-bold flex items-center gap-2"><SlidersHorizontal className="w-4 h-4"/>Filters</button></div><div className="grid lg:grid-cols-12 gap-7"><aside className="hidden lg:block lg:col-span-3"><Filters/></aside><main className="lg:col-span-9"><div className="bg-white border border-stone-200 rounded-2xl px-4 py-3 flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-5 shadow-sm"><span className="text-sm">Displaying <b>{cards.length}</b> matching services</span><div className="flex items-center gap-2"><select value={sort} onChange={e=>setSort(e.target.value)} className="rounded-lg border border-stone-200 px-3 py-2 text-xs"><option value="featured">Featured & Recommended</option><option value="rating">Highest Rated</option><option value="price_asc">Price: Low to High</option><option value="price_desc">Price: High to Low</option><option value="reviews">Most Reviewed</option></select><div className="flex border border-stone-200 rounded-lg p-1"><button onClick={()=>setViewMode('grid')} className={`p-2 rounded ${viewMode==='grid'?'bg-[#ef4563] text-white':''}`}><LayoutGrid className="w-4 h-4"/></button><button onClick={()=>setViewMode('list')} className={`p-2 rounded ${viewMode==='list'?'bg-[#ef4563] text-white':''}`}><List className="w-4 h-4"/></button></div></div></div>
      {loading?<div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">{[1,2,3,4,5,6].map(i=><div key={i} className="h-96 rounded-2xl bg-white border border-stone-200 animate-pulse"/>)}</div>:loadError?<div className="rounded-2xl border border-rose-200 bg-rose-50 p-12 text-center"><h2 className="text-xl font-black text-rose-700">Couldn&apos;t load services</h2><p className="mt-2 text-sm text-rose-700/80">{loadError}</p><button onClick={()=>window.location.reload()} className="mt-5 rounded-xl bg-[#ef4563] text-white px-5 py-3 text-sm font-bold">Try again</button></div>:cards.length===0?<div className="rounded-2xl border border-stone-200 bg-white p-16 text-center"><Search className="mx-auto w-10 h-10 text-[#ef4563]"/><h2 className="mt-4 text-xl font-black">No services found</h2><p className="mt-2 text-sm text-stone-500">Try another category, city or budget.</p><button onClick={reset} className="mt-5 rounded-xl bg-[#ef4563] text-white px-5 py-3 text-sm font-bold">Reset all filters</button></div>:<div className={viewMode==='grid'?'grid md:grid-cols-2 xl:grid-cols-3 gap-5':'space-y-4'}>{cards.map(({service,vendor})=><article key={service.id} className={`bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-[0_8px_25px_rgba(0,0,0,.06)] ${viewMode==='list'?'flex':''}`}>
        <div className={`relative ${viewMode==='list'?'w-56 shrink-0':''}`}><img src={service.coverImage||service.images[0]||vendor!.coverImage||vendor!.logo} alt={service.serviceName} className={`w-full object-cover ${viewMode==='list'?'h-full min-h-52':'h-52'}`}/><span className="absolute left-3 top-3 rounded-md bg-white/95 border border-stone-200 px-2.5 py-1 text-[10px] font-bold uppercase text-[#ef4563]">{service.categoryName}</span><div className="absolute bottom-3 left-3 right-3 flex justify-between"><span className="rounded-md bg-white/95 px-2.5 py-1 text-[10px] font-bold text-stone-700 flex items-center gap-1"><CalendarDays className="w-3 h-3"/>Live slots</span><span className="rounded-md bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 flex items-center gap-1"><ShieldCheck className="w-3 h-3"/>Verified</span></div><button onClick={()=>toggleFavorite(vendor!.id)} className="absolute right-3 top-3 rounded-full bg-white/95 p-2 shadow"><Heart className={`w-4 h-4 ${favoriteVendorIds.includes(vendor!.id)?'fill-[#ef4563] text-[#ef4563]':'text-stone-600'}`}/></button></div>
        <div className="p-4 flex-1"><div className="flex justify-between gap-3"><div className="min-w-0"><h3 className="font-black text-base truncate">{service.serviceName}</h3><p className="text-xs text-stone-500 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3"/>{service.city} · {vendor!.businessName}</p></div><div className="text-right shrink-0"><div className="font-black text-[#ef4563]">{formatCurrency(service.price)}</div><div className="text-[10px] text-stone-500">starting price</div></div></div><div className="flex items-center gap-1 mt-3 text-xs"><Star className="w-4 h-4 fill-amber-400 text-amber-400"/><b>{vendor!.rating.toFixed(1)}</b><span className="text-stone-400">{vendor!.reviewCount ? `${vendor!.reviewCount} reviews` : 'No reviews yet'}</span></div><p className="mt-2 text-xs text-stone-500 line-clamp-2">{service.description}</p><div className="flex flex-wrap gap-1.5 mt-3">{service.includedServices.slice(0,3).map(item=><span key={item} className="rounded-md bg-stone-50 border border-stone-200 px-2 py-1 text-[10px] text-stone-600">✓ {item}</span>)}</div><div className="flex gap-2 mt-4"><button onClick={()=>openReserveModal(vendor!,service)} className="flex-1 rounded-lg bg-[#ef4563] text-white py-2.5 text-xs font-black flex items-center justify-center gap-1.5"><CalendarDays className="w-3.5 h-3.5"/>Reserve</button><button onClick={()=>navigateTo('vendor-profile',vendor!.id)} className="flex-1 rounded-lg border border-[#ef4563] text-[#ef4563] py-2.5 text-xs font-bold">View details</button></div></div>
      </article>)}</div>}
    </main></div></div>
    {mobileFilters&&<div className="fixed inset-0 z-[70] bg-black/40 p-4 lg:hidden" onClick={()=>setMobileFilters(false)}><div className="max-w-md mx-auto mt-12" onClick={e=>e.stopPropagation()}><div className="flex justify-end mb-2"><button onClick={()=>setMobileFilters(false)} className="rounded-full bg-white p-2"><X/></button></div><Filters/></div></div>}
  </div>;
};
