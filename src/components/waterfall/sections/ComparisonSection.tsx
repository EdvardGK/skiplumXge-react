'use client';

import { motion, useInView } from "framer-motion";
import { useRef, Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Star, TrendingUp, ArrowDown } from "lucide-react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

interface ComparisonSectionProps {
  buildingData: {
    address: string | null;
    buildingType: string | null;
    totalArea: string | null;
  };
}

interface ComparisonData {
  category: string;
  consumption: string | number;
  grade: string;
  color: string;
  bgColor: string;
  icon: string;
  isUser: boolean;
}

// 3D Building constellation component
function BuildingConstellation() {
  const buildings = [
    { position: [0, 0, 0] as [number, number, number], height: 3, efficiency: 0.3, isUser: true }, // User's building
    { position: [-8, 0, -5] as [number, number, number], height: 2.5, efficiency: 0.8, isUser: false },
    { position: [6, 0, -3] as [number, number, number], height: 4, efficiency: 0.6, isUser: false },
    { position: [-4, 0, 8] as [number, number, number], height: 3.5, efficiency: 0.9, isUser: false },
    { position: [10, 0, 6] as [number, number, number], height: 2, efficiency: 0.4, isUser: false },
    { position: [-12, 0, 2] as [number, number, number], height: 2.8, efficiency: 0.7, isUser: false },
    { position: [3, 0, -8] as [number, number, number], height: 3.2, efficiency: 0.5, isUser: false },
  ];

  return (
    <group>
      {buildings.map((building, index) => (
        <group key={index} position={building.position}>
          {/* Building */}
          <mesh>
            <boxGeometry args={[2, building.height, 2]} />
            <meshPhysicalMaterial
              color={building.isUser ? '#f59e0b' : building.efficiency > 0.7 ? '#10b981' : building.efficiency > 0.5 ? '#3b82f6' : '#ef4444'}
              emissive={building.isUser ? '#f59e0b' : building.efficiency > 0.7 ? '#10b981' : '#000000'}
              emissiveIntensity={building.isUser ? 0.3 : building.efficiency > 0.7 ? 0.2 : 0}
              transparent
              opacity={0.8}
            />
          </mesh>

          {/* Efficiency indicator light */}
          <pointLight
            position={[0, building.height + 1, 0]}
            color={building.isUser ? '#f59e0b' : building.efficiency > 0.7 ? '#10b981' : building.efficiency > 0.5 ? '#3b82f6' : '#ef4444'}
            intensity={building.isUser ? 2 : building.efficiency}
            distance={8}
          />

          {/* Connection lines to user building (aurora effect) - Simplified for build */}
          {!building.isUser && (
            <mesh position={[building.position[0] / 2, building.height / 2, building.position[2] / 2]}>
              <boxGeometry args={[0.1, 0.1, Math.sqrt(building.position[0] ** 2 + building.position[2] ** 2)]} />
              <meshBasicMaterial
                color={building.efficiency > 0.7 ? '#10b981' : '#3b82f6'}
                transparent
                opacity={0.3}
              />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

export default function ComparisonSection({ buildingData }: ComparisonSectionProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-20%" });

  const comparisonData: ComparisonData[] = [
    {
      category: 'Din bygning',
      consumption: 'Input building consumption',
      grade: 'Input energy grade',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-900/20 border-yellow-500/30',
      icon: '🏠',
      isUser: true
    },
    {
      category: 'Nabolaget snitt',
      consumption: 'Input neighborhood average',
      grade: 'Input neighborhood grade',
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20 border-blue-500/30',
      icon: '🏘️',
      isUser: false
    },
    {
      category: 'Beste i området',
      consumption: 'Input best in area',
      grade: 'Input best grade',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-900/20 border-emerald-500/30',
      icon: '⭐',
      isUser: false
    },
    {
      category: 'TEK17 krav',
      consumption: 'Input TEK17 requirement',
      grade: '-',
      color: 'text-purple-400',
      bgColor: 'bg-purple-900/20 border-purple-500/30',
      icon: '📋',
      isUser: false
    }
  ];

  return (
    <section
      ref={ref}
      className="min-h-screen flex items-center justify-center px-4 py-20 relative"
    >
      {/* Aurora background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-emerald-900/20"
        initial={{ opacity: 0 }}
        animate={{ opacity: isInView ? 1 : 0 }}
        transition={{ duration: 2 }}
      />

      <div className="container mx-auto max-w-6xl relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 30 }}
          transition={{ duration: 1 }}
        >
          <motion.div
            className="flex items-center justify-center space-x-2 text-purple-400 mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: isInView ? 1 : 0 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <Users className="w-6 h-6" />
            <span className="text-lg font-semibold">Nabolagssammenligning</span>
          </motion.div>

          <motion.h2
            className="text-4xl lg:text-5xl font-bold text-white mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: isInView ? 1 : 0 }}
            transition={{ delay: 0.4 }}
          >
            Du er ikke alene
          </motion.h2>

          <motion.p
            className="text-xl text-slate-300 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: isInView ? 1 : 0 }}
            transition={{ delay: 0.6 }}
          >
            Se hvordan din energieffektivitet sammenlignes med området
          </motion.p>
        </motion.div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Left - 3D Constellation */}
          <motion.div
            className="relative h-96"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: isInView ? 1 : 0, x: isInView ? 0 : -50 }}
            transition={{ delay: 0.8 }}
          >
            <Card className="bg-slate-900/30 border-white/10 backdrop-blur-sm h-full">
              <CardContent className="p-2 h-full">
                <Suspense fallback={
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-slate-400">Laster nabolag...</div>
                  </div>
                }>
                  <Canvas camera={{ position: [15, 15, 15], fov: 50 }}>
                    <ambientLight intensity={0.3} />
                    <directionalLight position={[10, 10, 10]} intensity={0.5} />

                    <BuildingConstellation />

                    <OrbitControls
                      enableZoom={true}
                      enablePan={false}
                      maxPolarAngle={Math.PI / 2}
                      minPolarAngle={Math.PI / 6}
                      autoRotate
                      autoRotateSpeed={0.5}
                    />

                    <fog attach="fog" args={['#0f172a', 10, 50]} />
                  </Canvas>
                </Suspense>

                <div className="absolute bottom-4 left-4 text-xs text-slate-400">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-yellow-400 rounded"></div>
                      <span>Din bygning</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded"></div>
                      <span>Effektive bygninger</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-red-400 rounded"></div>
                      <span>Ineffektive bygninger</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right - Comparison Stats */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: isInView ? 1 : 0, x: isInView ? 0 : 50 }}
            transition={{ delay: 1 }}
          >
            {comparisonData.map((item, index) => (
              <motion.div
                key={item.category}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 20 }}
                transition={{ delay: 1.2 + index * 0.1 }}
              >
                <Card className={`${item.bgColor} backdrop-blur-sm ${item.isUser ? 'ring-2 ring-yellow-400/50' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{item.icon}</div>
                        <div>
                          <h3 className={`font-bold ${item.color}`}>{item.category}</h3>
                          <div className="text-xs text-slate-400">
                            {item.isUser ? 'Det er deg!' : 'Sammenligning'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-bold text-white">
                          {item.consumption}
                        </div>
                        <div className={`text-sm font-medium ${item.color}`}>
                          {item.grade}
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3 w-full bg-slate-700 rounded-full h-2">
                      <motion.div
                        className={`h-2 rounded-full ${
                          typeof item.consumption === 'number' && item.consumption > 150 ? 'bg-red-500' :
                          typeof item.consumption === 'number' && item.consumption > 120 ? 'bg-yellow-500' :
                          typeof item.consumption === 'number' && item.consumption > 100 ? 'bg-blue-500' : 'bg-emerald-500'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: isInView ? '60%' : 0 }}
                        transition={{ delay: 1.5 + index * 0.1, duration: 1 }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Success Stories */}
        <motion.div
          className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 30 }}
          transition={{ delay: 2 }}
        >
          <Card className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border-emerald-500/30 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Star className="w-6 h-6 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Suksesshistorie</h3>
              </div>
              <p className="text-slate-300 text-sm mb-3">
                <strong className="text-white">Storgata 15</strong> gikk fra klasse D til A
                med varmepumpe og isolering. Sparer nå 45.000 kr årlig.
              </p>
              <div className="text-emerald-400 text-sm font-medium">
                Tilbakebetaling: 6,2 år
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <TrendingUp className="w-6 h-6 text-blue-400" />
                <h3 className="text-lg font-bold text-white">Området ditt</h3>
              </div>
              <p className="text-slate-300 text-sm mb-3">
                <strong className="text-white">72% av naboene</strong> har gjennomført
                energitiltak de siste 5 årene. Gjennomsnittlig besparelse: 28%.
              </p>
              <div className="text-blue-400 text-sm font-medium">
                Du kan også oppnå dette!
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Transition */}
        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: isInView ? 1 : 0 }}
          transition={{ delay: 2.5 }}
        >
          <p className="text-slate-400 text-sm mb-4">
            Klar for å bli en av suksesshistoriene?
          </p>
          <ArrowDown className="w-6 h-6 text-cyan-400 mx-auto animate-bounce" />
        </motion.div>
      </div>
    </section>
  );
}