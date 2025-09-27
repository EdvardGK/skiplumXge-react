const fetch = require('node-fetch');

// Possible WFS endpoints based on standard patterns
const wfsEndpoints = [
  // Test environment
  'https://prodtest.matrikkel.no/matrikkelapi/wfs/v1',
  'https://prodtest.matrikkel.no/geoserver/wfs',
  'https://prodtest.matrikkel.no/matrikkel/wfs',
  'https://prodtest.matrikkel.no/wfs',

  // Production patterns
  'https://matrikkel.no/matrikkelapi/wfs/v1',
  'https://wfs.geonorge.no/skwms1/wfs.matrikkel',
  'https://kartverk.no/wfs/matrikkel',
];

// Standard WFS GetCapabilities request
async function testWFSEndpoint(url) {
  const getCapabilitiesUrl = `${url}?service=WFS&version=2.0.0&request=GetCapabilities`;

  try {
    console.log(`Testing: ${url}`);

    const response = await fetch(getCapabilitiesUrl, {
      headers: {
        'Accept': 'application/xml, text/xml',
        'User-Agent': 'Mozilla/5.0'
      },
      timeout: 5000
    });

    if (response.ok) {
      const text = await response.text();

      // Check if it's a valid WFS response
      if (text.includes('WFS_Capabilities') || text.includes('FeatureTypeList')) {
        console.log(`  ✅ VALID WFS ENDPOINT!`);

        // Check for BygningWFS
        if (text.includes('BygningWFS') || text.includes('Bygning')) {
          console.log(`  ✅ Has Building features!`);
        }

        // Extract feature types
        const featureTypes = text.match(/<Name>([^<]+)<\/Name>/g);
        if (featureTypes && featureTypes.length > 0) {
          console.log(`  📋 Feature types found: ${featureTypes.length}`);
          const buildingTypes = featureTypes.filter(f => f.toLowerCase().includes('bygn'));
          if (buildingTypes.length > 0) {
            console.log(`  🏢 Building types: ${buildingTypes.join(', ')}`);
          }
        }

        return { url, valid: true, hasBuildings: text.includes('Bygn') };
      } else {
        console.log(`  ❌ Not a WFS service (${response.status})`);
      }
    } else {
      console.log(`  ❌ HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }

  return { url, valid: false };
}

// Test a specific GetFeature request for buildings
async function testBuildingQuery(wfsUrl) {
  // Try to get buildings for a specific kommune (Oslo = 0301)
  const params = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeName: 'BygningWFS',
    maxFeatures: '1',
    outputFormat: 'application/json',
    CQL_FILTER: 'KOMMUNENR=0301'
  });

  const url = `${wfsUrl}?${params}`;

  try {
    console.log(`\n📍 Testing building query: ${wfsUrl}`);
    console.log(`   Query: Buildings in Oslo (kommune 0301)`);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      timeout: 10000
    });

    if (response.ok) {
      const contentType = response.headers.get('content-type');
      console.log(`   Response type: ${contentType}`);

      if (contentType && contentType.includes('json')) {
        const data = await response.json();
        console.log(`   ✅ Got JSON response!`);

        if (data.features && data.features.length > 0) {
          console.log(`   ✅ Found ${data.features.length} building(s)`);
          const building = data.features[0].properties;
          console.log(`   Sample building:`);
          console.log(`     - ID: ${building.BYGNINGID}`);
          console.log(`     - Type: ${building.BYGNINGSTYPE}`);
          console.log(`     - Status: ${building.BYGNINGSTATUS}`);
        }
      } else {
        const text = await response.text();
        if (text.includes('Exception')) {
          console.log(`   ❌ WFS Exception: ${text.substring(0, 200)}`);
        } else {
          console.log(`   ℹ️  Non-JSON response received`);
        }
      }
    } else {
      console.log(`   ❌ HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

// Main test function
async function main() {
  console.log('🔍 Searching for Matrikkel WFS endpoints...\n');

  const validEndpoints = [];

  for (const endpoint of wfsEndpoints) {
    const result = await testWFSEndpoint(endpoint);
    if (result.valid) {
      validEndpoints.push(result);
    }
    console.log('');
  }

  if (validEndpoints.length > 0) {
    console.log('\n✅ Found valid WFS endpoints:');
    for (const ep of validEndpoints) {
      console.log(`  - ${ep.url}`);
      if (ep.hasBuildings) {
        await testBuildingQuery(ep.url);
      }
    }
  } else {
    console.log('\n❌ No valid WFS endpoints found');
    console.log('The WFS service might require authentication or use different URLs');
  }

  // Also try the known Geonorge WFS
  console.log('\n🔍 Testing known Geonorge WFS services...');
  await testWFSEndpoint('https://wfs.geonorge.no/skwms1/wfs.nve');
}

main();