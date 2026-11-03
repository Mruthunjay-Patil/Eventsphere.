import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { CalendarDays, MapPin, Users, IndianRupee, ArrowRight } from 'lucide-react';

export const EventPlannerWizardView: React.FC = () => {
  const { currentCity, eventCategories, navigateTo, viewParam, refreshEvents, setActiveEventId, showToast, triggerCelebration } = useApp();
  const [eventType, setEventType] = useState(viewParam || 'Wedding');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('18:00');
  const [city, setCity] = useState(currentCity || 'Bengaluru');
  const [venue, setVenue] = useState('');
  const [guests, setGuests] = useState(150);
  const [budget, setBudget] = useState(150000);
  const [services, setServices] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const options = ['Venue', 'Catering', 'Photography', 'Videography', 'Decoration', 'Music / DJ', 'Entertainment', 'Makeup', 'Invitations', 'Transport', 'Lighting & Sound', 'Event Planning'];
  useEffect(() => { if (viewParam) setEventType(viewParam); }, [viewParam]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      const cat = eventCategories.find(c => c.name.toLowerCase() === eventType.toLowerCase() || c.slug.toLowerCase() === eventType.toLowerCase());
      const created = await api.createEvent({ title: title || `${eventType} Celebration`, eventType, eventCategorySlug: cat?.slug || eventType.toLowerCase().replace(/\s+/g,'-'), date, time, locationCity: city, venueAddress: venue, guestCount: guests, totalBudget: budget, requiredServices: services });
      await refreshEvents(); setActiveEventId(created.id); showToast('Event created', 'Your event details have been saved.'); triggerCelebration(); navigateTo('events');
    } catch (err: any) { showToast('Could not create event', err.message, 'error'); } finally { setBusy(false); }
  };
  return <div className="min-h-screen bg-[#fafafa] text-stone-900 py-10 sm:py-14"><div className="max-w-5xl mx-auto px-4 sm:px-6">
    <div className="mb-8"><p className="text-xs uppercase tracking-[.18em] font-semibold text-[#ef4563]">Every celebration</p><h1 className="text-3xl sm:text-4xl font-bold mt-2">Plan your event</h1><p className="text-sm text-stone-600 mt-2">Tell us the essentials in one simple form. You can update your plan anytime.</p></div>
    <form onSubmit={submit} className="grid lg:grid-cols-[1fr_300px] gap-6"><div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-7 space-y-6 shadow-sm">
      <section><h2 className="text-lg font-semibold">What are you celebrating?</h2><div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">{['Wedding','Birthday','Corporate Event','College Event','Engagement','Anniversary','Party','Conference','Concert','Baby Shower','Housewarming','Graduation','Other'].map(type=><button type="button" key={type} onClick={()=>setEventType(type)} className={`rounded-xl border px-3 py-3 text-sm text-left transition ${eventType===type?'border-[#ef4563] bg-[#fff2f4] text-[#ef4563] font-semibold':'border-stone-200 hover:border-stone-300'}`}>{type}</button>)}</div></section>
      <div className="grid sm:grid-cols-2 gap-4"><label><span className="form-label">Event name</span><input value={title} onChange={e=>setTitle(e.target.value)} placeholder={`e.g. ${eventType} Celebration`} className="form-field"/></label><label><span className="form-label">Event date</span><input required type="date" min={new Date().toISOString().slice(0,10)} value={date} onChange={e=>setDate(e.target.value)} className="form-field"/></label><label><span className="form-label">Time</span><input type="time" value={time} onChange={e=>setTime(e.target.value)} className="form-field"/></label><label><span className="form-label">City</span><input required value={city} onChange={e=>setCity(e.target.value)} placeholder="Your event city" className="form-field"/></label><label className="sm:col-span-2"><span className="form-label">Venue / address (optional)</span><input value={venue} onChange={e=>setVenue(e.target.value)} placeholder="Venue name or event location" className="form-field"/></label><label><span className="form-label">Expected guests</span><input type="number" min="1" value={guests} onChange={e=>setGuests(Number(e.target.value))} className="form-field"/></label><label><span className="form-label">Total budget (₹)</span><input type="number" min="0" value={budget} onChange={e=>setBudget(Number(e.target.value))} className="form-field"/></label></div>
      <section><h2 className="text-lg font-semibold">Services you may need</h2><p className="text-sm text-stone-500 mt-1">Choose any that apply.</p><div className="grid sm:grid-cols-2 gap-2 mt-3">{options.map(item=><label key={item} className="flex items-center gap-3 rounded-xl border border-stone-200 px-3 py-3 text-sm hover:bg-stone-50"><input type="checkbox" checked={services.includes(item)} onChange={()=>setServices(prev=>prev.includes(item)?prev.filter(x=>x!==item):[...prev,item])} className="accent-[#ef4563]"/>{item}</label>)}</div></section>
    </div><aside className="bg-white border border-stone-200 rounded-2xl p-5 h-fit shadow-sm"><p className="text-xs uppercase tracking-widest text-[#ef4563] font-semibold">Your event</p><h2 className="text-xl font-bold mt-2">{title || `${eventType} Celebration`}</h2><div className="space-y-4 mt-5 text-sm text-stone-600"><p className="flex gap-2"><CalendarDays className="w-4 h-4 text-[#ef4563]"/>{date || 'Choose a date'}</p><p className="flex gap-2"><MapPin className="w-4 h-4 text-[#ef4563]"/>{city || 'Choose a city'}</p><p className="flex gap-2"><Users className="w-4 h-4 text-[#ef4563]"/>{guests} guests</p><p className="flex gap-2"><IndianRupee className="w-4 h-4 text-[#ef4563]"/>{budget.toLocaleString('en-IN')} budget</p></div><button disabled={busy} className="w-full mt-6 rounded-xl bg-[#ef4563] text-white py-3 font-semibold text-sm flex justify-center items-center gap-2 disabled:opacity-50">{busy?'Saving…':'Create event'}<ArrowRight className="w-4 h-4"/></button><p className="text-xs text-stone-500 mt-3">You can change these details later.</p></aside></form>
  </div></div>;
};
