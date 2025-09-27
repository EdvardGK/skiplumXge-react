/**
 * Test what SOAP services and methods are available
 */

require('dotenv').config({ path: '../../../.env.local' });
const soap = require('soap');

const MATRIKKEL_USER = process.env.matrikkel_user || 'skiplum_matrikkeltest';
const MATRIKKEL_PASS = process.env.matrikkel_pass || 'EFP4d74EHPaqe8jbyhcppH5Lr7!rc?k8?KP@Lkjb';

async function exploreService(serviceName, wsdlUrl) {
  console.log(`\n========== ${serviceName} ==========`);
  console.log(`WSDL: ${wsdlUrl}`);

  try {
    const authHeader = 'Basic ' + Buffer.from(`${MATRIKKEL_USER}:${MATRIKKEL_PASS}`).toString('base64');

    const client = await new Promise((resolve, reject) => {
      soap.createClient(wsdlUrl, {
        wsdl_headers: {
          'Authorization': authHeader
        }
      }, (err, client) => {
        if (err) {
          reject(err);
          return;
        }
        client.setSecurity(new soap.BasicAuthSecurity(MATRIKKEL_USER, MATRIKKEL_PASS));
        resolve(client);
      });
    });

    // List all available methods
    console.log('\nAvailable methods:');
    const describe = client.describe();

    // Navigate through the service structure
    for (const service in describe) {
      console.log(`Service: ${service}`);
      for (const port in describe[service]) {
        console.log(`  Port: ${port}`);
        for (const method in describe[service][port]) {
          console.log(`    - ${method}`);
        }
      }
    }

    return client;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('Exploring Matrikkel SOAP Services...');
  console.log('Credentials:', MATRIKKEL_USER ? '✅ Set' : '❌ Missing');

  // Test StoreService
  await exploreService(
    'StoreService',
    'https://prodtest.matrikkel.no/matrikkelapi/wsapi/v1/StoreServiceWS?wsdl'
  );

  // Test BygningService
  const bygningClient = await exploreService(
    'BygningService',
    'https://prodtest.matrikkel.no/matrikkelapi/wsapi/v1/BygningServiceWS?wsdl'
  );

  // Test MatrikkelenhetService
  await exploreService(
    'MatrikkelenhetService',
    'https://prodtest.matrikkel.no/matrikkelapi/wsapi/v1/MatrikkelenhetServiceWS?wsdl'
  );
}

main().catch(console.error);