/**
 * Test client for Matrikkel WFS Building Lookup
 * Tests the workflow: Address/GNR-BNR → Property → Buildings
 */

const fetch = require('node-fetch');
const parseString = require('xml2js').parseString;

// WFS endpoints
const WFS_ENDPOINT = 'https://wfs.geonorge.no/skwms1/wfs.matrikkelen-bygning';
const TEST_ENDPOINT = 'https://prodtest.matrikkel.no/matrikkel/wfs';

// Helper to convert JS object to XML
function buildWfsRequest(typeName, filter) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<wfs:GetFeature
    xmlns:wfs="http://www.opengis.net/wfs"
    xmlns:ogc="http://www.opengis.net/ogc"
    xmlns:gml="http://www.opengis.net/gml"
    xmlns:matrikkel="http://matrikkel.statkart.no/matrikkelapi/wsapi/v1/"
    service="WFS"
    version="1.1.0"
    maxFeatures="50">
    <wfs:Query typeName="matrikkel:${typeName}">
        ${filter}
    </wfs:Query>
</wfs:GetFeature>`;
}

// Send WFS request
async function sendWfsRequest(xml, endpoint = WFS_ENDPOINT) {
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml',
            },
            body: xml
        });

        const xmlResponse = await response.text();

        return new Promise((resolve, reject) => {
            parseString(xmlResponse, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
    } catch (error) {
        console.error('WFS Request failed:', error);
        throw error;
    }
}

// 1. Find building by street address
async function findBuildingByStreetAddress(kommunenr, streetName, streetNumber, letter = null) {
    console.log(`\n1. FINDING STREET ADDRESS: ${streetName} ${streetNumber}${letter || ''} in ${kommunenr}`);
    console.log('='.repeat(60));

    // Step 1: Find the street address
    const addressFilter = `
        <ogc:Filter>
            <ogc:And>
                <ogc:PropertyIsEqualTo>
                    <ogc:PropertyName>KOMMUNENR</ogc:PropertyName>
                    <ogc:Literal>${kommunenr}</ogc:Literal>
                </ogc:PropertyIsEqualTo>
                <ogc:PropertyIsLike wildCard="%" singleChar="?" escapeChar="\\">
                    <ogc:PropertyName>ADRESSENAVN</ogc:PropertyName>
                    <ogc:Literal>%${streetName}%</ogc:Literal>
                </ogc:PropertyIsLike>
                <ogc:PropertyIsEqualTo>
                    <ogc:PropertyName>NR</ogc:PropertyName>
                    <ogc:Literal>${streetNumber}</ogc:Literal>
                </ogc:PropertyIsEqualTo>
                ${letter ? `
                <ogc:PropertyIsEqualTo>
                    <ogc:PropertyName>BOKSTAV</ogc:PropertyName>
                    <ogc:Literal>${letter}</ogc:Literal>
                </ogc:PropertyIsEqualTo>` : ''}
            </ogc:And>
        </ogc:Filter>`;

    const addressXml = buildWfsRequest('VegadresseWFS', addressFilter);
    console.log('Sending address query...');

    const addressResult = await sendWfsRequest(addressXml);

    // Extract coordinates from address
    const features = addressResult['wfs:FeatureCollection']?.['gml:featureMember'];
    if (!features || features.length === 0) {
        console.log('No address found!');
        return null;
    }

    const address = features[0]['matrikkel:VegadresseWFS'][0];
    console.log(`Found address: ${address['matrikkel:ADRESSETEKST']}`);

    const point = address['matrikkel:REPRESENTASJONSPUNKT'][0]['gml:Point'][0];
    const coords = point['gml:coordinates'][0].trim().split(',');
    const [x, y] = coords.map(parseFloat);

    console.log(`Address coordinates: ${x}, ${y}`);

    // Step 2: Find buildings near the address (within 50m)
    const buildingFilter = `
        <ogc:Filter>
            <ogc:And>
                <ogc:PropertyIsEqualTo>
                    <ogc:PropertyName>KOMMUNENR</ogc:PropertyName>
                    <ogc:Literal>${kommunenr}</ogc:Literal>
                </ogc:PropertyIsEqualTo>
                <ogc:BBOX>
                    <ogc:PropertyName>REPRESENTASJONSPUNKT</ogc:PropertyName>
                    <gml:Envelope srsName="http://www.opengis.net/gml/srs/epsg.xml#32632">
                        <gml:lowerCorner>${x - 50} ${y - 50}</gml:lowerCorner>
                        <gml:upperCorner>${x + 50} ${y + 50}</gml:upperCorner>
                    </gml:Envelope>
                </ogc:BBOX>
            </ogc:And>
        </ogc:Filter>`;

    const buildingXml = buildWfsRequest('BygningWFS', buildingFilter);
    console.log('\nSearching for buildings within 50m...');

    const buildingResult = await sendWfsRequest(buildingXml);
    const buildings = buildingResult['wfs:FeatureCollection']?.['gml:featureMember'] || [];

    console.log(`Found ${buildings.length} building(s)`);

    buildings.forEach((b, i) => {
        const building = b['matrikkel:BygningWFS'][0];
        console.log(`\nBuilding ${i + 1}:`);
        console.log(`  - Building ID: ${building['matrikkel:BYGNINGID']}`);
        console.log(`  - Building Number: ${building['matrikkel:BYGNINGSNR']}`);
        console.log(`  - Type: ${building['matrikkel:BYGNINGSTYPE'] || 'N/A'}`);
        console.log(`  - Status: ${building['matrikkel:BYGNINGSTATUS'] || 'N/A'}`);
    });

    return { address, buildings };
}

// 2. Find building by GNR/BNR
async function findBuildingByGnrBnr(kommunenr, gnr, bnr, fnr = null) {
    console.log(`\n2. FINDING PROPERTY: ${gnr}/${bnr}${fnr ? `/${fnr}` : ''} in ${kommunenr}`);
    console.log('='.repeat(60));

    // Step 1: Find the property parcel (teig)
    const teigFilter = `
        <ogc:Filter>
            <ogc:And>
                <ogc:PropertyIsEqualTo>
                    <ogc:PropertyName>KOMMUNENR</ogc:PropertyName>
                    <ogc:Literal>${kommunenr}</ogc:Literal>
                </ogc:PropertyIsEqualTo>
                <ogc:PropertyIsEqualTo>
                    <ogc:PropertyName>GARDSNR</ogc:PropertyName>
                    <ogc:Literal>${gnr}</ogc:Literal>
                </ogc:PropertyIsEqualTo>
                <ogc:PropertyIsEqualTo>
                    <ogc:PropertyName>BRUKSNR</ogc:PropertyName>
                    <ogc:Literal>${bnr}</ogc:Literal>
                </ogc:PropertyIsEqualTo>
                ${fnr ? `
                <ogc:PropertyIsEqualTo>
                    <ogc:PropertyName>FESTENR</ogc:PropertyName>
                    <ogc:Literal>${fnr}</ogc:Literal>
                </ogc:PropertyIsEqualTo>` : ''}
            </ogc:And>
        </ogc:Filter>`;

    const teigXml = buildWfsRequest('TeigWFS', teigFilter);
    console.log('Sending property query...');

    const teigResult = await sendWfsRequest(teigXml);

    const features = teigResult['wfs:FeatureCollection']?.['gml:featureMember'];
    if (!features || features.length === 0) {
        console.log('No property found!');
        return null;
    }

    const teig = features[0]['matrikkel:TeigWFS'][0];
    console.log(`Found property: ${teig['matrikkel:MATRIKKELNR']}`);
    console.log(`Area: ${teig['matrikkel:AREAL']} m²`);

    const point = teig['matrikkel:REPRESENTASJONSPUNKT'][0]['gml:Point'][0];
    const coords = point['gml:coordinates'][0].trim().split(',');
    const [x, y] = coords.map(parseFloat);

    console.log(`Property center: ${x}, ${y}`);

    // Step 2: Get property boundary for precise search
    const polygon = teig['matrikkel:FLATE'][0]['gml:Polygon'][0];
    const boundary = polygon['gml:outerBoundaryIs'][0]['gml:LinearRing'][0];
    const boundaryCoords = boundary['gml:coordinates'][0];

    // Calculate bounding box from polygon
    const coordPairs = boundaryCoords.trim().split(' ').map(pair => {
        const [px, py] = pair.split(',').map(parseFloat);
        return { x: px, y: py };
    });

    const minX = Math.min(...coordPairs.map(p => p.x));
    const maxX = Math.max(...coordPairs.map(p => p.x));
    const minY = Math.min(...coordPairs.map(p => p.y));
    const maxY = Math.max(...coordPairs.map(p => p.y));

    // Step 3: Find buildings within property boundary
    const buildingFilter = `
        <ogc:Filter>
            <ogc:And>
                <ogc:PropertyIsEqualTo>
                    <ogc:PropertyName>KOMMUNENR</ogc:PropertyName>
                    <ogc:Literal>${kommunenr}</ogc:Literal>
                </ogc:PropertyIsEqualTo>
                <ogc:BBOX>
                    <ogc:PropertyName>REPRESENTASJONSPUNKT</ogc:PropertyName>
                    <gml:Envelope srsName="http://www.opengis.net/gml/srs/epsg.xml#32632">
                        <gml:lowerCorner>${minX} ${minY}</gml:lowerCorner>
                        <gml:upperCorner>${maxX} ${maxY}</gml:upperCorner>
                    </gml:Envelope>
                </ogc:BBOX>
            </ogc:And>
        </ogc:Filter>`;

    const buildingXml = buildWfsRequest('BygningWFS', buildingFilter);
    console.log('\nSearching for buildings on property...');

    const buildingResult = await sendWfsRequest(buildingXml);
    const buildings = buildingResult['wfs:FeatureCollection']?.['gml:featureMember'] || [];

    console.log(`Found ${buildings.length} building(s) on property`);

    buildings.forEach((b, i) => {
        const building = b['matrikkel:BygningWFS'][0];
        console.log(`\nBuilding ${i + 1}:`);
        console.log(`  - Building ID: ${building['matrikkel:BYGNINGID']}`);
        console.log(`  - Building Number: ${building['matrikkel:BYGNINGSNR']}`);
        console.log(`  - Type: ${building['matrikkel:BYGNINGSTYPE'] || 'N/A'}`);
        console.log(`  - Status: ${building['matrikkel:BYGNINGSTATUS'] || 'N/A'}`);
        console.log(`  - SEFRAK: ${building['matrikkel:SEFRAKMINNE'] === 'true' ? 'Yes' : 'No'}`);
    });

    return { teig, buildings };
}

// Test with real examples
async function runTests() {
    console.log('MATRIKKEL WFS BUILDING LOOKUP TESTS');
    console.log('=====================================\n');

    try {
        // Test 1: Find building by street address in Oslo
        await findBuildingByStreetAddress('0301', 'Karl Johans gate', '1');

        // Test 2: Find building by GNR/BNR in Oslo
        await findBuildingByGnrBnr('0301', '200', '1');

        // Test 3: Find building by cadastral address
        const cadastralFilter = `
            <ogc:Filter>
                <ogc:And>
                    <ogc:PropertyIsEqualTo>
                        <ogc:PropertyName>KOMMUNENR</ogc:PropertyName>
                        <ogc:Literal>0301</ogc:Literal>
                    </ogc:PropertyIsEqualTo>
                    <ogc:PropertyIsEqualTo>
                        <ogc:PropertyName>GARDSNR</ogc:PropertyName>
                        <ogc:Literal>200</ogc:Literal>
                    </ogc:PropertyIsEqualTo>
                    <ogc:PropertyIsEqualTo>
                        <ogc:PropertyName>BRUKSNR</ogc:PropertyName>
                        <ogc:Literal>1</ogc:Literal>
                    </ogc:PropertyIsEqualTo>
                </ogc:And>
            </ogc:Filter>`;

        console.log('\n3. TESTING CADASTRAL ADDRESS LOOKUP');
        console.log('='.repeat(60));

        const cadastralXml = buildWfsRequest('MatrikkeladresseWFS', cadastralFilter);
        const cadastralResult = await sendWfsRequest(cadastralXml);

        const cadastralFeatures = cadastralResult['wfs:FeatureCollection']?.['gml:featureMember'];
        if (cadastralFeatures && cadastralFeatures.length > 0) {
            const addr = cadastralFeatures[0]['matrikkel:MatrikkeladresseWFS'][0];
            console.log(`Found cadastral address: ${addr['matrikkel:ADRESSETEKST']}`);
        } else {
            console.log('No cadastral address found');
        }

    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

// Run if executed directly
if (require.main === module) {
    runTests().then(() => {
        console.log('\nTests completed!');
    }).catch(error => {
        console.error('Tests failed:', error);
    });
}

module.exports = {
    findBuildingByStreetAddress,
    findBuildingByGnrBnr,
    sendWfsRequest,
    buildWfsRequest
};