// server.js - Matrikkel API Proxy Server
const express = require('express');
const soap = require('soap');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Configuration
const config = {
  baseUrl: process.env.MATRIKKEL_TEST_URL || 'https://prodtest.matrikkel.no/matrikkelapi/wsapi/v1/',
  username: process.env.MATRIKKEL_USERNAME,
  password: process.env.MATRIKKEL_PASSWORD,
  systemVersion: '3.17.0'
};

// Service clients cache
const serviceClients = {};

// Create SOAP client with auth
async function getServiceClient(serviceName) {
  if (!serviceClients[serviceName]) {
    const wsdlUrl = `${config.baseUrl}${serviceName}WS.wsdl`;
    
    try {
      const client = await soap.createClientAsync(wsdlUrl, {
        wsdl_headers: {
          Authorization: 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64')
        }
      });
      
      client.setSecurity(new soap.BasicAuthSecurity(config.username, config.password));
      serviceClients[serviceName] = client;
    } catch (error) {
      console.error(`Failed to create client for ${serviceName}:`, error);
      throw error;
    }
  }
  return serviceClients[serviceName];
}

// Create MatrikkelContext for all requests
function createMatrikkelContext() {
  return {
    klientIdentifikasjon: 'ReactApp',
    locale: 'no_NO_B',
    systemVersion: config.systemVersion,
    snapshotVersion: {
      timestamp: '9999-01-01T00:00:00+01:00'
    },
    koordinatsystemKodeId: {
      value: 10
    },
    brukOriginaleKoordinater: false
  };
}

// GET /api/buildings/:kommunenr/:gardsnr/:bruksnr
app.get('/api/buildings/:kommunenr/:gardsnr/:bruksnr', async (req, res) => {
  try {
    const { kommunenr, gardsnr, bruksnr } = req.params;
    const { festenr = 0, seksjonsnr = 0 } = req.query;
    
    // First, find the matrikkelenhet ID
    const matrikkelenhetService = await getServiceClient('MatrikkelenhetService');
    const context = createMatrikkelContext();
    
    const matrikkelenhetIdent = {
      kommuneIdent: {
        kommunenummer: kommunenr
      },
      gardsnummer: parseInt(gardsnr),
      bruksnummer: parseInt(bruksnr),
      festenummer: parseInt(festenr),
      seksjonsnummer: parseInt(seksjonsnr)
    };
    
    // Get matrikkelenhet ID
    const [matrikkelenhetIdResult] = await matrikkelenhetService.findMatrikkelenhetIdForIdentAsync({
      matrikkelenhetIdent,
      matrikkelContext: context
    });
    
    if (!matrikkelenhetIdResult || !matrikkelenhetIdResult.return) {
      return res.status(404).json({ error: 'Property unit not found' });
    }
    
    const matrikkelenhetId = matrikkelenhetIdResult.return;
    
    // Get building IDs for this matrikkelenhet
    const bygningService = await getServiceClient('BygningService');
    const [bygningIdsResult] = await bygningService.findBygningIdsForMatrikkelenhetAsync({
      matrikkelenhetIds: [matrikkelenhetId],
      matrikkelContext: context
    });
    
    if (!bygningIdsResult || !bygningIdsResult.return || bygningIdsResult.return.length === 0) {
      return res.json({ buildings: [] });
    }
    
    // Fetch full building objects
    const storeService = await getServiceClient('StoreService');
    const buildings = [];
    
    for (const bygningId of bygningIdsResult.return) {
      const [buildingResult] = await storeService.getObjectAsync({
        id: bygningId,
        matrikkelContext: context
      });
      
      if (buildingResult && buildingResult.return) {
        const building = buildingResult.return;
        
        // Extract relevant building information
        const buildingInfo = {
          bygningsnummer: building.bygningsnummer,
          bygningstype: building.bygningstype,
          bygningsstatus: building.bygningsstatus,
          // Building areas
          bebygdAreal: building.bebygdAreal, // BYA
          bruksareal: building.bruksareal,   // BRA
          // Year built
          byggeaar: building.byggeaar,
          // Floors
          antallEtasjer: building.antallEtasjer,
          // Additional info
          vannforsyning: building.vannforsyning,
          avlop: building.avlop,
          // Coordinates (if available)
          representasjonspunkt: building.representasjonspunkt,
          // Bruksenheter (units/apartments)
          bruksenheter: []
        };
        
        // Get bruksenheter (units) for this building
        if (bygningId) {
          try {
            const [bruksenhetResult] = await bygningService.findBruksenheterForBygningAsync({
              bygningId: bygningId,
              matrikkelContext: context
            });
            
            if (bruksenhetResult && bruksenhetResult.return) {
              buildingInfo.bruksenheter = bruksenhetResult.return.map(unit => ({
                bruksenhetsnummer: unit.bruksenhetsnummer,
                bruksenhetstype: unit.bruksenhetstype,
                bruksareal: unit.bruksareal,
                antallRom: unit.antallRom,
                antallBad: unit.antallBad,
                antallWC: unit.antallWC,
                kjokken: unit.kjokken,
                etasjenummer: unit.etasjenummer,
                etasjeplan: unit.etasjeplan
              }));
            }
          } catch (unitError) {
            console.error('Error fetching bruksenheter:', unitError);
          }
        }
        
        buildings.push(buildingInfo);
      }
    }
    
    res.json({ buildings });
    
  } catch (error) {
    console.error('Error fetching buildings:', error);
    res.status(500).json({ 
      error: 'Failed to fetch building information',
      details: error.message 
    });
  }
});

