import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BRAND_CONFIG } from '../../config/brand';
import { Search, MapPin, ChevronDown, ArrowRight } from 'lucide-react';

export const HeroSection: React.FC = () => {
  const { currentCity, setCurrentCity, navigateTo } = useApp();
  const [searchCategory, setSearchCategory] = useState('all');
  const [searchCity, setSearchCity] = useState(currentCity);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCity && searchCity !== currentCity) setCurrentCity(searchCity);
    navigateTo('vendors', searchCategory !== 'all' ? searchCategory : undefined);
  };

  return (
    <section className="relative overflow-hidden bg-black">
      <div className="relative w-full flex items-center justify-center min-h-[580px] py-10 md:py-0 md:h-[562px]">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1800&auto=format&fit=crop&q=90"
            alt="Event celebration"
            className="h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-black/25" />
        </div>

        <div className="relative z-10 w-full max-w-[1100px] px-4 sm:px-6 text-center md:translate-y-[150px]">
          <h1 className="text-[30px] sm:text-[36px] md:text-[42px] leading-[1.12] font-extrabold tracking-[-1px] md:tracking-[-1.2px] text-white">
            India's Event Planning{' '}
            <span className="text-[#ef4563]">Platform</span>
          </h1>

          <p className="mt-4 md:mt-5 text-[15px] sm:text-[17px] md:text-[20px] leading-6 md:leading-7 font-semibold text-white">
            Find trusted vendors for weddings, birthdays, corporate events, college functions, parties and more.
          </p>

          <div className="mt-6 w-full">
            <div className="mx-auto w-full max-w-[1004px] rounded-[9px] bg-white px-4 py-5 sm:px-[34px] sm:py-[30px] shadow-[0_8px_30px_rgba(0,0,0,0.20)]">
              <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_220px] items-center gap-3 md:gap-6 lg:gap-[46px]">
                <div className="relative">
                  <div className="h-[44px] flex items-center rounded-[4px] border border-[#cfcfcf] bg-white px-[13px]">
                    <Search className="mr-2 h-4 w-4 shrink-0 text-[#222]" />
                    <select
                      id="hero-vendor-search-select"
                      value={searchCategory}
                      onChange={(e) => setSearchCategory(e.target.value)}
                      className="w-full appearance-none border-none bg-transparent text-[15px] font-semibold text-[#171717] outline-none cursor-pointer"
                    >
                      <option value="all">Search For Vendors</option>
                      <option value="Beauty & Mehendi">Makeup & Beauty Artists</option>
                      <option value="Photography & Cinema">Photographers & Videographers</option>
                      <option value="Decoration & Florals">Decorators & Florists</option>
                      <option value="Food & Catering">Caterers, Food & Bakeries</option>
                      <option value="Venues">Event Venues & Halls</option>
                      <option value="Entertainment & Artists">DJs, Live Music & Entertainment</option>
                    </select>
                    <ChevronDown className="h-4 w-4 shrink-0 text-[#777] pointer-events-none" />
                  </div>
                </div>

                <div className="relative">
                  <div className="h-[44px] flex items-center rounded-[4px] border border-[#cfcfcf] bg-white px-[13px]">
                    <MapPin className="mr-2 h-4 w-4 shrink-0 text-[#777]" />
                    <select
                      id="hero-wedding-city-select"
                      value={searchCity}
                      onChange={(e) => {
                        setSearchCity(e.target.value);
                        setCurrentCity(e.target.value);
                      }}
                      className="w-full appearance-none border-none bg-transparent text-[15px] font-semibold text-[#999] outline-none cursor-pointer"
                    >
                      <option value="">Event city</option>
                      {BRAND_CONFIG.popularCities.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="h-4 w-4 shrink-0 text-[#aaa] pointer-events-none" />
                  </div>
                </div>

                <button
                  type="submit"
                  id="hero-find-vendors-submit-btn"
                  className="h-[54px] w-full md:w-[220px] rounded-[8px] bg-[#ef4563] text-[16px] font-bold text-white transition-colors hover:bg-[#df3655] flex items-center justify-center gap-3"
                >
                  <span>Find vendors</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
              </form>
            </div>
          </div>
        </div>


      </div>
    </section>
  );
};
