import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  UserEvent,
  Vendor,
  VendorPackage,
  Booking,
  Quotation,
  NotificationItem,
  EventCategory,
  VendorCategory,
  VendorService,
} from '../types';
import { api, authToken } from '../services/api';
import confetti from 'canvas-confetti';

interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type?: 'success' | 'info' | 'warning' | 'error';
}

interface AppContextType {
  // Auth & Role
  currentUser: User | null;
  availableUsers: User[];
  registerUser: (payload: any) => Promise<void>;
  loginUser: (payload: { email?: string; phone?: string; password: string; role?: 'customer' | 'vendor' | 'admin' }) => Promise<void>;
  logoutUser: () => Promise<void>;
  authMode: 'login' | 'register';
  authRole: 'customer' | 'vendor';
  setAuthRole: (role: 'customer' | 'vendor') => void;
  setAuthMode: (mode: 'login' | 'register') => void;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;

  // Active City & Taxonomies
  currentCity: string;
  setCurrentCity: (city: string) => void;
  eventCategories: EventCategory[];
  vendorCategories: VendorCategory[];

  // Events
  events: UserEvent[];
  activeEvent: UserEvent | null;
  setActiveEventId: (id: string) => void;
  refreshEvents: () => Promise<void>;

  // Favorites & Comparison
  favoriteVendorIds: string[];
  toggleFavorite: (vendorId: string) => Promise<void>;
  compareVendorIds: string[];
  addToCompare: (vendorId: string) => void;
  removeFromCompare: (vendorId: string) => void;
  clearCompare: () => void;

  // Notifications
  notifications: NotificationItem[];
  unreadNotifsCount: number;
  markNotifAsRead: (id: string) => Promise<void>;

  // Navigation / Views
  currentView: string;
  navigateTo: (view: string, param?: string) => void;
  viewParam?: string;

  // Modals
  enquiryModalData: { isOpen: boolean; vendor?: Vendor; package?: VendorPackage; eventId?: string };
  openEnquiryModal: (vendor: Vendor, pkg?: VendorPackage, eventId?: string) => void;
  closeEnquiryModal: () => void;

  quoteModalData: { isOpen: boolean; enquiryId?: string; eventId?: string; customerId?: string; customerName?: string; customerEmail?: string };
  openQuoteModal: (data: { enquiryId?: string; eventId?: string; customerId?: string; customerName?: string; customerEmail?: string }) => void;
  closeQuoteModal: () => void;

  checkoutModalData: { isOpen: boolean; booking?: Booking };
  openCheckoutModal: (booking: Booking) => void;
  closeCheckoutModal: () => void;

  invoiceModalData: { isOpen: boolean; booking?: Booking };
  reserveModalData: { isOpen: boolean; vendor?: Vendor; service?: VendorService };
  openReserveModal: (vendor: Vendor, service: VendorService) => void;
  closeReserveModal: () => void;
  openInvoiceModal: (booking: Booking) => void;
  closeInvoiceModal: () => void;

  // Toast / Notifications UI
  toasts: ToastMessage[];
  showToast: (title: string, description?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;
  triggerCelebration: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authRole, setAuthRole] = useState<'customer' | 'vendor'>('customer');

  const [currentCity, setCurrentCity] = useState<string>('Bangalore');
  const [eventCategories, setEventCategories] = useState<EventCategory[]>([]);
  const [vendorCategories, setVendorCategories] = useState<VendorCategory[]>([]);

  const [events, setEvents] = useState<UserEvent[]>([]);
  const [activeEventId, setActiveEventIdState] = useState<string>('');

  const [favoriteVendorIds, setFavoriteVendorIds] = useState<string[]>(['vend_1', 'vend_2', 'vend_5']);
  const [compareVendorIds, setCompareVendorIds] = useState<string[]>([]);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [currentView, setCurrentView] = useState<string>(() => { const v = (window.history.state?.view as string) || new URLSearchParams(window.location.search).get('view') || 'home'; return ['home','vendors','vendor-profile','create-event','events','ai-planner','compare','messages','vendor-portal','my-bookings','vendor-register','admin'].includes(v) ? v : 'home'; });
  const [viewParam, setViewParam] = useState<string | undefined>(() => window.history.state?.param as string | undefined);

