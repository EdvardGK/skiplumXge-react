const fetch = require('node-fetch');
require('dotenv').config({ path: '../../../.env.local' });

// The REAL WFS endpoint from the GetCapabilities file!
const WFS_BASE_URL = 'https://prodtest.matrikkel.no/geoservergeo/wfs';

// Matrikkel credentials
const MATRIKKEL_USER = process.env.matrikkel_user;
const MATRIKKEL_PASS = process.env.matrikkel_pass;

console.log('🏢 Testing Matrikkel WFS Building Data Access');
console.log('============================================\n');
console.log(`WFS URL: ${WFS_BASE_URL}`);
console.log(`Username: ${MATRIKKEL_USER ? MATRIKKEL_USER.substring(0, 8) + '...' : 'NOT SET'}`);
console.log(`Password: ${MATRIKKEL_PASS ? '********' : 'NOT SET'}\n`);

// Test 1: GetCapabilities
async function testGetCapabilities() {
  console.log('📋 Test 1: GetCapabilities (check if WFS is accessible)');

  const url = `${WFS_BASE_URL}?service=WFS&version=1.1.0&request=GetCapabilities`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${MATRIKKEL_USER}:${MATRIKKEL_PASS}`).toString('base64'),
        'Accept': 'application/xml, text/xml'
      }
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const text = await response.text();

      if (text.includes('WFS_Capabilities') || text.includes('FeatureTypeList')) {
        console.log('   ✅ Valid WFS service!');

        // Check for BygningWFS
        if (text.includes('BYGNINGWFS') || text.includes('BygningWFS')) {
          console.log('   ✅ Building layer (BYGNINGWFS) is available!');
          return true;
        } else {
          console.log('   ⚠️  Building layer not found in capabilities');
        }
      } else if (text.includes('ServiceException')) {
        console.log('   ❌ WFS Exception:', text.substring(0, 200));
      } else {
        console.log('   ❌ Not a valid WFS response');
      }
    } else {
      console.log('   ❌ Failed to access WFS');
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  return false;
}

// Test 2: DescribeFeatureType for BYGNINGWFS
async function testDescribeFeatureType() {
  console.log('\n📊 Test 2: DescribeFeatureType (get building schema)');

  const url = `${WFS_BASE_URL}?service=WFS&version=1.1.0&request=DescribeFeatureType&typeName=matrikkel:BYGNINGWFS`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${MATRIKKEL_USER}:${MATRIKKEL_PASS}`).toString('base64'),
        'Accept': 'application/xml'
      }
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const text = await response.text();

      if (text.includes('schema') || text.includes('complexType')) {
        console.log('   ✅ Got building schema!');

        // Extract field names
        const fields = text.match(/name="([^"]+)"/g);
        if (fields) {
          console.log('   📋 Building fields:');
          fields.slice(0, 10).forEach(field => {
            const name = field.match(/name="([^"]+)"/)[1];
            console.log(`      - ${name}`);
          });
        }
        return true;
      }
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  return false;
}

