import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ToastContainer } from './components/common/Toast';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { SupportChat } from './components/common/SupportChat';

// Views
import { HomeView } from './views/HomeView';
import { VendorDiscoveryView } from './views/VendorDiscoveryView';
import { VendorProfileView } from './views/VendorProfileView';
import { EventPlannerWizardView } from './views/EventPlannerWizardView';
import { CustomerEventDashboardView } from './views/CustomerEventDashboardView';
import { AiPlannerView } from './views/AiPlannerView';
import { VendorComparisonView } from './views/VendorComparisonView';
import { MessagesView } from './views/MessagesView';
import { VendorPortalView } from './views/VendorPortalView';
import { MyBookingsView } from './views/MyBookingsView';
import { VendorRegisterView } from './views/VendorRegisterView';
import { AdminConsoleView } from './views/AdminConsoleView';

// Modals
import { EnquiryModal } from './components/modals/EnquiryModal';
import { QuoteCreatorModal } from './components/modals/QuoteCreatorModal';
import { CheckoutModal } from './components/modals/CheckoutModal';
import { TaxInvoiceModal } from './components/modals/TaxInvoiceModal';
import { AuthModal } from './components/modals/AuthModal';
import { ReserveServiceModal } from './components/modals/ReserveServiceModal';

const AppContent: React.FC = () => {
  const { currentView } = useApp();

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa] text-stone-900 selection:bg-[#ef4563] selection:text-white">
      {/* Role Switcher Floating Bar */}
      {/* Primary Sticky Header */}
      <Navbar />

      {/* Main View Router */}
      <main className="flex-1">
        {currentView === 'home' && <HomeView />}
        {currentView === 'vendors' && <VendorDiscoveryView />}
        {currentView === 'vendor-profile' && <VendorProfileView />}
        {currentView === 'create-event' && <EventPlannerWizardView />}
        {currentView === 'events' && <CustomerEventDashboardView />}
        {currentView === 'ai-planner' && <AiPlannerView />}
        {currentView === 'compare' && <VendorComparisonView />}
        {currentView === 'messages' && <MessagesView />}
        {currentView === 'vendor-portal' && <VendorPortalView />}
        {currentView === 'my-bookings' && <MyBookingsView />}
        {currentView === 'vendor-register' && <VendorRegisterView />}
        {currentView === 'admin' && <AdminConsoleView />}
      </main>

      {/* Global Footer */}
      <Footer />

      {/* Global Interactive Overlays */}
      <ToastContainer />
      <EnquiryModal />
      <QuoteCreatorModal />
      <CheckoutModal />
      <TaxInvoiceModal />
      <AuthModal />
      <ReserveServiceModal />
      <SupportChat />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
