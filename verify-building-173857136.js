// Verify building 173857136 by cross-referencing OSM data with official Norwegian sources
const https = require('https');

// Building coordinates from OSM
const buildingLat = 59.7988371;
const buildingLon = 5.1846101;

// Search for official addresses near the building coordinates
function searchOfficialAddresses() {
  console.log('=== Verifying Building 173857136 ===');
  console.log(`OSM Coordinates: ${buildingLat}, ${buildingLon}`);
  console.log('OSM Building Number: 173857136');
  console.log('OSM Building Type: house\n');

  console.log('Searching for official addresses near these coordinates...\n');

  // Try multiple radius searches to find nearby addresses
  const radiusOptions = [25, 50, 100, 200];

  radiusOptions.forEach((radius, index) => {
    setTimeout(() => {
      searchAddressByRadius(radius);
    }, index * 2000); // 2 second delay between requests
  });
}

function searchAddressByRadius(radius) {
  console.log(`--- Searching within ${radius}m radius ---`);

  // Try different Kartverket endpoints for reverse geocoding
  const endpoints = [
    `/adresser/v1/punkt?lat=${buildingLat}&lon=${buildingLon}&radius=${radius}&treffPerSide=10`,
    `/adresser/v1/sok?lat=${buildingLat}&lon=${buildingLon}&radius=${radius}`
  ];

  endpoints.forEach((endpoint, i) => {
    setTimeout(() => {
      console.log(`Testing endpoint ${i + 1}: ${endpoint}`);

      const options = {
        hostname: 'ws.geonorge.no',
        path: endpoint,
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BuildingVerification/1.0'
        }
      };

      const req = https.get(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          console.log(`Status: ${res.statusCode}`);

          if (res.statusCode === 200) {
            try {
              const json = JSON.parse(data);

              if (json.adresser && json.adresser.length > 0) {
                console.log(`✅ Found ${json.adresser.length} address(es) within ${radius}m:`);

                json.adresser.forEach((addr, idx) => {
                  console.log(`\n  Address ${idx + 1}:`);
                  console.log(`    Full: ${addr.adressetekst}`);
                  console.log(`    Municipality: ${addr.kommunenavn} (${addr.kommunenummer})`);

                  if (addr.matrikkelenhet) {
                    console.log(`    gnr: ${addr.matrikkelenhet.gardsnummer}`);
                    console.log(`    bnr: ${addr.matrikkelenhet.bruksnummer}`);
                    console.log(`    Type: ${addr.matrikkelenhet.matrikkelenhetstype}`);
                  }

                  const distance = calculateDistance(
                    buildingLat, buildingLon,
                    addr.representasjonspunkt.lat, addr.representasjonspunkt.lon
                  );
                  console.log(`    Distance: ${distance.toFixed(1)}m from building`);

                  if (addr.matrikkelenhet) {
                    console.log(`    🔍 Test query: SELECT * FROM energy_certificates WHERE gnr=${addr.matrikkelenhet.gardsnummer} AND bnr=${addr.matrikkelenhet.bruksnummer};`);
                  }
                });
              } else {
                console.log(`❌ No addresses found within ${radius}m`);
              }
            } catch (e) {
              console.log(`❌ JSON parse error: ${e.message}`);
              console.log(`Raw response: ${data.substring(0, 200)}...`);
            }
          } else {
            console.log(`❌ HTTP ${res.statusCode}: ${data.substring(0, 200)}`);
          }

          console.log(''); // Empty line for readability
        });
      });

      req.on('error', (e) => {
        console.log(`❌ Request error: ${e.message}\n`);
      });

      req.setTimeout(10000, () => {
        console.log(`❌ Timeout for ${endpoint}\n`);
        req.destroy();
      });

    }, i * 1000); // 1 second delay between endpoint tests
  });
}

// Calculate distance between two coordinates in meters
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

// Also try searching with nearby coordinates to cast a wider net
function searchNearbyArea() {
  console.log('\n=== Expanding search to nearby area ===');

  const offsets = [
    {lat: 0.001, lon: 0.001, desc: 'northeast'},
    {lat: -0.001, lon: 0.001, desc: 'southeast'},
    {lat: 0.001, lon: -0.001, desc: 'northwest'},
    {lat: -0.001, lon: -0.001, desc: 'southwest'}
  ];

  offsets.forEach((offset, index) => {
    setTimeout(() => {
      const testLat = buildingLat + offset.lat;
      const testLon = buildingLon + offset.lon;

      console.log(`--- Searching ${offset.desc} area: ${testLat}, ${testLon} ---`);

      const options = {
        hostname: 'ws.geonorge.no',
        path: `/adresser/v1/punkt?lat=${testLat}&lon=${testLon}&radius=100&treffPerSide=5`,
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      };

      https.get(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const json = JSON.parse(data);
              if (json.adresser && json.adresser.length > 0) {
                console.log(`Found ${json.adresser.length} addresses in ${offset.desc} area`);
                json.adresser.slice(0, 2).forEach((addr, i) => {
                  console.log(`  ${addr.adressetekst} - gnr:${addr.matrikkelenhet?.gardsnummer} bnr:${addr.matrikkelenhet?.bruksnummer}`);
                });
              }
            } catch (e) {
              // Silent error for expanded search
            }
          }
          console.log('');
        });
      }).on('error', () => {});

    }, index * 1500);
  });
}

// Run the verification
console.log('BUILDING VERIFICATION - Cross-referencing OSM with Official Norwegian Registry\n');
searchOfficialAddresses();
setTimeout(() => searchNearbyArea(), 10000); // Start expanded search after 10 seconds