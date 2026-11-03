import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Vendor, VendorReview, VendorPackage } from '../types';
import { api } from '../services/api';
import { formatCurrency } from '../config/brand';
import {
  Star,
  MapPin,
  CheckCircle,
  Clock,
  Shield,
  Heart,
  Scale,
  MessageSquare,
  FileText,
  Calendar as CalendarIcon,
  Phone,
  Mail,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Send,
  User,
  Image as ImageIcon,
  Check,
} from 'lucide-react';

export const VendorProfileView: React.FC = () => {
  const {
    viewParam,
    navigateTo,
    favoriteVendorIds,
    toggleFavorite,
    compareVendorIds,
    addToCompare,
    removeFromCompare,
    openEnquiryModal,
    showToast,
    triggerCelebration,
    currentUser,
  } = useApp();

  const [vendor, setVendor] = useState<(Vendor & { reviews: VendorReview[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'packages' | 'portfolio' | 'about' | 'availability' | 'reviews'>('packages');

  // Review Form State
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewEventType, setReviewEventType] = useState('Grand Wedding');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Selected package for booking
  const [selectedPkg, setSelectedPkg] = useState<VendorPackage | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingMessage, setBookingMessage] = useState('');
  const [bookingBusy, setBookingBusy] = useState(false);

  useEffect(() => {
    const loadVendor = async () => {
      if (!viewParam) {
        navigateTo('vendors');
        return;
      }
      setLoading(true);
      try {
        const data = await api.getVendorById(viewParam);
        setVendor(data);
        if (data.packages && data.packages.length > 0) {
          setSelectedPkg(data.packages[0]);
        }
      } catch (e) {
        console.error('Failed to load vendor details', e);
        showToast('Vendor not found', undefined, 'error');
        navigateTo('vendors');
      } finally {
        setLoading(false);
      }
    };

    loadVendor();
  }, [viewParam]);

  const handleDirectBooking = async () => {
    if (!vendor) return;
    if (!currentUser) {
      openEnquiryModal(vendor, selectedPkg || undefined);
      return;
    }
    if (!bookingDate) { showToast('Select a date', 'Choose your event date before booking.', 'warning'); return; }
    setBookingBusy(true);
    try {
      const booking = await api.createBooking({
        vendorId: vendor.id,
        packageId: selectedPkg?.id,
        packageName: selectedPkg?.name || 'Custom Service',
        eventDate: bookingDate,
        totalAmount: selectedPkg?.price || vendor.startingPrice,
        specialRequirements: bookingMessage,
      });
      showToast('Booking created', `${booking.bookingReference} is ready for payment.`);
      navigateTo('events');
    } catch (e: any) {
      showToast('Booking failed', e.message, 'error');
    } finally { setBookingBusy(false); }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor || !reviewComment.trim()) return;

    setIsSubmittingReview(true);
    try {
      const newRev = await api.createReview({
        vendorId: vendor.id,
        rating: reviewRating,
        comment: reviewComment,
        eventType: reviewEventType,
      });

      setVendor((prev) =>
        prev
          ? {
              ...prev,
              reviews: [newRev, ...prev.reviews],
              reviewCount: prev.reviewCount + 1,
            }
          : null
      );

      setReviewComment('');
      showToast('Review Submitted', 'Thank you for your verified client feedback!');
      triggerCelebration();
    } catch (e: any) {
      showToast('Review submission failed', e.message, 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (loading || !vendor) {
    return (
      <div className="min-h-screen bg-[#050505] text-white py-20 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-[#F27D26] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono-accent uppercase tracking-wider text-stone-400">Loading vendor storefront...</p>
        </div>
      </div>
    );
  }

  const isFav = favoriteVendorIds.includes(vendor.id);
  const isCompared = compareVendorIds.includes(vendor.id);

  return (
    <div className="min-h-screen bg-[#fafafa] text-stone-900 pb-24">
      {/* Hero Banner Cover */}
      <div className="relative h-64 sm:h-80 md:h-96 w-full overflow-hidden bg-black border-b border-[#222222]">
        <img
          src={vendor.coverImage}
          alt={vendor.businessName}
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent" />

        {/* Top Floating Controls */}
        <div className="absolute top-6 left-4 right-4 max-w-7xl mx-auto flex items-center justify-between z-10">
          <button
            onClick={() => navigateTo('vendors')}
            className="px-4 py-2 rounded-lg bg-black/80 border border-[#333333] backdrop-blur-md text-white text-[10px] font-mono-accent uppercase tracking-wider font-bold hover:border-white transition-colors flex items-center space-x-1"
          >
            <span>← DIRECTORY</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => (isCompared ? removeFromCompare(vendor.id) : addToCompare(vendor.id))}
              className={`px-3.5 py-2 rounded-lg backdrop-blur-md text-[10px] font-mono-accent uppercase tracking-wider font-bold transition-colors flex items-center space-x-1.5 border ${
                isCompared
                  ? 'bg-[#F27D26] text-white border-[#F27D26]'
                  : 'bg-black/80 text-white border-[#333333] hover:border-white'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>{isCompared ? 'In Compare' : 'Compare'}</span>
            </button>

            <button
              onClick={() => toggleFavorite(vendor.id)}
              className={`p-2 rounded-lg backdrop-blur-md transition-colors border ${
                isFav ? 'bg-rose-600 text-white border-rose-600' : 'bg-black/80 text-white border-[#333333] hover:border-white'
              }`}
            >
              <Heart className={`w-4 h-4 ${isFav ? 'fill-white' : ''}`} />
            </button>
          </div>
        </div>

        {/* Hero Title & Badges */}
        <div className="absolute bottom-6 left-4 right-4 max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4 text-white z-10">
          <div className="flex items-end space-x-4">
            <img
              src={vendor.logo}
              alt={vendor.businessName}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-[#333333] shadow-2xl object-cover bg-black shrink-0"
            />
            <div>
              <div className="flex items-center space-x-2 mb-1.5">
                {vendor.verified && (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded bg-[#10B981] text-black text-[9px] font-black tracking-widest uppercase">
                    <CheckCircle className="w-3 h-3 text-black" />
                    <span>VERIFIED STOREFRONT</span>
                  </span>
                )}
                <span className="px-2 py-0.5 rounded bg-[#171717] border border-[#333333] text-stone-600 text-[10px] font-mono-accent uppercase tracking-wider font-semibold">
                  {vendor.categoryName}
                </span>
              </div>

              <h1 className="font-display text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white uppercase">
                {vendor.businessName}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-xs text-stone-400 mt-1.5 font-mono-accent">
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-[#ef4563]" />
                  <span>{vendor.city} ({vendor.serviceRadiusKm} km coverage)</span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1 text-[#ef4563] font-bold">
                  <Star className="w-3.5 h-3.5 fill-[#F27D26] text-[#ef4563]" />
                  <span>{vendor.rating}</span>
                  <span className="text-stone-400 font-normal">({vendor.reviewCount} client reviews)</span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-stone-500" />
                  <span>Avg Response: {vendor.responseTimeHours}h</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="sticky top-20 z-30 bg-white border-b border-stone-200 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center space-x-6 overflow-x-auto scrollbar-none">
          {[
            { id: 'packages', label: 'PACKAGES & PRICING' },
            { id: 'portfolio', label: `PORTFOLIO GALLERY (${vendor.portfolio.length})` },
            { id: 'about', label: 'ABOUT & SERVICES' },
            { id: 'availability', label: 'CALENDAR & SLOTS' },
            { id: 'reviews', label: `REVIEWS (${vendor.reviewCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 text-xs font-medium tracking-wider uppercase font-bold whitespace-nowrap border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-[#ef4563] text-[#ef4563]'
                  : 'border-transparent text-stone-500 hover:text-stone-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Layout: Tabs + Sticky Quote Box */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Left Content Area */}
          <div className="lg:col-span-8 space-y-8">
            {/* 1. PACKAGES TAB */}
            {activeTab === 'packages' && (
              <div className="space-y-6">
                <div>
                  <div className="w-8 h-[2px] bg-[#ef4563] mb-2" />
                  <h2 className="font-display text-2xl font-black text-stone-900 uppercase tracking-tight">STANDARD SERVICE PACKAGES</h2>
                  <p className="text-xs text-stone-500 mt-1">
                    Select a pre-configured package or request custom specifications for an itemized breakdown.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {vendor.packages.map((pkg) => {
                    const isSelected = selectedPkg?.id === pkg.id;

                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setSelectedPkg(pkg)}
                        className={`rounded-2xl p-5 border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#fff2f4] border-[#ef4563] shadow-sm ring-1 ring-[#ef4563]/20'
                            : 'bg-white border-stone-200 hover:border-stone-200'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium font-black uppercase tracking-wider text-[#ef4563] bg-stone-100 border border-stone-200 px-2 py-0.5 rounded">
                              {pkg.tier}
                            </span>
                            {isSelected && <Check className="w-4 h-4 text-[#ef4563]" />}
                          </div>

                          <h3 className="font-display text-lg font-black text-stone-900 uppercase">{pkg.name}</h3>
                          <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                            {pkg.description}
                          </p>

                          <div className="pt-2 font-medium">
                            <div className="text-[10px] uppercase text-stone-500 font-bold">TOTAL PRICING</div>
                            <div className="text-xl font-black text-stone-900">
                              {formatCurrency(pkg.price)}
                            </div>
                          </div>

                          <div className="space-y-1.5 pt-3 border-t border-stone-200">
                            <span className="text-[10px] font-medium uppercase tracking-wider font-bold text-stone-500 block">
                              WHAT'S INCLUDED:
                            </span>
                            {pkg.servicesIncluded.map((s, idx) => (
                              <div key={idx} className="flex items-start space-x-1.5 text-xs text-stone-600">
                                <CheckCircle className="w-3.5 h-3.5 text-[#10B981] shrink-0 mt-0.5" />
                                <span>{s}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEnquiryModal(vendor, pkg);
                            }}
                            className={`w-full py-2.5 rounded-lg text-[10px] font-medium uppercase tracking-wider font-bold transition-colors ${
                              isSelected
                                ? 'bg-[#ef4563] text-white hover:bg-[#dc3452]'
                                : 'bg-[#fff2f4] text-[#ef4563] hover:text-[#dc3452] hover:bg-[#ffe6eb]'
                            }`}
                          >
                            Book {pkg.name}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Custom Quote callout */}
                <div className="p-6 rounded-2xl bg-white text-stone-900 flex flex-col sm:flex-row items-center justify-between gap-4 border border-stone-200">
                  <div>
                    <h4 className="font-display text-base font-black uppercase">HAVE CUSTOM SPECIFICATIONS OR SCALE?</h4>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Request an itemized breakdown with tailored stage dimensions, floral menus, or sound setups.
                    </p>
                  </div>
                  <button
                    onClick={() => openEnquiryModal(vendor)}
                    className="px-5 py-2.5 rounded-lg bg-[#ef4563] text-white text-xs font-medium uppercase tracking-wider font-bold hover:bg-[#dc3452] whitespace-nowrap shrink-0"
                  >
                    Request Custom Quote
                  </button>
                </div>
              </div>
            )}

            {/* 2. PORTFOLIO GALLERY TAB */}
            {activeTab === 'portfolio' && (
              <div className="space-y-6">
                <div>
                  <div className="w-8 h-[2px] bg-[#ef4563] mb-2" />
                  <h2 className="font-display text-2xl font-black text-stone-900 uppercase tracking-tight">VERIFIED PORTFOLIO & SHOWCASE</h2>
                  <p className="text-xs text-stone-500 mt-1">
                    High-resolution photographs from verified live events executed by {vendor.businessName}.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {vendor.portfolio.map((img) => (
                    <div key={img.id} className="rounded-2xl overflow-hidden bg-white border border-stone-200 group">
                      <div className="aspect-[4/3] overflow-hidden relative">
                        <img
                          src={img.url}
                          alt={img.caption}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                        />
                      </div>
                      <div className="p-3 bg-white border-t border-stone-200">
                        <p className="text-xs font-bold text-stone-900">{img.caption}</p>
                        <p className="text-[10px] font-medium text-stone-500 uppercase tracking-wider mt-0.5">Verified Event Photography</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. ABOUT TAB */}
            {activeTab === 'about' && (
              <div className="space-y-6 bg-white rounded-2xl p-6 border border-stone-200 shadow-xl">
                <div>
                  <div className="w-8 h-[2px] bg-[#ef4563] mb-2" />
                  <h2 className="font-display text-xl font-black text-stone-900 uppercase">ABOUT {vendor.businessName}</h2>
                  <p className="text-xs sm:text-sm text-stone-600 mt-2 leading-relaxed">
                    {vendor.about}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-stone-200 font-medium">
                  <div>
                    <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-bold">EXPERIENCE</span>
                    <span className="text-sm font-black text-stone-900">{vendor.experienceYears} Years</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-bold">EVENTS EXECUTED</span>
                    <span className="text-sm font-black text-stone-900">{vendor.completedEventsCount}+</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-bold">BASE METRO</span>
                    <span className="text-sm font-black text-stone-900">{vendor.city}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-bold">RADIUS</span>
                    <span className="text-sm font-black text-stone-900">{vendor.serviceRadiusKm} km</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] font-medium font-bold uppercase tracking-[0.2em] text-[#ef4563] mb-2">
                    CORE SPECIALIZATIONS
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {vendor.services.map((s) => (
                      <span
                        key={s}
                        className="px-3 py-1.5 rounded-lg bg-[#141414] border border-stone-200 text-xs font-medium font-semibold text-stone-200"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {vendor.faq && vendor.faq.length > 0 && (
                  <div className="pt-4">
                    <h3 className="text-[10px] font-medium font-bold uppercase tracking-[0.2em] text-[#ef4563] mb-3">
                      FREQUENTLY ASKED QUESTIONS
                    </h3>
                    <div className="space-y-3">
                      {vendor.faq.map((f, i) => (
                        <div key={i} className="p-4 rounded-xl bg-[#141414] border border-stone-200">
                          <h4 className="text-xs font-bold text-stone-900 uppercase">{f.question}</h4>
                          <p className="text-xs text-stone-500 mt-1 leading-relaxed">{f.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. AVAILABILITY CALENDAR TAB */}
            {activeTab === 'availability' && (
              <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xl space-y-6">
                <div>
                  <div className="w-8 h-[2px] bg-[#ef4563] mb-2" />
                  <h2 className="font-display text-xl font-black text-stone-900 uppercase">CALENDAR & SLOT AVAILABILITY</h2>
                  <p className="text-xs text-stone-500 mt-1">
                    Dates marked in red are locked contracts. Other dates are open for immediate holds.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#141414] border border-stone-200">
                  <div className="flex items-center justify-between mb-4 font-medium">
                    <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">LOCKED EVENT DATES</span>
                    <span className="text-xs text-stone-500">{vendor.bookedDates.length} booked slots</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {vendor.bookedDates.map((date) => (
                      <span
                        key={date}
                        className="px-3 py-1.5 rounded-lg bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs font-medium font-semibold flex items-center space-x-1"
                      >
                        <CalendarIcon className="w-3 h-3 text-rose-400" />
                        <span>{date} (Reserved)</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#111A14] border border-[#1A3322] text-xs text-emerald-300">
                  <p className="font-bold">Need to check a custom date not listed above?</p>
                  <p className="mt-0.5 text-stone-500">
                    Send an enquiry to check slot availability and hold a 48-hour tentative reservation.
                  </p>
                </div>
              </div>
            )}

            {/* 5. REVIEWS TAB */}
            {activeTab === 'reviews' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="text-center sm:text-left">
                    <div className="text-5xl font-display font-black text-stone-900">{vendor.rating}</div>
                    <div className="flex items-center justify-center sm:justify-start space-x-1 text-[#ef4563] mt-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="w-4 h-4 fill-[#F27D26]" />
                      ))}
                    </div>
                    <p className="text-xs font-medium text-stone-500 mt-1">Based on {vendor.reviews.length} verified bookings</p>
                  </div>

                  <div className="flex-1 max-w-xs space-y-2 text-xs text-stone-600 w-full font-medium">
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500">Quality & Execution</span>
                      <span className="font-bold text-stone-900">4.9 / 5</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500">Punctuality</span>
                      <span className="font-bold text-stone-900">5.0 / 5</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500">Value for Investment</span>
                      <span className="font-bold text-stone-900">4.8 / 5</span>
                    </div>
                  </div>
                </div>

                {/* Write a Review Form */}
                <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xl space-y-4">
                  <h3 className="font-display text-lg font-black text-stone-900 uppercase">SUBMIT VERIFIED CLIENT REVIEW</h3>
                  <form onSubmit={handleReviewSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-wider font-bold text-stone-500 block mb-1">YOUR RATING</label>
                        <div className="flex items-center space-x-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewRating(star)}
                              className="p-1 text-[#ef4563] hover:scale-110 transition-transform"
                            >
                              <Star
                                className={`w-6 h-6 ${
                                  star <= reviewRating ? 'fill-[#F27D26] text-[#ef4563]' : 'text-stone-700'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-wider font-bold text-stone-500 block mb-1">EVENT TYPE</label>
                        <select
                          value={reviewEventType}
                          onChange={(e) => setReviewEventType(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg bg-[#141414] border border-stone-200 text-stone-900 font-bold outline-none"
                        >
                          <option value="Grand Wedding" className="bg-[#141414] text-stone-900">Grand Wedding</option>
                          <option value="Birthday Gala" className="bg-[#141414] text-stone-900">Birthday Gala</option>
                          <option value="Corporate Summit" className="bg-[#141414] text-stone-900">Corporate Summit</option>
                          <option value="Baby Shower" className="bg-[#141414] text-stone-900">Baby Shower</option>
                          <option value="Private Dinner" className="bg-[#141414] text-stone-900">Private Celebration</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider font-bold text-stone-500 block mb-1">YOUR EXPERIENCE</label>
                      <textarea
                        rows={3}
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Describe the setup, punctuality, and quality of service provided..."
                        className="w-full p-3 text-xs rounded-lg bg-[#141414] border border-stone-200 text-stone-900 outline-none focus:border-[#ef4563] placeholder:text-stone-600"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingReview}
                      className="px-6 py-2.5 rounded-lg bg-[#ef4563] text-white text-xs font-medium uppercase tracking-wider font-bold hover:bg-[#dc3452] transition-colors flex items-center space-x-2 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmittingReview ? 'Submitting...' : 'Post Client Review'}</span>
                    </button>
                  </form>
                </div>

                {/* Reviews List */}
                <div className="space-y-4">
                  {vendor.reviews.map((r) => (
                    <div key={r.id} className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <img
                            src={r.customerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                            alt={r.customerName}
                            className="w-10 h-10 rounded-full object-cover border border-stone-200"
                          />
                          <div>
                            <h4 className="text-xs font-bold text-stone-900">{r.customerName}</h4>
                            <p className="text-[11px] font-medium text-stone-500">{r.eventType} • {r.date}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1 text-[#ef4563]">
                          {[...Array(r.rating)].map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-[#F27D26]" />
                          ))}
                        </div>
                      </div>

                      <p className="text-xs text-stone-600 leading-relaxed">{r.comment}</p>

                      {r.verifiedBooking && (
                        <div className="inline-flex items-center space-x-1 text-[10px] text-[#10B981] font-medium font-bold uppercase tracking-wider">
                          <CheckCircle className="w-3 h-3 text-[#10B981]" />
                          <span>Verified Booking Contract</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sticky Sidebar Right: Booking & Direct Enquiries */}
          <div className="lg:col-span-4">
            <div className="sticky top-36 bg-white rounded-2xl p-6 border border-[#262626] shadow-2xl space-y-6">
              <div>
                <span className="text-[10px] font-medium font-bold text-stone-500 uppercase tracking-widest block">
                  STARTING PACKAGE RATE
                </span>
                <div className="flex items-baseline space-x-2 mt-0.5 font-medium">
                  <span className="text-3xl font-display font-black text-stone-900">
                    {formatCurrency(vendor.startingPrice)}
                  </span>
                  <span className="text-xs text-stone-500">/ event</span>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  id="vendor-sidebar-enquire-btn"
                  onClick={() => openEnquiryModal(vendor, selectedPkg || undefined)}
                  className="w-full py-3.5 px-4 rounded-lg bg-[#ef4563] text-white text-xs font-medium uppercase tracking-wider font-black hover:bg-[#dc3452] transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-[#F27D26]/20"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send Enquiry & Get Quote</span>
                </button>

                <button
                  id="vendor-sidebar-chat-btn"
                  onClick={() => navigateTo('messages')}
                  className="w-full py-3 px-4 rounded-lg bg-[#141414] border border-stone-200 text-stone-600 text-xs font-medium uppercase tracking-wider font-bold hover:text-stone-900 hover:border-[#ef4563] transition-colors flex items-center justify-center space-x-2"
                >
                  <Send className="w-4 h-4 text-[#ef4563]" />
                  <span>Direct Message Vendor</span>
                </button>
              </div>

              <div className="pt-4 border-t border-stone-200 space-y-3">
                <h3 className="font-black text-sm uppercase">Book this vendor</h3>
                <label className="block text-xs text-stone-500">Event date<input type="date" value={bookingDate} onChange={e=>setBookingDate(e.target.value)} className="mt-1 w-full rounded-lg bg-[#141414] border border-stone-200 p-2.5 text-stone-900"/></label>
                <textarea rows={3} value={bookingMessage} onChange={e=>setBookingMessage(e.target.value)} placeholder="Message / requirements" className="w-full rounded-lg bg-[#141414] border border-stone-200 p-2.5 text-xs text-stone-900 resize-none"/>
                <button onClick={handleDirectBooking} disabled={bookingBusy} className="w-full rounded-lg bg-[#ef4563] text-stone-900 py-3 text-xs font-black uppercase disabled:opacity-50">{bookingBusy?'Creating booking…':'Book vendor'}</button>
              </div>

              {/* Trust Box */}
              <div className="p-4 rounded-xl bg-[#141414] border border-stone-200 space-y-2 text-xs">
                <div className="flex items-center space-x-2 text-[#10B981] font-medium font-bold uppercase tracking-wider text-[11px]">
                  <Shield className="w-4 h-4 text-[#10B981]" />
                  <span>SECURE STRIPE CHECKOUT</span>
                </div>
                <ul className="space-y-1 text-stone-500 text-[11px] font-medium">
                  <li>✓ Payments processed through Stripe Checkout</li>
                  <li>✓ Payment status verified by the backend</li>
                  <li>✓ Booking and payment status tracked separately</li>
                </ul>
              </div>

              {/* Contact Snapshot */}
              <div className="pt-2 border-t border-stone-200 space-y-2 text-xs text-stone-500 font-medium">
                <div className="flex items-center space-x-2">
                  <Phone className="w-3.5 h-3.5 text-[#ef4563]" />
                  <span>{vendor.phone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="w-3.5 h-3.5 text-[#ef4563]" />
                  <span>{vendor.email}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
