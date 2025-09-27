/**
 * Direct WFS Test
 * Test WFS functionality with known cadastral reference
 */

const { getPropertyParcelWFS, getBuildingsWFS, buildTeigCQLFilter, buildBygningCQLFilter } = require('./matrikkel-wfs-client');

async function testWFSDirect() {
  console.log('🧪 Testing WFS directly with known cadastral reference');
  console.log('Property: 3436-285-57 (Hesthagen 16, Vinstra)\n');

  const matrikkelRef = {
    kommunenr: '3436',
    gardsnr: 285,
    bruksnr: 57,
    festenr: 0,
    seksjonsnr: 0
  };

  try {
    // Test 1: Property Parcel Query
    console.log('='.repeat(50));
    console.log('TEST 1: Property Parcel (TeigWFS)');
    console.log('='.repeat(50));

    const parcelResult = await getPropertyParcelWFS(matrikkelRef);
    console.log('Parcel result:', JSON.stringify(parcelResult, null, 2));

    // Test 2: Building Query
    console.log('\n' + '='.repeat(50));
    console.log('TEST 2: Buildings (BygningWFS)');
    console.log('='.repeat(50));

    const buildingResult = await getBuildingsWFS(matrikkelRef);
    console.log('Building result:', JSON.stringify(buildingResult, null, 2));

    // Test 3: Show CQL filters
    console.log('\n' + '='.repeat(50));
    console.log('TEST 3: CQL Filters');
    console.log('='.repeat(50));

    const teigFilter = buildTeigCQLFilter(matrikkelRef.kommunenr, matrikkelRef.gardsnr, matrikkelRef.bruksnr, matrikkelRef.festenr, matrikkelRef.seksjonsnr);
    const bygningFilter = buildBygningCQLFilter(matrikkelRef.kommunenr, matrikkelRef.gardsnr, matrikkelRef.bruksnr, matrikkelRef.festenr, matrikkelRef.seksjonsnr);

    console.log('TeigWFS filter:', teigFilter);
    console.log('BygningWFS filter:', bygningFilter);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run test
if (require.main === module) {
  testWFSDirect();
}

module.exports = { testWFSDirect };