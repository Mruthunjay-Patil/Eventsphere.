import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Vendor } from '../types';
import { api } from '../services/api';
import { formatCurrency } from '../config/brand';
import {
  Scale,
  Star,
  CheckCircle,
  MapPin,
  Clock,
  Shield,
  X,
  Plus,
  ArrowRight,
  MessageSquare,
} from 'lucide-react';

export const VendorComparisonView: React.FC = () => {
  const {
    compareVendorIds,
    removeFromCompare,
    clearCompare,
    navigateTo,
    openEnquiryModal,
  } = useApp();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVendors = async () => {
      setLoading(true);
      try {
        const all = await api.getVendors();
        const selected = all.filter((v) => compareVendorIds.includes(v.id));
        setVendors(selected);
      } catch (e) {
        console.error('Failed to load comparison vendors', e);
      } finally {
        setLoading(false);
      }
    };

    loadVendors();
  }, [compareVendorIds]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white py-20 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#F27D26] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (vendors.length === 0) {
    return (
      <div className="min-h-screen bg-[#050505] text-white py-20">
        <div className="max-w-md mx-auto px-4 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#141414] border border-[#2A2A2A] text-[#F27D26] flex items-center justify-center mx-auto">
            <Scale className="w-8 h-8" />
          </div>
          <h2 className="font-display text-2xl font-black text-white uppercase tracking-tight">Your Compare Tray is Empty</h2>
          <p className="text-xs text-stone-400">
            Browse our vendor directory and click the scale icon on vendor cards to compare services side-by-side.
          </p>
          <button
            onClick={() => navigateTo('vendors')}
            className="px-6 py-3 rounded-lg bg-[#F27D26] text-white text-xs font-mono-accent uppercase tracking-wider font-bold hover:bg-[#d96716]"
          >
            Explore Vendor Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#F5F5F5] py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-mono-accent uppercase tracking-widest text-stone-400 mb-1">
              <button onClick={() => navigateTo('vendors')} className="hover:text-white transition-colors">
                DIRECTORY
              </button>
              <span>/</span>
              <span className="text-[#F27D26] font-bold">SIDE-BY-SIDE MATRIX</span>
            </div>
            <div className="w-10 h-[2px] bg-[#F27D26] mb-2" />
            <h1 className="font-display text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">
              VENDOR COMPARISON MATRIX ({vendors.length} SELECTED)
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={clearCompare}
              className="px-4 py-2 rounded-lg bg-[#141414] border border-[#2E2E2E] text-xs font-mono-accent uppercase tracking-wider font-bold text-stone-400 hover:text-white hover:border-white transition-colors"
            >
              Clear All
            </button>
            <button
              onClick={() => navigateTo('vendors')}
              className="px-4 py-2 rounded-lg bg-[#F27D26] text-white text-xs font-mono-accent uppercase tracking-wider font-bold hover:bg-[#d96716] flex items-center space-x-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Vendor</span>
            </button>
          </div>
        </div>

        {/* Comparison Matrix Table */}
        <div className="bg-[#0D0D0D] rounded-3xl border border-[#262626] shadow-2xl overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-[#222222]">
                <th className="p-6 w-48 text-[10px] font-mono-accent font-bold text-stone-500 uppercase tracking-widest bg-[#121212]">
                  CRITERIA
                </th>
                {vendors.map((v) => (
                  <th key={v.id} className="p-6 w-64 align-top border-l border-[#1F1F1F]">
                    <div className="relative">
                      <button
                        onClick={() => removeFromCompare(v.id)}
                        className="absolute -top-2 -right-2 p-1.5 bg-[#171717] hover:bg-rose-900 border border-[#333333] text-stone-400 hover:text-white rounded-lg transition-colors"
                        title="Remove from comparison"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      <img
                        src={v.coverImage}
                        alt={v.businessName}
                        className="w-full h-32 rounded-xl object-cover mb-3 border border-[#2A2A2A]"
                      />

                      <div className="flex items-center space-x-1.5 mb-1 font-mono-accent">
                        {v.verified && <CheckCircle className="w-3.5 h-3.5 text-[#10B981]" />}
                        <span className="text-[9px] font-black text-[#F27D26] uppercase tracking-wider">{v.categoryName}</span>
                      </div>

                      <h3 className="font-display text-base font-black text-white leading-tight uppercase">
                        {v.businessName}
                      </h3>

                      <div className="flex items-center space-x-1 text-[#F27D26] font-bold text-xs mt-1 font-mono-accent">
                        <Star className="w-3.5 h-3.5 fill-[#F27D26] text-[#F27D26]" />
                        <span>{v.rating}</span>
                        <span className="text-stone-500 font-normal">({v.reviewCount} reviews)</span>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#1F1F1F] text-xs font-mono-accent">
              {/* Row: Starting Price */}
              <tr>
                <td className="p-4 font-bold text-stone-400 uppercase tracking-wider text-[11px] bg-[#121212]">STARTING PACKAGE</td>
                {vendors.map((v) => (
                  <td key={v.id} className="p-4 font-black text-white text-sm border-l border-[#1F1F1F]">
                    {formatCurrency(v.startingPrice)}
                  </td>
                ))}
              </tr>

              {/* Row: Location & Radius */}
              <tr>
                <td className="p-4 font-bold text-stone-400 uppercase tracking-wider text-[11px] bg-[#121212]">LOCATION & COVERAGE</td>
                {vendors.map((v) => (
                  <td key={v.id} className="p-4 text-stone-300 border-l border-[#1F1F1F]">
                    {v.city} • {v.serviceRadiusKm} km coverage
                  </td>
                ))}
              </tr>

              {/* Row: Experience */}
              <tr>
                <td className="p-4 font-bold text-stone-400 uppercase tracking-wider text-[11px] bg-[#121212]">TRACK RECORD</td>
                {vendors.map((v) => (
                  <td key={v.id} className="p-4 text-stone-300 border-l border-[#1F1F1F]">
                    {v.experienceYears} Years • {v.completedEventsCount}+ Events
                  </td>
                ))}
              </tr>

              {/* Row: Response Time */}
              <tr>
                <td className="p-4 font-bold text-stone-400 uppercase tracking-wider text-[11px] bg-[#121212]">AVG RESPONSE</td>
                {vendors.map((v) => (
                  <td key={v.id} className="p-4 text-stone-300 border-l border-[#1F1F1F]">
                    Within {v.responseTimeHours} Hours
                  </td>
                ))}
              </tr>

              {/* Row: Services Included */}
              <tr>
                <td className="p-4 font-bold text-stone-400 uppercase tracking-wider text-[11px] bg-[#121212]">SERVICES INCLUDED</td>
                {vendors.map((v) => (
                  <td key={v.id} className="p-4 text-stone-300 align-top border-l border-[#1F1F1F]">
                    <div className="flex flex-wrap gap-1">
                      {v.services.map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded bg-[#171717] border border-[#2B2B2B] text-[10px] font-semibold text-stone-200">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Row: Actions */}
              <tr>
                <td className="p-6 bg-[#121212] font-bold text-stone-400 uppercase tracking-wider text-[11px]">ACTIONS</td>
                {vendors.map((v) => (
                  <td key={v.id} className="p-6 border-l border-[#1F1F1F]">
                    <div className="space-y-2">
                      <button
                        onClick={() => openEnquiryModal(v)}
                        className="w-full py-2.5 px-3 rounded-lg bg-[#F27D26] text-white text-[10px] font-mono-accent uppercase tracking-wider font-black hover:bg-[#d96716] transition-colors"
                      >
                        Send Enquiry
                      </button>
                      <button
                        onClick={() => navigateTo('vendor-profile', v.id)}
                        className="w-full py-2.5 px-3 rounded-lg bg-[#171717] border border-[#2E2E2E] text-stone-300 hover:text-white text-[10px] font-mono-accent uppercase tracking-wider font-bold hover:border-white transition-colors"
                      >
                        View Storefront
                      </button>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
