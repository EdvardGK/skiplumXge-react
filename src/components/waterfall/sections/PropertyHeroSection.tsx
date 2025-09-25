'use client';

import { motion, useInView } from "framer-motion";
import { useRef, Suspense } from "react";
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
  };
}

export default function PropertyHeroSection({ buildingData }: PropertyHeroSectionProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-20%" });

  // Calculate TEK17 compliance (simplified)
  const energyConsumption = buildingData.energyConsumption
    ? parseInt(buildingData.energyConsumption)
    : null;

  const tek17Requirement = buildingData.buildingType === 'Kontor' ? 115 :
                          buildingData.buildingType === 'Bolig' ? 105 : 110;

  const isCompliant = energyConsumption ? energyConsumption <= tek17Requirement : null;

  // Generate building footprint for 3D visualization
  const buildingFootprint: [number, number][] = buildingData.totalArea ? [
    [-10, -8], [10, -8], [10, 8], [-10, 8]  // Simple rectangle
  ] : [[-5, -5], [5, -5], [5, 5], [-5, 5]];

  const buildingHeight = buildingData.buildingYear ?
    (new Date().getFullYear() - parseInt(buildingData.buildingYear) < 20 ? 12 : 8) : 10;

  return (
    <section
      ref={ref}
      className="min-h-screen relative flex items-center justify-center px-4 py-20"
    >
      {/* Background Aurora */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-slate-900/50 to-blue-900/30"
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
                  {buildingData.energyClass || 'Ikke sertifisert'}
                </div>
                <div className="text-xs text-slate-400">Energimerking</div>
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