/**
 * Example Component: How to Use the Cache Layer
 * This demonstrates various ways to access cached configuration data
 */

'use client';

import React from 'react';
import {
  useCachedCalculation,
  useContentText,
  useTEK17Requirement,
  useHeatSource,
  useFeatureFlag,
  useMunicipality
} from '@/cache/hooks/use-cached-config';
import {
  useEnergyCalculationParams,
  useSINTEFBreakdown,
  useInvestmentRoom,
  useTEK17Compliance
} from '@/cache/hooks/use-cached-calculations';

export function CacheUsageExample() {
  // ============= Basic Configuration Access =============

  // Get a single calculation value
  const { data: investmentMultiplier, isLoading: loadingMultiplier } =
    useCachedCalculation('investment_multiplier');

  // Get UI text (automatically uses Norwegian)
  const landingTitle = useContentText('landing.title');
  const landingSubtitle = useContentText('landing.subtitle', 'norwegian');

  // Get TEK17 requirement for a building type
  const { data: kontorTEK17 } = useTEK17Requirement('Kontorbygning');

  // Get heat source information
  const { data: heatPump } = useHeatSource('heatpump_air_air');

  // Check feature flag
  const isPDFExportEnabled = useFeatureFlag('pdf_export');
  const isEmailCaptureEnabled = useFeatureFlag('email_capture');

  // Get municipality data
  const { data: oslo } = useMunicipality('0301');

  // ============= Complex Calculations =============

  // Get all calculation parameters at once
  const { params: calcParams } = useEnergyCalculationParams();

  // Get SINTEF breakdown percentages
  const sintefBreakdown = useSINTEFBreakdown();

  // Calculate investment room based on annual waste
  const annualWasteCost = 92400; // Example value
  const investmentBreakdown = useInvestmentRoom(annualWasteCost);

  // Check TEK17 compliance
  const actualConsumption = 180; // kWh/m²
  const tek17Requirement = 115; // kWh/m²
  const compliance = useTEK17Compliance(actualConsumption, tek17Requirement);

  // ============= Render Examples =============

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Cache Layer Usage Examples</h2>

      {/* Basic Configuration Display */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold">Configuration Values</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-slate-800 rounded">
            <h4 className="font-medium text-cyan-400">Investment Multiplier</h4>
            {loadingMultiplier ? (
              <p>Loading...</p>
            ) : (
              <p className="text-2xl">{investmentMultiplier?.value}x</p>
            )}
          </div>

          <div className="p-4 bg-slate-800 rounded">
            <h4 className="font-medium text-cyan-400">SINTEF Breakdown</h4>
            <ul className="text-sm">
              <li>Heating: {sintefBreakdown.heating}%</li>
              <li>Lighting: {sintefBreakdown.lighting}%</li>
              <li>Other: {sintefBreakdown.other}%</li>
            </ul>
          </div>
        </div>
      </section>

      {/* UI Content */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold">UI Content</h3>
        <div className="p-4 bg-slate-800 rounded">
          <h4 className="text-2xl font-bold">{landingTitle}</h4>
          <p className="text-slate-300">{landingSubtitle}</p>
        </div>
      </section>

      {/* TEK17 Requirements */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold">TEK17 Requirements</h3>
        {kontorTEK17 && (
          <div className="p-4 bg-slate-800 rounded">
            <h4 className="font-medium text-cyan-400">{kontorTEK17.building_type}</h4>
            <p className="text-2xl">{kontorTEK17.max_energy_kwh_m2} kWh/m²</p>
            <p className="text-sm text-slate-400">{kontorTEK17.description}</p>
          </div>
        )}
      </section>

      {/* Heat Sources */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold">Heat Source Options</h3>
        {heatPump && (
          <div className="p-4 bg-slate-800 rounded">
            <h4 className="font-medium text-cyan-400">{heatPump.norwegian_name}</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>COP: {heatPump.efficiency_cop}</div>
              <div>Savings: {heatPump.typical_savings_percent}%</div>
              <div>Investment: {heatPump.typical_investment_kr.toLocaleString('nb-NO')} kr</div>
              <div>Priority: {heatPump.priority}</div>
            </div>
            <p className="text-sm text-slate-400 mt-2">{heatPump.description}</p>
          </div>
        )}
      </section>

      {/* Investment Calculations */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold">Investment Calculations</h3>
        <div className="p-4 bg-slate-800 rounded">
          <h4 className="font-medium text-cyan-400">Investment Room Breakdown</h4>
          <p className="text-sm text-slate-400 mb-2">
            Based on annual waste of {annualWasteCost.toLocaleString('nb-NO')} kr
          </p>
          <ul className="space-y-1">
            <li>Total: {investmentBreakdown.totalInvestment.toLocaleString('nb-NO')} kr</li>
            <li>Heating: {investmentBreakdown.heatingInvestment.toLocaleString('nb-NO')} kr</li>
            <li>Lighting: {investmentBreakdown.lightingInvestment.toLocaleString('nb-NO')} kr</li>
            <li>Other: {investmentBreakdown.otherInvestment.toLocaleString('nb-NO')} kr</li>
          </ul>
        </div>
      </section>

      {/* TEK17 Compliance */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold">TEK17 Compliance</h3>
        <div className="p-4 bg-slate-800 rounded">
          <div className={`inline-block px-3 py-1 rounded text-sm font-medium ${
            compliance.status === 'good' ? 'bg-green-500/20 text-green-400' :
            compliance.status === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {compliance.percentage.toFixed(0)}% of TEK17
          </div>
          <p className="mt-2 text-slate-300">{compliance.message}</p>
        </div>
      </section>

      {/* Feature Flags */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold">Feature Flags</h3>
        <div className="p-4 bg-slate-800 rounded">
          <ul className="space-y-1">
            <li>
              PDF Export: {isPDFExportEnabled ?
                <span className="text-green-400">Enabled</span> :
                <span className="text-red-400">Disabled</span>
              }
            </li>
            <li>
              Email Capture: {isEmailCaptureEnabled ?
                <span className="text-green-400">Enabled</span> :
                <span className="text-red-400">Disabled</span>
              }
            </li>
          </ul>
        </div>
      </section>

      {/* Municipality Data */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold">Municipality Data</h3>
        {oslo && (
          <div className="p-4 bg-slate-800 rounded">
            <h4 className="font-medium text-cyan-400">{oslo.name}</h4>
            <ul className="text-sm space-y-1">
              <li>Code: {oslo.code}</li>
              <li>Fylke: {oslo.fylke}</li>
              <li>Price Zone: {oslo.price_zone}</li>
              <li>Climate Zone: {oslo.climate_zone}</li>
              <li>Heating Degree Days: {oslo.heating_degree_days}</li>
            </ul>
          </div>
        )}
      </section>

      {/* All Calculation Parameters */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold">All Calculation Parameters</h3>
        {calcParams && (
          <div className="p-4 bg-slate-800 rounded">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>BRA Adjustment: {calcParams.braAdjustment}%</div>
              <div>Investment Multiplier: {calcParams.investmentMultiplier}x</div>
              <div>Base Price: {calcParams.baseElectricityPrice} kr/kWh</div>
              <div>Grid Rent: {calcParams.gridRent} kr/kWh</div>
              <div>CO₂ Factor: {calcParams.kwhToCO2} kg/kWh</div>
              <div>Target Conversion: {calcParams.targetConversionRate}%</div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}