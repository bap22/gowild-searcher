/**
 * Frontier GoWild API Client
 * Uses the signed mobile API endpoint (mtier.flyfrontier.com)
 * Based on FrontierWildWatch implementation
 */

const API_BASE = 'https://mtier.flyfrontier.com';
const SEARCH_ENDPOINT = '/flightavailabilityssv/FlightAvailabilitySimpleSearch';
const REGISTRATION_ENDPOINT = '/registrationssv';

// Frontier mobile API headers (from FrontierWildWatch)
const MOBILE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'device-id': 'cb8i9pLDTzWKeuXuDadR2O',
  'ocp-apim-subscription-key': '493f95d2aa20409e9094b6ae78c1e5de',
  'user-agent': 'NCPAndroid/3.5.4',
  'frontiertoken': '6870fb9c0-cbcc-4a49-b2ad-2b133e87e3d92',
  'x-px-os-version': '16',
  'x-px-uuid': '1ee1f538-ff40-11f0-a77b-45348a5e92ff',
  'x-px-authorization': '1',
  'x-px-device-fp': 'd2b77ff2a2b4d96d',
  'x-px-device-model': 'sdk_gphone64_arm64',
  'x-px-os': 'Android',
  'x-px-hello': 'AlZWAlUGAAseVVUHAx4CAlUDHlIEBFEeBwYABwtSBlYKAVVV',
  'x-px-mobile-sdk-version': '3.4.5',
};

// Domestic airports served by Frontier
const DOMESTIC_AIRPORTS = [
  'ATL', 'AUS', 'BNA', 'BOS', 'BWI', 'CLT', 'DCA', 'DEN', 'DFW', 'DTW',
  'EWR', 'FLL', 'HNL', 'HOU', 'IAD', 'IAH', 'JAX', 'JFK', 'LAS', 'LAX',
  'LGA', 'MCO', 'MDW', 'MEM', 'MIA', 'MKE', 'MSP', 'MSY', 'MYR', 'OAK',
  'ONT', 'ORD', 'PBI', 'PDX', 'PHL', 'PHX', 'PIT', 'RDU', 'RSW', 'SAN',
  'SEA', 'SFO', 'SJC', 'SLC', 'SMF', 'STL', 'TPA', 'ABQ', 'ANC', 'BOI',
  'BUF', 'BUR', 'CHS', 'CMH', 'COS', 'CVG', 'DAY', 'DSM', 'ELP', 'FAT',
  'GEG', 'GRR', 'HSV', 'IND', 'KOA', 'LIH', 'MCI', 'MFR', 'MHT', 'MOB',
  'MTJ', 'OKC', 'OMA', 'ORF', 'PSP', 'PVD', 'RNO', 'ROC', 'SAT', 'SAV',
  'SDF', 'SNA', 'SYR', 'TUS', 'TUL', 'XNA'
];

// In-memory cache for auth token (Vercel serverless)
let cachedToken = null;
let tokenExpiry = 0;

/**
 * Perform mobile API handshake to get auth token
 * Required before making search requests
 */
async function performHandshake() {
  // Return cached token if still valid
  if (cachedToken && Date.now() < tokenExpiry) {
    console.log('Using cached auth token');
    return cachedToken;
  }

  try {
    console.log('Performing Frontier mobile handshake...');

    // Step 1: Generate nonce
    const nonceResp = await fetch(`${API_BASE}${REGISTRATION_ENDPOINT}/generatenonce`, {
      method: 'POST',
      headers: MOBILE_HEADERS,
      body: JSON.stringify({
        deviceId: MOBILE_HEADERS['device-id'],
        signingKeyId: 'vercel-key',
        platform: 'Android',
      }),
    });

    if (!nonceResp.ok) {
      console.warn(`Handshake step 1 failed: ${nonceResp.status}`);
      return null;
    }

    console.log('✓ Nonce obtained');

    // Step 2: Get anonymous token (simplified - no ECDSA)
    const tokenResp = await fetch(`${API_BASE}${REGISTRATION_ENDPOINT}/RetrieveAnonymousToken`, {
      method: 'POST',
      headers: MOBILE_HEADERS,
      body: '',
    });

    if (!tokenResp.ok) {
      console.warn(`Handshake step 2 failed: ${tokenResp.status}`);
      return null;
    }

    const tokenData = await tokenResp.json();
    cachedToken = tokenData.data?.authToken;
    
    if (!cachedToken) {
      console.warn('No auth token in response');
      return null;
    }

    tokenExpiry = Date.now() + 3600000; // 1 hour
    console.log('✓ Auth token obtained');

    // Step 3: Sync public key
    await fetch(`${API_BASE}${REGISTRATION_ENDPOINT}/GetPublicKey`, {
      method: 'GET',
      headers: MOBILE_HEADERS,
    });

    return cachedToken;
  } catch (error) {
    console.error('Handshake failed:', error.message);
    return null;
  }
}

/**
 * Search for GoWild fares on a single route
 */
