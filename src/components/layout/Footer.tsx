import React from 'react';
import { useApp } from '../../context/AppContext';
import { BRAND_CONFIG } from '../../config/brand';
import { ShieldCheck, Sparkles, MapPin, Mail, Phone, ArrowRight, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  const { navigateTo, setCurrentCity } = useApp();

  return (
    <footer className="bg-stone-900 text-stone-300 pt-16 pb-12 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-stone-800">
          {/* Col 1: Brand & Mission */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#D82352] to-[#E83A59] flex items-center justify-center text-white shadow-md">
                <span className="font-sans font-black text-xl italic leading-none">ES</span>
              </div>
              <div>
                <div className="flex items-center">
                  <span className="font-bold text-2xl tracking-tight text-[#E83A59] leading-none">Event</span>
                  <span className="font-bold text-2xl tracking-tight text-white leading-none">Sphere</span>
                </div>
                <span className="text-[10px] text-stone-400 font-medium block mt-0.5">
                  India's Premier Event & Wedding Planning Platform
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-400 max-w-sm leading-relaxed">
              Plan weddings, birthdays, corporate events, and celebrations with trusted vendors across India.
            </p>

            <div className="pt-2 flex flex-col space-y-2 text-xs text-stone-300">
              <a href={`mailto:${BRAND_CONFIG.supportEmail}`} className="flex items-center space-x-2 hover:text-white transition-colors">
                <Mail className="w-4 h-4 text-[#E83A59]" />
                <span>{BRAND_CONFIG.supportEmail}</span>
              </a>
              <a href={`tel:${BRAND_CONFIG.supportPhone.replace(/[^+0-9]/g, '')}`} className="flex items-center space-x-2 hover:text-white transition-colors">
                <Phone className="w-4 h-4 text-[#E83A59]" />
                <span>{BRAND_CONFIG.supportPhone} (Concierge Support)</span>
              </a>
            </div>

            <div className="pt-2">
              <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-stone-800 border border-stone-700 text-[11px] font-bold text-stone-200">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>100% KYC Verified Vendors • Escrow Protection</span>
              </div>
            </div>
          </div>

          {/* Col 2: Vendor Categories */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Wedding Vendors
            </h4>
            <ul className="space-y-2 text-xs text-stone-400 font-medium">
              <li>
                <button
                  onClick={() => navigateTo('vendors', 'Beauty & Mehendi')}
                  className="hover:text-[#E83A59] transition-colors"
                >
                  Bridal Makeup Artists
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('vendors', 'Photography & Cinema')}
                  className="hover:text-[#E83A59] transition-colors"
                >
                  Wedding Photographers
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('vendors', 'Decoration & Florals')}
                  className="hover:text-[#E83A59] transition-colors"
                >
                  Wedding Decorators
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('vendors', 'Food & Catering')}
                  className="hover:text-[#E83A59] transition-colors"
                >
                  Wedding Caterers
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('vendors', 'Venues')}
                  className="hover:text-[#E83A59] transition-colors"
                >
                  Venues & Banquet Halls
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('vendors', 'Entertainment & Artists')}
                  className="hover:text-[#E83A59] transition-colors"
                >
                  Wedding DJs & Sangeet
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Wedding Planning Tools */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Planning Tools
            </h4>
            <ul className="space-y-2 text-xs text-stone-400 font-medium">
              <li>
                <button
                  onClick={() => navigateTo('ai-planner')}
                  className="hover:text-[#E83A59] transition-colors text-white font-semibold flex items-center space-x-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#E83A59]" />
                  <span>AI Wedding Wizard</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('events')}
                  className="hover:text-[#E83A59] transition-colors"
                >
                  90-Day Wedding Checklist
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('events')}
                  className="hover:text-[#E83A59] transition-colors"
                >
                  Dynamic Budget Tracker
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('compare')}
                  className="hover:text-[#E83A59] transition-colors"
                >
                  Vendor Comparison Tray
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('messages')}
                  className="hover:text-[#E83A59] transition-colors"
                >
                  Direct Quotes & Inquiries
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Top Cities & Vendor Onboarding */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Top Wedding Cities
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-stone-400 mb-6 font-medium">
              {BRAND_CONFIG.popularCities.slice(0, 8).map((city) => (
                <button
                  key={city.name}
                  onClick={() => {
                    setCurrentCity(city.name);
                    navigateTo('vendors');
                  }}
                  className="text-left hover:text-[#E83A59] transition-colors truncate"
                >
                  {city.name}
                </button>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-stone-800/80 border border-stone-700">
              <h5 className="text-xs font-bold text-white mb-1">Are you a Wedding Vendor?</h5>
              <p className="text-[11px] text-stone-400 mb-3 leading-relaxed">
                Join thousands of verified vendors receiving genuine wedding leads daily.
              </p>
              <button
                onClick={() => window.open('/?view=vendor-register', '_blank', 'noopener,noreferrer')}
                className="w-full py-2 px-3 rounded-xl bg-[#E83A59] text-white text-xs font-bold hover:bg-[#d82352] transition-all flex items-center justify-center space-x-1.5"
              >
                <span>Vendor Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-400 gap-4">
          <p>© 2026 {BRAND_CONFIG.name} . All rights reserved.</p>
          <div className="flex items-center space-x-6">
            <a href={`mailto:${BRAND_CONFIG.supportEmail}?subject=Privacy%20Policy%20Request`} className="hover:text-[#E83A59]">Privacy Policy</a>
            <a href={`mailto:${BRAND_CONFIG.supportEmail}?subject=Terms%20of%20Service%20Request`} className="hover:text-[#E83A59]">Terms of Service</a>
            <a href={`mailto:${BRAND_CONFIG.supportEmail}?subject=Security%20and%20Escrow%20Question`} className="hover:text-[#E83A59]">Security & Escrow</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
