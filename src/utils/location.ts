export interface ResolvedLocation {
  city: string;
  region?: string;
  country: string;
  countryCode?: string;
  source: 'gps' | 'ip' | 'timezone';
  formatted: string;
}

const STORAGE_KEY = 'velocitynet_accurate_location';

/**
 * Common timezone to country/city mappings for instant accurate resolution
 */
function getLocationFromTimezone(): { city: string; country: string; countryCode: string } {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta') {
      return { city: 'India', country: 'India', countryCode: 'IN' };
    }
    if (tz === 'America/New_York') return { city: 'New York', country: 'United States', countryCode: 'US' };
    if (tz === 'America/Chicago') return { city: 'Chicago', country: 'United States', countryCode: 'US' };
    if (tz === 'America/Los_Angeles') return { city: 'California', country: 'United States', countryCode: 'US' };
    if (tz === 'Europe/London') return { city: 'London', country: 'United Kingdom', countryCode: 'GB' };
    if (tz === 'Europe/Paris') return { city: 'Paris', country: 'France', countryCode: 'FR' };
    if (tz === 'Asia/Dubai') return { city: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE' };
    if (tz === 'Asia/Singapore') return { city: 'Singapore', country: 'Singapore', countryCode: 'SG' };
    if (tz === 'Asia/Tokyo') return { city: 'Tokyo', country: 'Japan', countryCode: 'JP' };
    if (tz === 'Australia/Sydney') return { city: 'Sydney', country: 'Australia', countryCode: 'AU' };

    const parts = tz.split('/');
    if (parts.length >= 2) {
      const city = parts[parts.length - 1].replace(/_/g, ' ');
      const country = parts[0].replace(/_/g, ' ');
      return { city, country, countryCode: '' };
    }
  } catch {
    // Ignore
  }
  return { city: 'Global Node', country: 'Global', countryCode: '' };
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
    source: 'timezone',
    formatted,
  };
}

/**
 * Fetches high-accuracy IP location with cross-validation against timezone
 */
export async function fetchAccurateLocation(): Promise<ResolvedLocation> {
  const tzLoc = getLocationFromTimezone();
  const tzName = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '';
  const isIndiaTz = tzName === 'Asia/Kolkata' || tzName === 'Asia/Calcutta';

  // 1. Try ipwho.is (direct client call)
  try {
    const res = await fetch('https://ipwho.is/', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        // If API says Singapore but user is in India timezone, disregard Singapore CDN artifact
        if (isIndiaTz && data.country_code !== 'IN') {
          // Discard
        } else {
          const city = data.city || '';
          const region = data.region || '';
          const country = data.country || '';
          const countryCode = data.country_code || '';
          const formatted = city && country ? (city !== country ? `${city}, ${country}` : country) : country || tzLoc.city;

          const result: ResolvedLocation = {
            city: city || tzLoc.city,
            region,
            country: country || tzLoc.country,
            countryCode,
            source: 'ip',
            formatted,
          };
          saveLocation(result);
          return result;
        }
      }
    }
  } catch {}

  // 2. Try freeipapi.com
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

          const result: ResolvedLocation = {
            city: city || tzLoc.city,
            region,
            country: country || tzLoc.country,
            countryCode,
            source: 'ip',
            formatted,
          };
          saveLocation(result);
          return result;
        }
      }
    }
  } catch {}

  // 3. Fallback to timezone verified location
  const result: ResolvedLocation = {
    city: tzLoc.city,
    country: tzLoc.country,
    countryCode: tzLoc.countryCode,
    source: 'timezone',
    formatted: tzLoc.city && tzLoc.city !== tzLoc.country ? `${tzLoc.city}, ${tzLoc.country}` : tzLoc.country,
  };
  saveLocation(result);
  return result;
}

/**
 * Triggers browser GPS / Wi-Fi Geolocation for exact town/city reverse geocoding
 */
export async function requestBrowserGeolocation(): Promise<ResolvedLocation> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new Error('Geolocation API not supported by browser');
  }

  return new Promise<ResolvedLocation>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          // BigDataCloud client reverse geocoding (free, reliable, zero API key required)
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
            // Deduplicate parts (e.g. if city == region)
            const uniqueParts = Array.from(new Set(parts));
            const formatted = uniqueParts.join(', ');

            const result: ResolvedLocation = {
              city: city || uniqueParts[0] || 'Local Area',
              region,
              country: country || 'Detected',
              countryCode,
              source: 'gps',
              formatted,
            };
            saveLocation(result);
            resolve(result);
            return;
          }
        } catch {
          // Continue to fallback
        }

        const fallbackLoc = getInitialLocation();
        fallbackLoc.source = 'gps';
        saveLocation(fallbackLoc);
        resolve(fallbackLoc);
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
