'use client';

import { motion, useInView } from "framer-motion";
import { useRef, Suspense, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building,
  CheckCircle,
  AlertTriangle,
  MapPin,
  Thermometer,
  Zap,
  Maximize2,
  Minimize2
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

  // State for selected 3D component
  const [selectedComponent, setSelectedComponent] = useState<{
    id: string | null;
    type?: string | null;
    color?: string;
    coverage?: number;
    greenSides?: number;
    segment?: string;
  }>({ id: null });

  // State for camera rotation (for north arrow)
  const [cameraAzimuth, setCameraAzimuth] = useState<number>(0);

  // State for fullscreen mode
  const [isFullscreen, setIsFullscreen] = useState(false);

  // State for sectioning
  const [sectionPlane, setSectionPlane] = useState<{ active: boolean; axis: 'x' | 'y' | 'z'; position: number; normal?: [number, number, number]; intersectionPoint?: [number, number, number] } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; componentId: string; normal?: [number, number, number]; intersectionPoint?: [number, number, number] } | null>(null);

  // State for floor visibility (including roof)
  // numberOfFloors will be calculated later based on OSM data
  const [visibleFloors, setVisibleFloors] = useState<Set<number>>(
    new Set(Array.from({ length: 3 }, (_, i) => i)) // Default to 2 floors + roof
  );

  // Track shift key state
  const [isShiftPressed, setIsShiftPressed] = useState(false);


  // State for footprint and axes visualization
  const [showFootprint, setShowFootprint] = useState(true);  // Building footprint on ground
  const [showAxes, setShowAxes] = useState(false);
  const [showBoundingBox, setShowBoundingBox] = useState(true);  // Bounding box

  // State for roof placement - which floor supports the roof
  const [roofPlacementFloor, setRoofPlacementFloor] = useState<number | null>(null);  // null = top of building, number = specific floor

  // Get header height dynamically
  const [headerHeight, setHeaderHeight] = useState(60);

  // Measure header height on mount and resize
  useEffect(() => {
    const measureHeader = () => {
      const header = document.querySelector('header');
      if (header) {
        setHeaderHeight(header.offsetHeight);
      }
    };

    measureHeader();
    window.addEventListener('resize', measureHeader);

    return () => {
      window.removeEventListener('resize', measureHeader);
    };
  }, []);

  // Listen for shift key press/release
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

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
  // Extract or estimate number of floors
  const numberOfFloors = buildingData.osmLevels ?
    buildingData.osmLevels :
    buildingData.totalArea && parseInt(buildingData.totalArea) > 500 ? 3 : 2;

  // Update visible floors when numberOfFloors changes
  useEffect(() => {
    setVisibleFloors(new Set(Array.from({ length: numberOfFloors + 1 }, (_, i) => i)));
  }, [numberOfFloors]);

  // Handle escape key to exit fullscreen
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [isFullscreen]);

  // Let BuildingMesh calculate height based on building type and floors
  // Only provide explicit height if we have OSM levels
  const explicitHeight = buildingData.osmLevels ? buildingData.osmLevels * 3.5 : undefined;


  return (
    <section
      ref={ref}
      className="min-h-screen relative flex items-center justify-center px-4 py-20"
    >
      {/* Debug Panel - Removed for production */}

      {/* Background Aurora - Dark Mode Theme */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-background"
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
              className="flex items-center space-x-2 text-aurora-cyan"
              initial={{ opacity: 0 }}
              animate={{ opacity: isInView ? 1 : 0 }}
              transition={{ delay: 0.5 }}
            >
              <MapPin className="w-5 h-5" />
              <span className="text-sm font-medium">Din eiendom</span>
            </motion.div>

            <motion.h1
              className="text-4xl lg:text-6xl font-bold text-foreground leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 20 }}
              transition={{ delay: 0.7 }}
            >
              {buildingData.address || 'Ukjent adresse'}
            </motion.h1>

            <motion.p
              className="text-lg text-text-secondary"
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
            <Card className="bg-card/50 border-border backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <Building className="w-6 h-6 text-aurora-cyan mx-auto mb-2" />
                <div className="text-foreground font-bold">
                  {buildingData.buildingType || 'Ukjent type'}
                </div>
                <div className="text-xs text-text-tertiary">Bygningstype</div>
              </CardContent>
            </Card>

            {/* Total Area */}
            <Card className="bg-card/50 border-border backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-foreground mb-1">
                  {buildingData.totalArea || '–'}
                  {buildingData.totalArea && <span className="text-sm">m²</span>}
                </div>
                <div className="text-xs text-text-tertiary">Bruksareal</div>
              </CardContent>
            </Card>

            {/* TEK17 Compliance */}
            <Card className="bg-card/50 border-border backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                {isCompliant !== null ? (
                  <>
                    {isCompliant ? (
                      <CheckCircle className="w-6 h-6 text-success mx-auto mb-2" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-orange-400 mx-auto mb-2" />
                    )}
                    <div className={`font-bold ${isCompliant ? 'text-success' : 'text-orange-400'}`}>
                      {isCompliant ? 'Godkjent' : 'Over krav'}
                    </div>
                    <div className="text-xs text-text-tertiary">TEK17 § 14-2</div>
                  </>
                ) : (
                  <>
                    <Thermometer className="w-6 h-6 text-text-tertiary mx-auto mb-2" />
                    <div className="text-text-tertiary font-bold">Ukjent</div>
                    <div className="text-xs text-text-tertiary">TEK17 status</div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Energy Class */}
            <Card className="bg-card/50 border-border backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <Zap className="w-6 h-6 text-aurora-purple mx-auto mb-2" />
                <div className="text-foreground font-bold">
                  {energyClass || (enovaResult?.status === 'Ikke registrert' ? 'Ikke registrert' : 'Ukjent')}
                </div>
                <div className="text-xs text-text-tertiary">
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
                    <div className="text-xs text-text-tertiary mb-1">Strømsone</div>
                    <div className="text-lg font-bold text-aurora-cyan">{priceZone}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-text-tertiary mb-1">Gjennomsnittspris (36 mnd)</div>
                    <div className="text-lg font-bold text-foreground">{electricityPrice.toFixed(2)} kr/kWh</div>
                  </div>
                </div>
                {realEnergyData?.priceZone && (
                  <div className="text-xs text-muted-foreground mt-2">
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
            <p className="text-text-tertiary text-sm mb-2">Rull ned for å utforske energihistorien</p>
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
          className={`${isFullscreen ? 'fixed left-0 right-0 bottom-0 z-[45] bg-background' : 'relative h-96 lg:h-[600px]'}`}
          style={isFullscreen ? { top: `${headerHeight}px` } : {}}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: isInView ? 1 : 0, x: isInView ? 0 : 50 }}
          transition={{ duration: 1, delay: 0.5 }}
          onClick={() => setContextMenu(null)} // Close context menu on click outside
        >
          {/* Container for 3D scene and controls */}
          <div className="w-full h-full relative">
            {/* Expand/Minimize Button - positioned to avoid compass overlap */}
            <Button
              variant="outline"
              size="icon"
              className={`absolute z-50 bg-background/90 backdrop-blur-sm top-4 left-4`}
              onClick={(e) => {
                e.stopPropagation();
                setIsFullscreen(!isFullscreen);
              }}
              title={isFullscreen ? "Minimer" : "Utvid"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>

          {/* Fullscreen hint - positioned next to button */}
          {isFullscreen && (
            <div className="absolute top-4 left-16 z-50 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-border">
              <p className="text-sm text-muted-foreground">
                Trykk <kbd className="px-1 py-0.5 text-xs bg-border rounded">ESC</kbd> for å avslutte fullskjerm
              </p>
            </div>
          )}

            <div
              className={`w-full h-full ${isFullscreen ? '' : 'bg-background/30 rounded-2xl border border-border backdrop-blur-sm'} overflow-hidden`}
            onWheel={(e) => {
              // Check if shift is held for section control
              if (e.shiftKey && sectionPlane?.active) {
                e.preventDefault();
                e.stopPropagation();

                // Update section position based on scroll
                // Inverted: scroll UP (negative deltaY) → push section away (positive delta)
                // scroll DOWN (positive deltaY) → pull section toward user (negative delta)
                const delta = e.deltaY > 0 ? 0.5 : -0.5; // Inverted for natural feel
                setSectionPlane(prev => {
                  if (!prev) return null;
                  const newPosition = Math.max(-20, Math.min(20, prev.position + delta));
                  return { ...prev, position: newPosition };
                });
              }
            }}
          >
            <Suspense fallback={
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-muted-foreground">Laster 3D modell...</div>
              </div>
            }>
              <Canvas
                camera={{ position: [20, 20, 20], fov: 50 }}
                className="w-full h-full"
                gl={{
                  localClippingEnabled: true, // Enable clipping planes
                  antialias: true, // Keep antialiasing for visual quality
                  powerPreference: "high-performance" // Request high-performance GPU
                }}
                dpr={[1, 2]} // Limit device pixel ratio for performance
              >
                {/* Brighter ambient light */}
                <ambientLight intensity={0.7} />

                {/* Main sun light */}
                <directionalLight
                  position={[10, 15, 10]}
                  intensity={1.2}
                  castShadow
                  shadow-mapSize-width={2048}
                  shadow-mapSize-height={2048}
                />

                {/* Fill light from opposite side */}
                <directionalLight
                  position={[-5, 8, -5]}
                  intensity={0.5}
                />

                {/* Space-themed gradient backdrop - clickable to deselect */}
                <mesh
                  position={[0, 20, -50]}
                  scale={[200, 100, 1]}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedComponent({ id: null, type: null });
                  }}
                >
                  <planeGeometry />
                  <meshBasicMaterial
                    color="#001d3d"
                    transparent
                    opacity={0.9}
                  />
                </mesh>

                {/* Additional backdrop for depth - clickable to deselect */}
                <mesh
                  position={[0, 0, -80]}
                  scale={[200, 100, 1]}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedComponent({ id: null, type: null });
                  }}
                >
                  <planeGeometry />
                  <meshBasicMaterial color="#000814" />
                </mesh>

                <BuildingMesh
                  footprint={buildingFootprint}
                  height={explicitHeight}
                  numberOfFloors={numberOfFloors}
                  buildingType={buildingData.buildingType || 'Kontor'}
                  showFootprint={showFootprint}
                  showAxes={showAxes}
                  showBoundingBox={showBoundingBox}
                  roofPlacementFloor={roofPlacementFloor}
                  onComponentSelect={(id, type, additionalInfo) => {
                    if (id === null) {
                      setSelectedComponent({ id: null, type: null });
                    } else {
                      setSelectedComponent({ id, type, ...additionalInfo });
                    }
                  }}
                  onContextMenu={(event, componentId) => {
                    // Calculate screen position for context menu
                    const x = event.nativeEvent.offsetX;
                    const y = event.nativeEvent.offsetY;
                    const normal = (event as any).normal || [0, 1, 0];
                    const intersectionPoint = (event as any).intersectionPoint || [0, 0, 0];
                    setContextMenu({ x, y, componentId, normal, intersectionPoint });
                  }}
                  sectionPlane={sectionPlane}
                  visibleFloors={visibleFloors}
                />

                {/* Green ground plane - clickable to deselect */}
                <mesh
                  rotation={[-Math.PI / 2, 0, 0]}
                  position={[0, -0.5, 0]}
                  receiveShadow
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedComponent({ id: null, type: null });
                  }}
                >
                  <planeGeometry args={[100, 100]} />
                  <meshLambertMaterial color="#2d5016" /> {/* Dark grass green */}
                </mesh>

                {/* Environment for better lighting */}
                <Environment preset="sunset" />

                <OrbitControls
                  enableZoom={!(sectionPlane?.active && isShiftPressed)}
                  enablePan={true}
                  // Removed angle restrictions - can now orbit fully including below
                  onChange={(e) => {
                    if (e?.target) {
                      // Calculate azimuth angle from camera position
                      const azimuth = Math.atan2(
                        e.target.object.position.x,
                        e.target.object.position.z
                      );
                      setCameraAzimuth(azimuth);
                    }
                  }}
                />

                <Environment preset="night" />
              </Canvas>
            </Suspense>
          </div>

          {/* North Arrow Indicator */}
          <motion.div
            className={`absolute top-4 right-4 bg-background/50 backdrop-blur-sm rounded-lg p-2 border border-border/50`}
            initial={{ opacity: 0 }}
            animate={{ opacity: isInView ? 1 : 0 }}
            transition={{ delay: 1 }}
          >
            <div className="relative w-12 h-12">
              {/* Compass circle */}
              <div className="absolute inset-0 border-2 border-cyan-400/30 rounded-full" />
              {/* Rotating arrow container */}
              <div
                className="absolute inset-0"
                style={{
                  transform: `rotate(${-cameraAzimuth * 180 / Math.PI}deg)`,
                  transition: 'transform 0.1s ease-out'
                }}
              >
                {/* North arrow */}
                <svg
                  className="w-full h-full"
                  viewBox="0 0 48 48"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Arrow pointing north (10% shorter) */}
                  <path
                    d="M24 11 L27 19 L24 17.5 L21 19 Z"
                    fill="rgba(34, 211, 238, 0.8)"
                    stroke="rgba(34, 211, 238, 1)"
                    strokeWidth="1"
                  />
                  {/* South indicator (10% shorter) */}
                  <path
                    d="M24 37 L21 29 L24 30.5 L27 29 Z"
                    fill="rgba(100, 116, 139, 0.5)"
                    stroke="rgba(100, 116, 139, 0.8)"
                    strokeWidth="1"
                  />
                </svg>
              </div>
              {/* Fixed cardinal directions (don't rotate) */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1 text-[8px] text-aurora-cyan font-bold">
                N
              </div>
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 text-[8px] text-muted-foreground">
                S
              </div>
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 text-[8px] text-muted-foreground">
                V
              </div>
              <div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1 text-[8px] text-muted-foreground">
                Ø
              </div>
            </div>
          </motion.div>

          {/* Floor Toggle Menu */}
          <motion.div
            className={`absolute top-20 right-4 bg-background/50 backdrop-blur-sm rounded-lg p-3 border border-border/50`}
            initial={{ opacity: 0 }}
            animate={{ opacity: isInView ? 1 : 0 }}
            transition={{ delay: 1.2 }}
          >
            <div className="text-xs text-aurora-cyan font-semibold mb-2">Etasjer</div>
            <div className="space-y-1 mb-3">
              {/* Roof toggle */}
              <label className="flex items-center gap-2 cursor-pointer hover:bg-card/50 rounded px-1 py-0.5">
                <input
                  type="checkbox"
                  checked={visibleFloors.has(numberOfFloors)}
                  onChange={(e) => {
                    const newVisible = new Set(visibleFloors);
                    if (e.target.checked) {
                      newVisible.add(numberOfFloors);
                    } else {
                      newVisible.delete(numberOfFloors);
                    }
                    setVisibleFloors(newVisible);
                  }}
                  className="w-3 h-3 accent-cyan-400"
                />
                <span className="text-[10px] text-text-secondary">Tak</span>
              </label>

              {/* Floor toggles (reverse order - top to bottom) */}
              {Array.from({ length: numberOfFloors }, (_, i) => numberOfFloors - 1 - i).map((floor) => (
                <label key={floor} className="flex items-center gap-2 cursor-pointer hover:bg-card/50 rounded px-1 py-0.5">
                  <input
                    type="checkbox"
                    checked={visibleFloors.has(floor)}
                    onChange={(e) => {
                      const newVisible = new Set(visibleFloors);
                      if (e.target.checked) {
                        newVisible.add(floor);
                      } else {
                        newVisible.delete(floor);
                      }
                      setVisibleFloors(newVisible);
                    }}
                    className="w-3 h-3 accent-cyan-400"
                  />
                  <span className="text-[10px] text-text-secondary">
                    {floor === 0 ? '1. etg' : `${floor + 1}. etg`}
                  </span>
                </label>
              ))}
            </div>

            {/* Visualization Toggle */}
            <div className="border-t border-border/30 pt-2 mt-2">
              <div className="text-xs text-aurora-purple font-semibold mb-2">Visualisering</div>
              <label className="flex items-center gap-2 cursor-pointer hover:bg-card/50 rounded px-1 py-0.5">
                <input
                  type="checkbox"
                  checked={showFootprint}
                  onChange={(e) => setShowFootprint(e.target.checked)}
                  className="w-3 h-3 accent-slate-400"
                />
                <span className="text-[10px] text-text-secondary">Fotavtrykk tak</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:bg-card/50 rounded px-1 py-0.5">
                <input
                  type="checkbox"
                  checked={showBoundingBox}
                  onChange={(e) => setShowBoundingBox(e.target.checked)}
                  className="w-3 h-3 accent-cyan-400"
                />
                <span className="text-[10px] text-text-secondary">Bounding box</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:bg-card/50 rounded px-1 py-0.5">
                <input
                  type="checkbox"
                  checked={showAxes}
                  onChange={(e) => setShowAxes(e.target.checked)}
                  className="w-3 h-3 accent-purple-400"
                />
                <span className="text-[10px] text-text-secondary">Vis koordinatakser</span>
              </label>
            </div>
          </motion.div>

          {/* 3D Controls Hint */}
          <motion.div
            className="absolute bottom-4 right-4 text-xs text-muted-foreground bg-background/50 px-2 py-1 rounded backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: isInView ? 1 : 0 }}
            transition={{ delay: 2 }}
          >
            Dra for å rotere • Høyreklikk for panorering • Zoom med hjul
          </motion.div>

          {/* Context Menu for Sectioning */}
          {contextMenu && (
            <div
              className="absolute bg-background/95 backdrop-blur-sm rounded-lg p-2 border border-border shadow-lg z-50"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              <button
                className="block w-full text-left px-3 py-2 text-sm hover:bg-primary/10 rounded transition-colors"
                onClick={() => {
                  // Create section parallel to clicked surface
                  const normal = contextMenu.normal || [0, 1, 0];
                  const intersectionPoint = contextMenu.intersectionPoint || [0, 0, 0];

                  // Determine primary axis based on normal and get position from intersection point
                  let axis: 'x' | 'y' | 'z' = 'y';
                  let position = 0;

                  if (Math.abs(normal[0]) > Math.abs(normal[1]) && Math.abs(normal[0]) > Math.abs(normal[2])) {
                    axis = 'x'; // Normal points mostly along X
                    position = intersectionPoint[0]; // Use X coordinate of click point
                  } else if (Math.abs(normal[2]) > Math.abs(normal[1])) {
                    axis = 'z'; // Normal points mostly along Z
                    position = intersectionPoint[2]; // Use Z coordinate of click point
                  } else {
                    axis = 'y'; // Normal points mostly along Y (up/down)
                    position = intersectionPoint[1]; // Use Y coordinate of click point
                  }

                  setSectionPlane({ active: true, axis, position, normal, intersectionPoint });
                  setContextMenu(null);
                }}
              >
                ✂️ Lag snitt
              </button>
              {sectionPlane?.active && (
                <button
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-red-500/10 rounded transition-colors text-destructive"
                  onClick={() => {
                    setSectionPlane(null);
                    setContextMenu(null);
                  }}
                >
                  ❌ Fjern snitt
                </button>
              )}
              <button
                className="block w-full text-left px-3 py-2 text-sm hover:bg-primary/10 rounded transition-colors text-muted-foreground"
                onClick={() => setContextMenu(null)}
              >
                Avbryt
              </button>
            </div>
          )}

          {/* Section Plane Controls */}
          {sectionPlane?.active && (
            <motion.div
              className="absolute bottom-20 left-4 bg-background/95 backdrop-blur-sm rounded-lg p-3 border border-border shadow-xl"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="space-y-2.5">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="text-xs text-aurora-cyan font-semibold">✂️ Snittplan aktivt</div>
                  <button
                    className="text-xs text-destructive hover:text-red-300 transition-colors px-1"
                    onClick={() => setSectionPlane(null)}
                    title="Lukk snittplan"
                  >
                    ✕
                  </button>
                </div>

                {/* Position display */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary">
                    {sectionPlane.axis === 'y' ? 'Høyde' :
                     sectionPlane.axis === 'x' ? 'X-pos' : 'Z-pos'}:
                  </span>
                  <span className="text-sm font-mono text-foreground bg-black/30 px-2 py-0.5 rounded">
                    {sectionPlane.position.toFixed(1)}m
                  </span>
                </div>

                {/* Control hint with visual keyboard */}
                <div className="bg-primary/10 rounded-md p-2 border border-primary/20">
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 text-[11px] bg-background rounded border border-border font-mono shadow-sm">
                      ⇧ Shift
                    </kbd>
                    <span className="text-[11px] text-text-tertiary">+</span>
                    <div className="flex flex-col items-center">
                      <div className="text-[10px] text-muted-foreground">▲</div>
                      <div className="px-2 py-0.5 text-[11px] bg-background rounded border border-border">
                        Scroll
                      </div>
                      <div className="text-[10px] text-muted-foreground">▼</div>
                    </div>
                    <span className="text-[11px] text-text-secondary ml-1">flytt snitt</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Selected Component Info - positioned below expand button */}
          {selectedComponent.id && (
            <motion.div
              className="absolute top-16 left-4 bg-background/80 backdrop-blur-sm rounded-lg p-3 border border-border"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="text-xs text-muted-foreground mb-1">Valgt komponent</div>
              <div className="text-sm font-medium text-foreground">{selectedComponent.type || 'Komponent'}</div>
              <div className="text-xs text-primary mt-1">{selectedComponent.id}</div>
              {selectedComponent.id.includes('roof') && (
                <div className="text-xs text-muted-foreground mt-2">
                  Klikk for å se varmetapsdata
                </div>
              )}
              {selectedComponent.id.includes('window') && (
                <div className="text-xs text-muted-foreground mt-2">
                  U-verdi: 1.2 W/m²K
                </div>
              )}
              {selectedComponent.id.includes('wall') && (
                <div className="text-xs text-muted-foreground mt-2">
                  Isolasjon: 600mm mineralull<br/>
                  U-verdi: 0.18 W/m²K
                </div>
              )}
              {selectedComponent.id.includes('floor') && (
                <div className="text-xs text-muted-foreground mt-2">
                  {selectedComponent.id.includes('divider')
                    ? 'Betongdekke 250mm'
                    : 'Gulvisolasjon: 250mm'}
                </div>
              )}
              {selectedComponent.id.includes('door') && (
                <div className="text-xs text-muted-foreground mt-2">
                  U-verdi: 1.5 W/m²K<br/>
                  Hovedinngang
                </div>
              )}
            </motion.div>
          )}
          </div> {/* End of relative container */}
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