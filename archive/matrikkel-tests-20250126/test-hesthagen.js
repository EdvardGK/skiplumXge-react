// Search for Hesthagen 16 in Vinstra
const testHesthagen = async () => {
  console.log('🔍 Searching for: Hesthagen 16 Vinstra\n');

  try {
    // Step 1: Search for the address
    const searchQuery = 'hesthagen 16 vinstra';
    console.log('1. Searching addresses via Kartverket...');
    const addressResponse = await fetch(`http://localhost:3008/api/addresses/search?q=${encodeURIComponent(searchQuery)}`);
    const addressData = await addressResponse.json();

    if (addressData.success && addressData.addresses?.length > 0) {
      console.log(`✅ Found ${addressData.addresses.length} addresses:\n`);

      addressData.addresses.forEach((addr, i) => {
        console.log(`Address ${i + 1}:`);
        console.log(`  Text: ${addr.adressetekst}`);
        console.log(`  Post: ${addr.postnummer} ${addr.poststed}`);
        console.log(`  Matrikkel: ${addr.kommunenr}-${addr.gardsnr}/${addr.bruksnr}`);
        console.log(`  Coordinates: ${addr.lat}, ${addr.lng}`);
        console.log('');
      });

      // Get the matrikkel numbers for SoapUI
      const firstAddr = addressData.addresses[0];
      console.log('=' .repeat(60));
      console.log('📋 FOR SOAPUI TESTING:');
      console.log('=' .repeat(60));
      console.log(`Kommune: ${firstAddr.kommunenr}`);
      console.log(`Gård: ${firstAddr.gardsnr}`);
      console.log(`Bruk: ${firstAddr.bruksnr}`);
      console.log('');
      console.log('CQL_FILTER for SoapUI:');
      console.log(`KOMMUNENR='${firstAddr.kommunenr}' AND GARDSNR=${firstAddr.gardsnr} AND BRUKSNR=${firstAddr.bruksnr}`);
      console.log('');
      console.log('Full WFS URL for buildings:');
      console.log(`https://prodtest.matrikkel.no/geoservergeo/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=matrikkel:BYGNINGWFS&CQL_FILTER=KOMMUNENR='${firstAddr.kommunenr}'+AND+GARDSNR=${firstAddr.gardsnr}+AND+BRUKSNR=${firstAddr.bruksnr}`);

    } else {
      console.log('❌ No addresses found');
      console.log('Response:', addressData);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

testHesthagen();