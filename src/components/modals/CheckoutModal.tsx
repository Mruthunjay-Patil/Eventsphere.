import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { formatCurrency } from '../../config/brand';
import { X, ShieldCheck, CreditCard, ArrowUpRight, LoaderCircle } from 'lucide-react';

type PaymentPlan = 'full' | 'advance' | 'balance';

export const CheckoutModal: React.FC = () => {
  const { checkoutModalData, closeCheckoutModal, showToast } = useApp();
  const booking = checkoutModalData.booking;
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>('full');
  const [isProcessing, setIsProcessing] = useState(false);
  const [gateway, setGateway] = useState<'stripe' | 'razorpay'>('razorpay');

  useEffect(() => {
    if (checkoutModalData.isOpen) setPaymentPlan(Number(booking?.paidAmount || 0) > 0 ? 'balance' : 'full');
  }, [checkoutModalData.isOpen, booking?.id]);

  if (!checkoutModalData.isOpen || !booking) return null;
  const balance = Math.max(0, Number(booking.balanceAmount ?? booking.totalAmount));
  const advance = Math.min(balance, Math.round(Number(booking.totalAmount) * 0.2 * 100) / 100);
  const amount = paymentPlan === 'advance' ? advance : balance;

  const startCheckout = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsProcessing(true);
    try {
      if (gateway === 'razorpay') {
        const order = await api.createRazorpayOrder(booking.id, paymentPlan);
        if (!(window as any).Razorpay) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Could not load Razorpay Checkout.'));
            document.body.appendChild(script);
          });
        }
        const checkout = new (window as any).Razorpay({
          key: order.key_id, amount: order.amount, currency: order.currency,
          name: 'EventSphere', description: `Booking ${booking.bookingReference}`,
          order_id: order.order_id,
          prefill: { name: booking.customerName, email: booking.customerEmail, contact: booking.customerPhone },
          handler: async (response: any) => {
            try {
              await api.verifyRazorpayPayment(response);
              showToast('Payment successful', 'Your Razorpay payment was verified.', 'success');
              closeCheckoutModal();
              window.location.assign('/?view=my-bookings&payment=success');
            } catch (error: any) {
              showToast('Payment verification pending', error?.message || 'Contact support if charged.', 'error');
              setIsProcessing(false);
            }
          },
          modal: { ondismiss: () => { setIsProcessing(false); showToast('Checkout cancelled', 'No payment was confirmed.', 'error'); } },
        });
        checkout.on('payment.failed', (response: any) => { setIsProcessing(false); showToast('Payment failed', response?.error?.description || 'Please retry.', 'error'); });
        checkout.open();
        return;
      }
      const result = await api.createStripeCheckoutSession(booking.id, paymentPlan);
      if (!result.checkoutUrl) throw new Error('Stripe did not return a Checkout URL. Please try again.');
      window.location.assign(result.checkoutUrl);
    } catch (error: any) {
      showToast('Unable to start checkout', error?.message || 'Please try again.', 'error');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-start sm:items-center justify-center overflow-y-auto overscroll-contain bg-[#20283A]/60 p-2 sm:p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="payment-checkout-title">
      <div className="relative my-2 sm:my-6 w-full max-w-lg max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-3rem)] overflow-y-auto overscroll-contain rounded-[22px] border border-[#E9E5E7] bg-white shadow-[0_24px_80px_rgba(32,40,58,.22)]">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#F0E8EB] bg-[#FFFBF8] px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#FFF0F3] text-[#F04468]"><CreditCard className="h-5 w-5" /></span>
            <div><p className="text-xs font-semibold uppercase tracking-[.12em] text-[#F04468]">Secure payment</p><h2 id="payment-checkout-title" className="mt-1 text-lg font-bold text-[#20283A]">Secure checkout</h2></div>
          </div>
          <button type="button" onClick={closeCheckoutModal} aria-label="Close checkout" className="rounded-full p-2 text-[#707789] transition hover:bg-[#FFF0F3] hover:text-[#F04468]"><X className="h-5 w-5" /></button>
        </header>
        <form onSubmit={startCheckout} className="space-y-4 sm:space-y-5 p-4 sm:p-6">
          <div className="rounded-2xl border border-[#E9E5E7] bg-[#FFFBF8] p-4">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs text-[#707789]">Vendor</p><p className="mt-1 font-semibold text-[#20283A]">{booking.vendorName}</p><p className="mt-1 text-sm text-[#707789]">{booking.packageName} · {booking.eventDate}</p></div><span className="rounded-full bg-[#EAF8F6] px-3 py-1 text-xs font-semibold text-[#238A80]">{gateway === 'razorpay' ? 'Razorpay' : 'Stripe Checkout'}</span></div>
            <div className="mt-4 space-y-2 border-t border-[#E9E5E7] pt-3 text-sm"><div className="flex justify-between"><span className="text-[#707789]">Booking total</span><strong className="text-[#20283A]">{formatCurrency(booking.totalAmount)}</strong></div><div className="flex justify-between"><span className="text-[#707789]">Already paid</span><strong className="text-[#20283A]">{formatCurrency(booking.paidAmount || 0)}</strong></div><div className="flex justify-between"><span className="text-[#707789]">Remaining balance</span><strong className="text-[#20283A]">{formatCurrency(balance)}</strong></div></div>
          </div>
          <fieldset className="space-y-2"><legend className="mb-2 text-sm font-semibold text-[#20283A]">Payment gateway</legend><div className="flex gap-3"><label className="flex-1 rounded-xl border p-3"><input type="radio" checked={gateway === 'razorpay'} onChange={() => setGateway('razorpay')} className="mr-2"/>Razorpay</label><label className="flex-1 rounded-xl border p-3"><input type="radio" checked={gateway === 'stripe'} onChange={() => setGateway('stripe')} className="mr-2"/>Stripe</label></div></fieldset><fieldset className="space-y-2"><legend className="mb-2 text-sm font-semibold text-[#20283A]">Choose payment amount</legend>
            {Number(booking.paidAmount || 0) === 0 && <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${paymentPlan === 'full' ? 'border-[#F04468] bg-[#FFF0F3]' : 'border-[#E9E5E7] hover:border-[#F5B6C3]'}`}><input type="radio" name="paymentPlan" value="full" checked={paymentPlan === 'full'} onChange={() => setPaymentPlan('full')} className="mt-1 accent-[#F04468]"/><span className="flex-1"><span className="block font-semibold text-[#20283A]">Pay in full</span><span className="mt-1 block text-xs text-[#707789]">Settle the full outstanding booking amount.</span></span><strong className="text-[#20283A]">{formatCurrency(balance)}</strong></label>}
            {Number(booking.paidAmount || 0) === 0 && <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${paymentPlan === 'advance' ? 'border-[#F04468] bg-[#FFF0F3]' : 'border-[#E9E5E7] hover:border-[#F5B6C3]'}`}><input type="radio" name="paymentPlan" value="advance" checked={paymentPlan === 'advance'} onChange={() => setPaymentPlan('advance')} className="mt-1 accent-[#F04468]"/><span className="flex-1"><span className="block font-semibold text-[#20283A]">Pay 20% advance</span><span className="mt-1 block text-xs text-[#707789]">Pay a deposit now and settle the balance later.</span></span><strong className="text-[#20283A]">{formatCurrency(advance)}</strong></label>}
            {Number(booking.paidAmount || 0) > 0 && <label className="flex items-start gap-3 rounded-xl border border-[#F04468] bg-[#FFF0F3] p-4"><input type="radio" checked readOnly className="mt-1 accent-[#F04468]"/><span className="flex-1"><span className="block font-semibold text-[#20283A]">Pay remaining balance</span><span className="mt-1 block text-xs text-[#707789]">Your previous payment remains recorded.</span></span><strong className="text-[#20283A]">{formatCurrency(balance)}</strong></label>}
          </fieldset>
          <div className="flex items-center gap-2 rounded-xl bg-[#EAF8F6] px-3 py-2.5 text-xs text-[#236B65]"><ShieldCheck className="h-4 w-4 shrink-0"/>Your payment is processed securely by the selected gateway. EventSphere never collects card details directly.</div>
          <button type="submit" disabled={isProcessing || amount <= 0} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F04468] px-5 py-3.5 font-semibold text-white shadow-sm transition hover:bg-[#D93256] focus:outline-none focus:ring-4 focus:ring-[#F04468]/20 disabled:cursor-not-allowed disabled:opacity-60">{isProcessing ? <><LoaderCircle className="h-4 w-4 animate-spin"/> Connecting to payment gateway…</> : <>Pay with {gateway === 'razorpay' ? 'Razorpay' : 'Stripe'} · {formatCurrency(amount)} <ArrowUpRight className="h-4 w-4"/></>}</button>
          <p className="text-center text-xs text-[#707789]">Booking status and payment status are tracked separately. Payment is confirmed only after the gateway payment is verified.</p>
        </form>
      </div>
    </div>
  );
};
