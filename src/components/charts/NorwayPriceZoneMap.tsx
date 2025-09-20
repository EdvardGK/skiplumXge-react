'use client';

import React, { useState } from 'react';
import { stormColors, getNorwayZoneColor } from '@/lib/storm-theme';

interface PriceZone {
  id: string;
  name: string;
  region: string;
  currentPrice: number; // øre/kWh
  avgPrice: number;
  color: string;
  coordinates: string; // SVG path
}

interface NorwayPriceZoneMapProps {
  selectedZone?: string;
  onZoneSelect?: (zone: string) => void;
  showPrices?: boolean;
  className?: string;
}

const priceZones: PriceZone[] = [
  {
    id: 'NO1',
    name: 'NO1 - Oslo',
    region: 'Øst-Norge',
    currentPrice: 285, // øre/kWh
    avgPrice: 245,
    color: stormColors.norway.NO1,
    coordinates: 'M280,200 L320,190 L340,220 L360,250 L340,280 L300,290 L280,260 Z'
  },
  {
    id: 'NO2',
    name: 'NO2 - Kristiansand',
    region: 'Sør-Norge',
    currentPrice: 275,
    avgPrice: 240,
    color: stormColors.norway.NO2,
    coordinates: 'M220,280 L280,260 L300,290 L280,320 L240,330 L200,310 Z'
  },
  {
    id: 'NO3',
    name: 'NO3 - Trondheim',
    region: 'Midt-Norge',
    currentPrice: 265,
    avgPrice: 235,
    color: stormColors.norway.NO3,
    coordinates: 'M240,120 L300,110 L320,140 L310,180 L280,200 L250,190 L240,160 Z'
  },
  {
    id: 'NO4',
    name: 'NO4 - Tromsø',
    region: 'Nord-Norge',
    currentPrice: 255,
    avgPrice: 225,
    color: stormColors.norway.NO4,
    coordinates: 'M260,40 L320,30 L340,60 L330,100 L300,110 L270,100 L260,70 Z'
  },
  {
    id: 'NO5',
    name: 'NO5 - Bergen',
    region: 'Vest-Norge',
    currentPrice: 295,
    avgPrice: 250,
    color: stormColors.norway.NO5,
    coordinates: 'M180,180 L240,160 L250,190 L240,220 L200,240 L160,220 L170,200 Z'
  }
];

