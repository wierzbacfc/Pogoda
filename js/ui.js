/**
 * UI Rendering and DOM Manipulation Module.
 */

// Helper functions from Section 16 of the specification
function degreesToCardinal(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function getCurrentHourIndex(hourlyTimes) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const currentHour = `${year}-${month}-${day}T${hour}`; // e.g. "2026-05-22T08"
  return hourlyTimes.findIndex(t => t.startsWith(currentHour));
}

function formatTime(isoString) {
  return isoString.slice(11, 16); // "2026-05-22T05:12" -> "05:12"
}

function getDayLabel(isoDate, index) {
  if (index === 0) return 'Dziś';
  if (index === 1) return 'Jutro';
  const days = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];
  return days[new Date(isoDate).getDay()];
}

function uvColor(index) {
  if (index <= 2)  return '#2d7dd2'; // low
  if (index <= 5)  return '#f7c948'; // moderate
  if (index <= 7)  return '#f4801a'; // high
  if (index <= 10) return '#e05c2a'; // very high
  return '#9b44c8';                  // extreme
}

function formatTemp(celsius, unit = 'C') {
  if (unit === 'F') return `${Math.round(celsius * 9 / 5 + 32)}°`;
  return `${Math.round(celsius)}°`;
}

// Logic for generating key day summary sentence (Section 11)
function getDaySummary(hourlyData, currentIdx) {
  if (currentIdx === -1) return 'Brak szczegółów.';

  // Check from current hour to end of today (23:00)
  const currentISO = hourlyData.time[currentIdx];
  const todayPrefix = currentISO.slice(0, 10);
  
  let endIdx = hourlyData.time.length;
  for (let i = currentIdx; i < hourlyData.time.length; i++) {
    if (!hourlyData.time[i].startsWith(todayPrefix)) {
      endIdx = i;
      break;
    }
  }

  const range = {
    codes: hourlyData.weathercode.slice(currentIdx, endIdx),
    temps: hourlyData.temperature_2m.slice(currentIdx, endIdx),
    times: hourlyData.time.slice(currentIdx, endIdx)
  };

  // 1. Check for precipitation (worst weathercode >= 51)
  let worstPrecipIdx = -1;
  let worstPrecipCode = -1;
  for (let i = 0; i < range.codes.length; i++) {
    const code = range.codes[i];
    if (code >= 51 && code > worstPrecipCode) {
      worstPrecipCode = code;
      worstPrecipIdx = i;
    }
  }

  if (worstPrecipIdx !== -1) {
    const timeStr = formatTime(range.times[worstPrecipIdx]);
    const info = getWeatherInfo(worstPrecipCode, true);
    return `Około ${timeStr} spodziewany: ${info.label.toLowerCase()}.`;
  }

  // 2. Check for evening cooling (> 5 degrees drop)
  const currentTemp = range.temps[0];
  const eveningTemp = range.temps[range.temps.length - 1]; // ~23:00
  if (currentTemp - eveningTemp > 5) {
    return 'Wieczorem zapowiada się odczuwalne ochłodzenie.';
  }

  // 3. Fallback
  return 'Dziś stabilne warunki pogodowe, bez większych zmian.';
}


