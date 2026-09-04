'use client';

import React from 'react';
import { Info, CheckCircle, AlertCircle, X } from 'lucide-react';

export interface ToastData {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

interface ToastProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export function Toast({ toasts, onDismiss }: ToastProps) {
  return (
    <div className="fixed top-4 left-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        let Icon = Info;
        let iconColor = 'text-blue-400';
        
        if (toast.type === 'success') {
          Icon = CheckCircle;
          iconColor = 'text-green-400';
        } else if (toast.type === 'error') {
          Icon = AlertCircle;
          iconColor = 'text-red-400';
        }

        return (
          <div 
            key={toast.id}
            className="pointer-events-auto flex items-center gap-3 bg-zinc-800/80 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 shadow-lg animate-in slide-in-from-top-4 fade-in duration-300"
            onClick={() => onDismiss(toast.id)}
          >
            <Icon size={20} className={`${iconColor} shrink-0`} />
            <span className="text-sm text-zinc-100 flex-1 min-w-0 break-words">{toast.message}</span>
            <button 
              className="shrink-0 p-1 hover:bg-white/5 rounded-full transition-all active:scale-95 text-zinc-400 hover:text-white"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(toast.id);
              }}
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
