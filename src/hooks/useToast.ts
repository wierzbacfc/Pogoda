'use client';

import { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

export function useToast(): {
  toasts: Toast[];
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
  dismissToast: (id: string) => void;
} {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    setToasts(prev => {
      const newToasts = [...prev, { id, message, type }];
      if (newToasts.length > 3) {
        return newToasts.slice(newToasts.length - 3);
      }
      return newToasts;
    });

    setTimeout(() => {
      dismissToast(id);
    }, 3000);
  }, [dismissToast]);

  return { toasts, showToast, dismissToast };
}
