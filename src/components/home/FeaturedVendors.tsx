import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Vendor } from '../../types';
import { api } from '../../services/api';
import { formatCurrency } from '../../config/brand';
import {
  Star,
  MapPin,
  CheckCircle,
  Heart,
  Scale,
  Sparkles,
  ArrowRight,
  MessageSquare,
  Sparkle,
} from 'lucide-react';

export const FeaturedVendors: React.FC = () => {
  const {
    currentCity,
    navigateTo,
    favoriteVendorIds,
    toggleFavorite,
    addToCompare,
    compareVendorIds,
    openEnquiryModal,
  } = useApp();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVendors = async () => {
      setLoading(true);
      try {
        const list = await api.getVendors({
          category: activeCategory === 'all' ? undefined : activeCategory,
          city: currentCity === 'All Cities' ? undefined : currentCity,
        });
        setVendors(list.slice(0, 8));
      } catch (e) {
        console.error('Failed to load featured vendors', e);
      } finally {
        setLoading(false);
      }
    };

    loadVendors();
  }, [activeCategory, currentCity]);

  const categories = [
    { label: 'All Vendors', value: 'all' },
    { label: 'Makeup & Mehndi', value: 'Beauty & Mehendi' },
    { label: 'Photographers', value: 'Photography & Cinema' },
    { label: 'Decor & Mandap', value: 'Decoration & Florals' },
    { label: 'Caterers', value: 'Food & Catering' },
    { label: 'Venues', value: 'Venues' },
    { label: 'DJs & Music', value: 'Entertainment & Artists' },
  ];

  return (
    <section className="py-14 sm:py-20 bg-stone-50/70 text-stone-900 border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Title & Filter Tabs */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-[#E83A59] mb-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>HANDPICKED & VERIFIED</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
              Top Rated Vendors in {currentCity}
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-xl">
              Compare transparent packages, certified reviews, and genuine portfolios.
            </p>
          </div>

          <button
            onClick={() => navigateTo('vendors')}
            className="inline-flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-[#E83A59] hover:text-[#d82352] transition-colors self-start md:self-auto"
          >
            <span>View All {currentCity} Vendors</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.value}
              id={`featured-cat-tab-${cat.value}`}
              onClick={() => setActiveCategory(cat.value)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                activeCategory === cat.value
                  ? 'bg-[#E83A59] text-white border-[#E83A59] shadow-sm shadow-rose-500/20'
                  : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300 hover:text-stone-900 shadow-2xs'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Vendor Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-96 rounded-2xl bg-white animate-pulse border border-stone-200" />
            ))}
          </div>
        ) : vendors.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-stone-200 shadow-xs">
            <p className="text-stone-700 font-semibold text-sm">
              No vendors found for this category in {currentCity}.
            </p>
            <button
              onClick={() => setActiveCategory('all')}
              className="mt-3 text-xs font-bold uppercase tracking-wider text-[#E83A59] hover:underline"
            >
              Reset category filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {vendors.map((vendor) => {
              const isFav = favoriteVendorIds.includes(vendor.id);
              const isCompared = compareVendorIds.includes(vendor.id);

              return (
                <div
                  key={vendor.id}
                  id={`vendor-card-${vendor.id}`}
                  className="group bg-white rounded-2xl overflow-hidden border border-stone-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.05)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Cover & Badges */}
                    <div className="relative aspect-[16/11] overflow-hidden bg-stone-100">
                      <img
                        src={vendor.coverImage}
                        alt={vendor.businessName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                        onClick={() => navigateTo('vendor-profile', vendor.id)}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                        {vendor.verified ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-emerald-800 text-[10px] font-bold shadow-xs">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>VERIFIED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-white/80 text-stone-700 text-[10px] font-semibold">
                            PRO
                          </span>
                        )}

                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCompare(vendor.id);
                            }}
                            className={`p-1.5 rounded-full backdrop-blur-md transition-all shadow-xs ${
                              isCompared
                                ? 'bg-[#E83A59] text-white'
                                : 'bg-white/80 text-stone-700 hover:bg-white'
                            }`}
                            title="Add to Compare"
                          >
                            <Scale className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(vendor.id);
                            }}
                            className={`p-1.5 rounded-full backdrop-blur-md transition-all shadow-xs ${
                              isFav
                                ? 'bg-rose-500 text-white'
                                : 'bg-white/80 text-stone-700 hover:bg-white'
                            }`}
                            title="Save to Favorites"
                          >
                            <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-white' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {/* Bottom Image Info */}
                      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-xs">
                        <span className="font-semibold truncate pr-2 text-stone-100 text-[11px]">
                          {vendor.categoryName}
                        </span>
                        <span className="flex items-center space-x-1 text-white font-bold bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[11px]">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{vendor.rating}</span>
                          <span className="text-stone-300 font-normal">({vendor.reviewCount})</span>
                        </span>
                      </div>
                    </div>

                    {/* Content Body */}
                    <div className="p-4 space-y-2.5">
                      <div>
                        <h3
                          onClick={() => navigateTo('vendor-profile', vendor.id)}
                          className="font-bold text-base text-stone-900 group-hover:text-[#E83A59] transition-colors cursor-pointer line-clamp-1"
                        >
                          {vendor.businessName}
                        </h3>
                        <div className="flex items-center text-xs text-stone-500 mt-1 space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-[#E83A59] shrink-0" />
                          <span className="truncate">{vendor.city} • {vendor.serviceRadiusKm}km service</span>
                        </div>
                      </div>

                      {/* Service Highlights */}
                      <div className="flex flex-wrap gap-1">
                        {vendor.services.slice(0, 2).map((s) => (
                          <span
                            key={s}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600"
                          >
                            {s}
                          </span>
                        ))}
                      </div>

                      {/* Pricing Tag */}
                      <div className="pt-2 border-t border-stone-100 flex items-baseline justify-between">
                        <span className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold">STARTING AT</span>
                        <span className="text-sm font-extrabold text-stone-900">
                          {formatCurrency(vendor.startingPrice)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => openEnquiryModal(vendor)}
                      className="py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-xs font-semibold text-stone-700 transition-all flex items-center justify-center space-x-1"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-[#E83A59]" />
                      <span>Enquire</span>
                    </button>

                    <button
                      onClick={() => navigateTo('vendor-profile', vendor.id)}
                      className="py-2 px-3 rounded-xl bg-[#E83A59] hover:bg-[#d82352] text-xs font-bold text-white shadow-xs transition-all flex items-center justify-center space-x-1"
                    >
                      <span>Storefront</span>
                      <ArrowRight className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
