'use client';

import { X } from 'lucide-react';
import { BuildingDataForm } from './BuildingDataForm';

interface BuildingDataFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  address?: string;
  lat?: string;
  lon?: string;
  municipality?: string;
  municipalityNumber?: string;
  postalCode?: string;
  gnr?: string;
  bnr?: string;
  bygningsnummer?: string;
  onSubmit: (data: any) => void;
  isSubmitting?: boolean;
}

export function BuildingDataFormModal({
  isOpen,
  onClose,
  address,
  lat,
  lon,
  municipality,
  municipalityNumber,
  postalCode,
  gnr,
  bnr,
  bygningsnummer,
  onSubmit,
  isSubmitting
}: BuildingDataFormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={isSubmitting ? undefined : onClose}
      />

      {/* Modal - Dynamic sizing to avoid scrolling */}
      <div className="relative bg-popover border border-border rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col">
        {/* Header with close button */}
        <div className="flex items-center justify-between p-4">
          <h2 className="text-lg font-semibold text-foreground">Bygningsdata</h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Lukk"
          >
            <X className="w-5 h-5 text-text-tertiary" />
          </button>
        </div>

        {/* Form content - scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          <BuildingDataForm
            address={address}
            lat={lat}
            lon={lon}
            municipality={municipality}
            municipalityNumber={municipalityNumber}
            postalCode={postalCode}
            gnr={gnr}
            bnr={bnr}
            bygningsnummer={bygningsnummer}
            onSubmit={(data) => {
              onSubmit(data);
              // Don't close the modal immediately - let it stay open during loading
              // The redirect will handle the transition
            }}
            isSubmitting={isSubmitting}
            onResetRequest={() => {/* Handled by global function */}}
          />
        </div>
      </div>
    </div>
  );
}