export default function NorwayPriceZoneMap({
  selectedZone,
  onZoneSelect,
  showPrices = true,
  className = ''
}: NorwayPriceZoneMapProps) {
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  const handleZoneClick = (zoneId: string) => {
    if (onZoneSelect) {
      onZoneSelect(zoneId);
    }
  };

  const getZoneOpacity = (zone: PriceZone) => {
    if (!hoveredZone && !selectedZone) return 0.8;
    if (hoveredZone === zone.id || selectedZone === zone.id) return 1.0;
    return 0.5;
  };

  const getPriceIntensity = (price: number) => {
    const minPrice = Math.min(...priceZones.map(z => z.currentPrice));
    const maxPrice = Math.max(...priceZones.map(z => z.currentPrice));
    return (price - minPrice) / (maxPrice - minPrice);
  };

  return (
    <div className={`${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-bold text-white mb-1">
          Norske strømprisområder
        </h3>
        <p className="text-slate-400 text-sm">
          Dagens priser og regionale forskjeller (øre/kWh)
        </p>
      </div>

      <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map */}
          <div className="relative">
            <svg
              width="100%"
              height="400"
              viewBox="0 0 400 400"
              className="drop-shadow-lg"
            >
              <defs>
                {/* Gradient definitions for each zone */}
                {priceZones.map(zone => (
                  <radialGradient key={zone.id} id={`gradient-${zone.id}`} cx="50%" cy="50%" r="70%">
                    <stop offset="0%" stopColor={zone.color} stopOpacity={0.9}/>
                    <stop offset="100%" stopColor={zone.color} stopOpacity={0.6}/>
                  </radialGradient>
                ))}

                {/* Glow filters */}
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* Norway outline (simplified) */}
              <path
                d="M200,20 L350,15 L370,50 L360,120 L380,180 L370,250 L350,320 L300,360 L250,370 L200,350 L150,320 L120,280 L140,240 L160,200 L180,160 L200,120 L220,80 L200,20 Z"
                fill="rgba(71, 85, 105, 0.3)"
                stroke="rgba(148, 163, 184, 0.5)"
                strokeWidth="2"
              />

              {/* Price zones */}
              {priceZones.map(zone => {
                const isActive = hoveredZone === zone.id || selectedZone === zone.id;
                const intensity = getPriceIntensity(zone.currentPrice);

                return (
                  <g key={zone.id}>
                    {/* Zone glow effect */}
                    {isActive && (
                      <path
                        d={zone.coordinates}
                        fill={zone.color}
                        opacity={0.4}
                        filter="url(#glow)"
                        transform="scale(1.05) translate(-5, -5)"
                      />
                    )}

                    {/* Main zone */}
                    <path
                      d={zone.coordinates}
                      fill={`url(#gradient-${zone.id})`}
                      opacity={getZoneOpacity(zone)}
                      stroke="white"
                      strokeWidth={isActive ? 3 : 1.5}
                      className="cursor-pointer transition-all duration-300"
                      onMouseEnter={() => setHoveredZone(zone.id)}
                      onMouseLeave={() => setHoveredZone(null)}
                      onClick={() => handleZoneClick(zone.id)}
                      filter={isActive ? "url(#glow)" : undefined}
                    />

                    {/* Zone label */}
                    <text
                      x={zone.coordinates.includes('280,200') ? 300 :
                         zone.coordinates.includes('220,280') ? 240 :
                         zone.coordinates.includes('240,120') ? 270 :
                         zone.coordinates.includes('260,40') ? 290 :
                         200}
                      y={zone.coordinates.includes('280,200') ? 230 :
                         zone.coordinates.includes('220,280') ? 300 :
                         zone.coordinates.includes('240,120') ? 155 :
                         zone.coordinates.includes('260,40') ? 70 :
                         210}
                      fill="white"
                      fontSize="14"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="pointer-events-none"
                      filter="drop-shadow(0 0 4px rgba(0,0,0,0.8))"
                    >
                      {zone.id}
                    </text>

                    {/* Price display */}
                    {showPrices && (
                      <text
                        x={zone.coordinates.includes('280,200') ? 300 :
                           zone.coordinates.includes('220,280') ? 240 :
                           zone.coordinates.includes('240,120') ? 270 :
                           zone.coordinates.includes('260,40') ? 290 :
                           200}
                        y={zone.coordinates.includes('280,200') ? 245 :
                           zone.coordinates.includes('220,280') ? 315 :
                           zone.coordinates.includes('240,120') ? 170 :
                           zone.coordinates.includes('260,40') ? 85 :
                           225}
                        fill="rgba(255,255,255,0.9)"
                        fontSize="11"
                        textAnchor="middle"
                        className="pointer-events-none"
                        filter="drop-shadow(0 0 3px rgba(0,0,0,0.8))"
                      >
                        {zone.currentPrice}ø
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Zone details */}
          <div className="space-y-4">
            <div className="text-sm text-slate-400 mb-4">
              {hoveredZone ? 'Hold musepeker over områder for detaljer' : 'Klikk på områder for mer informasjon'}
            </div>

            {priceZones.map(zone => {
              const isActive = hoveredZone === zone.id || selectedZone === zone.id;
              const priceDiff = zone.currentPrice - zone.avgPrice;

              return (
                <div
                  key={zone.id}
                  className={`p-4 rounded-lg border transition-all duration-300 cursor-pointer ${
                    isActive
                      ? 'bg-white/10 border-white/30 shadow-lg'
                      : 'bg-white/5 border-white/10 hover:bg-white/8'
                  }`}
                  onMouseEnter={() => setHoveredZone(zone.id)}
                  onMouseLeave={() => setHoveredZone(null)}
                  onClick={() => handleZoneClick(zone.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: zone.color }}
                      />
                      <div>
                        <div className="font-semibold text-white">{zone.name}</div>
                        <div className="text-sm text-slate-400">{zone.region}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">
                        {zone.currentPrice} øre
                      </div>
                      <div className={`text-sm ${priceDiff > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {priceDiff > 0 ? '+' : ''}{priceDiff} øre
                      </div>
                    </div>
                  </div>

                  {/* Price bar */}
                  <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(zone.currentPrice / 300) * 100}%`,
                        backgroundColor: zone.color
                      }}
                    />
                  </div>

                  <div className="mt-2 text-xs text-slate-500">
                    Gjennomsnitt: {zone.avgPrice} øre/kWh
                  </div>
                </div>
              );
            })}

            {/* Price summary */}
            <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h4 className="font-semibold text-white mb-3">Prissammendrag</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-slate-400">Høyeste pris</div>
                  <div className="text-red-400 font-semibold">
                    {Math.max(...priceZones.map(z => z.currentPrice))} øre/kWh
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Laveste pris</div>
                  <div className="text-emerald-400 font-semibold">
                    {Math.min(...priceZones.map(z => z.currentPrice))} øre/kWh
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Gjennomsnitt</div>
                  <div className="text-cyan-400 font-semibold">
                    {Math.round(priceZones.reduce((sum, z) => sum + z.currentPrice, 0) / priceZones.length)} øre/kWh
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Spredning</div>
                  <div className="text-amber-400 font-semibold">
                    {Math.max(...priceZones.map(z => z.currentPrice)) - Math.min(...priceZones.map(z => z.currentPrice))} øre
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}