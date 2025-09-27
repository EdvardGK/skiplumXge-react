// Test finding Strangata 39 in Vinstra
const testStrangata = async () => {
  console.log('🔍 Searching for: Strangata 39 Vinstra\n');

  try {
    // Step 1: Search for the address
    const searchQuery = 'strangata 39 vinstra';
    console.log('1. Searching addresses...');
    const addressResponse = await fetch(`http://localhost:3008/api/addresses/search?q=${encodeURIComponent(searchQuery)}`);
    const addressData = await addressResponse.json();

    console.log('Response status:', addressResponse.status);
    console.log('Response data:', JSON.stringify(addressData, null, 2));
    console.log('');

    if (addressData.success && addressData.addresses?.length > 0) {
      console.log(`✅ Found ${addressData.addresses.length} addresses:\n`);

      // Show all found addresses
      addressData.addresses.forEach((addr, i) => {
        console.log(`Address ${i + 1}:`);
        console.log(`  Text: ${addr.adressetekst}`);
        console.log(`  Post: ${addr.postnummer} ${addr.poststed}`);
        console.log(`  Matrikkel: ${addr.kommunenr}-${addr.gardsnr}/${addr.bruksnr}`);
        console.log(`  Coordinates: ${addr.lat}, ${addr.lng}`);
        console.log('');
      });

      // Step 2: Get building data for the first address
      const firstAddr = addressData.addresses[0];
      console.log(`2. Fetching buildings for: ${firstAddr.kommunenr}-${firstAddr.gardsnr}/${firstAddr.bruksnr}`);

      const buildingResponse = await fetch(
        `http://localhost:3008/api/buildings/${firstAddr.kommunenr}/${firstAddr.gardsnr}/${firstAddr.bruksnr}`
      );
      const buildingData = await buildingResponse.json();

      console.log('Building response:', JSON.stringify(buildingData, null, 2).substring(0, 500) + '...');

      if (buildingData.success && buildingData.buildings?.length > 0) {
        console.log(`\n✅ Found ${buildingData.buildings.length} buildings`);

        // Show first few buildings
        buildingData.buildings.slice(0, 3).forEach((building, i) => {
          console.log(`\nBuilding ${i + 1}:`);
          console.log(`  Number: ${building.bygningsnummer}`);
          console.log(`  Type: ${building.bygningstype?.beskrivelse}`);
          console.log(`  BRA: ${building.bruksareal} m²`);
          console.log(`  BYA: ${building.bebygdAreal} m²`);
          console.log(`  Year: ${building.byggeaar}`);
          console.log(`  Floors: ${building.antallEtasjer}`);
        });
      } else {
        console.log('❌ No buildings found for this property');
      }
    } else {
      console.log('❌ No addresses found');
      console.log('Response:', addressData);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
};

testStrangata();