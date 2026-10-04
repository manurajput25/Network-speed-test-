export interface WeatherInfo {
  temperatureC: number;
  temperatureF: number;
  weatherCode: number;
  condition: string;
  icon: string;
}

export interface ResolvedLocation {
  city: string;
  region?: string;
  country: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  weather?: WeatherInfo;
  source: 'gps' | 'ip' | 'timezone';
  formatted: string;
}

const STORAGE_KEY = 'velocitynet_accurate_location';

/**
 * Common timezone to country/city and approximate coordinates
 */
function getLocationFromTimezone(): {
  city: string;
  country: string;
  countryCode: string;
  lat: number;
  lon: number;
} {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta') {
      return { city: 'New Delhi', country: 'India', countryCode: 'IN', lat: 28.6139, lon: 77.209 };
    }
    if (tz === 'America/New_York') return { city: 'New York', country: 'United States', countryCode: 'US', lat: 40.7128, lon: -74.006 };
    if (tz === 'America/Chicago') return { city: 'Chicago', country: 'United States', countryCode: 'US', lat: 41.8781, lon: -87.6298 };
    if (tz === 'America/Los_Angeles') return { city: 'California', country: 'United States', countryCode: 'US', lat: 34.0522, lon: -118.2437 };
    if (tz === 'Europe/London') return { city: 'London', country: 'United Kingdom', countryCode: 'GB', lat: 51.5074, lon: -0.1278 };
    if (tz === 'Europe/Paris') return { city: 'Paris', country: 'France', countryCode: 'FR', lat: 48.8566, lon: 2.3522 };
    if (tz === 'Asia/Dubai') return { city: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE', lat: 25.2048, lon: 55.2708 };
    if (tz === 'Asia/Singapore') return { city: 'Singapore', country: 'Singapore', countryCode: 'SG', lat: 1.3521, lon: 103.8198 };
    if (tz === 'Asia/Tokyo') return { city: 'Tokyo', country: 'Japan', countryCode: 'JP', lat: 35.6762, lon: 139.6503 };
    if (tz === 'Australia/Sydney') return { city: 'Sydney', country: 'Australia', countryCode: 'AU', lat: -33.8688, lon: 151.2093 };

    const parts = tz.split('/');
    if (parts.length >= 2) {
      const city = parts[parts.length - 1].replace(/_/g, ' ');
      const country = parts[0].replace(/_/g, ' ');
      return { city, country, countryCode: '', lat: 20.0, lon: 77.0 };
    }
  } catch {
    // Ignore
  }
  return { city: 'Global Node', country: 'Global', countryCode: '', lat: 1.3521, lon: 103.8198 };
}

function parseWeatherCode(code: number): { condition: string; icon: string } {
  if (code === 0) return { condition: 'Clear Sky', icon: '☀️' };
  if (code === 1 || code === 2) return { condition: 'Partly Cloudy', icon: '⛅' };
  if (code === 3) return { condition: 'Overcast', icon: '☁️' };
  if (code === 45 || code === 48) return { condition: 'Foggy', icon: '🌫️' };
  if (code >= 51 && code <= 67) return { condition: 'Rain', icon: '🌧️' };
  if (code >= 71 && code <= 77) return { condition: 'Snow', icon: '❄️' };
  if (code >= 80 && code <= 82) return { condition: 'Showers', icon: '🌦️' };
  if (code >= 95 && code <= 99) return { condition: 'Thunderstorm', icon: '⛈️' };
  return { condition: 'Fair Weather', icon: '🌤️' };
}

/**
 * Fetches real-time ambient temperature and weather from Open-Meteo
 */
