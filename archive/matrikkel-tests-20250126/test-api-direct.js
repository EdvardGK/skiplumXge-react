// Direct test of Matrikkel API integration
const testMatrikkelAPI = async () => {
  console.log('🧪 Testing Matrikkel API Integration...\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing Health Check...');
    const healthResponse = await fetch('http://localhost:3007/health');
    const healthData = await healthResponse.json();
    console.log('✅ Health Status:', healthData);
    console.log('');

    // Test 2: Address Search
    console.log('2. Testing Address Search (hesthagen 16 vinstra)...');
    const addressResponse = await fetch('http://localhost:3007/api/addresses/search?q=hesthagen%2016%20vinstra');
    const addressData = await addressResponse.json();
    console.log('✅ Found', addressData.addresses?.length || 0, 'addresses');
    if (addressData.addresses?.[0]) {
      console.log('   First result:', {
        text: addressData.addresses[0].adressetekst,
        poststed: addressData.addresses[0].poststed,
        matrikkel: `${addressData.addresses[0].kommunenr}-${addressData.addresses[0].gardsnr}/${addressData.addresses[0].bruksnr}`
      });
    }
    console.log('');

    // Test 3: Building Data
    console.log('3. Testing Building Data (3436-285/57)...');
    const buildingResponse = await fetch('http://localhost:3007/api/buildings/3436/285/57');
    const buildingData = await buildingResponse.json();
    console.log('✅ Found', buildingData.buildings?.length || 0, 'buildings');
    if (buildingData.buildings?.[0]) {
      const building = buildingData.buildings[0];
      console.log('   First building:', {
        bygningsnummer: building.bygningsnummer,
        type: building.bygningstype?.beskrivelse,
        BRA: building.bruksareal + ' m²',
        BYA: building.bebygdAreal + ' m²',
        byggeaar: building.byggeaar,
        etasjer: building.antallEtasjer
      });
    }
    console.log('');

    // Test 4: Test Any Building endpoint
    console.log('4. Testing Any Building endpoint...');
    const testResponse = await fetch('http://localhost:3007/api/test/any-building');
    const testData = await testResponse.json();
    console.log('✅ Test endpoint returned:', testData.buildings?.length || 0, 'buildings');
    console.log('');

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    console.error('\nMake sure the Matrikkel proxy server is running on port 3007');
  }
};

testMatrikkelAPI();