/**
 * Main PWA Controller and State Manager.
 */

const App = {
  state: {
    cities: [],             // Saved cities (always starts with GPS_CITY at index 0)
    activeCityIndex: 0,     // Index of currently displayed city
    weatherMap: new Map(),  // city.id -> weatherData
    currentView: 'weather', // 'weather' | 'city-list' | 'search'
    prefs: {
      unit: 'C'             // 'C' | 'F'
    }
  },

  gpsState: {
    loading: false,
    error: null
  },

  async init() {
    console.log('Initializing WeatherPWA...');

    // 1. Load preferences and saved cities
    this.loadStateFromStorage();

    // 2. Initial view setup
    UI.showScreen(this.state.currentView);
    UI.showSkeleton(true);
    this.updateDotsIndicator();

    // 3. Register Event Listeners
    this.bindEvents();

    // 4. Register PWA Service Worker
    if (typeof PWA !== 'undefined') {
      PWA.register();
    }

    // 5. Initialize Geolocation (non-blocking)
    this.initGPS();

    // 6. Fetch weather for all cities
    // Force GPS fetch without waiting since we mocked it with Poznan
    if (GPS_CITY.latitude) {
      await this.fetchWeatherForCity(GPS_CITY);
    }
    await this.refreshAll();

    // 7. Hide skeleton loading screen
    UI.showSkeleton(false);

    // 8. Auto-refresh checks on wake-up
    this.bindLifecycleEvents();
  },

  loadStateFromStorage() {
    // Load prefs
    const savedPrefs = Storage.get('wpwa_prefs');
    this.state.prefs.unit = 'C'; // Force Celsius
    if (savedPrefs) {
      this.state.activeCityIndex = savedPrefs.activeCityIndex || 0;
    }

    // Load cities list (excluding GPS_CITY, which is initialized fresh)
    const savedCities = Storage.get('wpwa_cities', []);
    
    // Always insert GPS_CITY as the first item
    this.state.cities = [GPS_CITY];

    // Append non-GPS cities
    savedCities.forEach((city, index) => {
      city.order = index + 1;
      city.isGps = false;
      this.state.cities.push(city);
    });

    // Handle out-of-bounds active index
    if (this.state.activeCityIndex >= this.state.cities.length) {
      this.state.activeCityIndex = 0;
    }
  },

  saveStateToStorage() {
    // Save prefs (temp unit + active index)
    Storage.set('wpwa_prefs', {
      activeCityIndex: this.state.activeCityIndex,
      unit: this.state.prefs.unit
    });

    // Save non-GPS cities
    const citiesToSave = this.state.cities.filter(c => !c.isGps);
    Storage.set('wpwa_cities', citiesToSave);
  },

  async initGPS(forceRetry = false) {
    if (this.gpsState.loading) return;
    this.gpsState.loading = true;
    this.gpsState.error = null;
    
    console.log('Requesting GPS location...');

    try {
      // 10-second timeout wrapper for Geolocation API
      const posPromise = Geo.getCurrentPosition();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('GPS timeout')), 10000)
      );

      const coords = await Promise.race([posPromise, timeoutPromise]);
      
      console.log('GPS coordinates acquired:', coords);
      GPS_CITY.latitude = coords.latitude;
      GPS_CITY.longitude = coords.longitude;

      // Save GPS coordinates to a fallback key in localStorage
      Storage.set('wpwa_last_known_gps', {
        latitude: coords.latitude,
        longitude: coords.longitude,
        timestamp: Date.now()
      });

      // Query reverse geocoding to find city name
      const citySubtitle = await Geo.reverseGeocode(coords.latitude, coords.longitude);
      if (citySubtitle) {
        GPS_CITY.subtitle = citySubtitle;
        console.log(`GPS city identified as: ${citySubtitle}`);
      } else {
        GPS_CITY.subtitle = 'Lokalizacja GPS';
      }

      this.gpsState.loading = false;

      // Fetch weather specifically for GPS city now that coordinates are ready
      await this.fetchWeatherForCity(GPS_CITY);

      // If active city is GPS, rerender weather screen immediately
      if (this.state.activeCityIndex === 0) {
        this.renderActiveWeather();
      }

      // Rerender city list to show updated temperature & name
      if (this.state.currentView === 'city-list') {
        this.renderCitiesList();
      }

    } catch (err) {
      console.warn('GPS lookup failed:', err.message);
      this.gpsState.loading = false;
      this.gpsState.error = err.message;

      // Fallback: Check if we have last known GPS coordinates in storage
      const lastKnownGps = Storage.get('wpwa_last_known_gps');
      if (lastKnownGps) {
        console.log('Using last known GPS coordinates from cache...');
        GPS_CITY.latitude = lastKnownGps.latitude;
        GPS_CITY.longitude = lastKnownGps.longitude;
        GPS_CITY.subtitle = 'Ostatnia lokalizacja';
        
        UI.showToast('Użyto ostatniej znanej lokalizacji GPS', 'info');

        await this.fetchWeatherForCity(GPS_CITY);
        if (this.state.activeCityIndex === 0) {
          this.renderActiveWeather();
        }
      } else {
        GPS_CITY.subtitle = 'Brak uprawnień GPS';
      }

      if (this.state.currentView === 'city-list') {
        this.renderCitiesList();
      }
    }
  },

  async fetchWeatherForCity(city) {
    try {
      const weather = await API.fetchWeather(city);
      this.state.weatherMap.set(city.id, weather);
    } catch (e) {
      console.error(`Could not fetch weather for ${city.name}:`, e);
    }
  },

  async refreshAll() {
    console.log('Refreshing weather for all cities...');
    
    // We only fetch cities that have coordinates ready
    const citiesToFetch = this.state.cities.filter(c => c.latitude !== null && c.longitude !== null);
    
    const freshWeatherMap = await API.fetchAllCities(citiesToFetch);
    
    // Update local map and check if we have any successful fetches
    let hasSuccess = false;
    for (const [cityId, data] of freshWeatherMap.entries()) {
      this.state.weatherMap.set(cityId, data);
      if (data && !data.error) {
        hasSuccess = true;
      }
    }

    this.renderActiveWeather();
    
    // If we have fallback data from cache because we are offline, inform user
    const activeCity = this.state.cities[this.state.activeCityIndex];
    const activeWeather = this.state.weatherMap.get(activeCity.id);
    if (activeWeather && activeWeather.meta && activeWeather.meta.isFallback) {
      const timeString = new Date(activeWeather.meta.fetchedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      UI.showToast(`Brak sieci. Pokazuję dane z ${timeString}`, 'info');
    }
  },

  renderActiveWeather() {
    const activeCity = this.state.cities[this.state.activeCityIndex];
    const weatherData = this.state.weatherMap.get(activeCity.id);

    if (weatherData && !weatherData.error) {
      UI.showSkeleton(false);
      UI.renderWeatherScreen(activeCity, weatherData, this.state.prefs);
    } else {
      // Show skeleton loader or welcome/error screen
      if (activeCity.isGps && activeCity.latitude === null) {
        UI.showSkeleton(true);
      } else {
        UI.showSkeleton(false);
        this.renderWelcomeScreen();
      }
    }
  },

  renderWelcomeScreen() {
    const container = document.getElementById('weather-content-wrapper');
    if (!container) return;
    
    UI.setBackground(0, true); // Set default sunny gradient
    
    const activeCity = this.state.cities[this.state.activeCityIndex];
    const title = activeCity.isGps ? 'Oczekiwanie na GPS' : activeCity.name;
    const desc = activeCity.isGps 
      ? 'Dostęp do lokalizacji został zablokowany lub upłynął limit czasu. Włącz GPS lub dodaj miasto ręcznie.'
      : 'Nie udało się pobrać danych pogodowych dla tego miasta.';

    container.innerHTML = `
      <div class="state-container fade-in">
        <span class="material-symbols-outlined state-icon">cloud_off</span>
        <span class="state-title">${title}</span>
        <span class="state-desc">${desc}</span>
        ${activeCity.isGps ? `<button class="state-btn" onclick="App.initGPS(true)">Spróbuj ponownie</button>` : ''}
      </div>
    `;
  },

  renderCitiesList() {
    UI.renderCityList(
      this.state.cities, 
      this.state.weatherMap, 
      this.state.prefs, 
      this.handleSelectCity.bind(this),
      this.handleDeleteCity.bind(this)
    );

    // If GPS is loading/error, append a retry widget to the GPS card inside the UI renderer.
    // We bind a handler in case GPS is not available.
    if (this.gpsState.error) {
      const gpsRetryBtn = document.querySelector('.city-card-wrapper .city-card-subtitle');
      if (gpsRetryBtn) {
        gpsRetryBtn.innerHTML = `Lokalizacja niedostępna. <span style="text-decoration: underline; color: var(--accent-blue);">Ponów GPS</span>`;
        gpsRetryBtn.parentElement.parentElement.addEventListener('click', (e) => {
          e.stopPropagation();
          this.initGPS(true);
        });
      }
    }
  },

  handleSelectCity(index) {
    this.state.activeCityIndex = index;
    this.saveStateToStorage();
    this.renderActiveWeather();
    this.updateDotsIndicator();
    this.navigateTo('weather');
  },

  handleDeleteCity(index) {
    const deletedCity = this.state.cities[index];
    this.state.cities.splice(index, 1);
    
    // Cleanup cache key
    Storage.remove(`wpwa_weather_${deletedCity.id}`);

    // Update active index
    if (this.state.activeCityIndex >= this.state.cities.length) {
      this.state.activeCityIndex = this.state.cities.length - 1;
    }
    
    this.saveStateToStorage();
    UI.showToast(`Usunięto ${deletedCity.name}`, 'success');
    this.renderCitiesList();
    this.updateDotsIndicator();
  },

  handleAddCity(result) {
    // 1. Check duplicate
    const isDuplicate = App.state.cities.some(c => c.id === result.id);
    if (isDuplicate) {
      UI.showToast('To miasto już masz na liście', 'error');
      return;
    }

    // 2. Map structure
    const newCity = {
      id: result.id,
      name: result.name,
      country_code: result.country_code || '',
      admin1: result.admin1 || '',
      latitude: result.latitude,
      longitude: result.longitude,
      isGps: false,
      order: App.state.cities.length
    };

    App.state.cities.push(newCity);
    App.state.activeCityIndex = App.state.cities.length - 1; // Make it active
    App.saveStateToStorage();

    // Navigate immediately to refresh and download weather data
    App.navigateTo('weather');
    UI.showSkeleton(true);
    
    App.fetchWeatherForCity(newCity).then(() => {
      UI.showSkeleton(false);
      App.renderActiveWeather();
      App.updateDotsIndicator();
    });
  },

  updateDotsIndicator() {
    UI.renderDots(this.state.cities.length, this.state.activeCityIndex);
  },

  navigateTo(view) {
    this.state.currentView = view;
    UI.showScreen(view);

    if (view === 'city-list') {
      this.renderCitiesList();
    } else if (view === 'search') {
      const searchInput = document.getElementById('city-search-input');
      const resultsContainer = document.getElementById('search-results-list');
      if (searchInput) {
        searchInput.value = '';
        setTimeout(() => searchInput.focus(), 150);
      }
      if (resultsContainer) resultsContainer.innerHTML = '';
      UI.renderSearchResults([], [], () => {}, { emptyMode: 'prompt' });
    }
  },

  bindEvents() {
    // Bottom Navigation Bar
    const navWeatherBtn = document.getElementById('nav-weather');
    if (navWeatherBtn) {
      navWeatherBtn.addEventListener('click', () => {
        this.navigateTo('weather');
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        navWeatherBtn.classList.add('active');
      });
    }

    const navCitiesBtn = document.getElementById('nav-cities');
    if (navCitiesBtn) {
      navCitiesBtn.addEventListener('click', () => {
        this.navigateTo('city-list');
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        navCitiesBtn.classList.add('active');
      });
    }

    const navAddCityBtn = document.getElementById('nav-add-city');
    if (navAddCityBtn) {
      navAddCityBtn.addEventListener('click', () => {
        this.navigateTo('search');
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        navAddCityBtn.classList.add('active');
      });
    }

    // Header Back buttons
    const backToWeatherBtn = document.getElementById('btn-back-to-weather');
    if (backToWeatherBtn) {
      backToWeatherBtn.addEventListener('click', () => {
        this.navigateTo('weather');
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const navWeather = document.getElementById('nav-weather');
        if (navWeather) navWeather.classList.add('active');
      });
    }

    const cancelSearchBtn = document.getElementById('btn-cancel-search');
    if (cancelSearchBtn) {
      cancelSearchBtn.addEventListener('click', () => {
        this.navigateTo('weather');
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const navWeather = document.getElementById('nav-weather');
        if (navWeather) navWeather.classList.add('active');
      });
    }

    // Temp Unit Switcher in Header removed to keep Celsius permanent.

    // Live search geocoding handler with 400ms debounce
    const searchInput = document.getElementById('city-search-input');
    let searchTimeout = null;
    
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value;
        if (searchTimeout) clearTimeout(searchTimeout);

        if (query.trim().length < 2) {
          UI.renderSearchResults([], [], () => {}, { emptyMode: 'prompt' });
          return;
        }

        UI.setSearchLoading(true);
        searchTimeout = setTimeout(async () => {
          try {
            const results = await API.searchCity(query);
            UI.renderSearchResults(results, this.state.cities, this.handleAddCity);
          } catch (err) {
            UI.showToast('Błąd pobierania wyników geokodowania', 'error');
          } finally {
            UI.setSearchLoading(false);
          }
        }, 400);
      });
    }

    // Swipe switching on Weather Screen (Horizontal Swipe delta > 50px)
    const weatherScreen = document.getElementById('screen-weather');
    let touchStartX = 0;
    let touchStartY = 0;
    const swipeMinDelta = 50;

    if (weatherScreen) {
      weatherScreen.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }, { passive: true });

      weatherScreen.addEventListener('touchend', (e) => {
        const deltaX = touchStartX - e.changedTouches[0].clientX;
        const deltaY = Math.abs(touchStartY - e.changedTouches[0].clientY);

        // Ignore swipe if we are inside scrollable hourly container (to allow local scrolling)
        const isHourlyScroll = e.target.closest('#hourly-scroll-container');
        if (isHourlyScroll) return;

        // Verify it was mostly a horizontal gesture (low vertical slope)
        if (deltaY < 50) {
          if (deltaX > swipeMinDelta) {
            // Swiped left -> show next city
            if (this.state.activeCityIndex < this.state.cities.length - 1) {
              this.handleSelectCity(this.state.activeCityIndex + 1);
            }
          } else if (deltaX < -swipeMinDelta) {
            // Swiped right -> show previous city
            if (this.state.activeCityIndex > 0) {
              this.handleSelectCity(this.state.activeCityIndex - 1);
            }
          }
        }
      }, { passive: true });
    }
  },

  bindLifecycleEvents() {
    window.addEventListener('online', () => {
      this.refreshAll();
    });

    // visibilitychange: check if gone for > 5 minutes (300_000ms), and auto-refresh
    let lastActiveTime = Date.now();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const goneTime = Date.now() - lastActiveTime;
        if (goneTime > 300000) {
          console.log(`App resumed after ${Math.round(goneTime / 1000)}s. Refreshing...`);
          this.refreshAll();
          this.initGPS();
        }
      } else {
        lastActiveTime = Date.now();
      }
    });
  }
};

// Start application
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
