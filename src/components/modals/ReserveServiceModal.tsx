import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, MapPin, Phone, Mail, UserRound, X, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { formatCurrency } from '../../config/brand';

const today = new Date();
const isoToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

export const ReserveServiceModal: React.FC = () => {
  const { reserveModalData, closeReserveModal, currentUser, showToast } = useApp();
  const { isOpen, vendor, service } = reserveModalData;
  const [date, setDate] = useState(isoToday);
  const [slots, setSlots] = useState<{ startTime: string; endTime: string; status: 'available' | 'booked' }[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);

  const selected = useMemo(() => slots.find((s) => s.startTime === selectedSlot), [slots, selectedSlot]);

  const loadAvailability = async () => {
    if (!service?.id || !date) return;
    setLoadingSlots(true);
    setSelectedSlot('');
    try {
      const result = await api.getServiceAvailability(service.id, date);
      setSlots(result.slots);
    } catch (err: any) {
      setSlots([]);
      showToast('Could not load availability', err.message, 'error');
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setDate(isoToday);
      setAddress('');
      setNotes('');
    }
  }, [isOpen, service?.id]);

  useEffect(() => {
    if (isOpen && date) loadAvailability();
  }, [isOpen, date, service?.id]);

  if (!isOpen || !vendor || !service) return null;

  const reserve = async () => {
    if (!selected) return showToast('Choose a time slot', 'Select one available slot before reserving.', 'warning');
    if (!address.trim()) return showToast('Add the service location', 'Enter the address where the service will be delivered.', 'warning');
    setBooking(true);
    try {
      await api.createBooking({
        vendorId: vendor.id,
        serviceId: service.id,
        packageName: service.serviceName,
        eventDate: date,
        startTime: selected.startTime,
        endTime: selected.endTime,
        totalAmount: service.price,
        specialRequirements: notes.trim(),
        serviceAddress: address.trim(),
      });
      showToast('Booking request sent', `${vendor.businessName} received your ${date} ${selected.startTime} request.`, 'success');
      closeReserveModal();
    } catch (err: any) {
      showToast('Slot unavailable', err.message || 'This slot was booked by another customer. Choose another time.', 'error');
      await loadAvailability();
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center" onMouseDown={closeReserveModal}>
      <div className="w-full max-w-[900px] max-h-[92vh] overflow-hidden rounded-2xl bg-white text-stone-900 shadow-[0_25px_80px_rgba(0,0,0,.25)]" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-stone-200 px-5 sm:px-7 py-4">
          <div><p className="text-[10px] uppercase tracking-[.18em] font-black text-[#ef4563]">Booking</p><h2 className="text-xl sm:text-2xl font-black">Reserve Service Slot</h2></div>
          <button onClick={closeReserveModal} className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700"><X className="w-5 h-5" /></button>
        </div>

        <div className="max-h-[calc(92vh-73px)] overflow-y-auto p-5 sm:p-7 space-y-7">
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 flex flex-col sm:flex-row gap-4 sm:items-center">
            <img src={service.images[0] || vendor.coverImage || vendor.logo} alt={service.serviceName} className="w-full sm:w-20 h-36 sm:h-20 object-cover rounded-lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wide">
                <span className="rounded-full bg-[#fff0f3] px-2.5 py-1 text-[#ef4563]">{service.categoryName}</span>
                <span className="text-stone-500">• {service.subcategory || 'Event Service'}</span>
              </div>
              <h3 className="mt-1 text-lg font-black truncate">{service.serviceName}</h3>
              <p className="text-xs text-stone-500">Partner: {vendor.businessName}</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-emerald-700 font-bold"><ShieldCheck className="w-4 h-4" /> Verified service</div>
            </div>
            <div className="sm:text-right"><p className="text-[10px] uppercase tracking-wider text-stone-500">Starting fee</p><p className="text-xl font-black text-[#ef4563]">{formatCurrency(service.price)}</p></div>
          </div>

          <section>
            <div className="flex items-center justify-between gap-3 mb-3"><h3 className="text-sm font-black uppercase tracking-wider text-[#ef4563]">1. Select service date & available time slot</h3><span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> LIVE SLOT SYNC</span></div>
            <div className="grid lg:grid-cols-[220px_1fr] gap-5">
              <label className="block"><span className="text-xs text-stone-500">Service Date</span><div className="relative mt-1"><CalendarDays className="absolute left-3 top-3.5 w-4 h-4 text-stone-400" /><input type="date" min={isoToday} value={date} onChange={(e) => setDate(e.target.value)} className="form-field pl-10" /></div></label>
              <div><div className="flex items-center justify-between"><span className="text-xs text-stone-500">Available Slots</span><span className="text-[10px] text-stone-400">Booked slots are locked for everyone</span></div><div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">{loadingSlots ? Array.from({length:8}).map((_,i)=><div key={i} className="h-14 rounded-lg bg-stone-100 animate-pulse" />) : slots.map(slot=>{const available=slot.status==='available';const selectedTime=selectedSlot===slot.startTime;return <button key={slot.startTime} type="button" disabled={!available} onClick={()=>setSelectedSlot(slot.startTime)} className={`h-14 rounded-lg border text-center transition ${selectedTime?'border-[#ef4563] bg-[#fff0f3] text-[#ef4563]':available?'border-stone-200 bg-white hover:border-[#ef4563]':'border-stone-200 bg-stone-100 text-stone-400 cursor-not-allowed'}`}><span className="block text-xs font-black">{slot.startTime}</span><span className="block text-[9px] uppercase tracking-wide mt-1">{available?'Available':'Booked'}</span></button>})}</div></div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-black uppercase tracking-wider text-[#ef4563] mb-3">2. Customer contact & location</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <label><span className="text-xs text-stone-500">Full Name</span><div className="relative mt-1"><UserRound className="absolute left-3 top-3.5 w-4 h-4 text-stone-400"/><input readOnly value={currentUser?.name || ''} className="form-field pl-10 bg-stone-50" /></div></label>
              <label><span className="text-xs text-stone-500">Contact Phone</span><div className="relative mt-1"><Phone className="absolute left-3 top-3.5 w-4 h-4 text-stone-400"/><input readOnly value={currentUser?.phone || ''} className="form-field pl-10 bg-stone-50" /></div></label>
              <label><span className="text-xs text-stone-500">Email Address</span><div className="relative mt-1"><Mail className="absolute left-3 top-3.5 w-4 h-4 text-stone-400"/><input readOnly value={currentUser?.email || ''} className="form-field pl-10 bg-stone-50" /></div></label>
              <label><span className="text-xs text-stone-500">Service Address / Location</span><div className="relative mt-1"><MapPin className="absolute left-3 top-3.5 w-4 h-4 text-stone-400"/><input value={address} onChange={(e)=>setAddress(e.target.value)} placeholder="Enter event/service location" className="form-field pl-10" /></div></label>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-black uppercase tracking-wider text-[#ef4563] mb-3">3. Special instructions or requirements <span className="normal-case text-stone-400 font-normal">(optional)</span></h3>
            <textarea rows={4} value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Tell the vendor anything important about your event..." className="form-field resize-none" />
          </section>

          <div className="border-t border-stone-200 pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div><p className="text-[10px] uppercase tracking-wider text-stone-500">Estimated service fee</p><p className="text-xl font-black text-[#ef4563]">{formatCurrency(service.price)}</p><p className="text-[10px] text-stone-500 mt-1">Vendor confirms the request before payment.</p></div>
            <div className="flex gap-3"><button type="button" onClick={closeReserveModal} className="rounded-xl border border-stone-200 px-5 py-3 text-sm font-bold">Cancel</button><button type="button" disabled={booking} onClick={reserve} className="rounded-xl bg-[#ef4563] text-white px-5 py-3 text-sm font-black disabled:opacity-50 flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>{booking?'Reserving…':'Reserve Booking'}</button></div>
          </div>
        </div>
      </div>
    </div>
  );
};
