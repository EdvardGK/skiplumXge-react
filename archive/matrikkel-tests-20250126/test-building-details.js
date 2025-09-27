// Test getting detailed building information for Strandgata 39
const testBuildingDetails = async () => {
  console.log('🏢 Getting detailed building data for Strandgata 39 (3436-290/22)\n');

  try {
    // Fetch buildings
    const response = await fetch('http://localhost:3008/api/buildings/3436/290/22');
    const data = await response.json();

    console.log('Total buildings found:', data.buildings?.length || 0);
    console.log('\nDetailed Building Information:\n');
    console.log('=' .repeat(80));

    if (data.buildings && data.buildings.length > 0) {
      // Filter to find main buildings (residential/commercial)
      const mainBuildings = data.buildings.filter(b => {
        const typeCode = parseInt(b.bygningstype?.kode);
        // Residential types: 111-199, Commercial: 300-399, Industrial: 200-299
        return typeCode >= 111 && typeCode <= 399;
      });

      console.log('Main buildings (residential/commercial):', mainBuildings.length);
      console.log('\nAll buildings with details:\n');

      data.buildings.forEach((building, idx) => {
        console.log(`Building ${idx + 1}:`);
        console.log(`  Bygningsnummer: ${building.bygningsnummer}`);
        console.log(`  Type: ${building.bygningstype?.kode} - ${building.bygningstype?.beskrivelse}`);
        console.log(`  Bruksareal (BRA): ${building.bruksareal || 0} m²`);
        console.log(`  Bebygd areal (BYA): ${building.bebygdAreal || 0} m²`);
        console.log(`  Byggeår: ${building.byggeaar || 'Ukjent'}`);
        console.log(`  Etasjer: ${building.antallEtasjer || 1}`);

        if (building.representasjonspunkt) {
          console.log(`  Koordinater: ${building.representasjonspunkt.lat}, ${building.representasjonspunkt.lng}`);
        }
        console.log('');
      });

      // Summary statistics
      const totalBRA = data.buildings.reduce((sum, b) => sum + (b.bruksareal || 0), 0);
      const totalBYA = data.buildings.reduce((sum, b) => sum + (b.bebygdAreal || 0), 0);
      const buildingsWithYear = data.buildings.filter(b => b.byggeaar).length;
      const oldestYear = Math.min(...data.buildings.filter(b => b.byggeaar).map(b => b.byggeaar));
      const newestYear = Math.max(...data.buildings.filter(b => b.byggeaar).map(b => b.byggeaar));

      console.log('=' .repeat(80));
      console.log('\nSUMMARY:');
      console.log(`  Total Bruksareal: ${totalBRA} m²`);
      console.log(`  Total Bebygd areal: ${totalBYA} m²`);
      console.log(`  Buildings with known year: ${buildingsWithYear}/${data.buildings.length}`);
      if (buildingsWithYear > 0) {
        console.log(`  Oldest building: ${oldestYear}`);
        console.log(`  Newest building: ${newestYear}`);
      }

      // Check if we need to look at a different property nearby
      if (totalBRA === 0) {
        console.log('\n⚠️  No BRA data found. This might be auxiliary buildings only.');
        console.log('The main building might be on a neighboring property.');
      }

    } else {
      console.log('No buildings found for this property');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
};

testBuildingDetails();