/**
 * Test Matrikkel API with property 3201-7-54
 */

require('dotenv').config({ path: '../../../.env.local' });
const soap = require('soap');

// Credentials
const MATRIKKEL_USER = process.env.matrikkel_user || 'skiplum_matrikkeltest';
const MATRIKKEL_PASS = process.env.matrikkel_pass || 'EFP4d74EHPaqe8jbyhcppH5Lr7!rc?k8?KP@Lkjb';

// Service endpoints
const BASE_URL = 'https://prodtest.matrikkel.no/matrikkelapi/wsapi/v1';

// Create MatrikkelContext for all requests
function getMatrikkelContext() {
  return {
    locale: 'no_NO',
    brukOriginaleKoordinater: false,
    koordinatsystemKodeId: { value: 4258 },
    systemVersion: '1.0',
    klientIdentifikasjon: 'SkiplumEnergianalyse',
    snapshotVersion: { timestamp: '9999-01-01T00:00:00.000Z' }
  };
}

// Create SOAP client with auth
async function createClient(wsdlUrl) {
  return new Promise((resolve, reject) => {
    const options = {
      wsdl_headers: {
        'Authorization': 'Basic ' + Buffer.from(`${MATRIKKEL_USER}:${MATRIKKEL_PASS}`).toString('base64')
      }
    };

    soap.createClient(wsdlUrl, options, (err, client) => {
      if (err) reject(err);
      else {
        client.setSecurity(new soap.BasicAuthSecurity(MATRIKKEL_USER, MATRIKKEL_PASS));
        resolve(client);
      }
    });
  });
}

// Get MatrikkelenhetId from kommune/gård/bruk
async function getMatrikkelenhetId(kommune, gard, bruk) {
  const client = await createClient(`${BASE_URL}/MatrikkelenhetServiceWS?wsdl`);

  return new Promise((resolve, reject) => {
    const args = {
      matrikkelenhetIdent: {
        kommuneIdent: { kommunenummer: kommune },
        gardsnummer: gard,
        bruksnummer: bruk,
        festenummer: 0,
        seksjonsnummer: 0
      },
      matrikkelContext: getMatrikkelContext()
    };

    client.findMatrikkelenhetIdForIdent(args, (err, result) => {
      if (err) reject(err);
      else resolve(result.return.value);
    });
  });
}

// Get building IDs for a property
async function getBuildingIds(matrikkelenhetId) {
  const client = await createClient(`${BASE_URL}/BygningServiceWS?wsdl`);

  return new Promise((resolve, reject) => {
    const args = {
      matrikkelenhetId: { value: matrikkelenhetId },
      matrikkelContext: getMatrikkelContext()
    };

    client.findByggForMatrikkelenhet(args, (err, result) => {
      if (err) reject(err);
      else {
        const items = result.return?.item;
        if (!items) resolve([]);
        else if (Array.isArray(items)) resolve(items.map(item => item.value));
        else resolve([items.value]);
      }
    });
  });
}

// Test the property
async function testProperty() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║         MATRIKKEL API TEST - PROPERTY 3201-7-54         ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const testProperty = {
    kommune: '3201',
    gard: 7,
    bruk: 54
  };

  try {
    console.log(`📍 Testing Property: ${testProperty.kommune}-${testProperty.gard}-${testProperty.bruk}`);
    console.log(`   Kommune: ${testProperty.kommune} (likely Bærum or nearby)`);
    console.log(`   Gård: ${testProperty.gard}`);
    console.log(`   Bruk: ${testProperty.bruk}\n`);

    console.log('─'.repeat(60));
    console.log('STEP 1: Getting MatrikkelenhetId');
    console.log('─'.repeat(60));

    const matrikkelenhetId = await getMatrikkelenhetId(
      testProperty.kommune,
      testProperty.gard,
      testProperty.bruk
    );

    console.log(`✅ SUCCESS: MatrikkelenhetId = ${matrikkelenhetId}\n`);

    console.log('─'.repeat(60));
    console.log('STEP 2: Getting Building IDs');
    console.log('─'.repeat(60));

    const buildingIds = await getBuildingIds(matrikkelenhetId);

    console.log(`✅ SUCCESS: Found ${buildingIds.length} buildings`);

    if (buildingIds.length === 0) {
      console.log('   ⚠️  No buildings found on this property');
    } else {
      buildingIds.forEach((id, index) => {
        console.log(`   Building ${index + 1}: ID ${id}`);
      });
    }

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║                    RESULTS SUMMARY                       ║');
    console.log('╚══════════════════════════════════════════════════════════╝');

    console.log('\n📊 PROPERTY DATA:');
    console.log(`   Property: ${testProperty.kommune}-${testProperty.gard}-${testProperty.bruk}`);
    console.log(`   MatrikkelenhetId: ${matrikkelenhetId}`);
    console.log(`   Total Buildings: ${buildingIds.length}`);

    if (buildingIds.length > 0) {
      console.log(`   Building IDs: ${buildingIds.join(', ')}`);
    }

    // Return the data
    return {
      success: true,
      property: `${testProperty.kommune}-${testProperty.gard}-${testProperty.bruk}`,
      matrikkelenhetId: matrikkelenhetId,
      buildingIds: buildingIds,
      buildingCount: buildingIds.length
    };

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\nPossible reasons:');
    console.log('   • Property does not exist');
    console.log('   • Property has different festenummer');
    console.log('   • Kommune code might be incorrect');

    return {
      success: false,
      property: `${testProperty.kommune}-${testProperty.gard}-${testProperty.bruk}`,
      error: error.message
    };
  }
}

// Run the test
(async () => {
  const result = await testProperty();
  console.log('\n📦 Result object:', JSON.stringify(result, null, 2));
})();