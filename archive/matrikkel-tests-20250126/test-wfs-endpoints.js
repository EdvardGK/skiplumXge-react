/**
 * Test WFS Endpoints
 * Verify the WFS endpoints and capabilities
 */

const axios = require('axios');

const WFS_BASE = 'https://wfs.geonorge.no/skwms1/wfs.matrikkelen';

async function testWFSCapabilities() {
  console.log('🔍 Testing WFS Capabilities\n');

  try {
    // Test GetCapabilities
    console.log('1. Testing GetCapabilities...');
    const capabilitiesParams = {
      service: 'WFS',
      version: '2.0.0',
      request: 'GetCapabilities'
    };

    const capResponse = await axios.get(WFS_BASE, { params: capabilitiesParams });
    console.log(`✅ GetCapabilities status: ${capResponse.status}`);
    console.log(`Response length: ${capResponse.data.length} characters`);

    // Check if TeigWFS is in the response
    const hasTeigWFS = capResponse.data.includes('TeigWFS');
    const hasBygningWFS = capResponse.data.includes('BygningWFS');
    console.log(`Contains TeigWFS: ${hasTeigWFS}`);
    console.log(`Contains BygningWFS: ${hasBygningWFS}`);

    if (hasTeigWFS || hasBygningWFS) {
      console.log('\n✅ WFS service appears to be working');
    } else {
      console.log('\n❌ Expected feature types not found in capabilities');
      // Show a sample of the response
      console.log('Sample response:', capResponse.data.substring(0, 500) + '...');
    }

  } catch (error) {
    console.error('❌ GetCapabilities failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response sample:', error.response.data.substring(0, 500));
    }
  }

  // Test 2: Try a simple feature request
  console.log('\n2. Testing simple TeigWFS request...');
  try {
    const featureParams = {
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeName: 'app:TeigWFS',
      outputFormat: 'application/json',
      count: 1  // Just get one feature to test
    };

    const featureResponse = await axios.get(WFS_BASE, { params: featureParams });
    console.log(`✅ TeigWFS request status: ${featureResponse.status}`);

    if (featureResponse.data && featureResponse.data.features) {
      console.log(`Found ${featureResponse.data.features.length} features`);
      if (featureResponse.data.features.length > 0) {
        const properties = Object.keys(featureResponse.data.features[0].properties || {});
        console.log('Available properties:', properties.slice(0, 10).join(', '));
      }
    } else {
      console.log('No GeoJSON features in response');
    }

  } catch (error) {
    console.error('❌ TeigWFS request failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response sample:', error.response.data.substring(0, 500));
    }
  }

  // Test 3: Try BygningWFS
  console.log('\n3. Testing simple BygningWFS request...');
  try {
    const buildingParams = {
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeName: 'app:BygningWFS',
      outputFormat: 'application/json',
      count: 1
    };

    const buildingResponse = await axios.get(WFS_BASE, { params: buildingParams });
    console.log(`✅ BygningWFS request status: ${buildingResponse.status}`);

    if (buildingResponse.data && buildingResponse.data.features) {
      console.log(`Found ${buildingResponse.data.features.length} features`);
      if (buildingResponse.data.features.length > 0) {
        const properties = Object.keys(buildingResponse.data.features[0].properties || {});
        console.log('Available properties:', properties.slice(0, 10).join(', '));
      }
    } else {
      console.log('No GeoJSON features in response');
    }

  } catch (error) {
    console.error('❌ BygningWFS request failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response sample:', error.response.data.substring(0, 500));
    }
  }
}

// Run test
if (require.main === module) {
  testWFSCapabilities()
    .then(() => console.log('\n🏁 WFS endpoint testing complete'))
    .catch(error => console.error('Fatal error:', error));
}

module.exports = { testWFSCapabilities };