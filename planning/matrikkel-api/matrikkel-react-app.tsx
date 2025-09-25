import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// API Service
const API_BASE_URL = 'http://localhost:3001/api';

const matrikkelAPI = {
  async getBuildings(kommunenr, gardsnr, bruksnr, festenr = 0, seksjonsnr = 0) {
    const response = await fetch(
      `${API_BASE_URL}/buildings/${kommunenr}/${gardsnr}/${bruksnr}?festenr=${festenr}&seksjonsnr=${seksjonsnr}`
    );
    if (!response.ok) throw new Error('Failed to fetch buildings');
    return response.json();
  },
  
  async getPropertyBoundaries(kommunenr, gardsnr, bruksnr, festenr = 0, seksjonsnr = 0) {
    const response = await fetch(
      `${API_BASE_URL}/property-boundaries/${kommunenr}/${gardsnr}/${bruksnr}?festenr=${festenr}&seksjonsnr=${seksjonsnr}`
    );
    if (!response.ok) throw new Error('Failed to fetch boundaries');
    return response.json();
  },
  
  async searchAddress(kommune, vegnavn, husnummer) {
    const params = new URLSearchParams({ kommune });
    if (vegnavn) params.append('vegnavn', vegnavn);
    if (husnummer) params.append('husnummer', husnummer);
    
    const response = await fetch(`${API_BASE_URL}/search/address?${params}`);
    if (!response.ok) throw new Error('Failed to search addresses');
    return response.json();
  }
};

// Main App Component
export default function MatrikkelApp() {
  const [propertyInput, setPropertyInput] = useState({
    kommunenr: '0301',
    gardsnr: '1',
    bruksnr: '1',
    festenr: '0',
    seksjonsnr: '0'
  });
  
  const [buildings, setBuildings] = useState([]);
  const [boundaries, setBoundaries] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [buildingData, boundaryData] = await Promise.all([
        matrikkelAPI.getBuildings(
          propertyInput.kommunenr,
          propertyInput.gardsnr,
          propertyInput.bruksnr,
          propertyInput.festenr,
          propertyInput.seksjonsnr
        ),
        matrikkelAPI.getPropertyBoundaries(
          propertyInput.kommunenr,
          propertyInput.gardsnr,
          propertyInput.bruksnr,
          propertyInput.festenr,
          propertyInput.seksjonsnr
        )
      ]);
      
      setBuildings(buildingData.buildings || []);
      setBoundaries(boundaryData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-8">Matrikkel Building Information</h1>
        
        {/* Search Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Search Property</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <input
              type="text"
              placeholder="Kommune nr"
              value={propertyInput.kommunenr}
              onChange={(e) => setPropertyInput({...propertyInput, kommunenr: e.target.value})}
              className="border rounded px-3 py-2"
            />
            <input
              type="text"
              placeholder="Gårds nr"
              value={propertyInput.gardsnr}
              onChange={(e) => setPropertyInput({...propertyInput, gardsnr: e.target.value})}
              className="border rounded px-3 py-2"
            />
            <input
              type="text"
              placeholder="Bruks nr"
              value={propertyInput.bruksnr}
              onChange={(e) => setPropertyInput({...propertyInput, bruksnr: e.target.value})}
              className="border rounded px-3 py-2"
            />
            <input
              type="text"
              placeholder="Feste nr"
              value={propertyInput.festenr}
              onChange={(e) => setPropertyInput({...propertyInput, festenr: e.target.value})}
              className="border rounded px-3 py-2"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Building List */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Buildings ({buildings.length})</h2>
            {buildings.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-6 text-gray-500 text-center">
                No buildings found. Try searching for a property.
              </div>
            ) : (
              <div className="space-y-4">
                {buildings.map((building, index) => (
                  <BuildingCard
                    key={index}
                    building={building}
                    isSelected={selectedBuilding === index}
                    onSelect={() => setSelectedBuilding(index)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Property Info & Map */}
          <div>
            {boundaries && (
              <div className="bg-white rounded-lg shadow p-6 mb-4">
                <h3 className="text-lg font-semibold mb-3">Property Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Matrikkel:</span>
                    <p className="text-gray-600">
                      {boundaries.matrikkelenhet?.matrikkelnummer?.kommunenummer}/
                      {boundaries.matrikkelenhet?.matrikkelnummer?.gardsnummer}/
                      {boundaries.matrikkelenhet?.matrikkelnummer?.bruksnummer}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Total Area:</span>
                    <p className="text-gray-600">{boundaries.totalAreal} m²</p>
                  </div>
                  {boundaries.matrikkelenhet?.registrertAreal && (
                    <div>
                      <span className="font-medium">Registered Area:</span>
                      <p className="text-gray-600">{boundaries.matrikkelenhet.registrertAreal} m²</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Property Map would go here */}
            {/* Note: Actual map implementation would require coordinate transformation */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-3">Property Boundaries</h3>
              <div className="h-64 bg-gray-200 flex items-center justify-center text-gray-500">
                Map visualization would display here with property boundaries
                {boundaries && boundaries.teiger && (
                  <div className="text-xs mt-2">
                    ({boundaries.teiger.length} parcels found)
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Building Card Component
function BuildingCard({ building, isSelected, onSelect }) {
  return (
    <div 
      className={`bg-white rounded-lg shadow p-6 cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-blue-500' : 'hover:shadow-lg'
      }`}
      onClick={onSelect}
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold">
          Building #{building.bygningsnummer || 'N/A'}
        </h3>
        {building.byggeaar && (
          <span className="text-sm text-gray-600">Built: {building.byggeaar}</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="font-medium text-gray-700">BYA (Footprint):</span>
          <p className="text-gray-900">{building.bebygdAreal || 'N/A'} m²</p>
        </div>
        <div>
          <span className="font-medium text-gray-700">BRA (Total area):</span>
          <p className="text-gray-900">{building.bruksareal || 'N/A'} m²</p>
        </div>
        <div>
          <span className="font-medium text-gray-700">Floors:</span>
          <p className="text-gray-900">{building.antallEtasjer || 'N/A'}</p>
        </div>
        <div>
          <span className="font-medium text-gray-700">Type:</span>
          <p className="text-gray-900">{building.bygningstype?.beskrivelse || 'N/A'}</p>
        </div>
        <div>
          <span className="font-medium text-gray-700">Status:</span>
          <p className="text-gray-900">{building.bygningsstatus?.beskrivelse || 'N/A'}</p>
        </div>
        <div>
          <span className="font-medium text-gray-700">Units:</span>
          <p className="text-gray-900">{building.bruksenheter?.length || 0}</p>
        </div>
      </div>

      {building.bruksenheter && building.bruksenheter.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <h4 className="text-sm font-semibold mb-2">Units/Apartments:</h4>
          <div className="space-y-2">
            {building.bruksenheter.slice(0, 3).map((unit, idx) => (
              <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                <span className="font-medium">Unit {unit.bruksenhetsnummer}:</span>
                <span className="ml-2">Floor {unit.etasjenummer || 'N/A'}, </span>
                <span>{unit.bruksareal || 'N/A'} m², </span>
                <span>{unit.antallRom || 0} rooms</span>
              </div>
            ))}
            {building.bruksenheter.length > 3 && (
              <div className="text-xs text-gray-500">
                +{building.bruksenheter.length - 3} more units
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}