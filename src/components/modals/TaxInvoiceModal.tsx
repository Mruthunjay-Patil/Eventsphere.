import React from 'react';
import { useApp } from '../../context/AppContext';
import { BRAND_CONFIG, formatCurrency } from '../../config/brand';
import {
  X,
  Printer,
  Download,
  CheckCircle,
  Building,
  FileCheck,
} from 'lucide-react';

export const TaxInvoiceModal: React.FC = () => {
  const { invoiceModalData, closeInvoiceModal } = useApp();

  if (!invoiceModalData.isOpen || !invoiceModalData.booking) return null;

  const { booking } = invoiceModalData;

  const handlePrint = () => {
    window.print();
  };

  const invoiceNumber = `INV-${new Date().getFullYear()}-${booking.id.replace('book_', '').padStart(5, '0')}`;
  const invoiceDate = new Date(booking.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const subtotal = Math.round(booking.totalAmount / 1.18);
  const totalTax = booking.totalAmount - subtotal;
  const cgst = Math.round(totalTax / 2);
  const sgst = totalTax - cgst;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#0D0D0D] rounded-3xl max-w-2xl w-full border border-[#222222] shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col text-[#F5F5F5]">
        {/* Top Control Bar */}
        <div className="p-4 bg-[#080808] border-b border-[#222222] text-white flex items-center justify-between no-print font-mono-accent">
          <div className="flex items-center space-x-2">
            <FileCheck className="w-5 h-5 text-[#F27D26]" />
            <span className="font-display text-sm font-black uppercase tracking-tight">GST Tax Invoice & Receipt</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1A1A1A] border border-[#2A2A2A] text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 text-stone-200"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={closeInvoiceModal}
              className="p-1.5 text-stone-400 hover:text-white rounded-full hover:bg-[#1A1A1A]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div className="p-8 overflow-y-auto space-y-6 flex-1 text-stone-200 text-xs font-mono-accent bg-[#0A0A0A]">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-[#222222] pb-6">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-[#F27D26] text-white font-display font-black flex items-center justify-center text-base shadow-lg shadow-[#F27D26]/20">
                  E
                </div>
                <span className="font-display text-xl font-black uppercase tracking-tight text-white">
                  {BRAND_CONFIG.name}
                </span>
              </div>
              <p className="text-[11px] text-stone-400 font-sans">
                EventSphere Technologies Private Limited<br />
                GSTIN: 29AAACE9912K1Z9 • SAC Code: 998399<br />
                Indiranagar, Bangalore, Karnataka 560038
              </p>
            </div>

            <div className="text-right">
              <span className="inline-block px-2.5 py-0.5 rounded bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] font-black text-[10px] uppercase mb-1">
                ORIGINAL TAX INVOICE
              </span>
              <div className="font-black text-white text-sm">{invoiceNumber}</div>
              <div className="text-stone-400 text-[11px]">Date: {invoiceDate}</div>
              <div className="text-stone-400 text-[11px]">Booking Ref: {booking.bookingReference}</div>
            </div>
          </div>

          {/* Billed To & Vendor Details */}
          <div className="grid grid-cols-2 gap-6 pb-6 border-b border-[#222222]">
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-500 block mb-1">Billed To (Customer):</span>
              <div className="font-black text-white text-sm uppercase">{booking.customerName}</div>
              <div className="text-stone-400">{booking.customerEmail}</div>
              <div className="text-stone-400 mt-1">Event Date: <strong className="text-white">{booking.eventDate}</strong></div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-stone-500 block mb-1">Service Provider (Vendor):</span>
              <div className="font-black text-white text-sm uppercase">{booking.vendorName}</div>
              <div className="text-stone-400">Category: {booking.vendorCategory}</div>
              <div className="text-[#10B981] font-black uppercase mt-1">✓ Verified Partner</div>
            </div>
          </div>

          {/* Line Item Table */}
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#222222] text-[11px] font-bold text-stone-400 uppercase">
                <th className="py-2">Item Description</th>
                <th className="py-2 text-right">SAC</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]">
              <tr>
                <td className="py-3">
                  <div className="font-bold text-white uppercase">{booking.packageName}</div>
                  <div className="text-stone-400 text-[11px] font-sans">Professional event service management & deliverables</div>
                </td>
                <td className="py-3 text-right text-stone-400">998399</td>
                <td className="py-3 text-right font-black text-white">{formatCurrency(subtotal)}</td>
              </tr>
            </tbody>
          </table>

          {/* Total Breakdown */}
          <div className="border-t border-[#222222] pt-4 space-y-1.5 text-right">
            <div className="flex justify-between text-stone-400">
              <span>Taxable Subtotal:</span>
              <span className="font-medium text-white">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-stone-400">
              <span>CGST (9.0%):</span>
              <span className="font-medium text-white">{formatCurrency(cgst)}</span>
            </div>
            <div className="flex justify-between text-stone-400">
              <span>SGST (9.0%):</span>
              <span className="font-medium text-white">{formatCurrency(sgst)}</span>
            </div>
            <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-[#222222]">
              <span className="uppercase">Total Invoice Value:</span>
              <span className="text-[#F27D26] font-display text-base font-black">{formatCurrency(booking.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-[#10B981] font-black">
              <span>Total Amount Paid:</span>
              <span>{formatCurrency(booking.paidAmount)}</span>
            </div>
            {booking.balanceAmount > 0 && (
              <div className="flex justify-between text-rose-400 font-black">
                <span>Balance Due:</span>
                <span>{formatCurrency(booking.balanceAmount)}</span>
              </div>
            )}
          </div>

          {/* Footer Notes */}
          <div className="pt-6 border-t border-[#222222] text-[10px] text-stone-500 space-y-1 font-sans">
            <p>• Payments are managed via EventSphere Escrow and protected under the Buyer Protection Guarantee.</p>
            <p>• This is a computer-generated tax invoice and requires no physical signature.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
