const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const parentPageId = process.env.NOTION_PAGE_ID;

if (!process.env.NOTION_TOKEN || !parentPageId) {
  console.error('❌ Missing NOTION_TOKEN or NOTION_PAGE_ID in .env.local');
  process.exit(1);
}

console.log('🚀 Setting up Norwegian Energy Engineering Control Center in Notion...');
console.log(`📍 Parent Page ID: ${parentPageId}`);

// Database configurations
const databases = {
  formulas: {
    title: 'Beregningsformler',
    properties: {
      'Navn': { title: {} },
      'Beskrivelse': { rich_text: {} },
      'Verdi': { number: {} },
      'Enhet': {
        select: {
          options: [
            { name: '%', color: 'blue' },
            { name: 'kWh/m²', color: 'green' },
            { name: 'm', color: 'yellow' },
            { name: 'kr', color: 'orange' },
            { name: 'år', color: 'purple' },
            { name: 'multiplier', color: 'gray' },
            { name: 'ratio', color: 'pink' }
          ]
        }
      },
      'Norsk kilde': { rich_text: {} },
      'Kategori': {
        select: {
          options: [
            { name: 'Investering', color: 'green' },
            { name: 'Energi', color: 'blue' },
            { name: 'Volum', color: 'yellow' },
            { name: 'Prisberegning', color: 'orange' }
          ]
        }
      },
      'Status': {
        select: {
          options: [
            { name: 'Utkast', color: 'gray' },
            { name: 'Under vurdering', color: 'yellow' },
            { name: 'Godkjent', color: 'green' },
            { name: 'Aktiv', color: 'blue' },
            { name: 'Arkivert', color: 'red' }
          ]
        }
      },
      'Ansvarlig ingeniør': { people: {} },
      'Sist endret': { date: {} },
      'Gyldig fra': { date: {} },
      'Kommentarer': { rich_text: {} }
    }
  },

  buildingTypes: {
    title: 'Bygningstyper og energiforbruk',
    properties: {
      'Bygningstype': {
        select: {
          options: [
            { name: 'Småhus', color: 'green' },
            { name: 'Flerbolig', color: 'blue' },
            { name: 'Kontor', color: 'purple' },
            { name: 'Handel', color: 'orange' },
            { name: 'Skole', color: 'yellow' },
            { name: 'Barnehage', color: 'pink' },
            { name: 'Sykehus', color: 'red' },
            { name: 'Hotell', color: 'brown' },
            { name: 'Kultur', color: 'gray' },
            { name: 'Idrett', color: 'green' },
            { name: 'Industri', color: 'blue' },
            { name: 'Andre', color: 'default' }
          ]
        }
      },
      'Energiforbruk kWh/m²': { number: {} },
      'Takhøyde standard (m)': { number: {} },
      'Kommersiell størrelse regel': { rich_text: {} },
      'NVE referanse': { rich_text: {} },
      'Status': {
        select: {
          options: [
            { name: 'Utkast', color: 'gray' },
            { name: 'Under vurdering', color: 'yellow' },
            { name: 'Godkjent', color: 'green' },
            { name: 'Aktiv', color: 'blue' },
            { name: 'Arkivert', color: 'red' }
          ]
        }
      },
      'Ansvarlig ingeniør': { people: {} },
      'Sist validert': { date: {} },
      'Kommentarer': { rich_text: {} }
    }
  },

  energySystems: {
    title: 'Energisystem faktorer',
    properties: {
      'System type': {
        select: {
          options: [
            { name: 'Elektrisitet', color: 'yellow' },
            { name: 'Varmepumpe', color: 'green' },
            { name: 'Fjernvarme', color: 'red' },
            { name: 'Biomasse', color: 'brown' },
            { name: 'Solenergi', color: 'orange' },
            { name: 'Gass', color: 'blue' },
            { name: 'LED', color: 'purple' },
            { name: 'Halogen', color: 'gray' },
            { name: 'Naturlig', color: 'green' },
            { name: 'Mekanisk', color: 'blue' },
            { name: 'Balansert', color: 'purple' }
          ]
        }
      },
      'Forbruk kWh/m²': { number: {} },
      'Effektivitetsfaktor': { number: {} },
      'Anvendelse': {
        select: {
          options: [
            { name: 'Oppvarming', color: 'red' },
            { name: 'Belysning', color: 'yellow' },
            { name: 'Ventilasjon', color: 'blue' },
            { name: 'Varmtvann', color: 'orange' }
          ]
        }
      },
      'Kilde': { rich_text: {} },
      'Status': {
        select: {
          options: [
            { name: 'Utkast', color: 'gray' },
            { name: 'Under vurdering', color: 'yellow' },
            { name: 'Godkjent', color: 'green' },
            { name: 'Aktiv', color: 'blue' },
            { name: 'Arkivert', color: 'red' }
          ]
        }
      },
      'Ansvarlig ingeniør': { people: {} },
      'Kommentarer': { rich_text: {} }
    }
  },

  apiEndpoints: {
    title: 'API endepunkter',
    properties: {
      'Endepunkt': { url: {} },
      'Metode': {
        select: {
          options: [
            { name: 'GET', color: 'green' },
            { name: 'POST', color: 'blue' },
            { name: 'PUT', color: 'orange' },
            { name: 'DELETE', color: 'red' }
          ]
        }
      },
      'Formål': { rich_text: {} },
      'Forespørsel eksempel': { rich_text: {} },
      'Svar eksempel': { rich_text: {} },
      'Status': {
        select: {
          options: [
            { name: 'Aktiv', color: 'green' },
            { name: 'Under utvikling', color: 'yellow' },
            { name: 'Avviklet', color: 'red' },
            { name: 'Planlagt', color: 'gray' }
          ]
        }
      },
      'Sist testet': { date: {} },
      'Responstid (ms)': { number: {} },
      'Kommentarer': { rich_text: {} }
    }
  },

  dashboardComponents: {
    title: 'Dashboard komponenter',
    properties: {
      'Komponent navn': { title: {} },
      'Norsk visningsnavn': { rich_text: {} },
      'Beskrivelse': { rich_text: {} },
      'Type': {
        select: {
          options: [
            { name: 'Energikort', color: 'green' },
            { name: 'Investeringskort', color: 'blue' },
            { name: 'Kart', color: 'orange' },
            { name: 'Graf', color: 'purple' },
            { name: 'Handlingskort', color: 'yellow' }
          ]
        }
      },
      'Status': {
        select: {
          options: [
            { name: 'Aktiv', color: 'green' },
            { name: 'Test', color: 'yellow' },
            { name: 'Arkivert', color: 'red' }
          ]
        }
      },
      'Datakilder': { rich_text: {} },
      'Beregninger brukt': { rich_text: {} },
      'Kommentarer': { rich_text: {} }
    }
  }
};

