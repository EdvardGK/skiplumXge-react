/**
 * Test SOAP Navigation - Discover correct request structures
 */

require('dotenv').config({ path: '../../../.env.local' });
const soap = require('soap');

const MATRIKKEL_USER = process.env.matrikkel_user;
const MATRIKKEL_PASS = process.env.matrikkel_pass;

async function testMatrikkelSOAP() {
  console.log('🧪 Testing Matrikkel SOAP API Structure Discovery\n');

  const wsdl = 'https://prodtest.matrikkel.no/matrikkelapi/wsapi/v1/MatrikkelenhetServiceWS?WSDL';

  try {
    // Create client
    const client = await soap.createClientAsync(wsdl, {
      wsdl_options: { auth: `${MATRIKKEL_USER}:${MATRIKKEL_PASS}` }
    });
    client.setSecurity(new soap.BasicAuthSecurity(MATRIKKEL_USER, MATRIKKEL_PASS));

    // Get the method description for findMatrikkelenhet
    const description = client.describe();
    const service = description.MatrikkelenhetServiceWS;
    const port = service.MatrikkelenhetServicePort;
    const findMatrikkelenhetDesc = port.findMatrikkelenhet;

    console.log('📋 findMatrikkelenhet method structure:');
    console.log(JSON.stringify(findMatrikkelenhetDesc, null, 2));

    // Try different request structures based on the SOAP error
    console.log('\n🔍 Test 1: Using matrikkelenhetIdent with matrikkelnummer');
    try {
      const request1 = {
        matrikkelenhetIdent: {
          matrikkelnummer: {
            kommunenummer: "0301",
            gardsnummer: 1,
            bruksnummer: 1,
            festenummer: 0
          }
        }
      };
      console.log('Request:', JSON.stringify(request1, null, 2));

      const result1 = await client.findMatrikkelenhetAsync(request1);
      console.log('✅ Success! Result:', JSON.stringify(result1[0], null, 2).substring(0, 1000));
    } catch (error) {
      console.log('❌ Error:', error.message);
    }

    // Try findMatrikkelenheter (plural) with different structure
    console.log('\n🔍 Test 2: Using findMatrikkelenheter with direct parameters');
    try {
      const request2 = {
        kommunenummer: "0301",
        gardsnummer: 1,
        bruksnummer: 1,
        festenummer: 0
      };
      console.log('Request:', JSON.stringify(request2, null, 2));

      const result2 = await client.findMatrikkelenheterAsync(request2);
      console.log('✅ Success! Result:', JSON.stringify(result2[0], null, 2).substring(0, 1000));
    } catch (error) {
      console.log('❌ Error:', error.message);
    }

    // Try with matrikkelenhetId if we know one
    console.log('\n🔍 Test 3: Using findMatrikkelenhet with matrikkelenhetId');
    try {
      // We would need to know an actual ID, but let's try with a structure
      const request3 = {
        matrikkelenhetIdent: {
          matrikkelenhetId: "123456789" // Example ID
        }
      };
      console.log('Request:', JSON.stringify(request3, null, 2));

      const result3 = await client.findMatrikkelenhetAsync(request3);
      console.log('✅ Success! Result:', JSON.stringify(result3[0], null, 2).substring(0, 1000));
    } catch (error) {
      console.log('❌ Error:', error.message);
    }

    // Let's also check BygningService structure
    console.log('\n📋 Checking BygningServiceWS operations:');
    const bygningWsdl = 'https://prodtest.matrikkel.no/matrikkelapi/wsapi/v1/BygningServiceWS?WSDL';
    const bygningClient = await soap.createClientAsync(bygningWsdl, {
      wsdl_options: { auth: `${MATRIKKEL_USER}:${MATRIKKEL_PASS}` }
    });
    bygningClient.setSecurity(new soap.BasicAuthSecurity(MATRIKKEL_USER, MATRIKKEL_PASS));

    const bygningDesc = bygningClient.describe();
    const bygningOps = Object.keys(bygningDesc.BygningServiceWS.BygningServicePort);
    console.log('Available operations:', bygningOps.filter(op => op.includes('find')).join(', '));

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  }
}

testMatrikkelSOAP();