  // Modals
  const [enquiryModalData, setEnquiryModalData] = useState<{ isOpen: boolean; vendor?: Vendor; package?: VendorPackage; eventId?: string }>({ isOpen: false });
  const [pendingEnquiry, setPendingEnquiry] = useState<{ vendor: Vendor; pkg?: VendorPackage; eventId?: string } | null>(null);
  const [pendingReserve, setPendingReserve] = useState<{ vendor: Vendor; service: VendorService } | null>(null);
  const [quoteModalData, setQuoteModalData] = useState<{ isOpen: boolean; enquiryId?: string; eventId?: string; customerId?: string; customerName?: string; customerEmail?: string }>({ isOpen: false });
  const [checkoutModalData, setCheckoutModalData] = useState<{ isOpen: boolean; booking?: Booking }>({ isOpen: false });
  const [invoiceModalData, setInvoiceModalData] = useState<{ isOpen: boolean; booking?: Booking }>({ isOpen: false });
  const [reserveModalData, setReserveModalData] = useState<{ isOpen: boolean; vendor?: Vendor; service?: VendorService }>({ isOpen: false });

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (title: string, description?: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    setToasts((prev) => [...prev, { id, title, description, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#C25E3E', '#C5A059', '#722F37', '#2D5A43', '#F9EDE4'],
      });
    } catch (e) {
      console.log('Confetti trigger', e);
    }
  };

  // Initial Data Load
  const initApp = async () => {
    try {
      const [authData, evCats, venCats, evList, notifs] = await Promise.all([
        api.getMe(),
        api.getEventCategories(),
        api.getVendorCategories(),
        api.getEvents(),
        api.getNotifications(),
      ]);

      setCurrentUser(authData.user);
      setAvailableUsers(authData.availableUsers || []);
      setEventCategories(evCats);
      setVendorCategories(venCats);
      setEvents(evList);
      if (evList.length > 0) {
        setActiveEventIdState(evList[0].id);
      }
      setNotifications(notifs);
    } catch (err) {
      console.error('Failed to initialize app state:', err);
    }
  };

