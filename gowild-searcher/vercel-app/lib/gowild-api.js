/**
 * Frontier GoWild API Client
 * Uses the signed mobile API endpoint to search for GoWild fares
 */

const BASE_URL = 'https://mtier.flyfrontier.com';
const API_VERSION = 'v1';

/**
 * Generate a pseudo-signature for mobile API requests
 * Frontier's mobile app uses this pattern for authentication
 */
function generateMobileSignature() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `mobile-${timestamp}-${random}`;
}

/**
 * Get headers for mobile API requests
 */
function getMobileHeaders() {
  return {
    'Accept': 'application/json',
    'Accept-Language': 'en-US',
    'User-Agent': 'Frontier/2.0.0 (iOS; 15.0)',
    'X-Request-ID': generateMobileSignature(),
    'X-Device-Type': 'iOS',
    'Content-Type': 'application/json',
  };
}

/**
 * Search for GoWild fares from an origin to all destinations
 * @param {string} origin - Origin airport code (SLC, DEN, etc.)
 * @param {string} departureDate - Departure date in YYYY-MM-DD format
 * @returns {Promise<Array>} Array of GoWild fare results
 */
export async function searchGoWildFares(origin, departureDate) {
  const results = [];
  
  // Common destination airports for Frontier
  const destinations = [
    'ATL', 'AUS', 'BNA', 'BOS', 'BWI', 'CLT', 'DCA', 'DEN', 'DFW', 'DTW',
    'EWR', 'FLL', 'HOU', 'IAH', 'JAX', 'LAS', 'LAX', 'MCO', 'MDW', 'MIA',
    'MKE', 'MSP', 'MYR', 'OAK', 'ONT', 'ORD', 'PBI', 'PHL', 'PHX', 'PIT',
    'RDU', 'RSW', 'SAN', 'SEA', 'SFO', 'SLC', 'STL', 'TPA', 'IAD'
  ];

  // Filter out the origin from destinations
  const validDestinations = destinations.filter(d => d !== origin);

  // Search in parallel batches to avoid overwhelming the API
  const BATCH_SIZE = 10;
  const batches = [];
  
  for (let i = 0; i < validDestinations.length; i += BATCH_SIZE) {
    batches.push(validDestinations.slice(i, i + BATCH_SIZE));
  }

  // Process batches sequentially to manage rate limits
  for (const batch of batches) {
    const batchPromises = batch.map(async (destination) => {
      try {
        const fare = await searchSingleRoute(origin, destination, departureDate);
        if (fare && fare.isGoWild && fare.price <= 100) {
          return fare;
        }
        return null;
      } catch (error) {
        console.error(`Error searching ${origin} to ${destination}:`, error.message);
        return null;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter(r => r !== null));
  }

  // Sort by price ascending
  results.sort((a, b) => a.price - b.price);
  
  return results;
}

/**
 * Search for fares on a single route
 * @param {string} origin - Origin airport code
 * @param {string} destination - Destination airport code
 * @param {string} departureDate - Departure date in YYYY-MM-DD format
 * @returns {Promise<Object|null>} Fare object or null
 */
async function searchSingleRoute(origin, destination, departureDate) {
  const url = `${BASE_URL}/${API_VERSION}/search/availability`;
  
  const payload = {
    searchCriteria: {
      origin: origin,
      destination: destination,
      departureDate: departureDate,
      returnDate: null,
      passengers: {
        adults: 1,
        children: 0,
        infants: 0
      },
      currency: 'USD',
      market: 'US'
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: getMobileHeaders(),
      body: JSON.stringify(payload),
      timeout: 5000
    });

    if (!response.ok) {
      if (response.status === 404 || response.status === 400) {
        return null;
      }
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return parseFareResponse(data, origin, destination, departureDate);
  } catch (error) {
    if (error.code === 'ETIMEDOUT' || error.name === 'TimeoutError') {
      return null;
    }
    throw error;
  }
}

/**
 * Parse the API response to extract GoWild fare information
 * @param {Object} data - API response data
 * @param {string} origin - Origin airport code
 * @param {string} destination - Destination airport code
 * @param {string} departureDate - Departure date
 * @returns {Object|null} Parsed fare object or null
 */
function parseFareResponse(data, origin, destination, departureDate) {
  if (!data || !data.flights || data.flights.length === 0) {
    return null;
  }

  const flight = data.flights[0];
  
  // Look for GoWild fare in fare bundles
  const goWildFare = flight.fareBundles?.find(
    bundle => bundle.fareType === 'GOWILD' || 
              bundle.fareType === 'GO_WILD' ||
              bundle.name?.toLowerCase().includes('gowild')
  );

  if (!goWildFare) {
    return null;
  }

  const price = goWildFare.totalPrice || goWildFare.price || 0;
  
  // Only return if it's a valid GoWild fare under $100
  if (price > 100 || price <= 0) {
    return null;
  }

  const departureTime = flight.departureTime || 'Unknown';
  const arrivalTime = flight.arrivalTime || 'Unknown';
  const stops = flight.stops || 0;
  const flightNumber = flight.flightNumber || 'Unknown';

  // Generate booking URL
  const bookingUrl = generateBookingUrl(origin, destination, departureDate);

  return {
    origin,
    destination,
    route: `${origin} → ${destination}`,
    price: Math.floor(price),
    displayPrice: `$${Math.floor(price)}`,
    departureDate,
    departureTime,
    arrivalTime,
    stops,
    flightNumber,
    isGoWild: true,
    bookingUrl,
    currency: 'USD'
  };
}

/**
 * Generate a booking URL for flyfrontier.com
 * @param {string} origin - Origin airport code
 * @param {string} destination - Destination airport code
 * @param {string} departureDate - Departure date in YYYY-MM-DD format
 * @returns {string} Booking URL
 */
function generateBookingUrl(origin, destination, departureDate) {
  const baseUrl = 'https://www.flyfrontier.com/travel/plan-trip/book-a-trip/';
  const params = new URLSearchParams({
    origin,
    destination,
    departureDate,
    adults: '1',
    children: '0',
    infants: '0'
  });
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Get today's date in YYYY-MM-DD format
 * @param {string} timezone - Optional timezone (default: America/Denver)
 * @returns {string} Date string
 */
export function getTodayDate(timezone = 'America/Denver') {
  const now = new Date();
  const options = { 
    timeZone: timezone, 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  };
  const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(now);
  const dateMap = {};
  parts.forEach(({ type, value }) => {
    if (type !== 'literal') dateMap[type] = value;
  });
  return `${dateMap.year}-${dateMap.month}-${dateMap.day}`;
}

/**
 * Get tomorrow's date in YYYY-MM-DD format
 * @param {string} timezone - Optional timezone (default: America/Denver)
 * @returns {string} Date string
 */
export function getTomorrowDate(timezone = 'America/Denver') {
  const today = getTodayDate(timezone);
  const date = new Date(today + 'T00:00:00');
  date.setDate(date.getDate() + 1);
  return date.toISOString().split('T')[0];
}

export default {
  searchGoWildFares,
  getTodayDate,
  getTomorrowDate,
  generateBookingUrl
};
