import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { formatCurrency } from '../../config/brand';
import {
  X,
  Plus,
  Trash2,
  FileText,
  DollarSign,
  Calendar,
  Send,
} from 'lucide-react';

export const QuoteCreatorModal: React.FC = () => {
  const { quoteModalData, closeQuoteModal, showToast, triggerCelebration } = useApp();

  if (!quoteModalData.isOpen) return null;

  const [packageName, setPackageName] = useState('Bespoke Custom Execution Package');
  const [items, setItems] = useState([
    { name: 'Stage & Mandap Decor Floral Setup', amount: 85000 },
    { name: 'Foyer Entrance & Ambient Lighting', amount: 35000 },
    { name: 'Sound & Audio Rig with Technician', amount: 20000 },
  ]);
  const [taxRate, setTaxRate] = useState(18); // 18% GST standard
  const [paymentTerms, setPaymentTerms] = useState('30% advance on signing, 70% 2 days prior to event date.');
  const [validDays, setValidDays] = useState(7);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddItem = () => {
    setItems([...items, { name: '', amount: 10000 }]);
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const taxAmount = Math.round((subtotal * taxRate) / 100);
  const totalAmount = subtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || subtotal <= 0) {
      showToast('Please add at least one line item with amount', undefined, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const validUntilDate = new Date();
      validUntilDate.setDate(validUntilDate.getDate() + validDays);

      await api.createQuotation({
        enquiryId: quoteModalData.enquiryId,
        eventId: quoteModalData.eventId,
        customerId: quoteModalData.customerId || '',
        customerName: quoteModalData.customerName || 'Customer',
        customerEmail: quoteModalData.customerEmail || '',
                packageName,
        items,
        subtotal,
        taxAmount,
        totalAmount,
        validUntil: validUntilDate.toISOString().split('T')[0],
        paymentTerms,
      });

      closeQuoteModal();
      showToast('Formal Quotation Dispatched!', `Transmitted to ${quoteModalData.customerName || 'client'}.`);
      triggerCelebration();
    } catch (e: any) {
      showToast('Failed to create quote', e.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#0D0D0D] rounded-3xl max-w-2xl w-full border border-[#222222] shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col text-[#F5F5F5]">
        {/* Header */}
        <div className="p-6 bg-[#080808] border-b border-[#222222] text-white flex items-center justify-between font-mono-accent">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-[#F27D26]/20 border border-[#F27D26]/40 text-[#F27D26]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-black tracking-wider text-[#F27D26] block">Vendor Formal Quotation</span>
              <h3 className="font-display text-lg font-black uppercase tracking-tight">Generate Quote for {quoteModalData.customerName || 'Client'}</h3>
            </div>
          </div>

          <button
            onClick={closeQuoteModal}
            className="p-2 text-stone-400 hover:text-white rounded-full hover:bg-[#1A1A1A] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 font-mono-accent">
          <div>
            <label className="text-[10px] uppercase font-bold text-stone-400 block mb-1">Quotation / Package Name</label>
            <input
              type="text"
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl bg-[#141414] border border-[#2A2A2A] text-white outline-none font-bold focus:border-[#F27D26]"
              required
            />
          </div>

          {/* Line Items Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                Itemized Inclusions & Services
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-black text-[#F27D26] hover:underline flex items-center space-x-1 uppercase"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Item</span>
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Deliverable description"
                    value={item.name}
                    onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                    className="flex-1 p-2 text-xs rounded-xl bg-[#141414] border border-[#2A2A2A] text-white outline-none focus:border-[#F27D26]"
                    required
                  />
                  <div className="w-32 relative">
                    <span className="absolute left-2.5 top-2 text-xs text-stone-500">₹</span>
                    <input
                      type="number"
                      placeholder="Amount"
                      value={item.amount}
                      onChange={(e) => handleUpdateItem(idx, 'amount', Number(e.target.value))}
                      className="w-full p-2 pl-6 text-xs rounded-xl bg-[#141414] border border-[#2A2A2A] text-white outline-none font-bold text-right focus:border-[#F27D26]"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-2 text-stone-500 hover:text-rose-400 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Calculation Summary */}
          <div className="p-4 rounded-2xl bg-[#141414] border border-[#262626] space-y-2 text-xs">
            <div className="flex justify-between text-stone-400">
              <span>Subtotal Deliverables</span>
              <span className="font-bold text-white">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-stone-400">
              <span>Applicable GST ({taxRate}%)</span>
              <span className="font-bold text-white">{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-[#262626]">
              <span className="uppercase text-xs">Grand Total</span>
              <span className="text-[#F27D26] font-display text-lg font-black">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-stone-400 block mb-1">Validity (Days)</label>
              <input
                type="number"
                value={validDays}
                onChange={(e) => setValidDays(Number(e.target.value))}
                className="w-full p-2 text-xs rounded-xl bg-[#141414] border border-[#2A2A2A] text-white outline-none focus:border-[#F27D26]"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-stone-400 block mb-1">Milestone Terms</label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full p-2 text-xs rounded-xl bg-[#141414] border border-[#2A2A2A] text-white outline-none focus:border-[#F27D26]"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={closeQuoteModal}
              className="px-4 py-2.5 rounded-lg border border-[#2A2A2A] text-xs font-bold text-stone-400 hover:text-white hover:bg-[#1A1A1A] uppercase tracking-wider"
            >
              Discard
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-lg bg-[#F27D26] text-white text-xs font-black uppercase tracking-wider hover:bg-[#d96716] transition-colors flex items-center space-x-2 shadow-lg shadow-[#F27D26]/20 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Transmitting...' : 'Issue Formal Quote'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
