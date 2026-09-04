'use client';

import { useState, useEffect } from 'react';
import WeatherApp from '@/components/WeatherApp';

export default function WeatherClient() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen w-full max-w-md mx-auto bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-400">
        <div className="w-14 h-14 rounded-3xl bg-zinc-900 border border-white/10 flex items-center justify-center animate-pulse mb-4 shadow-2xl">
          <svg className="w-6 h-6 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
        </div>
        <p className="text-xs uppercase tracking-widest font-semibold text-zinc-500">Wczytywanie pogody...</p>
      </div>
    );
  }

  return <WeatherApp />;
}
