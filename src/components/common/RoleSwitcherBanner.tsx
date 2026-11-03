import React from 'react';
import { useApp } from '../../context/AppContext';
import { Sparkles, Shield, Store, UserCheck } from 'lucide-react';

export const RoleSwitcherBanner: React.FC = () => {
  const { currentUser, switchUserRole, currentView, navigateTo } = useApp();

  if (!currentUser) return null;

  return (
    <div className="bg-stone-900 text-stone-300 py-1.5 px-4 text-xs font-sans border-b border-stone-800">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#E83A59] animate-pulse" />
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-stone-800 text-[#E83A59] tracking-wider uppercase border border-stone-700">
              DEMO MODE
            </span>
          </div>
          <span className="text-stone-400 text-xs">
            Viewing as:{' '}
            <strong className="text-white capitalize font-bold">
              {currentUser.role} ({currentUser.name})
            </strong>
          </span>
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto py-0.5 text-xs">
          <span className="text-stone-400 text-[11px] mr-1 hidden sm:inline font-medium">
            Switch Perspective:
          </span>

          <button
            id="role-switch-customer"
            onClick={() => switchUserRole('customer')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center space-x-1.5 ${
              currentUser.role === 'customer'
                ? 'bg-[#E83A59] text-white shadow-xs'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Customer</span>
          </button>

          <button
            id="role-switch-vendor"
            onClick={() => switchUserRole('vendor')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center space-x-1.5 ${
              currentUser.role === 'vendor'
                ? 'bg-[#E83A59] text-white shadow-xs'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Vendor</span>
          </button>

          <button
            id="role-switch-admin"
            onClick={() => switchUserRole('admin')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center space-x-1.5 ${
              currentUser.role === 'admin'
                ? 'bg-[#E83A59] text-white shadow-xs'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>
        </div>
      </div>
    </div>
  );
};
