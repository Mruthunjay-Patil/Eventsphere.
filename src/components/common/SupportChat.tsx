import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, Sparkles, X, Send, LoaderCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { authToken } from '../../services/api';

type ChatMessage = { role: 'user' | 'assistant'; content: string };
type Role = 'guest' | 'customer' | 'vendor';
const ROLE_CONFIG: Record<Role, { subtitle: string; greeting: (name?: string) => string; chips: string[]; placeholder: string }> = {
  guest: {
    subtitle: 'Your event-planning companion',
    greeting: () => 'Hi! I’m your EventSphere assistant. I can help find approved vendors, plan an event, or explain booking and payment steps. What can I help with?',
    chips: ['Find vendors in my city', 'Cheapest vendors', 'How does booking work?'],
    placeholder: 'Ask about vendors, events or bookings…',
  },
  customer: {
    subtitle: 'Your event-planning companion',
    greeting: (name) => `Hi${name ? ` ${name}` : ''}! I can help you find vendors, plan your event, and check your bookings and payments. What do you need?`,
    chips: ['Find vendors in my city', 'Cheapest vendors', 'Check my booking', 'Do I have a balance to pay?'],
    placeholder: 'Ask about vendors, events or bookings…',
  },
  vendor: {
    subtitle: 'Your vendor business assistant',
    greeting: (name) => `Hi${name ? ` ${name}` : ''}! I’m here to help you run your business on EventSphere: adding services, handling booking requests, availability and payments. What would you like to do?`,
    chips: ['How do I add a service?', 'Any new booking requests?', 'How much have I been paid?', 'How do I block dates?', 'Is my service approved?'],
    placeholder: 'Ask about your services, bookings or payments…',
  },
};
export const SupportChat: React.FC = () => {
  const { currentUser, currentCity, navigateTo, showToast } = useApp();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const role: Role = currentUser?.role === 'vendor' ? 'vendor' : currentUser?.role === 'customer' ? 'customer' : 'guest';
  const config = ROLE_CONFIG[role];
  const firstName = currentUser?.name?.split(' ')[0];
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', content: config.greeting(firstName) }]);
  // Start a fresh, role-appropriate conversation whenever the signed-in role changes (login, logout, switching accounts).
  useEffect(() => { setMessages([{ role: 'assistant', content: ROLE_CONFIG[role].greeting(firstName) }]); setInput(''); }, [role, currentUser?.id]);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, open]);
  const send = async (text = input) => {
    const prompt = text.trim(); if (!prompt || busy) return;
    const next = [...messages, { role: 'user' as const, content: prompt }]; setMessages(next); setInput(''); setBusy(true);
    try {
      const response = await fetch('/api/ai/support-chat', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(authToken.get() ? { Authorization: `Bearer ${authToken.get()}` } : {}) }, body: JSON.stringify({ message: prompt, history: next.slice(-8), city: currentCity, userRole: role }) });
      const data = await response.json();
      if (!response.ok || data.success === false) throw new Error(data.message || 'Assistant is temporarily unavailable.');
      setMessages(old => [...old, { role: 'assistant', content: String(data.data?.reply || 'I couldn’t find a clear answer. Please try asking another way or contact support from the footer.') }]);
    } catch (e: any) {
      setMessages(old => [...old, { role: 'assistant', content: 'I can still help with the basics while live AI is unavailable. ' + (role === 'vendor' ? 'Open your Vendor Dashboard for booking requests, services and availability, or contact EventSphere support.' : 'Try “find vendors in my city”, “cheapest photographers”, or open My Bookings for your payment status.') + '' }]);
      showToast('Assistant connection issue', e.message || 'Using help fallback.', 'info');
    } finally { setBusy(false); }
  };
  return <>
    <button aria-label="Open EventSphere assistant" onClick={() => setOpen(v => !v)} className="fixed right-0 top-[38%] z-[70] flex items-center gap-2 rounded-l-xl bg-[#F04468] px-3 py-4 text-white shadow-xl hover:bg-[#D93256]"> <MessageCircle size={17}/><span className="[writing-mode:vertical-rl] rotate-180 text-sm font-bold">Need help?</span></button>
    {open && <section aria-label="EventSphere assistant chat" className="fixed bottom-4 right-4 z-[90] flex h-[min(620px,calc(100dvh-32px))] w-[min(380px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-[#E9E5E7] bg-[#FFFBF8] shadow-2xl">
      <header className="flex items-center justify-between bg-[#20283A] px-4 py-3 text-white"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#F04468]"><Sparkles size={20}/></span><div><b className="block text-sm">EventSphere Assistant</b><span className="text-xs text-white/70">{config.subtitle}</span></div></div><button aria-label="Close assistant" onClick={() => setOpen(false)} className="rounded-lg p-1 hover:bg-white/10"><X size={20}/></button></header>
      <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">{messages.map((m,i)=><div key={i} className={`flex ${m.role==='user'?'justify-end':'justify-start'}`}><p className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-3 text-sm leading-5 ${m.role==='user'?'rounded-br-md bg-[#F04468] text-white':'rounded-bl-md border border-[#E9E5E7] bg-white text-[#20283A]'}`}>{m.content}</p></div>)}{busy&&<div className="flex items-center gap-2 text-xs text-stone-500"><LoaderCircle className="animate-spin" size={15}/>Finding an answer…</div>}<div ref={bottom}/></div>
      <div className="flex flex-wrap gap-2 border-t border-[#E9E5E7] bg-white px-3 pt-3">{config.chips.map(q=><button key={q} disabled={busy} onClick={()=>send(q)} className="rounded-full border border-[#F04468]/30 px-3 py-1.5 text-xs font-semibold text-[#78283F] hover:bg-[#FFF0F3] disabled:opacity-50">{q}</button>)}</div>
      <form onSubmit={e=>{e.preventDefault();void send()}} className="flex gap-2 bg-white p-3"><input value={input} onChange={e=>setInput(e.target.value)} maxLength={1000} placeholder={config.placeholder} className="min-w-0 flex-1 rounded-xl border border-[#E9E5E7] px-3 py-3 text-sm outline-none focus:border-[#F04468]"/><button aria-label="Send message" disabled={busy||!input.trim()} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#F04468] text-white disabled:opacity-50"><Send size={18}/></button></form>
    </section>}
  </>;
};