const UI = {
  // Screen views triggers
  showScreen(viewName) {
    const views = ['weather', 'city-list', 'search'];
    const dots = document.getElementById('dots-container');
    if (dots) dots.classList.toggle('hidden', viewName !== 'weather');
    const openCitiesBtn = document.getElementById('btn-open-cities');
    if (openCitiesBtn) openCitiesBtn.classList.toggle('hidden', viewName !== 'weather');

    views.forEach(v => {
      const el = document.getElementById(`screen-${v}`);
      if (el) {
        if (v === viewName) {
          el.classList.remove('hidden');
          el.classList.add('fade-in');
          window.scrollTo(0, 0);
          const scroller = el.querySelector('.app-content');
          if (scroller) scroller.scrollTop = 0;
        } else {
          el.classList.add('hidden');
          el.classList.remove('fade-in');
        }
      }
    });
  },

  // Set the dynamic linear gradient background
  setBackground(weathercode, isDay) {
    const bgEl = document.querySelector('.app-bg');
    const containerEl = document.querySelector('.app-container');
    if (!bgEl) return;

    const gradient = getBgGradient(weathercode, isDay);
    bgEl.style.background = gradient;

    // Contrast logic: Night themes are dark, so make text light
    if (!isDay) {
      containerEl.classList.add('text-light');
      document.body.style.backgroundColor = '#0b0f19'; // Match dark body background
    } else {
      containerEl.classList.remove('text-light');
      document.body.style.backgroundColor = ''; // Restore default body background
    }

    // Trigger visual weather animations (particles/rain/snow)
    this.updateWeatherEffects(weathercode, isDay);
  },

  // Generates and overlays animated particle elements based on weather state
  updateWeatherEffects(weathercode, isDay) {
    const effectsEl = document.getElementById('weather-effects');
    if (!effectsEl) return;

    // Clear previous elements and classes
    effectsEl.innerHTML = '';
    effectsEl.className = 'weather-effects';

    const effectType = getWeatherEffectType(weathercode, isDay);
    effectsEl.dataset.effect = effectType;
    effectsEl.dataset.weatherCode = String(weathercode);
    effectsEl.dataset.isDay = String(Boolean(isDay));

    if (effectType === 'rain' || effectType === 'storm') {
      // Create falling rain lines
      const dropCount = effectType === 'storm' ? 45 : 25;
      for (let i = 0; i < dropCount; i++) {
        const drop = document.createElement('div');
        drop.className = 'rain-drop';
        drop.style.left = `${Math.random() * 110 - 5}%`;
        drop.style.top = `${Math.random() * -100}px`;
        drop.style.animationDelay = `${Math.random() * 2}s`;
        drop.style.animationDuration = `${0.5 + Math.random() * 0.5}s`;
        effectsEl.appendChild(drop);
      }
      if (effectType === 'storm') {
        effectsEl.classList.add('stormy-active');
        // Create lightning bolts
        const boltCount = 2;
        for (let i = 0; i < boltCount; i++) {
          const bolt = document.createElement('div');
          bolt.className = 'lightning-bolt';
          bolt.style.left = `${20 + Math.random() * 60}%`;
          bolt.style.height = `${150 + Math.random() * 250}px`;
          bolt.style.animationDelay = `${1 + Math.random() * 5}s`;
          effectsEl.appendChild(bolt);
        }
      }
    } else if (effectType === 'snow') {
      // Create drifting snowflakes
      const flakeCount = 20;
      for (let i = 0; i < flakeCount; i++) {
        const flake = document.createElement('div');
        flake.className = 'snowflake';
        const size = 3 + Math.random() * 5;
        flake.style.width = `${size}px`;
        flake.style.height = `${size}px`;
        flake.style.left = `${Math.random() * 100}%`;
        flake.style.top = `${Math.random() * -20}px`;
        flake.style.animationDelay = `${Math.random() * 5}s`;
        flake.style.animationDuration = `${3 + Math.random() * 3}s`;
        effectsEl.appendChild(flake);
      }
    } else if (effectType === 'sunny') {
      // Create sun glow
      const glow = document.createElement('div');
      glow.className = 'sun-glow';
      glow.style.width = '240px';
      glow.style.height = '240px';
      glow.style.top = '-60px';
      glow.style.right = '-60px';
      effectsEl.appendChild(glow);

      // Create sun rays
      const rayAngles = [-15, 0, 15, 30, 45, 60];
      rayAngles.forEach((angle, idx) => {
        const ray = document.createElement('div');
        ray.className = 'sun-ray';
        ray.style.setProperty('--ray-angle', `${angle}deg`);
        ray.style.right = `${10 + idx * 25}px`;
        ray.style.animationDelay = `${idx * 0.4}s`;
        ray.style.height = `${140 + Math.random() * 60}px`;
        effectsEl.appendChild(ray);
      });

      // Create floating bokeh particles
      const particleCount = 8;
      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'sun-particle';
        const size = 30 + Math.random() * 40;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${Math.random() * 6}s`;
        particle.style.animationDuration = `${7 + Math.random() * 5}s`;
        effectsEl.appendChild(particle);
      }
    } else if (effectType === 'starry') {
      // Create stars
      const starCount = 25;
      for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        const size = 1.5 + Math.random() * 2;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 70}%`;
        star.style.animationDelay = `${Math.random() * 3}s`;
        star.style.animationDuration = `${1.5 + Math.random() * 2}s`;
        effectsEl.appendChild(star);
      }

      // Create shooting stars
      const shootingStarCount = 2;
      for (let i = 0; i < shootingStarCount; i++) {
        const ss = document.createElement('div');
        ss.className = 'shooting-star';
        ss.style.left = `${10 + Math.random() * 60}%`;
        ss.style.top = `${10 + Math.random() * 40}%`;
        ss.style.width = `${60 + Math.random() * 50}px`;
        ss.style.animationDelay = `${3 + Math.random() * 8}s`;
        ss.style.animationDuration = `${0.8 + Math.random() * 0.8}s`;
        effectsEl.appendChild(ss);
      }
    } else if (effectType === 'cloudy') {
      // Create drifting cloud masses
      const cloudCount = 4;
      for (let i = 0; i < cloudCount; i++) {
        const cloud = document.createElement('div');
        cloud.className = 'drift-cloud';
        const width = 140 + Math.random() * 100;
        const height = 70 + Math.random() * 50;
        cloud.style.width = `${width}px`;
        cloud.style.height = `${height}px`;
        cloud.style.top = `${10 + Math.random() * 50}%`;
        cloud.style.animationDelay = `${Math.random() * -40}s`;
        cloud.style.animationDuration = `${35 + Math.random() * 25}s`;
        effectsEl.appendChild(cloud);
      }
    } else if (effectType === 'fog') {
      // Create fog layers
      const fogCount = 3;
      for (let i = 0; i < fogCount; i++) {
        const fog = document.createElement('div');
        fog.className = 'fog-layer';
        fog.style.top = `${40 + i * 20}%`;
        fog.style.animationDelay = `${i * -5}s`;
        fog.style.animationDuration = `${12 + Math.random() * 8}s`;
        effectsEl.appendChild(fog);
      }
    }
  },

  // 1. Ekran 1 — Weather Details View
  renderWeatherScreen(city, weatherData, prefs) {
    // Determine current index of the hour
    const currentIdx = getCurrentHourIndex(weatherData.hourly.time);
    if (currentIdx === -1) {
      this.showToast('Błąd indeksu czasu', 'error');
      return;
    }

    const weatherCode = weatherData.hourly.weathercode[currentIdx];
    const isDay = weatherData.hourly.is_day[currentIdx];

    // Set background gradient & contrast
    this.setBackground(weatherCode, isDay);

    // Set header city name
    const headerTitle = document.getElementById('weather-header-title');
    if (headerTitle) {
      headerTitle.textContent = city.isGps && city.subtitle ? city.subtitle : city.name;
    }

    // Render Hero Section
    this.renderHero(weatherData.hourly, weatherData.daily, currentIdx, city, prefs);

    // Render "Dziś w skrócie" summary box
    this.renderDaySummary(weatherData.hourly, weatherData.daily, currentIdx);

    // Render Hourly horizontal scroll list
    this.renderHourlyBar(weatherData.hourly, currentIdx, prefs);

    // Render 14-day daily forecast list
    this.renderDailyForecast(weatherData.daily, prefs);

    // Render Details Grid
    this.renderDetailsGrid(weatherData.hourly, weatherData.daily, currentIdx);
  },

  renderHero(hourlyData, dailyData, currentIdx, city, prefs) {
    const heroIcon = document.getElementById('hero-icon');
    const heroTemp = document.getElementById('hero-temp');
    const heroDesc = document.getElementById('hero-desc');
    const heroFeelsLike = document.getElementById('hero-feels-like');
    const maxTempVal = document.getElementById('hero-temp-max');
    const minTempVal = document.getElementById('hero-temp-min');
    const locationIcon = document.getElementById('hero-location-icon');

    const code = hourlyData.weathercode[currentIdx];
    const isDay = hourlyData.is_day[currentIdx];
    const info = getWeatherInfo(code, isDay);

    if (heroIcon) heroIcon.textContent = info.icon;
    if (heroTemp) heroTemp.textContent = formatTemp(hourlyData.temperature_2m[currentIdx], prefs.unit);
    if (heroDesc) heroDesc.textContent = info.label;
    if (heroFeelsLike) {
      heroFeelsLike.textContent = `Odczuwalna ${formatTemp(hourlyData.apparent_temperature[currentIdx], prefs.unit)}`;
    }
    if (locationIcon) {
      locationIcon.style.display = 'inline-block';
      if (city.isGps) {
        locationIcon.textContent = 'my_location';
        locationIcon.style.color = 'var(--accent-blue)';
      } else {
        locationIcon.textContent = 'location_on';
        locationIcon.style.color = '#64748b'; // Slate 500
      }
    }

    const heroSunrise = document.getElementById('hero-sunrise');
    const heroSunset = document.getElementById('hero-sunset');
    if (heroSunrise) heroSunrise.textContent = `${formatTime(dailyData.sunrise[0])}`;
    if (heroSunset) heroSunset.textContent = `${formatTime(dailyData.sunset[0])}`;

    if (maxTempVal) maxTempVal.textContent = `Max: ${formatTemp(dailyData.temperature_2m_max[0], prefs.unit)}`;
    if (minTempVal) minTempVal.textContent = `Min: ${formatTemp(dailyData.temperature_2m_min[0], prefs.unit)}`;
  },

  renderDaySummary(hourlyData, dailyData, currentIdx) {
    const summaryText = document.getElementById('summary-text');
    if (summaryText) {
      summaryText.textContent = getDaySummary(hourlyData, currentIdx);
    }
  },

  renderHourlyBar(hourlyData, currentIdx, prefs) {
    const container = document.getElementById('hourly-scroll-container');
    if (!container) return;
    container.innerHTML = '';

    // Renders from current hour to end of next day
    const currentISO = hourlyData.time[currentIdx];
    const currentDateStr = currentISO.slice(0, 10);

    let itemsToRender = [];
    let separatorAdded = false;

    // Get up to ~33 hours limit or until the end of tomorrow (index max currentIdx + 36)
    const maxIdx = Math.min(currentIdx + 36, hourlyData.time.length);

    for (let i = currentIdx; i < maxIdx; i++) {
      const timeStr = hourlyData.time[i];
      const dateStr = timeStr.slice(0, 10);

      // Check if day changed, add tomorrow separator
      if (!separatorAdded && dateStr !== currentDateStr) {
        itemsToRender.push({ type: 'separator', label: 'Jutro' });
        separatorAdded = true;
      }

      itemsToRender.push({
        type: 'hour',
        time: formatTime(timeStr),
        code: hourlyData.weathercode[i],
        isDay: hourlyData.is_day[i],
        temp: formatTemp(hourlyData.temperature_2m[i], prefs.unit),
        isActive: i === currentIdx
      });
    }

    itemsToRender.forEach(item => {
      if (item.type === 'separator') {
        const sep = document.createElement('div');
        sep.className = 'hourly-separator';
        sep.textContent = item.label;
        container.appendChild(sep);
      } else {
        const card = document.createElement('div');
        card.className = `hourly-card ${item.isActive ? 'active' : ''}`;
        
        const info = getWeatherInfo(item.code, item.isDay);
        
        card.innerHTML = `
          <span class="hourly-time">${item.isActive ? 'Teraz' : item.time}</span>
          <span class="hourly-icon">${info.icon}</span>
          <span class="hourly-temp">${item.temp}</span>
        `;
        container.appendChild(card);
      }
    });
  },

  renderDailyForecast(dailyData, prefs) {
    const container = document.getElementById('forecast-list-container');
    if (!container) return;
    container.innerHTML = '';

    // Render up to 14 days
    const limit = Math.min(14, dailyData.time.length);
    
    // Calculate global min and max for temperature range bars
    let globalMin = Math.min(...dailyData.temperature_2m_min.slice(0, limit));
    let globalMax = Math.max(...dailyData.temperature_2m_max.slice(0, limit));
    if (globalMin === globalMax) globalMax += 1; // avoid div by 0
    const globalRange = globalMax - globalMin;
    for (let i = 0; i < limit; i++) {
      const dayName = getDayLabel(dailyData.time[i], i);
      const code = dailyData.weathercode[i];
      const info = getWeatherInfo(code, true);
      const dayMin = dailyData.temperature_2m_min[i];
      const dayMax = dailyData.temperature_2m_max[i];
      const minT = formatTemp(dayMin, prefs.unit);
      const maxT = formatTemp(dayMax, prefs.unit);
      
      const prob = dailyData.precipitation_probability_max[i] || 0;
      let rainInfo = '';
      if (prob >= 20) {
        rainInfo = `<span style="font-size: 10px; color: var(--accent-rain); font-weight: bold; margin-left: 4px;">${prob}%</span>`;
      }

      // Calculate width and position for temperature bar
      const leftPercent = ((dayMin - globalMin) / globalRange) * 100;
      const widthPercent = ((dayMax - dayMin) / globalRange) * 100;

      // Color based on temperature (cooler = blueish, hotter = orange/red)
      let barColor = 'var(--accent-orange)';
      if (dayMax < 0) barColor = 'var(--accent-blue)';
      else if (dayMax < 15) barColor = 'var(--accent-teal)';
      else if (dayMax > 28) barColor = 'var(--accent-red)';

      const barStyle = `left: ${leftPercent}%; width: ${widthPercent}%; background-color: ${barColor};`;

      const row = document.createElement('div');
      row.className = 'forecast-row';
      row.innerHTML = `
        <span class="forecast-day">${dayName}</span>
        <div class="forecast-icon-wrapper" style="width: 48px; display: flex; align-items: center; justify-content: center;">
          <span class="forecast-icon">${info.icon}</span>
          ${rainInfo}
        </div>
        <div class="forecast-bar-container">
          <span class="forecast-temp min">${minT}</span>
          <div class="forecast-bar">
            <div class="forecast-bar-fill" style="${barStyle}"></div>
          </div>
          <span class="forecast-temp max">${maxT}</span>
        </div>
      `;
      container.appendChild(row);
    }
  },

  renderDetailsGrid(hourlyData, dailyData, currentIdx) {
    const sunriseVal = document.getElementById('details-sunrise');
    const sunsetVal = document.getElementById('details-sunset');
    const windSpeed = document.getElementById('details-wind-speed');
    const windDir = document.getElementById('details-wind-dir');
    const humidity = document.getElementById('details-humidity');
    const dewPoint = document.getElementById('details-dew-point');
    const uvIndex = document.getElementById('details-uv-index');
    const uvDesc = document.getElementById('details-uv-desc');
    const visibility = document.getElementById('details-visibility');
    const visibilityDesc = document.getElementById('details-visibility-desc');

    // Sunrise & Sunset
    if (sunriseVal) sunriseVal.textContent = formatTime(dailyData.sunrise[0]);
    if (sunsetVal) sunsetVal.textContent = `Zachód: ${formatTime(dailyData.sunset[0])}`;

    // Wind speed & Cardinal direction
    const speed = Math.round(hourlyData.windspeed_10m[currentIdx]);
    const dirDeg = hourlyData.winddirection_10m[currentIdx];
    if (windSpeed) windSpeed.textContent = `${speed} km/h`;
    if (windDir) windDir.textContent = degreesToCardinal(dirDeg);

    // Humidity
    const hum = hourlyData.relativehumidity_2m[currentIdx];
    if (humidity) humidity.textContent = `${hum}%`;
    
    // Dew Point estimation: T_d = T - ((100 - RH)/5)
    const t = hourlyData.temperature_2m[currentIdx];
    const dp = Math.round(t - ((100 - hum) / 5));
    if (dewPoint) dewPoint.textContent = `Punkt rosy ${dp}°`;

    // UV Index
    const uv = Math.round(hourlyData.uv_index[currentIdx]);
    if (uvIndex) {
      uvIndex.textContent = uv;
      uvIndex.style.color = uvColor(uv);
    }
    
    let uvText = 'Niski';
    if (uv > 2) uvText = 'Umiarkowany';
    if (uv > 5) uvText = 'Wysoki';
    if (uv > 7) uvText = 'Bardzo wysoki';
    if (uv > 10) uvText = 'Ekstremalny';
    if (uvDesc) uvDesc.textContent = uvText;

    // Visibility
    const visMeters = hourlyData.visibility[currentIdx]; // in meters
    const visKm = Math.round(visMeters / 1000);
    if (visibility) visibility.textContent = `${visKm} km`;
    
    let visText = 'Dobra';
    if (visKm < 1) visText = 'Bardzo słaba';
    else if (visKm < 4) visText = 'Słaba';
    else if (visKm < 10) visText = 'Umiarkowana';
    if (visibilityDesc) visibilityDesc.textContent = visText;
  },

  renderDots(cities, activeIndex, onSelect) {
    const container = document.getElementById('dots-container');
    if (!container) return;
    container.innerHTML = '';

    if (!cities || cities.length === 0) return;

    const track = document.createElement('div');
    track.className = 'city-pager-track';

    cities.forEach((city, index) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = `city-pager-item ${index === activeIndex ? 'active' : ''}`;
      item.setAttribute('aria-label', `Pokaż miasto ${city.name}`);
      item.textContent = city.isGps && city.subtitle && city.subtitle !== 'Brak uprawnień GPS'
        ? city.subtitle
        : city.name;
      item.addEventListener('click', () => {
        if (index !== activeIndex && typeof onSelect === 'function') {
          onSelect(index);
        }
      });
      track.appendChild(item);
    });

    container.appendChild(track);

    const activeItem = track.querySelector('.city-pager-item.active');
    if (activeItem) {
      requestAnimationFrame(() => {
        activeItem.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      });
    }
  },

  // 2. Ekran 2 — Moje Miasta View
  renderCityList(cities, weatherMap, prefs, activeIndex, onSelect, onDelete) {
    const listContainer = document.getElementById('city-list-container');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    cities.forEach((city, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = `city-card-wrapper ${index === activeIndex ? 'active' : ''}`;

      const card = document.createElement('button');
      card.className = 'city-card';
      card.setAttribute('aria-pressed', index === activeIndex ? 'true' : 'false');

      // Load card values if weather is cached/fetched
      const weather = weatherMap.get(city.id);
      
      let subtitle = city.admin1 ? `${city.admin1}, ${city.country_code}` : (city.country_code || '');
      if (city.isGps) {
        subtitle = city.subtitle || 'Wyszukiwanie lokalizacji...';
      }

      let cardWeatherHtml = '';
      if (city.isGps && (city.latitude === null || city.longitude === null)) {
        // GPS active but coords not ready
        cardWeatherHtml = `
          <div class="skeleton-loader" style="width: 80px; height: 32px;">
            <div class="skeleton-item" style="width: 100%; height: 100%;"></div>
          </div>
        `;
      } else if (weather && !weather.error) {
        const curIdx = getCurrentHourIndex(weather.hourly.time);
        const tempVal = formatTemp(weather.hourly.temperature_2m[curIdx], prefs.unit);
        const code = weather.hourly.weathercode[curIdx];
        const isDay = weather.hourly.is_day[curIdx];
        const info = getWeatherInfo(code, isDay);

        cardWeatherHtml = `
          <span class="city-card-temp">${tempVal}</span>
          <span class="city-card-icon" aria-hidden="true">${info.icon}</span>
        `;
      } else if (weather && weather.error) {
        cardWeatherHtml = `<span class="city-card-subtitle" style="color: var(--accent-red)">Błąd danych</span>`;
      } else {
        // Spinner or loading
        cardWeatherHtml = `
          <div class="skeleton-loader" style="width: 60px; height: 30px;">
            <div class="skeleton-item" style="width: 100%; height: 100%;"></div>
          </div>
        `;
      }

      const gpsMarker = city.isGps ? '<span class="city-card-gps-icon">📍</span>' : '';

      card.innerHTML = `
        <div class="city-card-info">
          ${gpsMarker}
          <div class="city-card-names">
            <span class="city-card-title">${city.name}${index === activeIndex ? ' <span class="city-card-active-label">Teraz</span>' : ''}</span>
            <span class="city-card-subtitle">${subtitle}</span>
          </div>
        </div>
        <div class="city-card-weather">
          ${cardWeatherHtml}
        </div>
      `;

      // Tap card action -> change active city & go to Ekran 1
      card.addEventListener('click', (e) => {
        // Prevent click if we are currently swiped to show delete
        if (wrapper.classList.contains('swiped')) {
          wrapper.classList.remove('swiped');
          return;
        }
        onSelect(index);
      });

      wrapper.appendChild(card);

      // Attach Swipe-to-Delete handlers (excluding GPS location card)
      if (!city.isGps) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'city-card-delete';
        deleteBtn.innerHTML = `
          <span class="material-symbols-outlined">delete</span>
          <span>Usuń</span>
        `;
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          onDelete(index);
        });

        wrapper.appendChild(deleteBtn);

        // Touch event swipe tracking
        let startX = 0;
        let startY = 0;
        const swipeThreshold = 50;

        card.addEventListener('touchstart', (e) => {
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
        }, { passive: true });

        card.addEventListener('touchend', (e) => {
          const deltaX = startX - e.changedTouches[0].clientX;
          const deltaY = Math.abs(startY - e.changedTouches[0].clientY);

          // If horizontal swipe, ignore vertical scrolling
          if (deltaY < 30) {
            if (deltaX > swipeThreshold) {
              // Swipe left -> reveal delete button
              // Remove swiped state from all other items first
              document.querySelectorAll('.city-card-wrapper').forEach(w => {
                if (w !== wrapper) w.classList.remove('swiped');
              });
              wrapper.classList.add('swiped');
            } else if (deltaX < -swipeThreshold) {
              // Swipe right -> hide delete button
              wrapper.classList.remove('swiped');
            }
          }
        }, { passive: true });
      }

      listContainer.appendChild(wrapper);
    });

    if (cities.filter(city => !city.isGps).length === 0) {
      const note = document.createElement('div');
      note.className = 'city-list-empty-note';
      note.textContent = 'Dodane miasta pojawią się tutaj.';
      listContainer.appendChild(note);
    }
  },

  // 3. Ekran 3 — Wyszukiwanie View
  renderSearchResults(results, savedCities, onAddCity, options = {}) {
    const resultsContainer = document.getElementById('search-results-list');
    const stateContainer = document.getElementById('search-state-container');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = '';
    
    if (stateContainer) {
      stateContainer.classList.add('hidden');
    }

    if (!results || results.length === 0) {
      if (stateContainer) {
        stateContainer.classList.remove('hidden');
        const isPrompt = options.emptyMode === 'prompt';
        stateContainer.innerHTML = isPrompt
          ? `
            <span class="material-symbols-outlined state-icon">travel_explore</span>
            <span class="state-title">Wpisz nazwę miasta</span>
            <span class="state-desc">Wyniki pojawią się po wpisaniu co najmniej dwóch znaków.</span>
          `
          : `
            <span class="material-symbols-outlined state-icon">search_off</span>
            <span class="state-title">Brak wyników</span>
            <span class="state-desc">Nie znaleziono miast pasujących do zapytania.</span>
          `;
      }
      return;
    }

    results.forEach(res => {
      const isAlreadyAdded = savedCities.some(c => c.id === res.id);
      
      const item = document.createElement('li');
      item.className = 'search-result-item';
      if (isAlreadyAdded) item.classList.add('already-added');
      
      const details = res.admin1 ? `${res.admin1}, ${res.country}` : res.country;

      item.innerHTML = `
        <div class="search-result-info">
          <span class="search-result-name">${res.name}</span>
          <span class="search-result-details">${details}</span>
        </div>
        <button class="search-result-add-btn" aria-label="Dodaj ${res.name}" ${isAlreadyAdded ? 'disabled' : ''}>
          <span class="material-symbols-outlined">${isAlreadyAdded ? 'done' : 'add'}</span>
        </button>
      `;

      item.addEventListener('click', () => {
        if (!isAlreadyAdded) onAddCity(res);
      });

      resultsContainer.appendChild(item);
    });
  },

  // Skeleton Loader screen toggle
  showSkeleton(visible) {
    const mainContent = document.getElementById('weather-content-wrapper');
    const skeleton = document.getElementById('weather-skeleton-wrapper');
    if (!mainContent || !skeleton) return;

    if (visible) {
      mainContent.classList.add('hidden');
      skeleton.classList.remove('hidden');
    } else {
      mainContent.classList.remove('hidden');
      skeleton.classList.add('hidden');
    }
  },

  // Spinner inside geocoding input
  setSearchLoading(visible) {
    const spinner = document.getElementById('search-input-spinner');
    if (spinner) {
      spinner.style.display = visible ? 'block' : 'none';
    }
  },

  // Global Toast Messages
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    container.innerHTML = `
      <div class="toast ${type}">
        <span class="material-symbols-outlined">
          ${type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info'}
        </span>
        <span>${message}</span>
      </div>
    `;

    container.classList.add('visible');

    // Auto dismiss after 3 seconds
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      container.classList.remove('visible');
    }, 3000);
  },

  // Offline warnings (Removed by user request)
  showOfflineBanner(visible) {
    // Stub to prevent errors since the banner HTML was removed
  }
};
