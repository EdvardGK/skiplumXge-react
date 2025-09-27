'use client';

import { motion, useInView } from "framer-motion";
import { useRef, Suspense, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building,
  CheckCircle,
  AlertTriangle,
  MapPin,
  Thermometer,
  Zap
} from "lucide-react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import BuildingMesh from "../three/BuildingMesh";
import type { RealEnergyData } from '@/hooks/use-real-energy-data';

interface PropertyHeroSectionProps {
  buildingData: {
    address: string | null;
    buildingType: string | null;
    totalArea: string | null;
    heatedArea: string | null;
    buildingYear: string | null;
    lat: string | null;
    lon: string | null;
    energyClass: string | null;
    energyConsumption: string | null;
    buildingFootprint?: number[][] | null;
    osmLevels?: number | null;
  };
  realEnergyData?: RealEnergyData;
  energyAnalysis?: any;
}

export default function PropertyHeroSection({ buildingData, realEnergyData, energyAnalysis }: PropertyHeroSectionProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-20%" });

  // Use real Enova data when available
  const enovaResult = realEnergyData?.enovaResult;
  const hasEnovaCertificate = enovaResult?.found && enovaResult?.certificate;

  // Get energy class from Enova or use provided data
  const energyClass = enovaResult?.energyGrade || buildingData.energyClass || null;
  const energyConsumption = enovaResult?.energyConsumption ||
    (buildingData.energyConsumption ? parseInt(buildingData.energyConsumption) : null);

  const tek17Requirement = buildingData.buildingType === 'Kontor' ? 115 :
                          buildingData.buildingType === 'Bolig' ? 105 : 110;

  const isCompliant = energyConsumption ? energyConsumption <= tek17Requirement : null;

  // Get price zone and electricity price
  const priceZone = realEnergyData?.zoneDisplayName || 'Østlandet';
  const electricityPrice = realEnergyData?.average36MonthPrice || realEnergyData?.currentPricing?.totalPrice || 2.80;

  // Use OSM footprint if available, otherwise generate a simple rectangle
  const buildingFootprint: [number, number][] = buildingData.buildingFootprint ?
    // Transform OSM coordinates to local 3D space (center around origin)
    (() => {
      const footprint = buildingData.buildingFootprint as number[][];
      if (!footprint || footprint.length === 0) {
        return [[-10, -8], [10, -8], [10, 8], [-10, 8]] as [number, number][];
      }

      console.log('Raw OSM footprint:', footprint);

      // Calculate center point and bounds
      let minLat = Infinity, maxLat = -Infinity;
      let minLon = Infinity, maxLon = -Infinity;

      footprint.forEach(([lat, lon]) => {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
      });

      const centerLat = (minLat + maxLat) / 2;
      const centerLon = (minLon + maxLon) / 2;

      // Calculate actual size in degrees
      const latRange = maxLat - minLat;
      const lonRange = maxLon - minLon;

      // Convert to meters (approximate)
      // At ~60° latitude (Norway), 1 degree lat ≈ 111km, 1 degree lon ≈ 55km
      const metersPerDegreeLat = 111000;
      const metersPerDegreeLon = 55000;

      const widthMeters = lonRange * metersPerDegreeLon;
      const heightMeters = latRange * metersPerDegreeLat;

      console.log('Building dimensions (meters):', { width: widthMeters, height: heightMeters });

      // Scale to reasonable 3D units (target: ~20 units for typical building)
      const targetSize = 20;
      const maxDimension = Math.max(widthMeters, heightMeters);
      const scaleFactor = targetSize / maxDimension;

      // Transform to local coordinates
      const transformed = footprint.map(([lat, lon]) => [
        ((lon - centerLon) * metersPerDegreeLon * scaleFactor),
        ((lat - centerLat) * metersPerDegreeLat * scaleFactor)
      ] as [number, number]);

      console.log('Transformed footprint:', transformed);

      return transformed;
    })()
    : buildingData.totalArea ? [
      [-10, -8], [10, -8], [10, 8], [-10, 8]  // Default rectangle based on area
    ] : [[-5, -5], [5, -5], [5, 5], [-5, 5]];

  // Use OSM levels if available, otherwise estimate based on building age
  const buildingHeight = buildingData.osmLevels ?
    buildingData.osmLevels * 3.5 : // Approximately 3.5m per floor
    buildingData.buildingYear ?
      (new Date().getFullYear() - parseInt(buildingData.buildingYear) < 20 ? 12 : 8) : 10;

  // Debug info for roof algorithm
  const [showDebug, setShowDebug] = useState(true);

  return (
    <section
      ref={ref}
      className="min-h-screen relative flex items-center justify-center px-4 py-20"
    >
      {/* Debug Panel for Building Analysis */}
      {showDebug && (
        <div className="fixed top-20 right-4 z-50 bg-black/80 text-white p-4 rounded-lg max-w-md max-h-[80vh] overflow-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">🔍 Building Debug Info</h3>
            <button
              onClick={() => setShowDebug(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4 text-sm">
            {/* OSM Data */}
            <div>
              <h4 className="font-semibold text-cyan-400 mb-2">OSM Building Data</h4>
              <div className="bg-white/10 p-2 rounded">
                <div>Footprint Points: {buildingData.buildingFootprint ? buildingData.buildingFootprint.length : 'None'}</div>
                <div>OSM Levels: {buildingData.osmLevels || 'N/A'}</div>
                {buildingData.buildingFootprint && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-cyan-300">Raw Coordinates</summary>
                    <pre className="text-xs mt-1 overflow-auto">
                      {JSON.stringify(buildingData.buildingFootprint, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>

            {/* Transformed Footprint */}
            <div>
              <h4 className="font-semibold text-cyan-400 mb-2">Transformed to 3D Space</h4>
              <div className="bg-white/10 p-2 rounded">
                <div>Points: {buildingFootprint.length}</div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-cyan-300">3D Coordinates</summary>
                  <pre className="text-xs mt-1 overflow-auto">
                    {JSON.stringify(buildingFootprint, null, 2)}
                  </pre>
                </details>
              </div>
            </div>

            {/* Building Dimensions */}
            <div>
              <h4 className="font-semibold text-cyan-400 mb-2">Calculated Dimensions</h4>
              <div className="bg-white/10 p-2 rounded">
                <div>Height: {buildingHeight}m</div>
                <div>Total Area: {buildingData.totalArea}m²</div>
                <div>Heated Area: {buildingData.heatedArea}m²</div>
              </div>
            </div>

            {/* Shape Detection */}
            <div>
              <h4 className="font-semibold text-cyan-400 mb-2">Shape Analysis</h4>
              <div className="bg-white/10 p-2 rounded">
                <div className="text-yellow-300">
                  ⚠️ Check browser console for detailed roof algorithm analysis
                </div>
                <div className="mt-2 text-xs">
                  <div>• Corner detection</div>
                  <div>• Concave corners found</div>
                  <div>• Shape type (Rectangle/L/T/Complex)</div>
                  <div>• Rectangle decomposition</div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowDebug(true)}
            className="mt-4 w-full py-2 bg-cyan-600 hover:bg-cyan-500 rounded text-sm"
          >
            Refresh Analysis
          </button>
        </div>
      )}

      {/* Show Debug Button when hidden */}
      {!showDebug && (
        <button
          onClick={() => setShowDebug(true)}
          className="fixed top-20 right-4 z-50 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg"
        >
          🔍 Show Debug
        </button>
      )}

      {/* Background Aurora - Northern Lights Theme */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"
        initial={{ opacity: 0 }}
        animate={{ opacity: isInView ? 1 : 0 }}
        transition={{ duration: 2 }}
      />

      <div className="container mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">

        {/* Left Column - Building Information */}
        <motion.div
          className="space-y-8"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: isInView ? 1 : 0, x: isInView ? 0 : -50 }}
          transition={{ duration: 1, delay: 0.3 }}
        >
          {/* Address Header */}
          <div className="space-y-4">
            <motion.div
              className="flex items-center space-x-2 text-cyan-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: isInView ? 1 : 0 }}
              transition={{ delay: 0.5 }}
            >
              <MapPin className="w-5 h-5" />
              <span className="text-sm font-medium">Din eiendom</span>
            </motion.div>

            <motion.h1
              className="text-4xl lg:text-6xl font-bold text-white leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 20 }}
              transition={{ delay: 0.7 }}
            >
              {buildingData.address || 'Ukjent adresse'}
            </motion.h1>

            <motion.p
              className="text-lg text-slate-300"
              initial={{ opacity: 0 }}
              animate={{ opacity: isInView ? 1 : 0 }}
              transition={{ delay: 0.9 }}
            >
              Utforsk din bygnings energihistorie - fra dagens tilstand til fremtidens potensial
            </motion.p>
          </div>

          {/* Building Stats Cards */}
          <motion.div
            className="grid grid-cols-2 gap-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 30 }}
            transition={{ delay: 1.1 }}
          >
            {/* Building Type */}
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <Building className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                <div className="text-white font-bold">
                  {buildingData.buildingType || 'Ukjent type'}
                </div>
                <div className="text-xs text-slate-400">Bygningstype</div>
              </CardContent>
            </Card>

            {/* Total Area */}
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  {buildingData.totalArea || '–'}
                  {buildingData.totalArea && <span className="text-sm">m²</span>}
                </div>
                <div className="text-xs text-slate-400">Bruksareal</div>
              </CardContent>
            </Card>

            {/* TEK17 Compliance */}
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                {isCompliant !== null ? (
                  <>
                    {isCompliant ? (
                      <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-orange-400 mx-auto mb-2" />
                    )}
                    <div className={`font-bold ${isCompliant ? 'text-emerald-400' : 'text-orange-400'}`}>
                      {isCompliant ? 'Godkjent' : 'Over krav'}
                    </div>
                    <div className="text-xs text-slate-400">TEK17 § 14-2</div>
                  </>
                ) : (
                  <>
                    <Thermometer className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                    <div className="text-slate-400 font-bold">Ukjent</div>
                    <div className="text-xs text-slate-400">TEK17 status</div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Energy Class */}
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <Zap className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                <div className="text-white font-bold">
                  {energyClass || (enovaResult?.status === 'Ikke registrert' ? 'Ikke registrert' : 'Ukjent')}
                </div>
                <div className="text-xs text-slate-400">
                  {hasEnovaCertificate ? 'Enova-sertifisert' : 'Energimerking'}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Price Zone and Electricity Info */}
          <motion.div
            className="mt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 20 }}
            transition={{ delay: 1.3 }}
          >
            <Card className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border-cyan-500/30 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Strømsone</div>
                    <div className="text-lg font-bold text-cyan-400">{priceZone}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400 mb-1">Gjennomsnittspris (36 mnd)</div>
                    <div className="text-lg font-bold text-white">{electricityPrice.toFixed(2)} kr/kWh</div>
                  </div>
                </div>
                {realEnergyData?.priceZone && (
                  <div className="text-xs text-slate-500 mt-2">
                    Kilde: NVE • Supabase database
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* CTA Scroll Hint */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: isInView ? 1 : 0 }}
            transition={{ delay: 1.5 }}
          >
            <p className="text-slate-400 text-sm mb-2">Rull ned for å utforske energihistorien</p>
            <motion.div
              className="w-6 h-10 border-2 border-cyan-400/50 rounded-full mx-auto relative"
              animate={{
                borderColor: ['rgba(34, 211, 238, 0.5)', 'rgba(34, 211, 238, 1)', 'rgba(34, 211, 238, 0.5)']
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <motion.div
                className="w-1 h-1 bg-cyan-400 rounded-full absolute left-1/2 transform -translate-x-1/2 top-2"
                animate={{ y: [0, 16, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Right Column - 3D Building Visualization */}
        <motion.div
          className="relative h-96 lg:h-[600px]"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: isInView ? 1 : 0, x: isInView ? 0 : 50 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          <div className="w-full h-full bg-slate-900/30 rounded-2xl border border-white/10 backdrop-blur-sm overflow-hidden">
            <Suspense fallback={
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-slate-400">Laster 3D modell...</div>
              </div>
            }>
              <Canvas
                camera={{ position: [20, 20, 20], fov: 50 }}
                className="w-full h-full"
              >
                <ambientLight intensity={0.4} />
                <directionalLight
                  position={[10, 10, 10]}
                  intensity={1}
                  castShadow
                  shadow-mapSize-width={2048}
                  shadow-mapSize-height={2048}
                />

                <BuildingMesh
                  footprint={buildingFootprint}
                  height={buildingHeight}
                  buildingType={buildingData.buildingType || 'default'}
                  showHeatParticles={!isCompliant && energyConsumption !== null}
                />

                {/* Ground plane */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
                  <planeGeometry args={[50, 50]} />
                  <meshLambertMaterial color="#0f172a" />
                </mesh>

                <OrbitControls
                  enableZoom={true}
                  enablePan={false}
                  maxPolarAngle={Math.PI / 2}
                  minPolarAngle={Math.PI / 6}
                />

                <Environment preset="night" />
              </Canvas>
            </Suspense>
          </div>

          {/* 3D Controls Hint */}
          <motion.div
            className="absolute bottom-4 right-4 text-xs text-slate-400 bg-slate-900/50 px-2 py-1 rounded backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: isInView ? 1 : 0 }}
            transition={{ delay: 2 }}
          >
            Dra for å rotere • Zoom med hjul
          </motion.div>
        </motion.div>
      </div>

      {/* Heat Particles Transition */}
      {!isCompliant && energyConsumption !== null && (
        <motion.div
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2"
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: isInView ? 1 : 0, y: isInView ? 50 : 0 }}
          transition={{ delay: 2.5, duration: 1.5 }}
        >
          <div className="flex space-x-2">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-orange-400 rounded-full"
                animate={{
                  y: [0, -20, -40],
                  opacity: [1, 0.7, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </section>
  );
}