'use client';

import React, { useState, useEffect } from 'react';
import { MapComponent } from './MapComponent';
import { BuildingSelector } from './BuildingSelector';
import { Address, BuildingInfo, SelectedBuilding } from '@/types/norwegian-energy';

interface AddressBuildingSelectorProps {
  selectedAddress: Address;
  onBuildingSelect: (building: SelectedBuilding) => void;
  className?: string;
}

export function AddressBuildingSelector({
  selectedAddress,
  onBuildingSelect,
  className = ''
}: AddressBuildingSelectorProps) {
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>();

  // Reset selection when address changes
  useEffect(() => {
    setSelectedBuildingId(undefined);
  }, [selectedAddress.adressetekst]);

  // Auto-select if only one building
  useEffect(() => {
    if (selectedAddress.buildings && selectedAddress.buildings.length === 1) {
      const building = selectedAddress.buildings[0];
      handleBuildingSelect(building.bygningsnummer);
    }
  }, [selectedAddress.buildings]);

  const handleBuildingSelect = (bygningsnummer: string) => {
    // Ensure single building selection (no portfolio support)
    setSelectedBuildingId(bygningsnummer);

    // Find the selected building
    const building = selectedAddress.buildings?.find(b => b.bygningsnummer === bygningsnummer);

    if (building) {
      const selectedBuilding: SelectedBuilding = {
        address: selectedAddress.adressetekst,
        gnr: building.gnr,
        bnr: building.bnr,
        bygningsnummer: building.bygningsnummer,
        coordinates: building.coordinates,
      };

      onBuildingSelect(selectedBuilding);
    }
  };

  // Don't render if no buildings
  if (!selectedAddress.buildings || selectedAddress.buildings.length === 0) {
    return null;
  }

  // Check if we have map data for any building
  const hasMapData = selectedAddress.buildings.some(b => b.hasMapData);

  return (
    <div className={className}>
      {hasMapData ? (
        <MapComponent
          address={selectedAddress.adressetekst}
          buildings={selectedAddress.buildings}
          selectedBuilding={selectedBuildingId}
          onBuildingSelect={handleBuildingSelect}
        />
      ) : (
        <BuildingSelector
          address={selectedAddress.adressetekst}
          buildings={selectedAddress.buildings}
          selectedBuilding={selectedBuildingId}
          onBuildingSelect={handleBuildingSelect}
        />
      )}

      {/* Development Info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-3 bg-slate-800/50 border border-white/10 rounded-lg text-xs text-slate-400">
          <div className="font-medium text-white mb-2">Debug Info:</div>
          <div>Address: {selectedAddress.adressetekst}</div>
          <div>gnr/bnr: {selectedAddress.matrikkel?.gardsnummer}/{selectedAddress.matrikkel?.bruksnummer}</div>
          <div>Buildings: {selectedAddress.buildings.length}</div>
          <div>Has Map Data: {hasMapData ? 'Yes' : 'No'}</div>
          <div>Selected Building: {selectedBuildingId || 'None'}</div>
        </div>
      )}
    </div>
  );
}

export default AddressBuildingSelector;