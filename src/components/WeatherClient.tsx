'use client';

import dynamic from 'next/dynamic';

const WeatherApp = dynamic(() => import('@/components/WeatherApp'), {
  ssr: false,
  loading: () => <div className="h-screen w-full bg-zinc-950" />,
});

export default function WeatherClient() {
  return <WeatherApp />;
}

