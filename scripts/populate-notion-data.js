const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

console.log('📊 Populating Notion databases with current values...\n');

// Load database IDs and extracted data
let databaseIds;
let extractedData;

try {
  databaseIds = JSON.parse(fs.readFileSync(path.join(__dirname, 'notion-database-ids.json'), 'utf8'));
  extractedData = JSON.parse(fs.readFileSync(path.join(__dirname, 'extracted-values.json'), 'utf8'));
} catch (error) {
  console.error('❌ Missing required files. Run setup-notion.js and extract-current-values.js first.');
  process.exit(1);
}

// Helper function to create database entries
async function createDatabaseEntry(databaseId, properties) {
  try {
    const response = await notion.pages.create({
      parent: { database_id: databaseId },
      properties
    });
    return response;
  } catch (error) {
    console.error(`❌ Failed to create entry:`, error.message);
    throw error;
  }
}

// Populate formulas database
async function populateFormulas() {
  console.log('🧮 Populating Beregningsformler...');

  const formulas = [
    {
      name: 'norwegian_discount_rate',
      description: 'Norsk diskonteringsrente for energiinvesteringer',
      value: extractedData.energyCalculations.constants.discountRate || 0.06,
      unit: '%',
      source: 'Konservativ diskonteringsrente for energioppgraderinger',
      category: 'Investering',
      status: 'Aktiv'
    },
    {
      name: 'investment_period_years',
      description: 'Standard investeringsperiode for energioppgraderinger',
      value: extractedData.energyCalculations.constants.investmentPeriod || 10,
      unit: 'år',
      source: 'Standard investeringsperiode for energioppgraderinger',
      category: 'Investering',
      status: 'Aktiv'
    },
    {
      name: 'heated_area_ratio',
      description: 'Andel oppvarmet areal av total BRA',
      value: 0.92,
      unit: 'ratio',
      source: 'Norsk standard for oppvarmet areal',
      category: 'Volum',
      status: 'Aktiv'
    },
    {
      name: 'top_floor_reduction',
      description: 'Reduksjonsfaktor for øverste etasje pga takstrukturer',
      value: 0.7,
      unit: 'ratio',
      source: 'Norske byggeregler - takstrukturer og arkitektoniske trekk',
      category: 'Volum',
      status: 'Aktiv'
    }
  ];

  for (const formula of formulas) {
    const properties = {
      'Navn': { title: [{ text: { content: formula.name } }] },
      'Beskrivelse': { rich_text: [{ text: { content: formula.description } }] },
      'Verdi': { number: formula.value },
      'Enhet': { select: { name: formula.unit } },
      'Norsk kilde': { rich_text: [{ text: { content: formula.source } }] },
      'Kategori': { select: { name: formula.category } },
      'Status': { select: { name: formula.status } },
      'Gyldig fra': { date: { start: new Date().toISOString().split('T')[0] } }
    };

    await createDatabaseEntry(databaseIds.formulas, properties);
    console.log(`   ✅ ${formula.name}`);

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

// Populate building types database
async function populateBuildingTypes() {
  console.log('\n🏢 Populating Bygningstyper og energiforbruk...');

  const ceilingHeights = {
    'Småhus': 2.4,
    'Flerbolig': 2.4,
    'Kontor': 2.7,
    'Skole': 2.7,
    'Barnehage': 2.7,
    'Sykehus': 2.7,
    'Hotell': 2.7,
    'Kultur': 2.7,
    'Handel': 3.0, // Average - varies by size
    'Idrett': 6.0,
    'Industri': 4.5,
    'Andre': 2.7
  };

  const nveReferences = {
    'Småhus': 'SSB 2022 - Husholdningsforbruk',
    'Flerbolig': 'SSB 2022 - Husholdningsforbruk',
    'Barnehage': 'NVE Rapport 2019-31',
    'Kontor': 'NVE Rapport 2019-31 - Kontorbygg',
    'Skole': 'NVE Rapport 2019-31',
    'Sykehus': 'NVE Rapport 2019-31',
    'Hotell': 'NVE Rapport 2019-31',
    'Handel': 'NVE Rapport 2019-31 - Forretningsbygg',
    'Kultur': 'NVE Rapport 2019-31 - Kulturbygg',
    'Idrett': 'NVE Rapport 2019-31 - Idrettsbygg',
    'Industri': 'NVE Rapport 2019-31 - Lett industri/verksted',
    'Andre': 'NVE Rapport 2019-31'
  };

  for (const [buildingType, energyConsumption] of Object.entries(extractedData.buildingStandards.energyConsumption)) {
    const properties = {
      'Bygningstype': { select: { name: buildingType } },
      'Energiforbruk kWh/m²': { number: energyConsumption },
      'Takhøyde standard (m)': { number: ceilingHeights[buildingType] || 2.7 },
      'NVE referanse': { rich_text: [{ text: { content: nveReferences[buildingType] || 'NVE Rapport 2019-31' } }] },
      'Status': { select: { name: 'Aktiv' } },
      'Sist validert': { date: { start: new Date().toISOString().split('T')[0] } }
    };

    // Add commercial size rules for Handel
    if (buildingType === 'Handel') {
      properties['Kommersiell størrelse regel'] = {
        rich_text: [{ text: { content: '< 150m²: 2.7m, 150-500m²: 3.0m, > 500m²: 4.5m takhøyde' } }]
      };
    }

    await createDatabaseEntry(databaseIds.buildingTypes, properties);
    console.log(`   ✅ ${buildingType}: ${energyConsumption} kWh/m², ${ceilingHeights[buildingType] || 2.7}m`);

    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

// Populate energy systems database
async function populateEnergySystems() {
  console.log('\n⚡ Populating Energisystem faktorer...');

  // Add heating systems
  for (const [system, consumption] of Object.entries(extractedData.energyCalculations.heatingConsumption)) {
    const properties = {
      'System type': { select: { name: system } },
      'Forbruk kWh/m²': { number: consumption },
      'Anvendelse': { select: { name: 'Oppvarming' } },
      'Kilde': { rich_text: [{ text: { content: 'Norske energiforbruksstandarder' } }] },
      'Status': { select: { name: 'Aktiv' } }
    };

    // Add efficiency factors
    if (system === 'Varmepumpe') {
      properties['Effektivitetsfaktor'] = { number: 3.0 }; // COP 3.0
    } else if (system === 'Elektrisitet') {
      properties['Effektivitetsfaktor'] = { number: 1.0 };
    }

    await createDatabaseEntry(databaseIds.energySystems, properties);
    console.log(`   ✅ ${system}: ${consumption} kWh/m²`);

    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Add other system types (lighting, ventilation)
  const otherSystems = [
    { type: 'LED', consumption: 15, application: 'Belysning', efficiency: 1.0 },
    { type: 'Halogen', consumption: 25, application: 'Belysning', efficiency: 0.6 },
    { type: 'Naturlig', consumption: 0, application: 'Ventilasjon', efficiency: 1.0 },
    { type: 'Mekanisk', consumption: 20, application: 'Ventilasjon', efficiency: 0.8 },
    { type: 'Balansert', consumption: 15, application: 'Ventilasjon', efficiency: 0.9 }
  ];

  for (const system of otherSystems) {
    const properties = {
      'System type': { select: { name: system.type } },
      'Forbruk kWh/m²': { number: system.consumption },
      'Effektivitetsfaktor': { number: system.efficiency },
      'Anvendelse': { select: { name: system.application } },
      'Kilde': { rich_text: [{ text: { content: 'Norske energiforbruksstandarder' } }] },
      'Status': { select: { name: 'Aktiv' } }
    };

    await createDatabaseEntry(databaseIds.energySystems, properties);
    console.log(`   ✅ ${system.type}: ${system.consumption} kWh/m² (${system.application})`);

    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

// Populate API endpoints database
async function populateAPIEndpoints() {
  console.log('\n🔗 Populating API endepunkter...');

  for (const endpoint of extractedData.apiEndpoints) {
    const properties = {
      'Endepunkt': { url: `https://landingsside-energi-react.vercel.app${endpoint.path}` },
      'Metode': { select: { name: endpoint.methods[0] } }, // Use first method
      'Formål': { rich_text: [{ text: { content: endpoint.purpose } }] },
      'Status': { select: { name: endpoint.status } },
      'Sist testet': { date: { start: new Date().toISOString().split('T')[0] } }
    };

    await createDatabaseEntry(databaseIds.apiEndpoints, properties);
    console.log(`   ✅ ${endpoint.methods.join(', ')} ${endpoint.path}`);

    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

// Populate dashboard components database
async function populateDashboardComponents() {
  console.log('\n📊 Populating Dashboard komponenter...');

  for (const component of extractedData.dashboardComponents) {
    const properties = {
      'Komponent navn': { title: [{ text: { content: component.id } }] },
      'Norsk visningsnavn': { rich_text: [{ text: { content: component.displayName } }] },
      'Type': { select: { name: component.type } },
      'Status': { select: { name: component.status } },
      'Beskrivelse': { rich_text: [{ text: { content: `Dashboard komponent: ${component.displayName}` } }] }
    };

    await createDatabaseEntry(databaseIds.dashboardComponents, properties);
    console.log(`   ✅ ${component.id} - ${component.displayName}`);

    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

// Main population function
async function main() {
  try {
    await populateFormulas();
    await populateBuildingTypes();
    await populateEnergySystems();
    await populateAPIEndpoints();
    await populateDashboardComponents();

    console.log('\n🎉 All databases populated successfully!');
    console.log('\n📋 Summary:');
    console.log('   • Beregningsformler: Core calculation formulas');
    console.log('   • Bygningstyper: Building types with energy consumption and ceiling heights');
    console.log('   • Energisystem faktorer: Energy system consumption factors');
    console.log('   • API endepunkter: Current API endpoints');
    console.log('   • Dashboard komponenter: Dashboard tiles and components');

    console.log('\n📝 Next steps:');
    console.log('   1. Review data in Notion');
    console.log('   2. Assign engineers to validate formulas');
    console.log('   3. Set up API integration for live editing');
    console.log('   4. Configure webhooks for real-time updates');

  } catch (error) {
    console.error('\n❌ Population failed:', error.message);
    process.exit(1);
  }
}

main();