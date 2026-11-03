import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto bg-[#1C1917] text-white p-4 rounded-xl shadow-xl border border-stone-800 flex items-start space-x-3"
          >
            <div className="shrink-0 mt-0.5">
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-[#C5A059]" />}
              {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
              {t.type === 'error' && <XCircle className="w-5 h-5 text-rose-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold tracking-tight text-stone-100">{t.title}</h4>
              {t.description && <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">{t.description}</p>}
            </div>
            <button
              id={`toast-close-${t.id}`}
              onClick={() => removeToast(t.id)}
              className="text-stone-400 hover:text-white shrink-0 p-1 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
