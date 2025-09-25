# Matrikkel API React Setup Guide

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────────┐
│  React App      │────▶│  Node.js Proxy   │────▶│  Matrikkel API     │
│  (REST calls)   │◀────│  (SOAP→REST)     │◀────│  (SOAP/WSDL)       │
└─────────────────┘     └──────────────────┘     └────────────────────┘
```

## Setup Steps

### 1. Backend Setup (Node.js Proxy)

```bash
# Create backend directory
mkdir matrikkel-backend
cd matrikkel-backend

# Initialize project
npm init -y

# Install dependencies
npm install express soap cors dotenv

# Create .env file with your credentials
echo "MATRIKKEL_USERNAME=your_username" >> .env
echo "MATRIKKEL_PASSWORD=your_password" >> .env
echo "MATRIKKEL_TEST_URL=https://prodtest.matrikkel.no/matrikkelapi/wsapi/v1/" >> .env

# Copy the server.js code from the artifact above
# Start the server
node server.js
```

### 2. React App Setup

```bash
# Create React app (in a new terminal)
npx create-react-app matrikkel-frontend
cd matrikkel-frontend

# Install additional dependencies
npm install leaflet react-leaflet
npm install proj4  # For coordinate transformation

# Replace src/App.js with the React component code above
# Start the React app
npm start
```

## Coordinate Transformation Utility

The Matrikkel API returns coordinates in EUREF89 UTM zone 33 (EPSG:25833). To display on web maps, convert to WGS84 (EPSG:4326):

```javascript
// coordinateUtils.js
import proj4 from 'proj4';

// Define the projections
proj4.defs([
  ['EPSG:25833', '+proj=utm +zone=33 +ellps=GRS80 +units=m +no_defs'],
  ['EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs']
]);

export function utm33ToWGS84(easting, northing) {
  return proj4('EPSG:25833', 'EPSG:4326', [easting, northing]);
}

export function convertBoundaryToLatLng(boundary) {
  if (!boundary.yttergrense?.koordinater) return null;
  
  const coordinates = boundary.yttergrense.koordinater;
  const latLngCoords = [];
  
  // Assuming coordinates are pairs of [easting, northing]
  for (let i = 0; i < coordinates.length; i += 2) {
    const [lng, lat] = utm33ToWGS84(coordinates[i], coordinates[i + 1]);
    latLngCoords.push([lat, lng]);
  }
  
  return latLngCoords;
}
```

## Enhanced Map Component

```javascript
// PropertyMap.js
import { MapContainer, TileLayer, Polygon, Marker } from 'react-leaflet';
import { convertBoundaryToLatLng } from './coordinateUtils';

export function PropertyMap({ boundaries, buildings }) {
  // Convert boundaries to lat/lng
  const polygons = boundaries?.teiger?.map(teig => {
    const coords = convertBoundaryToLatLng(teig);
    return coords ? { id: teig.teigId, coordinates: coords } : null;
  }).filter(Boolean) || [];

  // Default center (Oslo)
  const center = polygons.length > 0 
    ? polygons[0].coordinates[0] 
    : [59.9139, 10.7522];

  return (
    <MapContainer center={center} zoom={17} style={{ height: '400px' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      
      {/* Property boundaries */}
      {polygons.map(polygon => (
        <Polygon
          key={polygon.id}
          positions={polygon.coordinates}
          pathOptions={{
            color: 'blue',
            weight: 2,
            fillOpacity: 0.1
          }}
        />
      ))}
      
      {/* Building markers */}
      {buildings.map((building, idx) => {
        if (building.representasjonspunkt) {
          const [lng, lat] = utm33ToWGS84(
            building.representasjonspunkt.x,
            building.representasjonspunkt.y
          );
          return (
            <Marker key={idx} position={[lat, lng]}>
              <Popup>
                Building #{building.bygningsnummer}<br />
                BRA: {building.bruksareal} m²<br />
                Built: {building.byggeaar}
              </Popup>
            </Marker>
          );
        }
        return null;
      })}
    </MapContainer>
  );
}
```

## API Endpoints Provided by Proxy

### 1. Get Building Information
```
GET /api/buildings/:kommunenr/:gardsnr/:bruksnr?festenr=0&seksjonsnr=0

Response:
{
  "buildings": [{
    "bygningsnummer": "12345678",
    "bygningstype": { "id": 111, "kode": "111", "beskrivelse": "Enebolig" },
    "bebygdAreal": 120,      // BYA
    "bruksareal": 240,       // BRA
    "byggeaar": 1985,
    "antallEtasjer": 2,
    "bruksenheter": [{
      "bruksenhetsnummer": "H0101",
      "etasjenummer": "1",
      "bruksareal": 120,
      "antallRom": 5
    }]
  }]
}
```

### 2. Get Property Boundaries
```
GET /api/property-boundaries/:kommunenr/:gardsnr/:bruksnr

Response:
{
  "matrikkelenhet": {
    "matrikkelnummer": {...},
    "areal": 1500,
    "registrertAreal": 1498
  },
  "teiger": [{
    "teigId": "123",
    "areal": 1500,
    "yttergrense": {
      "koordinater": [x1, y1, x2, y2, ...],
      "geometritype": "POLYGON"
    }
  }],
  "totalAreal": 1500
}
```

### 3. Search Addresses
```
GET /api/search/address?kommune=0301&vegnavn=Storgata&husnummer=10

Response:
{
  "addresses": [{
    "id": "456",
    "adressetekst": "Storgata 10",
    "postnummer": "0155",
    "poststed": "OSLO",
    "matrikkelenhetId": "789"
  }]
}
```

## Common Issues & Solutions

### 1. SOAP Client Creation Fails
- Check your credentials are correct
- Verify the test URL is accessible
- Some WSDL files may require specific headers

### 2. Empty Building Results
- Not all properties have buildings
- Building data might be incomplete
- Check if the property is vacant land

### 3. Missing Coordinates
- Not all objects have geometry data
- Some boundaries may only have area, not coordinates
- Building coordinates might be at property center

### 4. Timeout Issues
- SOAP calls can be slow
- Implement caching in the proxy
- Consider pagination for large results

## Performance Optimization

### 1. Implement Caching
```javascript
// In server.js
const cache = new Map();

function getCacheKey(service, method, params) {
  return `${service}:${method}:${JSON.stringify(params)}`;
}

// Before making SOAP call
const cacheKey = getCacheKey('StoreService', 'getObject', id);
if (cache.has(cacheKey)) {
  return cache.get(cacheKey);
}

// After successful SOAP call
cache.set(cacheKey, result);
```

### 2. Batch Requests
When fetching multiple buildings, use the proxy to batch requests:

```javascript
// Add to server.js
app.post('/api/buildings/batch', async (req, res) => {
  const { properties } = req.body; // Array of {kommunenr, gardsnr, bruksnr}
  const results = await Promise.all(
    properties.map(prop => fetchBuildingsForProperty(prop))
  );
  res.json({ results });
});
```

## Next Steps

1. **Add Authentication**: Implement proper auth between React and proxy
2. **Error Handling**: Add retry logic for failed SOAP calls
3. **Data Persistence**: Consider adding a database for caching
4. **Advanced Features**:
   - Historical data queries
   - Change notifications
   - Export functionality
   - 3D building visualization

## Resources

- [Kartverket API Documentation](https://kartverket.no/api)
- [SOAP Client Documentation](https://www.npmjs.com/package/soap)
- [React Leaflet Documentation](https://react-leaflet.js.org/)
- [Proj4js Documentation](http://proj4js.org/)