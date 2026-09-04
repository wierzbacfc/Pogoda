'use client';

import React, { useState } from 'react';
import { getWeatherInfo } from '@/lib/weather-codes';
import {
  Sun,
  Moon,
  CloudSun,
  CloudMoon,
  Cloud,
  CloudDrizzle,
  CloudRain,
  CloudLightning,
  Snowflake,
  CloudFog,
  HelpCircle,
} from 'lucide-react';

interface WeatherIconProps {
  code: number;
  isDay?: boolean;
  size?: number;
  className?: string;
  glow?: boolean;
}

function getBasePath(): string {
  if (typeof window !== 'undefined') {
    if (window.location.pathname.startsWith('/Pogoda')) {
      return '/Pogoda';
    }
  }
  return process.env.NEXT_PUBLIC_BASE_PATH || '';
}

/**
 * WeatherIcon component rendering authentic 3D Fluent Volumetric weather assets
 * with automatic base path resolution and resilient vector fallback.
 */
export function WeatherIcon({
  code,
  isDay = true,
  size = 24,
  className = '',
  glow = true,
}: WeatherIconProps) {
  const [hasError, setHasError] = useState(false);
  const { iconType } = getWeatherInfo(code, isDay);

  let finalIconType = iconType;
  if (finalIconType === 'Sun' && !isDay) finalIconType = 'Moon';
  if (finalIconType === 'CloudSun' && !isDay) finalIconType = 'CloudMoon';

  const getIconFile = () => {
    switch (finalIconType) {
      case 'Sun':
        return 'sun.png';
      case 'Moon':
        return 'crescent_moon.png';
      case 'CloudSun':
        return 'sun_cloud.png';
      case 'CloudMoon':
        return 'moon_cloud.png';
      case 'Cloud':
        return 'cloud.png';
      case 'CloudDrizzle':
        return 'sun_rain.png';
      case 'CloudRain':
        return 'cloud_rain.png';
      case 'CloudLightning':
        return 'cloud_storm.png';
      case 'Snowflake':
        return 'snowflake.png';
      case 'CloudSnow':
        return 'cloud_snow.png';
      case 'CloudFog':
        return 'fog.png';
      default:
        return 'sun_cloud.png';
    }
  };

  const basePath = getBasePath();
  const src = `${basePath}/icons/weather-3d/${getIconFile()}`;

  const renderFallbackIcon = () => {
    const iconProps = { size, className: 'drop-shadow-sm' };
    switch (finalIconType) {
      case 'Sun':
        return <Sun {...iconProps} className="text-amber-400 fill-amber-400/20" />;
      case 'Moon':
        return <Moon {...iconProps} className="text-indigo-300 fill-indigo-300/20" />;
      case 'CloudSun':
        return <CloudSun {...iconProps} className="text-amber-300" />;
      case 'CloudMoon':
        return <CloudMoon {...iconProps} className="text-indigo-200" />;
      case 'Cloud':
        return <Cloud {...iconProps} className="text-zinc-300 fill-white/10" />;
      case 'CloudDrizzle':
        return <CloudDrizzle {...iconProps} className="text-cyan-400" />;
      case 'CloudRain':
        return <CloudRain {...iconProps} className="text-blue-400" />;
      case 'CloudLightning':
        return <CloudLightning {...iconProps} className="text-amber-400" />;
      case 'Snowflake':
        return <Snowflake {...iconProps} className="text-sky-300" />;
      case 'CloudSnow':
        return <Snowflake {...iconProps} className="text-sky-300" />;
      case 'CloudFog':
        return <CloudFog {...iconProps} className="text-zinc-400" />;
      default:
        return <HelpCircle {...iconProps} className="text-zinc-400" />;
    }
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none transition-transform duration-300 ${
        glow ? 'drop-shadow-[0_12px_24px_rgba(0,0,0,0.45)]' : ''
      } ${className}`}
      style={{ width: size, height: size }}
    >
      {!hasError ? (
        <img
          src={src}
          alt={finalIconType}
          width={size}
          height={size}
          className="w-full h-full object-contain pointer-events-none drop-shadow-md"
          loading="eager"
          onError={() => setHasError(true)}
        />
      ) : (
        renderFallbackIcon()
      )}
    </div>
  );
}
