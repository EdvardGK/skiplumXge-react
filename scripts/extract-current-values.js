const fs = require('fs');
const path = require('path');

// Extract current values from the codebase for initial Notion population
console.log('🔍 Extracting current values from codebase...\n');

// Read and parse the Norwegian building standards file
function extractBuildingStandards() {
  const filePath = path.join(__dirname, '../src/lib/norwegian-building-standards.ts');
  const content = fs.readFileSync(filePath, 'utf8');

  // Extract energy consumption values
  const energyConsumptionMatch = content.match(/ENERGY_CONSUMPTION_PER_M2[^}]+}/s);
  const energyConsumption = {};

  if (energyConsumptionMatch) {
    const lines = energyConsumptionMatch[0].split('\n');
    lines.forEach(line => {
      const match = line.match(/'([^']+)':\s*(\d+)/);
      if (match) {
        energyConsumption[match[1]] = parseInt(match[2]);
      }
    });
  }

  console.log('🏢 Building Energy Consumption (kWh/m²):');
  for (const [type, value] of Object.entries(energyConsumption)) {
    console.log(`   ${type}: ${value} kWh/m²`);
  }

  return { energyConsumption };
}

// Extract energy calculation constants
function extractEnergyCalculations() {
  const filePath = path.join(__dirname, '../src/lib/energy-calculations.ts');
  const content = fs.readFileSync(filePath, 'utf8');

  const constants = {};

  // Extract discount rate
  const discountRateMatch = content.match(/NORWEGIAN_DISCOUNT_RATE\s*=\s*([\d.]+)/);
  if (discountRateMatch) {
    constants.discountRate = parseFloat(discountRateMatch[1]);
  }

  // Extract investment period
  const investmentPeriodMatch = content.match(/INVESTMENT_PERIOD_YEARS\s*=\s*(\d+)/);
  if (investmentPeriodMatch) {
    constants.investmentPeriod = parseInt(investmentPeriodMatch[1]);
  }

  // Extract heating consumption values
  const heatingMatch = content.match(/HEATING_CONSUMPTION[^}]+}/s);
  const heatingConsumption = {};

  if (heatingMatch) {
    const lines = heatingMatch[0].split('\n');
    lines.forEach(line => {
      const match = line.match(/'([^']+)':\s*(\d+)/);
      if (match) {
        heatingConsumption[match[1]] = parseInt(match[2]);
      }
    });
  }

  console.log('\n⚡ Energy System Factors:');
  console.log(`   Discount Rate: ${constants.discountRate * 100}%`);
  console.log(`   Investment Period: ${constants.investmentPeriod} years`);
  console.log('   Heating Systems:');
  for (const [system, value] of Object.entries(heatingConsumption)) {
    console.log(`     ${system}: ${value} kWh/m²`);
  }

  return { constants, heatingConsumption };
}

// Extract API endpoints from the codebase
function extractAPIEndpoints() {
  const apiDir = path.join(__dirname, '../src/app/api');
  const endpoints = [];

  function scanDirectory(dir, basePath = '') {
    const items = fs.readdirSync(dir);

    items.forEach(item => {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        scanDirectory(itemPath, path.join(basePath, item));
      } else if (item === 'route.ts') {
        const content = fs.readFileSync(itemPath, 'utf8');
        const methods = [];

        // Detect HTTP methods
        if (content.includes('export async function GET')) methods.push('GET');
        if (content.includes('export async function POST')) methods.push('POST');
        if (content.includes('export async function PUT')) methods.push('PUT');
        if (content.includes('export async function DELETE')) methods.push('DELETE');

        // Extract purpose from comments or endpoint name
        const endpointPath = '/api' + basePath.replace(/\\/g, '/');

        let purpose = '';
        const commentMatch = content.match(/\/\*\*\s*\n\s*\*\s*([^\n]+)/);
        if (commentMatch) {
          purpose = commentMatch[1];
        } else {
          // Guess purpose from path
          if (endpointPath.includes('addresses')) purpose = 'Adressesøk via Kartverket';
          else if (endpointPath.includes('buildings')) purpose = 'Bygningsdata fra OSM';
          else if (endpointPath.includes('electricity')) purpose = 'Strømpriser fra NVE';
          else if (endpointPath.includes('reports')) purpose = 'PDF rapport generering';
          else if (endpointPath.includes('excel')) purpose = 'Excel eksport';
          else if (endpointPath.includes('healthcheck')) purpose = 'System helsesjekk';
          else purpose = 'API endepunkt';
        }

        endpoints.push({
          path: endpointPath,
          methods,
          purpose,
          status: 'Aktiv'
        });
      }
    });
  }

  if (fs.existsSync(apiDir)) {
    scanDirectory(apiDir);
  }

  console.log('\n🔗 API Endpoints:');
  endpoints.forEach(endpoint => {
    console.log(`   ${endpoint.methods.join(', ')} ${endpoint.path} - ${endpoint.purpose}`);
  });

  return endpoints;
}

// Extract dashboard components
function extractDashboardComponents() {
  const dashboardPath = path.join(__dirname, '../src/app/dashboard/page.tsx');
  const components = [];

  if (fs.existsSync(dashboardPath)) {
    const content = fs.readFileSync(dashboardPath, 'utf8');

    // Extract tile IDs and names from dashboard grid
    const tileMatches = content.matchAll(/id="([^"]+)"/g);
    for (const match of tileMatches) {
      const tileId = match[1];
      let displayName = '';
      let type = 'Energikort';

      // Determine type and display name
      if (tileId.includes('tek17')) {
        displayName = 'TEK17 Status';
        type = 'Energikort';
      } else if (tileId.includes('enova')) {
        displayName = 'Enova Energimerking';
        type = 'Energikort';
      } else if (tileId.includes('energy-zone')) {
        displayName = 'Anbefalt første steg';
        type = 'Energikort';
      } else if (tileId.includes('roi-budget')) {
        displayName = 'ROI Budsjett';
        type = 'Investeringskort';
      } else if (tileId.includes('time-series')) {
        displayName = 'Prishistorikk graf';
        type = 'Graf';
      } else if (tileId.includes('map')) {
        displayName = 'Eiendomskart';
        type = 'Kart';
      } else if (tileId.includes('investment')) {
        displayName = 'Investeringsanalyse';
        type = 'Investeringskort';
      } else if (tileId.includes('action')) {
        displayName = tileId.replace('action-', '').replace('-', ' ');
        type = 'Handlingskort';
      }

      if (displayName) {
        components.push({
          id: tileId,
          displayName,
          type,
          status: 'Aktiv'
        });
      }
    }
  }

  console.log('\n📊 Dashboard Components:');
  components.forEach(comp => {
    console.log(`   ${comp.id} - ${comp.displayName} (${comp.type})`);
  });

  return components;
}

// Main extraction function
function main() {
  const extractedData = {
    buildingStandards: extractBuildingStandards(),
    energyCalculations: extractEnergyCalculations(),
    apiEndpoints: extractAPIEndpoints(),
    dashboardComponents: extractDashboardComponents()
  };

  // Save extracted data
  const outputPath = path.join(__dirname, 'extracted-values.json');
  fs.writeFileSync(outputPath, JSON.stringify(extractedData, null, 2));

  console.log(`\n💾 Extracted data saved to: ${outputPath}`);
  console.log('\n✅ Extraction complete! Ready for population script.');
}

main();