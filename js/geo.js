/**
 * Geolocation and Geocoding Utility Module.
 */

const Geo = {
  // Fetches current GPS coordinates
  async getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('GPS niedostępny'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos => resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        }),
        err => reject(err),
        { timeout: 10000, maximumAge: 300000 } // cache GPS for 5 mins
      );
    });
  },

  // Reverse geocodes coordinates to a city name
  async reverseGeocode(lat, lon) {
    try {
      const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=pl`);
      if (!response.ok) throw new Error('API error');
      const data = await response.json();
      return data.city || data.locality || data.principalSubdivision || null;
    } catch (e) {
      console.warn('Reverse geocoding failed, using default label.', e);
      return null;
    }
  },

  // Calculate distance between two coordinate sets in km (Haversine formula)
  gpsDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
};

// Global helper matching the spec signature
function gpsDistance(lat1, lon1, lat2, lon2) {
  return Geo.gpsDistance(lat1, lon1, lat2, lon2);
}

// Pseudo-city representing active GPS location
const GPS_CITY = {
  id: 'gps',
  name: 'Poznań',
  subtitle: 'Wielkopolskie, Polska', // to be populated by reverse geocoding (e.g. "Poznań")
  latitude: 52.4064, // to be populated on start
  longitude: 16.9252,
  isGps: true
};