  useEffect(() => {
    initApp();
    const onPopState = (event: PopStateEvent) => {
      setCurrentView(event.state?.view || 'home');
      setViewParam(event.state?.param);
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
    if (!window.history.state?.view) { const requestedView = new URLSearchParams(window.location.search).get('view') || 'home'; const initialView = ['home','vendors','vendor-profile','create-event','events','ai-planner','compare','messages','vendor-portal','my-bookings','vendor-register','admin'].includes(requestedView) ? requestedView : 'home'; setCurrentView(initialView); window.history.replaceState({ view: initialView }, '', window.location.pathname + window.location.search); }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const registerUser = async (payload: any) => {
    try {
      const res = await api.register(payload);
      authToken.set(res.token);
      setCurrentUser(res.user);
      await refreshEvents();
      setIsAuthModalOpen(false);
      showToast('Welcome to EventSphere!', `Account created for ${res.user.name}`);
      if (pendingEnquiry && res.user.role === 'customer') {
        setEnquiryModalData({ isOpen: true, vendor: pendingEnquiry.vendor, package: pendingEnquiry.pkg, eventId: pendingEnquiry.eventId });
        setPendingEnquiry(null);
      } else if (pendingReserve && res.user.role === 'customer') {
        setReserveModalData({ isOpen: true, vendor: pendingReserve.vendor, service: pendingReserve.service });
        setPendingReserve(null);
      } else {
        navigateTo(res.user.role === 'vendor' ? 'vendor-portal' : 'home');
      }
    } catch (err: any) {
      showToast('Registration failed', err.message, 'error');
      throw err;
    }
  };

  const loginUser = async (payload: { email?: string; phone?: string; password: string; role?: 'customer' | 'vendor' | 'admin' }) => {
    try {
      const res = await api.login(payload);
      authToken.set(res.token);
      setCurrentUser(res.user);
      await refreshEvents();
      setIsAuthModalOpen(false);
      showToast('Welcome back!', `Signed in as ${res.user.name}`);
      if (pendingEnquiry && res.user.role === 'customer') {
        setEnquiryModalData({ isOpen: true, vendor: pendingEnquiry.vendor, package: pendingEnquiry.pkg, eventId: pendingEnquiry.eventId });
        setPendingEnquiry(null);
      } else if (pendingReserve && res.user.role === 'customer') {
        setReserveModalData({ isOpen: true, vendor: pendingReserve.vendor, service: pendingReserve.service });
        setPendingReserve(null);
      } else {
        navigateTo(res.user.role === 'vendor' ? 'vendor-portal' : 'home');
      }
    } catch (err: any) {
      showToast('Login failed', err.message, 'error');
      throw err;
    }
  };

  const logoutUser = async () => {
    try { await api.logout(); } catch { /* token removal is enough client-side */ }
    authToken.clear();
    setCurrentUser(null);
    navigateTo('home');
    showToast('Logged out', 'Your EventSphere session has ended.', 'info');
  };

  const refreshEvents = async () => {
    try {
      const list = await api.getEvents();
      setEvents(list);
      if (list.length > 0 && (!activeEventId || !list.some((e) => e.id === activeEventId))) {
        setActiveEventIdState(list[0].id);
      }
    } catch (e) {
      console.error('Error refreshing events', e);
    }
  };

  const toggleFavorite = async (vendorId: string) => {
    try {
      const updated = await api.toggleFavorite(vendorId);
      setFavoriteVendorIds(updated);
      const isFav = updated.includes(vendorId);
      showToast(isFav ? 'Saved to Favorites' : 'Removed from Favorites', undefined, 'info');
    } catch (e) {
      console.error('Toggle favorite failed', e);
    }
  };

  const addToCompare = (vendorId: string) => {
    if (compareVendorIds.includes(vendorId)) return;
    if (compareVendorIds.length >= 4) {
      showToast('Comparison limit reached', 'You can compare up to 4 vendors at a time.', 'warning');
      return;
    }
    setCompareVendorIds((prev) => [...prev, vendorId]);
    showToast('Added to Compare Tray', undefined, 'info');
  };

  const removeFromCompare = (vendorId: string) => {
    setCompareVendorIds((prev) => prev.filter((id) => id !== vendorId));
  };

  const clearCompare = () => {
    setCompareVendorIds([]);
  };

  const markNotifAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (e) {
      console.error('Mark notif read error', e);
    }
  };

  const navigateTo = (view: string, param?: string) => {
    setCurrentView(view);
    setViewParam(param);
    const nextUrl = new URL(window.location.href); nextUrl.searchParams.set('view', view); if (param) nextUrl.searchParams.set('param', param); else nextUrl.searchParams.delete('param'); window.history.pushState({ view, param }, '', nextUrl.pathname + nextUrl.search);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeEvent = events.find((e) => e.id === activeEventId) || (events.length > 0 ? events[0] : null);
  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  return (
    <AppContext.Provider
      value={{
        currentUser,
        availableUsers,
        registerUser,
        loginUser,
        logoutUser,
        authMode,
        authRole,
        setAuthRole,
        setAuthMode,
        isAuthModalOpen,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
        currentCity,
        setCurrentCity,
        eventCategories,
        vendorCategories,
        events,
        activeEvent,
        setActiveEventId: setActiveEventIdState,
        refreshEvents,
        favoriteVendorIds,
        toggleFavorite,
        compareVendorIds,
        addToCompare,
        removeFromCompare,
        clearCompare,
        notifications,
        unreadNotifsCount,
        markNotifAsRead,
        currentView,
        navigateTo,
        viewParam,
        enquiryModalData,
        openEnquiryModal: (vendor, pkg, eventId) => {
          if (!currentUser) {
            setPendingEnquiry({ vendor, pkg, eventId });
            setAuthRole('customer');
            setAuthMode('login');
            setIsAuthModalOpen(true);
            return;
          }
          setEnquiryModalData({ isOpen: true, vendor, package: pkg, eventId });
        },
        closeEnquiryModal: () => setEnquiryModalData({ isOpen: false }),
        quoteModalData,
        openQuoteModal: (data) => setQuoteModalData({ isOpen: true, ...data }),
        closeQuoteModal: () => setQuoteModalData({ isOpen: false }),
        checkoutModalData,
        openCheckoutModal: (booking) => setCheckoutModalData({ isOpen: true, booking }),
        closeCheckoutModal: () => setCheckoutModalData({ isOpen: false }),
        invoiceModalData,
        openInvoiceModal: (booking) => setInvoiceModalData({ isOpen: true, booking }),
        closeInvoiceModal: () => setInvoiceModalData({ isOpen: false }),
        reserveModalData,
        openReserveModal: (vendor, service) => {
          if (!currentUser) {
            setPendingReserve({ vendor, service });
            setAuthRole('customer');
            setAuthMode('login');
            setIsAuthModalOpen(true);
            return;
          }
          setReserveModalData({ isOpen: true, vendor, service });
        },
        closeReserveModal: () => setReserveModalData({ isOpen: false }),
        toasts,
        showToast,
        removeToast,
        triggerCelebration,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
