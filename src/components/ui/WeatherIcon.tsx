'use client';

import React from 'react';
import { getWeatherInfo } from '@/lib/weather-codes';

interface WeatherIconProps {
  code: number;
  isDay?: boolean;
  size?: number;
  className?: string;
  glow?: boolean;
}

/**
 * WeatherIcon component rendering authentic 3D Fluent Volumetric weather assets
 */
export function WeatherIcon({
  code,
  isDay = true,
  size = 24,
  className = '',
  glow = true,
}: WeatherIconProps) {
  const { iconType } = getWeatherInfo(code, isDay);

  let finalIconType = iconType;
  if (finalIconType === 'Sun' && !isDay) finalIconType = 'Moon';
  if (finalIconType === 'CloudSun' && !isDay) finalIconType = 'CloudMoon';

  const getIconSrc = () => {
    switch (finalIconType) {
      case 'Sun':
        return '/icons/weather-3d/sun.png';
      case 'Moon':
        return '/icons/weather-3d/crescent_moon.png';
      case 'CloudSun':
        return '/icons/weather-3d/sun_cloud.png';
      case 'CloudMoon':
        return '/icons/weather-3d/moon_cloud.png';
      case 'Cloud':
        return '/icons/weather-3d/cloud.png';
      case 'CloudDrizzle':
        return '/icons/weather-3d/sun_rain.png';
      case 'CloudRain':
        return '/icons/weather-3d/cloud_rain.png';
      case 'CloudLightning':
        return '/icons/weather-3d/cloud_storm.png';
      case 'Snowflake':
        return '/icons/weather-3d/snowflake.png';
      case 'CloudSnow':
        return '/icons/weather-3d/cloud_snow.png';
      case 'CloudFog':
        return '/icons/weather-3d/fog.png';
      default:
        return '/icons/weather-3d/sun_cloud.png';
    }
  };

  const src = getIconSrc();

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none transition-transform duration-300 ${
        glow ? 'drop-shadow-[0_12px_24px_rgba(0,0,0,0.45)]' : ''
      } ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={src}
        alt={finalIconType}
        width={size}
        height={size}
        className="w-full h-full object-contain pointer-events-none drop-shadow-md"
        loading="eager"
      />
    </div>
  );
}
