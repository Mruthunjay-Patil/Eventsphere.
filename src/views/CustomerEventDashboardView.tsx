import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  UserEvent,
  EventChecklistItem,
  EventBudgetItem,
  Booking,
  Quotation,
  Vendor,
} from '../types';
import { api } from '../services/api';
import { formatCurrency } from '../config/brand';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  CreditCard,
  FileText,
  MessageSquare,
  Sparkles,
  ArrowRight,
  TrendingUp,
  DollarSign,
  ChevronDown,
  Check,
  X,
  Send,
} from 'lucide-react';

export const CustomerEventDashboardView: React.FC = () => {
  const {
    events,
    activeEvent,
    setActiveEventId,
    navigateTo,
    openCheckoutModal,
    openInvoiceModal,
    openEnquiryModal,
    showToast,
    triggerCelebration,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'checklist' | 'budget' | 'bookings' | 'matched'>('checklist');

  // Checklist State
  const [checklist, setChecklist] = useState<EventChecklistItem[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('General');
  const [isAddingTask, setIsAddingTask] = useState(false);

  // Budget State
  const [budgetItems, setBudgetItems] = useState<EventBudgetItem[]>([]);
  const [budgetSummary, setBudgetSummary] = useState({
    totalPlanned: 0,
    totalQuoted: 0,
    totalPaid: 0,
    remaining: 0,
  });
  const [newBudgetCategory, setNewBudgetCategory] = useState('');
  const [newBudgetPlanned, setNewBudgetPlanned] = useState<number>(50000);
  const [isAddingBudget, setIsAddingBudget] = useState(false);

  // Bookings & Quotes
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [userQuotations, setUserQuotations] = useState<Quotation[]>([]);

  // Matched Vendors
  const [matchedVendors, setMatchedVendors] = useState<Vendor[]>([]);

  const loadEventData = async () => {
    if (!activeEvent) return;
    try {
      const [chk, bud, bks, qts, vends] = await Promise.all([
        api.getChecklist(activeEvent.id),
        api.getBudget(activeEvent.id),
        api.getBookings(),
        api.getQuotations(),
        api.getVendors({ city: activeEvent.locationCity }),
      ]);

      setChecklist(chk);
      setBudgetItems(bud.items);
      setBudgetSummary(bud.summary);
      setUserBookings(bks.filter((b) => b.eventId === activeEvent.id));
      setUserQuotations(qts.filter((q) => q.eventId === activeEvent.id));
      setMatchedVendors(vends.slice(0, 4));
    } catch (err) {
      console.error('Failed to load event dashboard details', err);
    }
  };

  useEffect(() => {
    loadEventData();
  }, [activeEvent]);

  if (!activeEvent) {
    return (
      <div className="min-h-screen bg-[#050505] text-white py-20">
        <div className="max-w-md mx-auto px-4 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#141414] border border-[#2A2A2A] text-[#F27D26] flex items-center justify-center mx-auto">
            <Calendar className="w-8 h-8" />
          </div>
          <h2 className="font-display text-2xl font-black text-white uppercase tracking-tight">No Active Events Found</h2>
          <p className="text-xs text-stone-400">
            Start by planning your first wedding, birthday, conference, or private celebration.
          </p>
          <button
            onClick={() => navigateTo('create-event')}
            className="px-6 py-3 rounded-lg bg-[#F27D26] text-white text-xs font-mono-accent uppercase tracking-wider font-bold hover:bg-[#d96716]"
          >
            Launch Event Planner Wizard
          </button>
        </div>
      </div>
    );
  }

  // Checklist Actions
  const handleToggleChecklist = async (item: EventChecklistItem) => {
    try {
      const updated = await api.updateChecklistItem(activeEvent.id, item.id, {
        completed: !item.completed,
      });
      setChecklist((prev) => prev.map((c) => (c.id === item.id ? updated : c)));
      if (!item.completed) {
        showToast('Task Marked Complete', item.title);
      }
    } catch (e) {
      console.error('Toggle checklist error', e);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      const created = await api.addChecklistItem(activeEvent.id, {
        title: newTaskTitle,
        category: newTaskCategory,
      });
      setChecklist((prev) => [...prev, created]);
      setNewTaskTitle('');
      setIsAddingTask(false);
      showToast('Task Added', created.title);
    } catch (e) {
      console.error('Add task error', e);
    }
  };

  const handleDeleteTask = async (itemId: string) => {
    try {
      await api.deleteChecklistItem(activeEvent.id, itemId);
      setChecklist((prev) => prev.filter((c) => c.id !== itemId));
    } catch (e) {
      console.error('Delete task error', e);
    }
  };

  // Budget Actions
  const handleAddBudgetItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBudgetCategory.trim()) return;
    try {
      const created = await api.addBudgetItem(activeEvent.id, {
        category: newBudgetCategory,
        plannedAmount: newBudgetPlanned,
      });
      setBudgetItems((prev) => [...prev, created]);
      setNewBudgetCategory('');
      setIsAddingBudget(false);
      showToast('Budget Category Added', `${created.category}: ${formatCurrency(created.plannedAmount)}`);
    } catch (e) {
      console.error('Add budget item error', e);
    }
  };

  // Quotation Actions
  const handleAcceptQuote = async (quoteId: string) => {
    try {
      const res = await api.acceptQuotation(quoteId);
      showToast('Quotation Accepted!', 'Your booking is ready for milestone payment.');
      triggerCelebration();
      loadEventData();
    } catch (e: any) {
      showToast('Failed to accept quotation', e.message, 'error');
    }
  };

  const completedTasksCount = checklist.filter((c) => c.completed).length;
  const checklistProgress = checklist.length > 0 ? Math.round((completedTasksCount / checklist.length) * 100) : 0;

  // Days left calculation
  const eventDateObj = new Date(activeEvent.date);
  const now = new Date();
  const diffTime = eventDateObj.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  return (
    <div className="min-h-screen bg-[#050505] text-[#F5F5F5] py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Top Bar: Event Selector & Countdown */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0D0D0D] p-6 rounded-3xl border border-[#262626] shadow-2xl">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-[#171717] border border-[#2B2B2B] text-[#F27D26] flex items-center justify-center font-bold">
              <Calendar className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono-accent font-black uppercase tracking-wider text-[#F27D26] bg-[#1A1A1A] border border-[#2D2D2D] px-2.5 py-0.5 rounded">
                  {activeEvent.eventType}
                </span>

                {/* Event Switcher dropdown */}
                {events.length > 1 && (
                  <select
                    value={activeEvent.id}
                    onChange={(e) => setActiveEventId(e.target.value)}
                    className="text-xs font-mono-accent font-bold text-stone-300 bg-[#171717] border border-[#2A2A2A] rounded-lg px-2.5 py-1 cursor-pointer outline-none"
                  >
                    {events.map((evt) => (
                      <option key={evt.id} value={evt.id} className="bg-[#171717] text-white">
                        SWITCH TO: {evt.title.toUpperCase()}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <h1 className="font-display text-2xl sm:text-3xl font-black text-white uppercase tracking-tight mt-1">
                {activeEvent.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-6 font-mono-accent">
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider font-bold text-stone-500 block">COUNTDOWN</span>
              <span className="text-xl font-black text-[#F27D26]">
                {daysRemaining} DAYS TO GO
              </span>
            </div>

            <button
              onClick={() => navigateTo('create-event')}
              className="px-4 py-2.5 rounded-lg bg-[#F27D26] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#d96716] transition-colors flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ New Event</span>
            </button>
          </div>
        </div>

        {/* Event Snapshot Metrics Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono-accent">
          <div className="bg-[#0D0D0D] p-5 rounded-2xl border border-[#222222] shadow-xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-stone-500 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>DATE & TIME</span>
            </span>
            <span className="text-sm font-black text-white block">
              {activeEvent.date} ({activeEvent.time || '18:00'})
            </span>
          </div>

          <div className="bg-[#0D0D0D] p-5 rounded-2xl border border-[#222222] shadow-xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-stone-500 flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>CITY & GUESTS</span>
            </span>
            <span className="text-sm font-black text-white block">
              {activeEvent.locationCity} • {activeEvent.guestCount} Guests
            </span>
          </div>

          <div className="bg-[#0D0D0D] p-5 rounded-2xl border border-[#222222] shadow-xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-stone-500 flex items-center space-x-1">
              <DollarSign className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>TARGET BUDGET</span>
            </span>
            <span className="text-sm font-black text-white block">
              {formatCurrency(activeEvent.totalBudget)}
            </span>
          </div>

          <div className="bg-[#0D0D0D] p-5 rounded-2xl border border-[#222222] shadow-xl space-y-1">
            <div className="flex items-center justify-between text-[10px] uppercase font-bold">
              <span className="text-stone-500">CHECKLIST PROGRESS</span>
              <span className="font-black text-[#F27D26]">{checklistProgress}%</span>
            </div>
            <div className="w-full bg-[#1A1A1A] h-2 rounded-full overflow-hidden mt-2 border border-[#282828]">
              <div
                className="bg-[#F27D26] h-full rounded-full transition-all"
                style={{ width: `${checklistProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Dashboard Tabs Bar */}
        <div className="bg-[#0D0D0D] rounded-2xl border border-[#222222] shadow-xl p-1.5 flex items-center space-x-2 overflow-x-auto">
          {[
            { id: 'checklist', label: `EVENT CHECKLIST (${completedTasksCount}/${checklist.length})` },
            { id: 'budget', label: `BUDGET MANAGER (${formatCurrency(budgetSummary.totalPaid)} PAID)` },
            { id: 'bookings', label: `BOOKINGS & QUOTES (${userBookings.length + userQuotations.length})` },
            { id: 'matched', label: 'CURATED MATCHES' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-lg text-xs font-mono-accent font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-[#F27D26] text-white shadow-lg shadow-[#F27D26]/20'
                  : 'text-stone-400 hover:text-white hover:bg-[#171717]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 1. CHECKLIST TAB */}
        {activeTab === 'checklist' && (
          <div className="bg-[#0D0D0D] rounded-3xl p-6 sm:p-8 border border-[#222222] shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F1F1F]">
              <div>
                <div className="w-8 h-[2px] bg-[#F27D26] mb-2" />
                <h2 className="font-display text-xl font-black text-white uppercase tracking-tight">EVENT MILESTONE CHECKLIST</h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  Track vendor locks, tastings, guest RSVPs, and coordination milestones.
                </p>
              </div>

              <button
                onClick={() => setIsAddingTask(true)}
                className="px-4 py-2 rounded-lg bg-[#F27D26] text-white text-xs font-mono-accent uppercase tracking-wider font-bold hover:bg-[#d96716] flex items-center space-x-1 self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Task</span>
              </button>
            </div>

            {/* Add Task Form Modal / Inline */}
            {isAddingTask && (
              <form onSubmit={handleAddTask} className="p-4 rounded-2xl bg-[#141414] border border-[#262626] space-y-3 font-mono-accent">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">TASK TITLE</label>
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="e.g. Schedule Mandap mockup review with decorator"
                      className="w-full p-2.5 text-xs rounded-lg bg-[#0D0D0D] border border-[#2A2A2A] text-white outline-none focus:border-[#F27D26]"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">CATEGORY</label>
                    <select
                      value={newTaskCategory}
                      onChange={(e) => setNewTaskCategory(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-lg bg-[#0D0D0D] border border-[#2A2A2A] text-white outline-none font-bold"
                    >
                      <option value="Venues" className="bg-[#0D0D0D] text-white">Venues</option>
                      <option value="Catering" className="bg-[#0D0D0D] text-white">Catering</option>
                      <option value="Decoration" className="bg-[#0D0D0D] text-white">Decoration</option>
                      <option value="Photography" className="bg-[#0D0D0D] text-white">Photography</option>
                      <option value="Guest Ops" className="bg-[#0D0D0D] text-white">Guest Logistics</option>
                      <option value="General" className="bg-[#0D0D0D] text-white">General</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingTask(false)}
                    className="px-3 py-1.5 text-xs font-bold text-stone-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-[#F27D26] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#d96716]"
                  >
                    Save Task
                  </button>
                </div>
              </form>
            )}

            {/* Checklist Items List */}
            <div className="space-y-2.5 font-mono-accent">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  id={`checklist-item-${item.id}`}
                  onClick={() => handleToggleChecklist(item)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                    item.completed
                      ? 'bg-[#111111] border-[#222222] opacity-60'
                      : 'bg-[#141414] border-[#262626] hover:border-[#F27D26] hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                        item.completed
                          ? 'bg-[#10B981] border-[#10B981] text-black font-black'
                          : 'border-stone-600 bg-[#0D0D0D] group-hover:border-[#F27D26]'
                      }`}
                    >
                      {item.completed && <Check className="w-3.5 h-3.5 text-black" />}
                    </div>

                    <div>
                      <span
                        className={`text-xs font-bold block ${
                          item.completed ? 'line-through text-stone-500' : 'text-white'
                        }`}
                      >
                        {item.title}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">{item.category}</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTask(item.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-stone-400 hover:text-rose-400 rounded transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. BUDGET MANAGER TAB */}
        {activeTab === 'budget' && (
          <div className="space-y-6 font-mono-accent">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-[#0D0D0D] p-5 rounded-2xl border border-[#222222] shadow-xl">
                <span className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">TOTAL PLANNED</span>
                <div className="text-xl font-display font-black text-white mt-1">
                  {formatCurrency(budgetSummary.totalPlanned)}
                </div>
              </div>

              <div className="bg-[#0D0D0D] p-5 rounded-2xl border border-[#222222] shadow-xl">
                <span className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">QUOTED / COMMITTED</span>
                <div className="text-xl font-display font-black text-white mt-1">
                  {formatCurrency(budgetSummary.totalQuoted)}
                </div>
              </div>

              <div className="bg-[#0D0D0D] p-5 rounded-2xl border border-[#222222] shadow-xl">
                <span className="text-[10px] text-[#10B981] uppercase tracking-widest font-bold">PAID ADVANCES</span>
                <div className="text-xl font-display font-black text-[#10B981] mt-1">
                  {formatCurrency(budgetSummary.totalPaid)}
                </div>
              </div>

              <div className="bg-[#0D0D0D] p-5 rounded-2xl border border-[#222222] shadow-xl">
                <span className="text-[10px] text-[#F27D26] uppercase tracking-widest font-bold">REMAINING BUFFER</span>
                <div className="text-xl font-display font-black text-[#F27D26] mt-1">
                  {formatCurrency(budgetSummary.remaining)}
                </div>
              </div>
            </div>

            {/* Category Breakdown Table */}
            <div className="bg-[#0D0D0D] rounded-3xl p-6 sm:p-8 border border-[#222222] shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1F1F1F]">
                <div>
                  <div className="w-8 h-[2px] bg-[#F27D26] mb-2" />
                  <h3 className="font-display text-lg font-black text-white uppercase">CATEGORY ALLOCATIONS</h3>
                </div>
                <button
                  onClick={() => setIsAddingBudget(true)}
                  className="px-3.5 py-2 rounded-lg bg-[#F27D26] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#d96716] flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Category</span>
                </button>
              </div>

              {isAddingBudget && (
                <form onSubmit={handleAddBudgetItem} className="p-4 rounded-2xl bg-[#141414] border border-[#262626] space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">CATEGORY NAME</label>
                      <input
                        type="text"
                        value={newBudgetCategory}
                        onChange={(e) => setNewBudgetCategory(e.target.value)}
                        placeholder="e.g. Return Gifts & Favors"
                        className="w-full p-2.5 text-xs rounded-lg bg-[#0D0D0D] border border-[#2A2A2A] text-white outline-none focus:border-[#F27D26]"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">PLANNED BUDGET (₹)</label>
                      <input
                        type="number"
                        value={newBudgetPlanned}
                        onChange={(e) => setNewBudgetPlanned(Number(e.target.value))}
                        className="w-full p-2.5 text-xs rounded-lg bg-[#0D0D0D] border border-[#2A2A2A] text-white outline-none font-black"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingBudget(false)}
                      className="px-3 py-1 text-xs font-bold text-stone-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-[#F27D26] text-white text-xs font-bold uppercase tracking-wider"
                    >
                      Save
                    </button>
                  </div>
                </form>
              )}

              <div className="divide-y divide-[#1F1F1F]">
                {budgetItems.map((b) => (
                  <div key={b.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-black text-white uppercase">{b.category}</h4>
                      <p className="text-[11px] text-stone-400">
                        Planned: {formatCurrency(b.plannedAmount)} • Quoted: {formatCurrency(b.quotedAmount)}
                      </p>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <span className="text-[9px] uppercase tracking-wider text-stone-500 block">PAID AMOUNT</span>
                        <span className="text-xs font-black text-[#10B981]">{formatCurrency(b.paidAmount)}</span>
                      </div>

                      <button
                        onClick={() => navigateTo('vendors', b.category)}
                        className="px-3 py-1.5 rounded-lg bg-[#171717] border border-[#2A2A2A] text-stone-300 text-[10px] font-bold uppercase tracking-wider hover:text-white hover:border-[#F27D26] transition-colors"
                      >
                        Find Vendors
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. BOOKINGS & QUOTATIONS TAB */}
        {activeTab === 'bookings' && (
          <div className="space-y-6 font-mono-accent">
            {/* Pending Formal Quotes Section */}
            {userQuotations.length > 0 && (
              <div className="bg-[#0D0D0D] rounded-3xl p-6 sm:p-8 border border-[#222222] shadow-2xl space-y-4">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-[#F27D26]" />
                  <h3 className="font-display text-lg font-black text-white uppercase">RECEIVED ITEMISED QUOTATIONS</h3>
                </div>

                <div className="space-y-4">
                  {userQuotations.map((quote) => (
                    <div
                      key={quote.id}
                      className="p-5 rounded-2xl bg-[#141414] border border-[#262626] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start space-x-3.5">
                        <img
                          src={quote.vendorLogo}
                          alt={quote.vendorName}
                          className="w-12 h-12 rounded-xl object-cover border border-[#333333] bg-black"
                        />
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-black text-white uppercase">{quote.vendorName}</h4>
                            <span className="px-2 py-0.5 rounded text-[9px] font-black bg-[#F27D26]/20 border border-[#F27D26]/40 text-[#F27D26] uppercase">
                              {quote.status}
                            </span>
                          </div>
                          <p className="text-xs text-stone-400 mt-0.5">
                            Package: {quote.packageName} • Valid until: {quote.validUntil}
                          </p>

                          {/* Itemized inclusions preview */}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {quote.items.map((it, idx) => (
                              <span key={idx} className="text-[9px] bg-[#0D0D0D] px-2 py-0.5 rounded text-stone-300 border border-[#262626]">
                                {it.name} ({formatCurrency(it.amount)})
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2">
                        <div className="text-left sm:text-right">
                          <span className="text-[9px] uppercase tracking-wider text-stone-500 block">TOTAL AMOUNT (INCL. GST)</span>
                          <span className="text-base font-black text-white">{formatCurrency(quote.totalAmount)}</span>
                        </div>

                        {quote.status === 'sent' && (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleAcceptQuote(quote.id)}
                              className="px-4 py-2 rounded-lg bg-[#10B981] text-black text-xs font-black uppercase tracking-wider hover:bg-[#0da271] transition-colors"
                            >
                              Accept Quote
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confirmed Bookings Section */}
            <div className="bg-[#0D0D0D] rounded-3xl p-6 sm:p-8 border border-[#222222] shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="w-8 h-[2px] bg-[#F27D26] mb-2" />
                  <h3 className="font-display text-lg font-black text-white uppercase">CONFIRMED & ACTIVE BOOKINGS</h3>
                </div>
                <span className="text-xs text-stone-400 uppercase tracking-wider">{userBookings.length} Total Bookings</span>
              </div>

              {userBookings.length === 0 ? (
                <div className="py-12 text-center text-xs text-stone-500 uppercase tracking-wider">
                  No bookings made yet for this event. Send enquiries or accept quotations above.
                </div>
              ) : (
                <div className="space-y-4">
                  {userBookings.map((b) => (
                    <div
                      key={b.id}
                      className="p-5 rounded-2xl bg-[#141414] border border-[#262626] shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start space-x-4">
                        <img
                          src={b.vendorLogo}
                          alt={b.vendorName}
                          className="w-14 h-14 rounded-2xl object-cover border border-[#333333]"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-black text-white uppercase">{b.vendorName}</h4>
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                b.paymentStatus === 'fully_paid'
                                  ? 'bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981]'
                                  : b.paymentStatus === 'advance_paid'
                                  ? 'bg-[#F27D26]/20 border border-[#F27D26]/40 text-[#F27D26]'
                                  : 'bg-[#1E1E1E] text-stone-400'
                              }`}
                            >
                              {b.paymentStatus.replace('_', ' ')}
                            </span>
                          </div>

                          <p className="text-xs text-stone-400">
                            Ref: <strong className="text-white">{b.bookingReference}</strong> • {b.vendorCategory} • Event Date: {b.eventDate}
                          </p>

                          <div className="text-xs text-stone-300 font-medium">
                            Paid: <strong className="text-[#10B981]">{formatCurrency(b.paidAmount)}</strong> / Total {formatCurrency(b.totalAmount)}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
                        <button
                          onClick={() => openInvoiceModal(b)}
                          className="px-3 py-2 rounded-lg border border-[#2E2E2E] bg-[#171717] text-xs font-bold text-stone-300 hover:text-white hover:border-white transition-colors flex items-center space-x-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>TAX INVOICE</span>
                        </button>

                        {b.balanceAmount > 0 && (
                          <button
                            onClick={() => openCheckoutModal(b)}
                            className="px-4 py-2 rounded-lg bg-[#F27D26] text-white text-xs font-black uppercase tracking-wider hover:bg-[#d96716] flex items-center space-x-1.5 shadow-lg shadow-[#F27D26]/20"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>PAY {formatCurrency(b.balanceAmount)}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. MATCHED VENDORS TAB */}
        {activeTab === 'matched' && (
          <div className="bg-[#0D0D0D] rounded-3xl p-6 sm:p-8 border border-[#222222] shadow-2xl space-y-6">
            <div>
              <div className="w-8 h-[2px] bg-[#F27D26] mb-2" />
              <h2 className="font-display text-xl font-black text-white uppercase tracking-tight">
                RECOMMENDED VERIFIED VENDORS IN {activeEvent.locationCity.toUpperCase()}
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Pre-screened professionals matching your event date and guest capacity.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {matchedVendors.map((v) => (
                <div key={v.id} className="p-4 rounded-2xl bg-[#141414] border border-[#262626] flex flex-col justify-between group hover:border-[#F27D26] transition-colors">
                  <div className="space-y-3">
                    <img src={v.coverImage} alt={v.businessName} className="w-full h-32 rounded-xl object-cover border border-[#2A2A2A]" />
                    <div>
                      <h4 className="text-xs font-black text-white uppercase line-clamp-1">{v.businessName}</h4>
                      <p className="text-[11px] font-mono-accent text-stone-400">{v.categoryName} • {v.city}</p>
                      <p className="text-xs font-mono-accent font-black text-[#F27D26] mt-1">From {formatCurrency(v.startingPrice)}</p>
                    </div>
                  </div>

                  <div className="pt-3 flex items-center space-x-2 font-mono-accent">
                    <button
                      onClick={() => openEnquiryModal(v)}
                      className="flex-1 py-2 rounded-lg bg-[#1E1E1E] border border-[#2D2D2D] text-[10px] font-bold uppercase tracking-wider text-stone-300 hover:text-white hover:border-white transition-colors"
                    >
                      Enquire
                    </button>
                    <button
                      onClick={() => navigateTo('vendor-profile', v.id)}
                      className="flex-1 py-2 rounded-lg bg-[#F27D26] text-white text-[10px] font-black uppercase tracking-wider hover:bg-[#d96716] transition-colors"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
