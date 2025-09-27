# Testing Matrikkel API with SoapUI

## 1. Setup SoapUI Project

### Create New SOAP Project
1. Open SoapUI
2. File → New SOAP Project
3. Project Name: `Matrikkel API Test`
4. Initial WSDL: Leave empty (we'll add multiple WSDLs)

## 2. Add Matrikkel WSDL Services

### Add WFS Service (for Building Data)
1. Right-click on project → Add WSDL
2. WSDL Location: `https://prodtest.matrikkel.no/geoservergeo/wfs?service=WFS&version=1.1.0&request=GetCapabilities`
3. Check "Create Requests"

### Alternative: Direct WFS Testing (Recommended)
Since WFS is REST-like, use REST project instead:

1. Right-click on project → New REST Service
2. Service Endpoint: `https://prodtest.matrikkel.no/geoservergeo/wfs`

## 3. Authentication Setup

### Add Basic Authentication
1. In request properties, find "Authentication"
2. Type: `Basic`
3. Username: `skiplum_matrikkeltest`
4. Password: `EFP4d74EHPaqe8jbyhcppH5Lr7!rc?k8?KP@Lkjb`

## 4. Test Requests

### Test 1: Get Property Boundaries (TEIG)
**Method:** GET
**Endpoint:** `https://prodtest.matrikkel.no/geoservergeo/wfs`
**Parameters:**
```
service=WFS
version=1.1.0
request=GetFeature
typeName=matrikkel:TEIGWFS
CQL_FILTER=KOMMUNENR='3436' AND GARDSNR=290 AND BRUKSNR=22
```

**Full URL:**
```
https://prodtest.matrikkel.no/geoservergeo/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=matrikkel:TEIGWFS&CQL_FILTER=KOMMUNENR='3436'+AND+GARDSNR=290+AND+BRUKSNR=22
```

### Test 2: Get Buildings for Property
**Method:** GET
**Endpoint:** `https://prodtest.matrikkel.no/geoservergeo/wfs`
**Parameters:**
```
service=WFS
version=1.1.0
request=GetFeature
typeName=matrikkel:BYGNINGWFS
bbox=61.596,9.740,61.598,9.744,urn:x-ogc:def:crs:EPSG:4326
```

**Full URL:**
```
https://prodtest.matrikkel.no/geoservergeo/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=matrikkel:BYGNINGWFS&bbox=61.596,9.740,61.598,9.744,urn:x-ogc:def:crs:EPSG:4326
```

### Test 3: Get ANY Building (Test Connection)
**Method:** GET
**Endpoint:** `https://prodtest.matrikkel.no/geoservergeo/wfs`
**Parameters:**
```
service=WFS
version=1.1.0
request=GetFeature
typeName=matrikkel:BYGNINGWFS
maxFeatures=1
```

## 5. Expected Responses

### TEIG Response (Property)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<wfs:FeatureCollection>
  <gml:featureMembers>
    <matrikkel:TEIGWFS>
      <matrikkel:TEIGID>148289726</matrikkel:TEIGID>
      <matrikkel:KOMMUNENR>3436</matrikkel:KOMMUNENR>
      <matrikkel:GARDSNR>290</matrikkel:GARDSNR>
      <matrikkel:BRUKSNR>22</matrikkel:BRUKSNR>
      <matrikkel:AREAL>635.2</matrikkel:AREAL>
      <matrikkel:REPRESENTASJONSPUNKT>
        <gml:Point>
          <gml:pos>61.597376 9.741807</gml:pos>
        </gml:Point>
      </matrikkel:REPRESENTASJONSPUNKT>
    </matrikkel:TEIGWFS>
  </gml:featureMembers>
</wfs:FeatureCollection>
```

### Building Response
```xml
<?xml version="1.0" encoding="UTF-8"?>
<wfs:FeatureCollection>
  <gml:featureMembers>
    <matrikkel:BYGNINGWFS>
      <matrikkel:BYGNINGID>147934889</matrikkel:BYGNINGID>
      <matrikkel:BYGNINGSTYPE>111</matrikkel:BYGNINGSTYPE>
      <matrikkel:BYGNINGSNUMMER>147934889</matrikkel:BYGNINGSNUMMER>
      <matrikkel:BRUKSAREAL>240</matrikkel:BRUKSAREAL>
      <matrikkel:BEBYGDAREAL>120</matrikkel:BEBYGDAREAL>
      <matrikkel:BYGGEAAR>1985</matrikkel:BYGGEAAR>
      <matrikkel:ANTALL_ETASJER>2</matrikkel:ANTALL_ETASJER>
      <matrikkel:REPRESENTASJONSPUNKT>
        <gml:Point>
          <gml:pos>61.597376 9.741807</gml:pos>
        </gml:Point>
      </matrikkel:REPRESENTASJONSPUNKT>
    </matrikkel:BYGNINGWFS>
  </gml:featureMembers>
</wfs:FeatureCollection>
```

## 6. Testing Different Properties

### Hesthagen 16, Vinstra (Original test)
- Kommune: 3436
- Gårdsnr: 285
- Bruksnr: 57

### Strandgata 39, Vinstra (Current test)
- Kommune: 3436
- Gårdsnr: 290
- Bruksnr: 22

### Oslo Example
- Kommune: 0301
- Gårdsnr: 1
- Bruksnr: 1

## 7. Troubleshooting

### No Building Data (BRA = 0)
This often happens when:
1. Buildings are utility/auxiliary buildings (garages, sheds)
2. Data is incomplete in Matrikkel
3. Wrong property boundaries

**Solution:** Try expanding the BBOX area:
```
Original: bbox=61.596,9.740,61.598,9.744
Expanded: bbox=61.595,9.739,61.599,9.745
```

### Authentication Errors
1. Ensure Basic Auth is enabled
2. Check credentials are correct
3. Try in Authorization header: `Basic c2tpcGx1bV9tYXRyaWtrZWx0ZXN0OkVGUDRkNzRFSFBhcWU4amJ5aGNwcEg1THI3IXJjP2s4P0tQQExramI=`

### Empty Results
1. Check CQL_FILTER syntax (single quotes for strings)
2. Verify property exists
3. Try without filters first

## 8. SoapUI Test Suite Setup

### Create Test Suite
1. Right-click project → New TestSuite: "Matrikkel Tests"
2. Add TestCase: "Property Lookup"
3. Add REST Test Step for each request above

### Add Assertions
1. Valid HTTP Status (200)
2. XPath Match: `//matrikkel:BYGNINGID` exists
3. XPath Match: `//matrikkel:BRUKSAREAL > 0`

### Property Testing Script
```groovy
// Groovy script for SoapUI
def kommune = "3436"
def gaard = "290"
def bruk = "22"

// Build URL
def url = "https://prodtest.matrikkel.no/geoservergeo/wfs"
def params = "?service=WFS&version=1.1.0&request=GetFeature&typeName=matrikkel:BYGNINGWFS"
def filter = "&CQL_FILTER=KOMMUNENR='${kommune}'+AND+GARDSNR=${gaard}+AND+BRUKSNR=${bruk}"

testRunner.testCase.setPropertyValue("TestURL", url + params + filter)
```

## 9. Alternative: Postman Collection

If you prefer Postman, here's the collection structure:

```json
{
  "info": {
    "name": "Matrikkel API Tests"
  },
  "auth": {
    "type": "basic",
    "basic": {
      "username": "skiplum_matrikkeltest",
      "password": "EFP4d74EHPaqe8jbyhcppH5Lr7!rc?k8?KP@Lkjb"
    }
  },
  "item": [
    {
      "name": "Get TEIG (Property)",
      "request": {
        "method": "GET",
        "url": {
          "raw": "https://prodtest.matrikkel.no/geoservergeo/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=matrikkel:TEIGWFS&CQL_FILTER=KOMMUNENR='3436'+AND+GARDSNR=290+AND+BRUKSNR=22"
        }
      }
    },
    {
      "name": "Get Buildings",
      "request": {
        "method": "GET",
        "url": {
          "raw": "https://prodtest.matrikkel.no/geoservergeo/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=matrikkel:BYGNINGWFS&bbox=61.596,9.740,61.598,9.744,urn:x-ogc:def:crs:EPSG:4326"
        }
      }
    }
  ]
}
```

Save this as `Matrikkel-API.postman_collection.json` and import into Postman.