// Test 3: GetFeature - Get actual building data
async function testGetBuildingData() {
  console.log('\n🏗️ Test 3: GetFeature (get real building data)');

  // Try to get one building from Oslo (kommune 0301)
  const params = new URLSearchParams({
    service: 'WFS',
    version: '1.1.0',
    request: 'GetFeature',
    typeName: 'matrikkel:BYGNINGWFS',
    maxFeatures: '1',
    outputFormat: 'application/json'
  });

  // Add filter for Oslo kommune
  const cqlFilter = 'KOMMUNENR=0301';
  params.append('CQL_FILTER', cqlFilter);

  const url = `${WFS_BASE_URL}?${params}`;

  try {
    console.log('   Querying: Buildings in Oslo (kommune 0301)');
    console.log('   Max features: 1');

    const response = await fetch(url, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${MATRIKKEL_USER}:${MATRIKKEL_PASS}`).toString('base64'),
        'Accept': 'application/json, application/xml'
      }
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const contentType = response.headers.get('content-type');
      console.log(`   Content-Type: ${contentType}`);

      const text = await response.text();

      // Try to parse as JSON
      try {
        const data = JSON.parse(text);

        if (data.features && data.features.length > 0) {
          console.log('   ✅ Got building data!');
          console.log(`   📊 Found ${data.features.length} building(s)`);

          const building = data.features[0].properties;
          console.log('\n   🏢 Sample Building Data:');
          console.log(`      ID: ${building.BYGNINGID || building.bygningid || 'N/A'}`);
          console.log(`      Type: ${building.BYGNINGSTYPE || building.bygningstype || 'N/A'}`);
          console.log(`      Status: ${building.BYGNINGSTATUS || building.bygningstatus || 'N/A'}`);
          console.log(`      Kommune: ${building.KOMMUNENR || building.kommunenr || 'N/A'}`);

          // Show all available fields
          console.log('\n   📋 All available fields:');
          Object.keys(building).forEach(key => {
            console.log(`      - ${key}: ${building[key]}`);
          });

          return true;
        } else {
          console.log('   ⚠️  No features returned');
        }
      } catch (e) {
        // Not JSON, might be XML
        if (text.includes('<wfs:FeatureCollection')) {
          console.log('   ℹ️  Got XML response (JSON not supported)');

          // Check if there are features
          if (text.includes('<matrikkel:BYGNINGWFS')) {
            console.log('   ✅ Building data returned in XML format');

            // Try to extract some data
            const bygningId = text.match(/<matrikkel:BYGNINGID>([^<]+)<\/matrikkel:BYGNINGID>/);
            const bygningstype = text.match(/<matrikkel:BYGNINGSTYPE>([^<]+)<\/matrikkel:BYGNINGSTYPE>/);

            if (bygningId || bygningstype) {
              console.log('\n   🏢 Sample Building Data (from XML):');
              if (bygningId) console.log(`      ID: ${bygningId[1]}`);
              if (bygningstype) console.log(`      Type: ${bygningstype[1]}`);
            }
          } else {
            console.log('   ⚠️  No building features in response');
          }
        } else if (text.includes('ServiceException')) {
          console.log('   ❌ Service Exception:', text.substring(0, 300));
        } else {
          console.log('   ❌ Unexpected response format');
        }
      }
    } else if (response.status === 401) {
      console.log('   ❌ Authentication failed - check credentials');
    } else {
      console.log('   ❌ Failed to get building data');
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  return false;
}

// Test 4: Query by specific matrikkel number
async function testQueryByMatrikkel(kommunenr = '0301', gardsnr = '1', bruksnr = '1') {
  console.log(`\n🎯 Test 4: Query specific property (${kommunenr}-${gardsnr}-${bruksnr})`);

  const params = new URLSearchParams({
    service: 'WFS',
    version: '1.1.0',
    request: 'GetFeature',
    typeName: 'matrikkel:BYGNINGWFS',
    outputFormat: 'application/json'
  });

  // Filter by matrikkel numbers
  const cqlFilter = `KOMMUNENR=${kommunenr} AND GARDSNR=${gardsnr} AND BRUKSNR=${bruksnr}`;
  params.append('CQL_FILTER', cqlFilter);

  const url = `${WFS_BASE_URL}?${params}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${MATRIKKEL_USER}:${MATRIKKEL_PASS}`).toString('base64'),
        'Accept': 'application/json'
      }
    });

    console.log(`   Status: ${response.status}`);

    if (response.ok) {
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        if (data.features && data.features.length > 0) {
          console.log(`   ✅ Found ${data.features.length} building(s) for this property`);
          return true;
        } else {
          console.log('   ℹ️  No buildings found for this matrikkel number');
        }
      } catch {
        console.log('   ℹ️  Response in XML format');
      }
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  return false;
}

// Run all tests
async function main() {
  console.log('Starting WFS tests...\n');

  const hasCapabilities = await testGetCapabilities();

  if (hasCapabilities) {
    await testDescribeFeatureType();
    await testGetBuildingData();
    await testQueryByMatrikkel('0301', '208', '1'); // Karl Johans gate area
  } else {
    console.log('\n❌ Cannot proceed - WFS service not accessible');
    console.log('   This might require:');
    console.log('   1. Valid credentials');
    console.log('   2. IP whitelisting');
    console.log('   3. VPN access');
    console.log('   4. Or the service might be restricted');
  }

  console.log('\n============================================');
  console.log('✅ WFS Testing Complete');
}

main();