async function createDatabase(key, config) {
  try {
    console.log(`📊 Creating database: ${config.title}...`);

    const response = await notion.databases.create({
      parent: {
        type: "page_id",
        page_id: parentPageId
      },
      title: [
        {
          text: {
            content: config.title
          }
        }
      ],
      properties: config.properties
    });

    console.log(`✅ Created: ${config.title} (ID: ${response.id})`);
    return response;
  } catch (error) {
    console.error(`❌ Failed to create ${config.title}:`, error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('\n🏗️  Creating Norwegian databases...\n');

    const createdDatabases = {};

    // Create all databases
    for (const [key, config] of Object.entries(databases)) {
      const database = await createDatabase(key, config);
      createdDatabases[key] = database;

      // Add small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n🎉 All databases created successfully!');
    console.log('\n📋 Database Summary:');

    for (const [key, db] of Object.entries(createdDatabases)) {
      console.log(`   • ${databases[key].title}: ${db.id}`);
    }

    console.log('\n📝 Next steps:');
    console.log('   1. Visit your Notion page to see the new databases');
    console.log('   2. Add team members to databases with appropriate permissions');
    console.log('   3. Run data population script to fill with current values');
    console.log('   4. Set up API integration for live editing');

    // Save database IDs for future reference
    const dbIds = {};
    for (const [key, db] of Object.entries(createdDatabases)) {
      dbIds[key] = db.id;
    }

    fs.writeFileSync(
      path.join(__dirname, 'notion-database-ids.json'),
      JSON.stringify(dbIds, null, 2)
    );

    console.log('\n💾 Database IDs saved to notion-database-ids.json');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
main();