'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { WeatherResult, City } from '@/lib/types';
import { getCurrentHourIndex } from '@/lib/utils';
import {
  ComposedChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { Droplets, Wind, Cloud, Thermometer } from 'lucide-react';
import { WeatherIcon } from '@/components/ui/WeatherIcon';

interface LandscapeChartProps {
  city: City;
  weather?: WeatherResult;
  onClose: () => void;
}

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  return (
    <g>
      <circle cx={cx} cy={cy} r={3} fill="#fcd34d" />
      <foreignObject x={cx - 12} y={cy - 30} width={24} height={24}>
        <div className="flex items-center justify-center w-full h-full">
          <WeatherIcon code={payload.weathercode} isDay={payload.isDay} size={20} glow={false} />
        </div>
      </foreignObject>
    </g>
  );
};

export function LandscapeChart({ city, weather, onClose }: LandscapeChartProps) {
  const [days, setDays] = useState<3 | 7>(3);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // HUD State
  const [hudData, setHudData] = useState<any | null>(null);
  const [hudPos, setHudPos] = useState({ x: 0, y: 0, isTopHalf: false });
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const isPressing = useRef(false);
  const startPos = useRef<{ x: number, y: number } | null>(null);

  // Prepare data
  const chartData = useMemo(() => {
    if (!weather?.hourly) return [];
    
    const curIdx = getCurrentHourIndex(weather.hourly.time, weather.timezone);
    if (curIdx < 0) return [];

    const hoursCount = days * 24;
    const data = [];

    for (let i = 0; i < hoursCount; i++) {
      const idx = curIdx + i;
      if (idx >= weather.hourly.time.length) break;

      const date = new Date(weather.hourly.time[idx]);
      const hourStr = date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
      const dayStr = date.toLocaleDateString('pl-PL', { weekday: 'short' });
      const isMidnight = date.getHours() === 0;

      data.push({
        index: idx,
        timeLabel: isMidnight ? `${dayStr}` : hourStr,
        fullTime: `${dayStr}, ${hourStr}`,
        temp: weather.hourly.temperature_2m[idx],
        precip: weather.hourly.precipitation[idx],
        precipProb: weather.hourly.precipitation_probability[idx],
        wind: weather.hourly.windspeed_10m[idx],
        windDir: weather.hourly.winddirection_10m[idx],
        cloud: weather.hourly.cloudcover?.[idx] || 0,
        weathercode: weather.hourly.weathercode[idx],
        isDay: weather.hourly.is_day[idx] === 1,
      });
    }

    return data;
  }, [weather, days]);

  const POINT_WIDTH = 45;
  const chartWidth = Math.max(chartData.length * POINT_WIDTH, typeof window !== 'undefined' ? window.innerWidth : 800);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    
    isPressing.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };
    const { clientX, clientY } = e;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Start long press timer (200ms)
    pressTimer.current = setTimeout(() => {
      if (!isPressing.current) return;
      
      const xInContainer = clientX - rect.left;
      const dataIndex = Math.floor(xInContainer / POINT_WIDTH);
      
      if (dataIndex >= 0 && dataIndex < chartData.length) {
        setHudData(chartData[dataIndex]);
        setHudPos({ 
          x: Math.min(Math.max(clientX, 150), window.innerWidth - 150), 
          y: clientY,
          isTopHalf: clientY < window.innerHeight / 2
        });
        if (navigator.vibrate) navigator.vibrate(10);
      }
    }, 200);
  };

  const cancelPress = () => {
    isPressing.current = false;
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!startPos.current) return;
    
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      cancelPress();
      setHudData(null);
    }
  };

  const handlePointerUp = () => {
    cancelPress();
    setHudData(null);
    startPos.current = null;
  };

  if (!weather) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-zinc-950/95 backdrop-blur-3xl flex flex-col text-zinc-100 touch-none">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-zinc-900/50 border-b border-white/10">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold">{city.name}</h2>
          <span className="text-sm text-zinc-400">Prognoza szczegółowa</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-zinc-800/80 rounded-full p-1 border border-white/10">
            <button 
              onClick={() => setDays(3)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${days === 3 ? 'bg-blue-500/30 text-blue-200' : 'text-zinc-400'}`}
            >
              3 Dni
            </button>
            <button 
              onClick={() => setDays(7)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${days === 7 ? 'bg-blue-500/30 text-blue-200' : 'text-zinc-400'}`}
            >
              7 Dni
            </button>
          </div>
          <button onClick={onClose} className="p-2 bg-zinc-800/80 rounded-full border border-white/10 text-zinc-300 hover:bg-zinc-700/80 transition-colors">
            Zamknij
          </button>
        </div>
      </div>

      {/* Chart Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-x-auto overflow-y-hidden"
        style={{ touchAction: 'pan-x' }}
      >
        <div 
          ref={containerRef}
          className="h-full flex flex-col pt-2 pb-2"
          style={{ width: chartWidth }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Chart 1: Temperature */}
          <div className="flex-[3] pointer-events-none">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 25, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={true} />
                <XAxis dataKey="timeLabel" stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis domain={['dataMin - 2', 'dataMax + 2']} hide />
                <Line type="monotone" dataKey="temp" stroke="#fcd34d" strokeWidth={3} dot={<CustomDot />} isAnimationActive={false}>
                </Line>
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 2: Precipitation & Cloud Cover */}
          <div className="flex-[2] pointer-events-none mt-1">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={true} />
                <XAxis dataKey="timeLabel" hide />
                <YAxis yAxisId="precip" orientation="left" domain={[0, 'dataMax + 5']} hide />
                <YAxis yAxisId="clouds" orientation="right" domain={[0, 100]} hide />
                
                <Area yAxisId="clouds" type="monotone" dataKey="cloud" fill="rgba(161, 161, 170, 0.2)" stroke="none" isAnimationActive={false} />
                <Bar yAxisId="precip" dataKey="precip" fill="#60a5fa" radius={[4, 4, 0, 0]} maxBarSize={20} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 3: Wind */}
          <div className="flex-[1] pointer-events-none mt-1">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={true} />
                <XAxis dataKey="timeLabel" hide />
                <YAxis domain={[0, 'dataMax + 10']} hide />
                <Line type="monotone" dataKey="wind" stroke="#a78bfa" strokeWidth={2} dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Glassmorphism HUD Tooltip */}
      {hudData && (
        <div 
          className={`fixed pointer-events-none z-[200] transform -translate-x-1/2 ${
            hudPos.isTopHalf ? 'translate-y-0 pt-4' : '-translate-y-full pb-4'
          }`}
          style={{ left: hudPos.x, top: hudPos.y }}
        >
          <div className="bg-zinc-900/60 backdrop-blur-2xl border border-white/20 p-4 rounded-3xl shadow-2xl min-w-[180px]">
            <div className="text-center font-semibold text-lg text-white mb-2">{hudData.fullTime}</div>
            
            <div className="flex flex-col gap-2 text-sm text-zinc-200">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Thermometer size={16} className="text-amber-400" /> Temp</span>
                <span className="font-bold text-white">{hudData.temp.toFixed(1)}°C</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Droplets size={16} className="text-blue-400" /> Opad</span>
                <span className="font-bold text-white">{hudData.precip.toFixed(1)} mm ({hudData.precipProb}%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Cloud size={16} className="text-zinc-400" /> Chmury</span>
                <span className="font-bold text-white">{hudData.cloud}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Wind size={16} className="text-purple-400" /> Wiatr</span>
                <span className="font-bold text-white">{hudData.wind.toFixed(1)} km/h</span>
              </div>
            </div>

            {/* Arrow */}
            {hudPos.isTopHalf ? (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-zinc-900/60 border-t border-l border-white/20 transform rotate-45 backdrop-blur-2xl"></div>
            ) : (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-zinc-900/60 border-b border-r border-white/20 transform rotate-45 backdrop-blur-2xl"></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