// GET /api/property-boundaries/:kommunenr/:gardsnr/:bruksnr
app.get('/api/property-boundaries/:kommunenr/:gardsnr/:bruksnr', async (req, res) => {
  try {
    const { kommunenr, gardsnr, bruksnr } = req.params;
    const { festenr = 0, seksjonsnr = 0 } = req.query;
    
    // Get matrikkelenhet ID
    const matrikkelenhetService = await getServiceClient('MatrikkelenhetService');
    const context = createMatrikkelContext();
    
    const matrikkelenhetIdent = {
      kommuneIdent: {
        kommunenummer: kommunenr
      },
      gardsnummer: parseInt(gardsnr),
      bruksnummer: parseInt(bruksnr),
      festenummer: parseInt(festenr),
      seksjonsnummer: parseInt(seksjonsnr)
    };
    
    const [matrikkelenhetIdResult] = await matrikkelenhetService.findMatrikkelenhetIdForIdentAsync({
      matrikkelenhetIdent,
      matrikkelContext: context
    });
    
    if (!matrikkelenhetIdResult || !matrikkelenhetIdResult.return) {
      return res.status(404).json({ error: 'Property unit not found' });
    }
    
    const matrikkelenhetId = matrikkelenhetIdResult.return;
    
    // Get the full matrikkelenhet object
    const storeService = await getServiceClient('StoreService');
    const [matrikkelenhetResult] = await storeService.getObjectAsync({
      id: matrikkelenhetId,
      matrikkelContext: context
    });
    
    if (!matrikkelenhetResult || !matrikkelenhetResult.return) {
      return res.status(404).json({ error: 'Property details not found' });
    }
    
    const matrikkelenhet = matrikkelenhetResult.return;
    
    // Get teig (property parcels) for this matrikkelenhet
    const teiger = [];
    if (matrikkelenhet.teigIdentList && matrikkelenhet.teigIdentList.length > 0) {
      for (const teigId of matrikkelenhet.teigIdentList) {
        const [teigResult] = await storeService.getObjectAsync({
          id: teigId,
          matrikkelContext: context
        });
        
        if (teigResult && teigResult.return) {
          const teig = teigResult.return;
          
          // Extract boundary coordinates
          const boundaries = {
            teigId: teig.id,
            areal: teig.areal,
            hovedteig: teig.hovedteig,
            // Geometry/boundaries
            yttergrense: null,
            representasjonspunkt: teig.representasjonspunkt
          };
          
          // Get the actual boundary geometry if available
          if (teig.yttergrenseGeometri) {
            boundaries.yttergrense = {
              koordinater: teig.yttergrenseGeometri.koordinater,
              geometritype: teig.yttergrenseGeometri.geometritype
            };
          }
          
          teiger.push(boundaries);
        }
      }
    }
    
    res.json({
      matrikkelenhet: {
        matrikkelnummer: matrikkelenhet.matrikkelnummer,
        areal: matrikkelenhet.areal,
        registrertAreal: matrikkelenhet.registrertAreal,
        arealMerknader: matrikkelenhet.arealMerknader
      },
      teiger: teiger,
      totalAreal: teiger.reduce((sum, teig) => sum + (teig.areal || 0), 0)
    });
    
  } catch (error) {
    console.error('Error fetching property boundaries:', error);
    res.status(500).json({ 
      error: 'Failed to fetch property boundaries',
      details: error.message 
    });
  }
});

// GET /api/search/address
app.get('/api/search/address', async (req, res) => {
  try {
    const { kommune, vegnavn, husnummer } = req.query;
    
    if (!kommune) {
      return res.status(400).json({ error: 'Kommune is required' });
    }
    
    const adresseService = await getServiceClient('AdresseService');
    const context = createMatrikkelContext();
    
    const searchModel = {
      kommunenummer: kommune
    };
    
    if (vegnavn) {
      searchModel.adressenavn = vegnavn;
    }
    
    if (husnummer) {
      searchModel.nummer = parseInt(husnummer);
    }
    
    const [searchResult] = await adresseService.findAdresserAsync({
      adressesokModel: searchModel,
      matrikkelContext: context
    });
    
    if (!searchResult || !searchResult.return) {
      return res.json({ addresses: [] });
    }
    
    // Fetch full address objects
    const storeService = await getServiceClient('StoreService');
    const addresses = [];
    
    for (const adresseId of searchResult.return.slice(0, 50)) { // Limit to 50 results
      const [addressResult] = await storeService.getObjectAsync({
        id: adresseId,
        matrikkelContext: context
      });
      
      if (addressResult && addressResult.return) {
        addresses.push({
          id: addressResult.return.id,
          adressetekst: addressResult.return.adressetekst,
          postnummer: addressResult.return.postnummer,
          poststed: addressResult.return.poststed,
          kommunenummer: addressResult.return.kommunenummer,
          matrikkelenhetId: addressResult.return.matrikkelenhetId
        });
      }
    }
    
    res.json({ addresses });
    
  } catch (error) {
    console.error('Error searching addresses:', error);
    res.status(500).json({ 
      error: 'Failed to search addresses',
      details: error.message 
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Matrikkel proxy server running on port ${PORT}`);
  console.log('Make sure to set environment variables:');
  console.log('- MATRIKKEL_USERNAME');
  console.log('- MATRIKKEL_PASSWORD');
  console.log('- MATRIKKEL_TEST_URL (optional)');
});

// package.json dependencies:
/*
{
  "dependencies": {
    "express": "^4.18.2",
    "soap": "^1.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3"
  }
}
*/