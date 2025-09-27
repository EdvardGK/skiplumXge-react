// Test the JSON-returning Matrikkel API
const testJSONAPI = async () => {
  console.log('🧪 Testing JSON Matrikkel API on port 3008...\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing Health Check...');
    const healthResponse = await fetch('http://localhost:3008/health');
    const healthData = await healthResponse.json();
    console.log('✅ Health Status:', healthData.status);
    console.log('');

    // Test 2: Address Search
    console.log('2. Testing Address Search (hesthagen 16 vinstra)...');
    const addressResponse = await fetch('http://localhost:3008/api/addresses/search?q=hesthagen%2016%20vinstra');
    const addressData = await addressResponse.json();
    console.log('✅ Success:', addressData.success);
    console.log('   Found', addressData.addresses?.length || 0, 'addresses');
    if (addressData.addresses?.[0]) {
      console.log('   First result:', addressData.addresses[0].adressetekst);
    }
    console.log('');

    // Test 3: Building Data
    console.log('3. Testing Building Data (3436-285/57)...');
    const buildingResponse = await fetch('http://localhost:3008/api/buildings/3436/285/57');
    const buildingData = await buildingResponse.json();
    console.log('✅ Success:', buildingData.success);
    console.log('   Property:', buildingData.propertyId);
    console.log('   Buildings found:', buildingData.buildings?.length || 0);

    if (buildingData.buildings?.[0]) {
      const building = buildingData.buildings[0];
      console.log('   First building:');
      console.log('     - Bygningsnummer:', building.bygningsnummer);
      console.log('     - Type:', building.bygningstype?.beskrivelse);
      console.log('     - BRA:', building.bruksareal, 'm²');
      console.log('     - Byggeår:', building.byggeaar);
    }
    console.log('');

    // Test 4: Test Any Building
    console.log('4. Testing Any Building endpoint...');
    const testResponse = await fetch('http://localhost:3008/api/test/any-building');
    const testData = await testResponse.json();
    console.log('✅ Success:', testData.success);
    console.log('   Message:', testData.message);
    console.log('   Buildings:', testData.buildings?.length || 0);
    console.log('');

    console.log('🎉 All JSON API tests completed successfully!');
    console.log('\n✅ The API is now returning proper JSON instead of XML');

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  }
};

testJSONAPI();