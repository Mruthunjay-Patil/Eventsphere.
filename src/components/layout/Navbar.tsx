import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, ChevronDown, Camera, Palette, UserRound, Building2, Sparkles, Utensils, Mail, Gem, Music, Crown, Car, Clapperboard, Gift, Plane, Church } from 'lucide-react';
import { SearchOverlayModal } from '../common/SearchOverlayModal';

export const Navbar: React.FC = () => {
  const { currentUser, currentView, navigateTo, openAuthModal, setAuthMode, setAuthRole, logoutUser } = useApp();
  const isVendorRegistrationPage = currentView === 'vendor-register';
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isVendorsDropdownOpen, setIsVendorsDropdownOpen] = useState(false);
  const vendorMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (vendorMenuRef.current && !vendorMenuRef.current.contains(event.target as Node)) {
        setIsVendorsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const vendorNavCategories = [
    { label: 'Event Planners', category: 'all', icon: UserRound },
    { label: 'Photographers & Videographers', category: 'Photography & Cinema', icon: Camera },
    { label: 'Event Venues', category: 'Venues', icon: Building2 },
    { label: 'Decorators & Florists', category: 'Decoration & Florals', icon: Sparkles },
    { label: 'Caterers & Food', category: 'Food & Catering', icon: Utensils },
    { label: 'DJs & Live Music', category: 'Entertainment & Artists', icon: Music },
    { label: 'Entertainment & Artists', category: 'Entertainment & Artists', icon: Clapperboard },
    { label: 'Makeup & Styling', category: 'Beauty & Mehendi', icon: Palette },
    { label: 'Sound, AV & Lighting', category: 'Sound, AV & Lighting', icon: Sparkles },
    { label: 'Invitations & Gifts', category: 'Invitations & Favors', icon: Mail },
    { label: 'Transport & Rentals', category: 'Rentals & Furniture', icon: Car },
    { label: 'Cakes & Bakeries', category: 'Food & Catering', icon: Gift },
    { label: 'Mehndi Artists', category: 'Beauty & Mehendi', icon: Palette },
    { label: 'Jewellery & Accessories', category: 'Jewellery', icon: Gem },
    { label: 'Hosts & Choreographers', category: 'Entertainment & Artists', icon: UserRound },
    { label: 'Photo Booths & Experiences', category: 'Entertainment & Artists', icon: Sparkles },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 min-h-[78px] bg-white border-b border-[#E9E5E7]">
        <div className="mx-auto flex min-h-[78px] max-w-[1180px] flex-wrap items-center justify-between gap-y-1 px-4 py-2 md:flex-nowrap md:py-0">
          <button onClick={() => navigateTo('home')} className="flex items-center text-left">
            <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[8px] bg-[#ef4563] text-white">
              <span className="text-[20px] font-bold italic tracking-[-1.5px]">ES</span>
            </div>
            <div className="ml-[6px]">
              <div className="flex items-baseline leading-none">
                <span className="text-[20px] font-bold tracking-[-1.2px] text-[#ef4563] sm:text-[24px]">Event</span><span className="text-[20px] font-bold tracking-[-1.2px] text-[#171717] sm:text-[24px]">Sphere</span>
              </div>
              <span className="mt-[2px] hidden text-[10px] leading-none text-[#ef4563] sm:block">India's Premier Event & Wedding Planning Platform</span>
            </div>
          </button>

          <nav className="flex w-full items-center justify-between gap-3 overflow-x-auto md:overflow-visible [&>*]:shrink-0 [&>*]:whitespace-nowrap pb-1 text-[12px] sm:gap-4 sm:text-[13px] md:h-full md:w-auto md:justify-start md:gap-5 md:pb-0 xl:gap-[30px] xl:text-[15px]">
            {(!currentUser || currentUser.role === 'customer') && !isVendorRegistrationPage && <div ref={vendorMenuRef} className="relative h-full flex items-center" onMouseEnter={() => setIsVendorsDropdownOpen(true)} onMouseLeave={() => setIsVendorsDropdownOpen(false)}>
              <button
                id="nav-vendors-dropdown-btn"
                onClick={() => setIsVendorsDropdownOpen((open) => (window.matchMedia('(hover: none)').matches ? !open : true))}
                className="flex items-center gap-[7px] text-[#111111]"
              >
                <span>Vendors</span>
                <ChevronDown className={`h-[15px] w-[15px] transition-transform ${isVendorsDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isVendorsDropdownOpen && (
                <div
                  className="fixed inset-x-3 top-[118px] md:absolute md:inset-x-auto md:top-full md:left-1/2 z-[80] mt-0 md:-translate-x-1/2 md:w-[655px] max-h-[calc(100dvh-100px)] overflow-y-auto rounded-b-xl bg-white border border-[#eeeeee] shadow-[0_10px_30px_rgba(0,0,0,0.16)]"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-[50px] px-5 sm:px-[29px] pt-[18px] pb-[13px] max-h-[65vh] overflow-y-auto">
                    {vendorNavCategories.map(({ label, category, icon: Icon }) => (
                      <button
                        key={label}
                        onClick={() => {
                          navigateTo('vendors', category !== 'all' ? category : undefined);
                          setIsVendorsDropdownOpen(false);
                        }}
                        className="flex h-[40px] items-center gap-[14px] text-left text-[15px] font-medium text-[#171717] hover:text-[#ef4563]"
                      >
                        <Icon className="h-[16px] w-[16px] shrink-0 text-[#171717]" strokeWidth={2} />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-[#eeeeee] px-[29px] py-[19px] flex items-center justify-end gap-[12px]">
                    <span className="text-[14px] text-[#222]">I am a vendor</span>
                    <a
                      href="/?view=vendor-register" target="_blank" rel="noopener noreferrer"
                      onClick={() => setIsVendorsDropdownOpen(false)}
                      className="rounded-full border border-[#ef4563]/35 px-[13px] py-[7px] text-[12px] font-medium text-[#ef4563] hover:bg-[#fff4f6]"
                    >
                      Register now
                    </a>
                  </div>
                </div>
              )}
            </div>}

            {(!currentUser || currentUser.role === 'customer') && !isVendorRegistrationPage && <>
              <button id="navbar-search-trigger" onClick={() => setIsSearchOpen(true)} className="flex items-center gap-[5px] text-[#111111]">
                <span>Search</span><Search className="h-[16px] w-[16px]" strokeWidth={2.2} />
              </button>
              <span className="h-[24px] w-px bg-[#dddddd]" />
            </>}

            <button
              id="navbar-login-btn"
              onClick={() => { setAuthRole(isVendorRegistrationPage || currentUser?.role === 'vendor' ? 'vendor' : 'customer'); setAuthMode('login'); openAuthModal(); }}
              className="text-[#111111]"
            >
              {isVendorRegistrationPage ? 'Vendor login' : currentUser ? currentUser.name.split(' ')[0] : 'Login'}
            </button>
            {currentUser?.role === 'customer' && !isVendorRegistrationPage && (
              <button onClick={() => navigateTo('my-bookings')} className="whitespace-nowrap text-[13px] text-[#171717] hover:text-[#ef4563]">My Bookings</button>
            )}
            {!isVendorRegistrationPage && currentUser?.role === 'vendor' && (
              <button onClick={() => navigateTo('vendor-portal')} className="whitespace-nowrap text-[13px] text-[#171717] hover:text-[#ef4563]">Vendor Dashboard</button>
            )}
            {!isVendorRegistrationPage && currentUser?.role === 'admin' && <button onClick={() => navigateTo('admin')} className="whitespace-nowrap text-[13px] text-[#171717] hover:text-[#ef4563]">Admin Dashboard</button>}
            {currentUser && !isVendorRegistrationPage && (
              <button onClick={() => logoutUser()} className="text-[13px] text-stone-500 hover:text-[#ef4563]">Logout</button>
            )}

            {(!currentUser || currentUser.role === 'customer') && currentView !== 'vendor-register' && (
              <a
                id="nav-are-you-vendor-btn"
                href="/?view=vendor-register"
                target="_blank"
                rel="noopener noreferrer"
                className="whitespace-nowrap text-[14px] text-[#78283F] transition-colors hover:text-[#F04468]"
              >
                Are you a vendor?
              </a>
            )}
          </nav>
        </div>
      </header>
      <SearchOverlayModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};