async function searchRoute(origin, destination, date, authToken) {
  const requestBody = {
    flightAvailabilityRequestModel: {
      passengers: {
        types: [{ type: 'ADT', count: 1 }],
        residentCountry: 'US',
      },
      filters: {
        maxConnections: 20,
        fareInclusionType: 'Default',
        type: 'All',
        includeAllotments: true,
        bundleControlFilter: '2',
      },
      codes: { currencyCode: 'USD' },
      origin,
      destination,
      beginDate: date,
    },
  };

  const headers = {
    ...MOBILE_HEADERS,
    'x-platform': 'Android',
    'x-device-id': MOBILE_HEADERS['device-id'],
  };

  // Add auth token if we have one
  if (authToken) {
    headers['authtoken'] = authToken;
  }

  try {
    const response = await fetch(`${API_BASE}${SEARCH_ENDPOINT}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(8000), // 8s timeout per route
    });

    if (response.status === 403 || response.status === 429) {
      console.warn(`Rate limited for ${origin}→${destination}`);
      return [];
    }

    if (!response.ok) {
      console.error(`API error ${response.status} for ${origin}→${destination}`);
      return [];
    }

    const data = await response.json();
    return parseResponse(data, origin, destination, date);
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error(`Search error ${origin}→${destination}:`, error.message);
    }
    return [];
  }
}

/**
 * Parse API response and extract GoWild fares
 */
function parseResponse(data, origin, destination, date) {
  const flights = [];

  try {
    const availability = data.flightAvailabilityResponseModel || {};
    const itineraries = availability.itineraries || [];

    for (const itin of itineraries) {
      const segments = itin.segments || [];
      if (segments.length === 0) continue;

      const fares = itin.fares || [];
      
      // Look for GoWild fares (low price, specific fare type)
      for (const fare of fares) {
        const price = fare.totalFare || fare.baseFare || 999;
        const fareType = fare.fareType || fare.fareFamily || '';
        
        // GoWild fares are typically under $100
        // Also check for fare type indicators
        const isGoWild = price < 100 || 
                        fareType.toLowerCase().includes('gowild') ||
                        fare.bundleName?.toLowerCase().includes('gowild');

        if (!isGoWild || price > 99) continue;

        flights.push({
          origin,
          destination,
          date,
          depart_time: segments[0].departureTime || '?',
          arrive_time: segments[segments.length - 1].arrivalTime || '?',
          stops: segments.length - 1,
          price: Math.floor(price),
          booking_url: `https://www.flyfrontier.com/travel/book/?o1=${origin}&d1=${destination}&dd1=${date}%2000:00:00&adt=1&ftype=GW`,
        });
      }
    }
  } catch (error) {
    console.error('Parse error:', error.message);
  }

  return flights;
}

/**
 * Search all destinations from origin
 * Optimized for Vercel 60s timeout
 */
export async function searchGoWildFares(origin, dateRange = 'both') {
  console.log(`Starting GoWild search from ${origin} for date range: ${dateRange}`);
  
  // Perform handshake first
  const authToken = await performHandshake();
  if (!authToken) {
    console.warn('Handshake failed, searching without auth token');
  }

  // Determine dates to search
  const today = new Date();
  const dates = [];
  
  if (dateRange === 'today' || dateRange === 'both') {
    dates.push(today.toISOString().split('T')[0]);
  }
  if (dateRange === 'tomorrow' || dateRange === 'both') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    dates.push(tomorrow.toISOString().split('T')[0]);
  }

  console.log(`Searching dates: ${dates.join(', ')}`);

  const allFlights = [];
  const batchSize = 10;

  // Search each date
  for (const date of dates) {
    console.log(`\nSearching for ${date}...`);
    
    // Search in parallel batches
    for (let i = 0; i < DOMESTIC_AIRPORTS.length; i += batchSize) {
      const batch = DOMESTIC_AIRPORTS.slice(i, i + batchSize);
      const destinations = batch.filter(d => d !== origin);

      // Parallel search within batch
      const promises = destinations.map(dest => 
        searchRoute(origin, dest, date, authToken)
      );
      
      const results = await Promise.all(promises);
      results.forEach(flights => allFlights.push(...flights));

      // Small delay between batches
      if (i + batchSize < DOMESTIC_AIRPORTS.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  }

  // Remove duplicates (keep lowest price)
  const unique = {};
  for (const flight of allFlights) {
    const key = `${flight.origin}-${flight.destination}-${flight.date}`;
    if (!unique[key] || flight.price < unique[key].price) {
      unique[key] = flight;
    }
  }

  const deduped = Object.values(unique);
  deduped.sort((a, b) => a.price - b.price);

  console.log(`\nFound ${deduped.length} GoWild fares`);
  return deduped;
}

/**
 * Get today's date in YYYY-MM-DD format (Denver time)
 */
export function getTodayDate() {
  const now = new Date();
  const options = { 
    timeZone: 'America/Denver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };
  return new Intl.DateTimeFormat('en-CA', options).format(now);
}

/**
 * Get tomorrow's date in YYYY-MM-DD format (Denver time)
 */
export function getTomorrowDate() {
  const today = getTodayDate();
  const date = new Date(today + 'T00:00:00');
  date.setDate(date.getDate() + 1);
  return date.toISOString().split('T')[0];
}

export default {
  searchGoWildFares,
  getTodayDate,
  getTomorrowDate,
};
