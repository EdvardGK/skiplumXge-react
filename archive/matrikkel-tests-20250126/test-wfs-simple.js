const fetch = require('node-fetch');
require('dotenv').config({ path: '../../../.env.local' });

const WFS_BASE_URL = 'https://prodtest.matrikkel.no/geoservergeo/wfs';
const MATRIKKEL_USER = process.env.matrikkel_user;
const MATRIKKEL_PASS = process.env.matrikkel_pass;

console.log('🔍 Testing WFS - Get ANY building\n');

// Simple query - just get one building without filters
async function getAnyBuilding() {
  const params = new URLSearchParams({
    service: 'WFS',
    version: '1.1.0',
    request: 'GetFeature',
    typeName: 'matrikkel:BYGNINGWFS',
    maxFeatures: '1'
  });

  const url = `${WFS_BASE_URL}?${params}`;

  console.log('Request URL:', url);
  console.log('');

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${MATRIKKEL_USER}:${MATRIKKEL_PASS}`).toString('base64'),
        'Accept': 'application/xml, text/xml'
      }
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    const contentType = response.headers.get('content-type');
    console.log(`Content-Type: ${contentType}\n`);

    if (response.ok) {
      const text = await response.text();

      // Save response to file for analysis
      require('fs').writeFileSync('wfs-response.xml', text);
      console.log('Response saved to wfs-response.xml\n');

      // Check what we got
      if (text.includes('<wfs:FeatureCollection')) {
        console.log('✅ Got WFS FeatureCollection');

        // Count features
        const featureMatches = text.match(/<matrikkel:BYGNINGWFS/g);
        if (featureMatches) {
          console.log(`✅ Found ${featureMatches.length} building feature(s)\n`);

          // Extract first building data
          const bygningId = text.match(/<matrikkel:BYGNINGID>([^<]+)<\/matrikkel:BYGNINGID>/);
          const kommunenr = text.match(/<matrikkel:KOMMUNENR>([^<]+)<\/matrikkel:KOMMUNENR>/);
          const bygningstype = text.match(/<matrikkel:BYGNINGSTYPE>([^<]+)<\/matrikkel:BYGNINGSTYPE>/);
          const bygningstatus = text.match(/<matrikkel:BYGNINGSTATUS>([^<]+)<\/matrikkel:BYGNINGSTATUS>/);
          const bygningsnr = text.match(/<matrikkel:BYGNINGSNR>([^<]+)<\/matrikkel:BYGNINGSNR>/);

          console.log('🏢 Building Data:');
          if (bygningId) console.log(`   ID: ${bygningId[1]}`);
          if (kommunenr) console.log(`   Kommune: ${kommunenr[1]}`);
          if (bygningstype) console.log(`   Type Code: ${bygningstype[1]}`);
          if (bygningstatus) console.log(`   Status Code: ${bygningstatus[1]}`);
          if (bygningsnr) console.log(`   Building Nr: ${bygningsnr[1]}`);

          // Extract coordinates
          const coordinates = text.match(/<gml:pos>([^<]+)<\/gml:pos>/);
          if (coordinates) {
            console.log(`   Coordinates: ${coordinates[1]}`);
          }

          return true;
        } else {
          console.log('⚠️  FeatureCollection is empty (no buildings)');
        }
      } else if (text.includes('ServiceException')) {
        const exception = text.match(/<ServiceException[^>]*>([^<]+)<\/ServiceException>/);
        console.log('❌ Service Exception:', exception ? exception[1] : 'Unknown error');
      } else {
        console.log('❌ Unexpected response format');
        console.log('First 500 chars:', text.substring(0, 500));
      }
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  return false;
}

// Test with different kommune numbers
async function testDifferentKommuner() {
  console.log('\n🔍 Testing different kommune numbers...\n');

  const kommuner = [
    { nr: '5001', name: 'Trondheim' },
    { nr: '4601', name: 'Bergen' },
    { nr: '1101', name: 'Eigersund' },
    { nr: '3001', name: 'Halden' }
  ];

  for (const kommune of kommuner) {
    console.log(`Testing kommune ${kommune.nr} (${kommune.name})...`);

    const params = new URLSearchParams({
      service: 'WFS',
      version: '1.1.0',
      request: 'GetFeature',
      typeName: 'matrikkel:BYGNINGWFS',
      maxFeatures: '1',
      CQL_FILTER: `KOMMUNENR=${kommune.nr}`
    });

    try {
      const response = await fetch(`${WFS_BASE_URL}?${params}`, {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${MATRIKKEL_USER}:${MATRIKKEL_PASS}`).toString('base64')
        }
      });

      if (response.ok) {
        const text = await response.text();
        const hasBuildings = text.includes('<matrikkel:BYGNINGWFS');
        console.log(`   ${hasBuildings ? '✅ Has buildings' : '⚠️  No buildings'}`);

        if (hasBuildings) {
          const bygningId = text.match(/<matrikkel:BYGNINGID>([^<]+)</);
          if (bygningId) console.log(`   Sample ID: ${bygningId[1]}`);
          break; // Found data, stop searching
        }
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
}

async function main() {
  const hasData = await getAnyBuilding();

  if (!hasData) {
    await testDifferentKommuner();
  }

  console.log('\n✅ Test complete');
}

main();