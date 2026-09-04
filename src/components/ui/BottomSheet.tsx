'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isMounted || !isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />
      <div 
        className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-md max-h-[85vh] overflow-y-auto bg-zinc-900/95 backdrop-blur-2xl rounded-t-3xl border-t border-white/15 p-6 shadow-2xl transition-transform duration-300 animate-in slide-in-from-bottom"
      >
        <div className="w-12 h-1.5 rounded-full bg-zinc-600 mx-auto mb-4 shrink-0" />
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white tracking-tight truncate flex-1 min-w-0 pr-4">{title}</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all active:scale-95 shrink-0">
              <X size={20} className="text-zinc-400" />
            </button>
          </div>
        )}
        <div className="flex-1 min-w-0 pb-[max(env(safe-area-inset-bottom),16px)]">
          {children}
        </div>
      </div>
    </>
  );
}
