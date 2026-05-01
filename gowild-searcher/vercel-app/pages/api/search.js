/**
 * GoWild Fare Search API Route
 * Handles search requests and returns GoWild fares under $100
 * Optimized for Vercel's 60-second timeout
 */

import { searchGoWildFares, getTodayDate, getTomorrowDate } from '../../lib/gowild-api';

// Increase timeout for Vercel
export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
};

/**
 * POST /api/search
 * Search for GoWild fares
 * 
 * Request body:
 * {
 *   origin: 'SLC' | 'DEN',
 *   dateRange: 'today' | 'tomorrow' | 'both'
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   fares: Array,
 *   searchParams: Object,
 *   timestamp: string
 * }
 */
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowed: ['POST']
    });
  }

  const startTime = Date.now();
  
  try {
    const { origin = 'SLC', dateRange = 'both' } = req.body;

    // Validate origin
    const validOrigins = ['SLC', 'DEN'];
    if (!validOrigins.includes(origin)) {
      return res.status(400).json({ 
        error: 'Invalid origin',
        validOrigins 
      });
    }

    // Validate date range
    const validDateRanges = ['today', 'tomorrow', 'both'];
    if (!validDateRanges.includes(dateRange)) {
      return res.status(400).json({ 
        error: 'Invalid date range',
        validDateRanges 
      });
    }

    // Determine which dates to search
    const datesToSearch = [];
    if (dateRange === 'today' || dateRange === 'both') {
      datesToSearch.push(getTodayDate());
    }
    if (dateRange === 'tomorrow' || dateRange === 'both') {
      datesToSearch.push(getTomorrowDate());
    }

    // Search for fares on each date
    const allFares = [];
    const searchPromises = datesToSearch.map(async (date) => {
      try {
        // Set a timeout for each search to prevent hanging
        const searchPromise = searchGoWildFares(origin, date);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Search timeout')), 25000);
        });
        
        const fares = await Promise.race([searchPromise, timeoutPromise]);
        return fares || [];
      } catch (error) {
        console.error(`Error searching date ${date}:`, error.message);
        return [];
      }
    });

    const results = await Promise.all(searchPromises);
    results.forEach(fares => allFares.push(...fares));

    // Remove duplicates (same route and date)
    const uniqueFares = removeDuplicates(allFares);

    const elapsed = Date.now() - startTime;

    return res.status(200).json({
      success: true,
      fares: uniqueFares,
      count: uniqueFares.length,
      searchParams: {
        origin,
        dateRange,
        dates: datesToSearch
      },
      performance: {
        elapsedMs: elapsed,
        datesSearched: datesToSearch.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Search error:', error);
    const elapsed = Date.now() - startTime;
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Search failed',
      performance: {
        elapsedMs: elapsed
      },
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Remove duplicate fares (same route and date)
 * Keep the lowest price for each unique route+date combination
 */
function removeDuplicates(fares) {
  const fareMap = new Map();
  
  fares.forEach(fare => {
    const key = `${fare.origin}-${fare.destination}-${fare.departureDate}`;
    const existing = fareMap.get(key);
    
    if (!existing || fare.price < existing.price) {
      fareMap.set(key, fare);
    }
  });
  
  return Array.from(fareMap.values());
}
