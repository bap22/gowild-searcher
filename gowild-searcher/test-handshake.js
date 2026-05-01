// Test Frontier API handshake
const API_BASE = 'https://mtier.flyfrontier.com';
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

async function testHandshake() {
  console.log('=== Testing Frontier Mobile API Handshake ===\n');

  try {
    // Step 1: Nonce
    console.log('Step 1: Getting nonce...');
    const nonceResp = await fetch(`${API_BASE}/registrationssv/generatenonce`, {
      method: 'POST',
      headers: MOBILE_HEADERS,
      body: JSON.stringify({
        deviceId: MOBILE_HEADERS['device-id'],
        signingKeyId: 'test-key',
        platform: 'Android',
      }),
    });

    console.log(`Status: ${nonceResp.status} ${nonceResp.statusText}`);
    if (nonceResp.ok) {
      const nonceData = await nonceResp.json();
      console.log('✓ Nonce response:', JSON.stringify(nonceData, null, 2));
    } else {
      const text = await nonceResp.text();
      console.log('Response:', text.substring(0, 500));
    }

    // Step 2: Token
    console.log('\nStep 2: Getting auth token...');
    const tokenResp = await fetch(`${API_BASE}/registrationssv/RetrieveAnonymousToken`, {
      method: 'POST',
      headers: MOBILE_HEADERS,
      body: '',
    });

    console.log(`Status: ${tokenResp.status} ${tokenResp.statusText}`);
    if (tokenResp.ok) {
      const tokenData = await tokenResp.json();
      console.log('✓ Token response:', JSON.stringify(tokenData, null, 2));
      const authToken = tokenData.data?.authToken;
      if (authToken) {
        console.log('\n✓✓✓ AUTH TOKEN OBTAINED:', authToken.substring(0, 50) + '...');
        
        // Step 3: Test search with token
        console.log('\nStep 3: Testing search with auth token...');
        const searchBody = {
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
            origin: 'SLC',
            destination: 'DEN',
            beginDate: new Date().toISOString().split('T')[0],
          },
        };

        const searchResp = await fetch(`${API_BASE}/flightavailabilityssv/FlightAvailabilitySimpleSearch`, {
          method: 'POST',
          headers: {
            ...MOBILE_HEADERS,
            'authtoken': authToken,
            'x-platform': 'Android',
          },
          body: JSON.stringify(searchBody),
        });

        console.log(`Search Status: ${searchResp.status} ${searchResp.statusText}`);
        if (searchResp.ok) {
          const searchData = await searchResp.json();
          console.log('✓✓✓ SEARCH SUCCESSFUL!');
          const itineraries = searchData.flightAvailabilityResponseModel?.itineraries || [];
          console.log(`Found ${itineraries.length} itineraries`);
          
          // Check for GoWild fares
          let gowildCount = 0;
          itineraries.forEach((itin, i) => {
            if (i < 3) {
              const fares = itin.fares || [];
              console.log(`Itinerary ${i + 1}: ${fares.length} fares`);
              fares.forEach(fare => {
                const price = fare.totalFare || fare.baseFare || 0;
                if (price < 100) {
                  console.log(`  🎯 GoWild: $${price} (${fare.fareType || fare.fareFamily})`);
                  gowildCount++;
                }
              });
            }
          });
          console.log(`\nTotal GoWild fares found: ${gowildCount}`);
        } else {
          const errorText = await searchResp.text();
          console.log('Search error:', errorText.substring(0, 500));
        }
      }
    } else {
      const text = await tokenResp.text();
      console.log('Response:', text.substring(0, 500));
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testHandshake();
