import React, { useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { ChevronLeft, ChevronRight, CalendarDays, ArrowRight } from 'lucide-react';

const events = [
  ['Wedding','https://images.unsplash.com/photo-1519741497674-611481863552?w=600&auto=format&fit=crop&q=80'],
  ['Birthday','https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&auto=format&fit=crop&q=80'],
  ['Corporate Event','https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=600&auto=format&fit=crop&q=80'],
  ['College Event','https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80'],
  ['Engagement','https://images.unsplash.com/photo-1606800052052-a08af7148866?w=600&auto=format&fit=crop&q=80'],
  ['Anniversary','https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&auto=format&fit=crop&q=80'],
  ['Party','https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80'],
  ['Conference','https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=600&auto=format&fit=crop&q=80'],
  ['Concert','https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&auto=format&fit=crop&q=80'],
  ['Baby Shower','https://images.unsplash.com/photo-1513159446162-54eb8bdaa79b?w=600&auto=format&fit=crop&q=80'],
  ['Housewarming','https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80'],
  ['Graduation','https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&auto=format&fit=crop&q=80'],
];
const services = [
  ['Event Planners','all','https://images.unsplash.com/photo-1507504031003-b417219a0fde?w=600&auto=format&fit=crop&q=80'],['Photographers','Photography & Cinema','https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&auto=format&fit=crop&q=80'],['Event Venues','Venues','https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=600&auto=format&fit=crop&q=80'],['Decorators','Decoration & Florals','https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=600&auto=format&fit=crop&q=80'],['Caterers & Food','Food & Catering','https://images.unsplash.com/photo-1555244162-803834f70033?w=600&auto=format&fit=crop&q=80'],['DJs & Live Music','Entertainment & Artists','https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&auto=format&fit=crop&q=80'],['Makeup & Styling','Beauty & Mehendi','https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600&auto=format&fit=crop&q=80'],['Cakes & Bakeries','Food & Catering','https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80'],['Sound & AV','all','https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80'],['Invitations & Gifts','Invitations & Favors','https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&auto=format&fit=crop&q=80']];

export const EventTypesGrid: React.FC = () => {
 const {navigateTo}=useApp(); const eventRef=useRef<HTMLDivElement>(null); const serviceRef=useRef<HTMLDivElement>(null); const scroll=(ref:React.RefObject<HTMLDivElement|null>,dir:number)=>ref.current?.scrollBy({left:dir*420,behavior:'smooth'});
 const Card:React.FC<{item:string[];event?:boolean}>=({item,event})=><button onClick={()=>event?navigateTo('vendors',`event:${item[0]}`):navigateTo('vendors',item[1]==='all'?undefined:item[1])} className="group shrink-0 w-[205px] sm:w-[225px] bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-[0_5px_18px_rgba(0,0,0,.06)] text-left hover:-translate-y-1 hover:shadow-xl transition snap-start"><img src={event?item[1]:item[2]} alt={item[0]} className="w-full h-[150px] object-cover group-hover:scale-105 transition-transform duration-500"/><div className="p-3"><h3 className="font-black text-sm">{item[0]}</h3><p className="text-[11px] text-stone-500 mt-1">{event?'Plan this event →':'Explore providers →'}</p></div></button>;
 return <section className="bg-white text-stone-900 py-12 sm:py-16 border-b border-stone-200"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  <div className="flex items-end justify-between gap-4"><div><div className="text-[10px] uppercase tracking-widest text-[#ef4563] font-bold">Every celebration</div><h2 className="text-2xl sm:text-3xl font-black mt-1">Plan any event</h2><p className="text-xs sm:text-sm text-stone-500 mt-1">From weddings and birthdays to corporate events, concerts and college functions.</p></div><div className="flex gap-2"><button onClick={()=>scroll(eventRef,-1)} className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center"><ChevronLeft/></button><button onClick={()=>scroll(eventRef,1)} className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center"><ChevronRight/></button></div></div>
  <div ref={eventRef} className="mt-7 flex gap-5 overflow-x-auto pb-4 snap-x" style={{scrollbarWidth:'none'}}>{events.map(e=><Card key={e[0]} item={e} event/>)}</div>
  <div className="mt-12 flex items-end justify-between gap-4"><div><div className="text-[10px] uppercase tracking-widest text-[#ef4563] font-bold">Vendor marketplace</div><h2 className="text-2xl sm:text-3xl font-black mt-1">Explore event services</h2><p className="text-xs sm:text-sm text-stone-500 mt-1">Choose a service and see real marketplace listings, prices, ratings and enquiries.</p></div><div className="flex gap-2"><button onClick={()=>scroll(serviceRef,-1)} className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center"><ChevronLeft/></button><button onClick={()=>scroll(serviceRef,1)} className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center"><ChevronRight/></button></div></div>
  <div ref={serviceRef} className="mt-7 flex gap-5 overflow-x-auto pb-4 snap-x" style={{scrollbarWidth:'none'}}>{services.map(s=><Card key={s[0]} item={s}/>)}</div>
 </div></section>;
};