export async function fetchLocationWeather(lat: number, lon: number): Promise<WeatherInfo | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=temperature_2m,weather_code`,
      { cache: 'no-store' }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.current && typeof data.current.temperature_2m === 'number') {
        const tempC = Math.round(data.current.temperature_2m * 10) / 10;
        const tempF = Math.round(((tempC * 9) / 5 + 32) * 10) / 10;
        const code = data.current.weather_code ?? 0;
        const { condition, icon } = parseWeatherCode(code);
        return {
          temperatureC: tempC,
          temperatureF: tempF,
          weatherCode: code,
          condition,
          icon,
        };
      }
    }
  } catch {
    // Ignore weather fetch error
  }
  return null;
}

/**
 * Returns instant synchronous cached or timezone location
 */
export function getInitialLocation(): ResolvedLocation {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.formatted) return parsed;
      }
    } catch {}
  }

  const tz = getLocationFromTimezone();
  const formatted = tz.city && tz.city !== tz.country ? `${tz.city}, ${tz.country}` : tz.country;

  return {
    city: tz.city,
    country: tz.country,
    countryCode: tz.countryCode,
    latitude: tz.lat,
    longitude: tz.lon,
    source: 'timezone',
    formatted,
  };
}

/**
 * Fetches high-accuracy IP location with cross-validation against timezone
 * and attaches live ambient temperature.
 */
export async function fetchAccurateLocation(): Promise<ResolvedLocation> {
  const tzLoc = getLocationFromTimezone();
  const tzName = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '';
  const isIndiaTz = tzName === 'Asia/Kolkata' || tzName === 'Asia/Calcutta';

  let lat = tzLoc.lat;
  let lon = tzLoc.lon;
  let resolved: ResolvedLocation | null = null;

  // 1. Try ipwho.is (direct client call)
  try {
    const res = await fetch('https://ipwho.is/', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        // If API says Singapore/other foreign country but user is in India timezone, disregard CDN artifact
        if (isIndiaTz && data.country_code !== 'IN') {
          // Discard
        } else {
          const city = data.city || '';
          const region = data.region || '';
          const country = data.country || '';
          const countryCode = data.country_code || '';
          const formatted = city && country ? (city !== country ? `${city}, ${country}` : country) : country || tzLoc.city;

          if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
            lat = data.latitude;
            lon = data.longitude;
          }

          resolved = {
            city: city || tzLoc.city,
            region,
            country: country || tzLoc.country,
            countryCode,
            latitude: lat,
            longitude: lon,
            source: 'ip',
            formatted,
          };
        }
      }
    }
  } catch {}

  // 2. Try freeipapi.com if not resolved yet
  if (!resolved) {
    try {
      const res = await fetch('https://freeipapi.com/api/json', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.countryName) {
          if (isIndiaTz && data.countryCode !== 'IN') {
            // Discard
          } else {
            const city = data.cityName || '';
            const region = data.regionName || '';
            const country = data.countryName || '';
            const countryCode = data.countryCode || '';
            const formatted = city && country ? (city !== country ? `${city}, ${country}` : country) : country;

            if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
              lat = data.latitude;
              lon = data.longitude;
            }

            resolved = {
              city: city || tzLoc.city,
              region,
              country: country || tzLoc.country,
              countryCode,
              latitude: lat,
              longitude: lon,
              source: 'ip',
              formatted,
            };
          }
        }
      }
    } catch {}
  }

  // 3. Fallback to timezone verified location
  if (!resolved) {
    resolved = {
      city: tzLoc.city,
      country: tzLoc.country,
      countryCode: tzLoc.countryCode,
      latitude: tzLoc.lat,
      longitude: tzLoc.lon,
      source: 'timezone',
      formatted: tzLoc.city && tzLoc.city !== tzLoc.country ? `${tzLoc.city}, ${tzLoc.country}` : tzLoc.country,
    };
  }

  // Fetch live ambient temperature for the resolved coordinates
  try {
    const weather = await fetchLocationWeather(resolved.latitude ?? lat, resolved.longitude ?? lon);
    if (weather) {
      resolved.weather = weather;
    }
  } catch {}

  saveLocation(resolved);
  return resolved;
}

/**
 * Triggers browser GPS / Wi-Fi Geolocation for exact town/city reverse geocoding
 * and retrieves exact local weather temperature.
 */
export async function requestBrowserGeolocation(): Promise<ResolvedLocation> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new Error('Geolocation API not supported by browser');
  }

  return new Promise<ResolvedLocation>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let resultLoc: ResolvedLocation | null = null;

        try {
          // BigDataCloud client reverse geocoding
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          if (res.ok) {
            const data = await res.json();
            const city = data.locality || data.city || data.principalSubdivision || '';
            const region = data.principalSubdivision || '';
            const country = data.countryName || '';
            const countryCode = data.countryCode || '';

            const parts = [city, region, country].filter(Boolean);
            const uniqueParts = Array.from(new Set(parts));
            const formatted = uniqueParts.join(', ');

            resultLoc = {
              city: city || uniqueParts[0] || 'Local Area',
              region,
              country: country || 'Detected',
              countryCode,
              latitude,
              longitude,
              source: 'gps',
              formatted,
            };
          }
        } catch {
          // Continue to fallback
        }

        if (!resultLoc) {
          resultLoc = getInitialLocation();
          resultLoc.source = 'gps';
          resultLoc.latitude = latitude;
          resultLoc.longitude = longitude;
        }

        // Fetch live weather temperature for exact GPS location
        try {
          const weather = await fetchLocationWeather(latitude, longitude);
          if (weather) {
            resultLoc.weather = weather;
          }
        } catch {}

        saveLocation(resultLoc);
        resolve(resultLoc);
      },
      (err) => {
        reject(err);
      },
      { timeout: 8000, enableHighAccuracy: true, maximumAge: 60000 }
    );
  });
}

function saveLocation(loc: ResolvedLocation) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    } catch {}
  }
}
