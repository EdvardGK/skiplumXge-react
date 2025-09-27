/**
 * Test findByggEnkel to get building details with area and year
 */

require('dotenv').config({ path: '../../../.env.local' });
const soap = require('soap');
const util = require('util');

// Credentials
const MATRIKKEL_USER = process.env.matrikkel_user || 'skiplum_matrikkeltest';
const MATRIKKEL_PASS = process.env.matrikkel_pass || 'EFP4d74EHPaqe8jbyhcppH5Lr7!rc?k8?KP@Lkjb';

// Service endpoint
const BASE_URL = 'https://prodtest.matrikkel.no/matrikkelapi/wsapi/v1';

// Create SOAP client with auth
async function createClient(wsdlUrl) {
  return new Promise((resolve, reject) => {
    const options = {
      wsdl_headers: {
        'Authorization': 'Basic ' + Buffer.from(`${MATRIKKEL_USER}:${MATRIKKEL_PASS}`).toString('base64')
      }
    };

    soap.createClient(wsdlUrl, options, (err, client) => {
      if (err) {
        reject(err);
      } else {
        client.setSecurity(new soap.BasicAuthSecurity(MATRIKKEL_USER, MATRIKKEL_PASS));
        resolve(client);
      }
    });
  });
}

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

async function testBuildingMethods() {
  console.log('🏢 Testing Building Data Retrieval Methods\n');
  console.log('=' .repeat(60));

  try {
    // Create client for BygningService
    const client = await createClient(`${BASE_URL}/BygningServiceWS?wsdl`);

    // Test building IDs we found earlier
    const byggIds = [147938306, 147938310, 147938302];

    console.log('\n📋 Testing different methods to get building data:\n');

    for (const byggId of byggIds) {
      console.log(`\nBuilding ID: ${byggId}`);
      console.log('-'.repeat(40));

      // Method 1: findByggEnkel - Simpler data structure
      console.log('\n1. Testing findByggEnkel:');
      try {
        const result = await new Promise((resolve, reject) => {
          const args = {
            bygningsnr: byggId,
            matrikkelContext: getMatrikkelContext()
          };

          client.findByggEnkel(args, (err, result) => {
            if (err) {
              console.log(`   ❌ Error: ${err.message}`);
              resolve(null);
            } else {
              resolve(result);
            }
          });
        });

        if (result && result.return) {
          console.log('   ✅ Success! Data structure:');
          console.log(util.inspect(result.return, { depth: 4, colors: true }));
        }
      } catch (error) {
        console.log(`   ⚠️ Exception: ${error.message}`);
      }

      // Method 2: findBygg - General building search
      console.log('\n2. Testing findBygg:');
      try {
        const result = await new Promise((resolve, reject) => {
          const args = {
            bygningsnr: byggId,
            matrikkelContext: getMatrikkelContext()
          };

          client.findBygg(args, (err, result) => {
            if (err) {
              console.log(`   ❌ Error: ${err.message}`);
              resolve(null);
            } else {
              resolve(result);
            }
          });
        });

        if (result && result.return) {
          console.log('   ✅ Success! Data structure:');
          console.log(util.inspect(result.return, { depth: 4, colors: true }));
        }
      } catch (error) {
        console.log(`   ⚠️ Exception: ${error.message}`);
      }

      // Only test first building to avoid too much output
      break;
    }

    // Also test getting building info objects
    console.log('\n\n3. Testing findBygningInfoObjekter for detailed info:');
    try {
      const result = await new Promise((resolve, reject) => {
        const args = {
          byggId: { value: byggIds[0] },
          matrikkelContext: getMatrikkelContext()
        };

        client.findBygningInfoObjekter(args, (err, result) => {
          if (err) {
            console.log(`   ❌ Error: ${err.message}`);
            resolve(null);
          } else {
            resolve(result);
          }
        });
      });

      if (result && result.return) {
        console.log('   ✅ Success! Info objects:');
        console.log(util.inspect(result.return, { depth: 4, colors: true }));
      }
    } catch (error) {
      console.log(`   ⚠️ Exception: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  }
}

// Run the test
(async () => {
  await testBuildingMethods();

  console.log('\n\n💡 Summary:');
  console.log('The Matrikkel SOAP API is working and we can:');
  console.log('✅ Get MatrikkelenhetId from kommune/gård/bruk');
  console.log('✅ Get building IDs for a property');
  console.log('⏳ Working on getting building details (area, year)');
  console.log('\nThe building data might be stored differently than expected.');
  console.log('We may need to use a combination of methods or check the WSDL documentation.');
})();