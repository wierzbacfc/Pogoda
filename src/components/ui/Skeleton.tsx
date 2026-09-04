import React from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  );
}

export function WeatherSkeleton() {
  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Hero Card Skeleton */}
      <div className="relative overflow-hidden bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col gap-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="h-5 w-32 bg-white/10 rounded-lg animate-pulse" />
          <div className="h-8 w-8 bg-white/10 rounded-full animate-pulse" />
        </div>
        <div className="h-20 w-44 bg-white/10 rounded-2xl animate-pulse" />
        <div className="flex items-center gap-4">
          <div className="h-4 w-28 bg-white/10 rounded-md animate-pulse" />
          <div className="h-4 w-20 bg-white/10 rounded-md animate-pulse" />
        </div>
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      </div>

      {/* Hourly Card Skeleton */}
      <div className="relative overflow-hidden bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col gap-3 shadow-lg">
        <div className="h-3 w-28 bg-white/10 rounded animate-pulse" />
        <div className="flex gap-2.5 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-16 h-24 bg-white/5 rounded-xl border border-white/5 flex flex-col items-center justify-center gap-2"
            >
              <div className="w-8 h-2.5 bg-white/10 rounded animate-pulse" />
              <div className="w-6 h-6 rounded-full bg-white/10 animate-pulse" />
              <div className="w-6 h-3 bg-white/10 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      </div>

      {/* Daily Card Skeleton */}
      <div className="relative overflow-hidden bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col gap-3 shadow-lg">
        <div className="h-3 w-24 bg-white/10 rounded animate-pulse" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
            <div className="h-4 w-12 bg-white/10 rounded animate-pulse" />
            <div className="h-5 w-5 bg-white/10 rounded-full animate-pulse" />
            <div className="h-2 flex-1 mx-4 bg-white/5 rounded-full" />
            <div className="h-4 w-12 bg-white/10 rounded animate-pulse" />
          </div>
        ))}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      </div>

      {/* Details Grid Skeleton */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="relative overflow-hidden bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col gap-2 shadow-lg"
          >
            <div className="h-3 w-16 bg-white/10 rounded animate-pulse" />
            <div className="h-6 w-20 bg-white/10 rounded-lg animate-pulse" />
            <div className="h-3 w-24 bg-white/5 rounded animate-pulse" />
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          </div>
        ))}
      </div>
    </div>
  );
}
