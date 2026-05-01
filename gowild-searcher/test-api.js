// Test script to debug Frontier API
const crypto = require('crypto');

const API_CONFIG = {
  baseUrl: 'https://mtier.flyfrontier.com/flightavailabilityssv/FlightAvailabilitySimpleSearch',
  headers: {
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
  },
};

function signRequest(endpoint, method, body) {
  const timestamp = Date.now().toString();
  const bodyJson = body ? JSON.stringify(body) : '';
  const bodyHash = crypto.createHash('sha256').update(bodyJson).digest('base64');

  const metadata = {
    endpoint,
    method,
    timestamp,
    body_hash: bodyHash,
  };
  const metadataJson = JSON.stringify(metadata);
  const metadataHash = crypto.createHash('sha256').update(metadataJson).digest();

  const signature = Buffer.from(metadataHash).toString('base64');

  return {
    'x-signing-key-id': 'vercel-key',
    'x-signature': signature,
    'x-request-data': metadataHash.toString('base64'),
    'x-timestamp': timestamp,
    'x-device-id': API_CONFIG.headers['device-id'],
    'x-platform': 'Android',
  };
}

async function testSearch() {
  const origin = 'SLC';
  const destination = 'DEN';
  const today = new Date().toISOString().split('T')[0];
  
  const body = {
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
      origin: origin,
      destination: destination,
      beginDate: today,
    },
  };

  const signHeaders = signRequest(API_CONFIG.baseUrl, 'POST', body);
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    ...API_CONFIG.headers,
    ...signHeaders,
  };

  console.log('Testing:', origin, '→', destination, 'for', today);
  console.log('Headers:', JSON.stringify(headers, null, 2));
  console.log('Body:', JSON.stringify(body, null, 2));

  try {
    const response = await fetch(API_CONFIG.baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    console.log('\n=== RESPONSE ===');
    console.log('Status:', response.status, response.statusText);
    console.log('Headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
    
    const text = await response.text();
    console.log('Body:', text.substring(0, 2000));
    
    if (response.status === 200) {
      try {
        const data = JSON.parse(text);
        console.log('\n=== PARSED ===');
        console.log('Keys:', Object.keys(data));
        if (data.flightAvailabilityResponseModel) {
          const itineraries = data.flightAvailabilityResponseModel.itineraries || [];
          console.log('Itineraries found:', itineraries.length);
          itineraries.slice(0, 3).forEach((itin, i) => {
            console.log(`\nItinerary ${i + 1}:`);
            console.log('  Fares:', itin.fares?.length || 0);
            console.log('  Segments:', itin.segments?.length || 0);
            if (itin.fares) {
              itin.fares.forEach(fare => {
                console.log(`    Fare: ${fare.fareType || fare.fareFamily} - $${fare.totalFare || fare.baseFare}`);
              });
            }
          });
        }
      } catch (e) {
        console.log('Parse error:', e.message);
      }
    }
  } catch (error) {
    console.error('Request failed:', error.message);
  }
}

testSearch();
