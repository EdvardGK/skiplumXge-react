'use client';

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Thermometer, ArrowDown } from "lucide-react";

interface HeatLossSectionProps {
  buildingData: {
    address: string | null;
    buildingType: string | null;
    totalArea: string | null;
    buildingYear: string | null;
  };
  energyAnalysis?: any;
}

export default function HeatLossSection({ buildingData, energyAnalysis }: HeatLossSectionProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-20%" });

  // Calculate building age
  const currentYear = new Date().getFullYear();
  const buildingAge = buildingData.buildingYear
    ? currentYear - parseInt(buildingData.buildingYear)
    : 0;

  // Heat loss breakdown based on building age (Norwegian building physics)
  const heatLossBreakdown = (() => {
    if (!buildingAge || buildingAge === 0) {
      // No building year - use defaults with source label
      return {
        walls: 35,
        roof: 25,
        windows: 20,
        floor: 10,
        ventilation: 10,
        source: 'Krever: Bygningsår'
      };
    }

    // Age-based distribution (from main dashboard logic)
    if (buildingAge <= 10) { // TEK17 era
      return { walls: 25, roof: 20, floor: 15, windows: 20, ventilation: 15, infiltration: 5 };
    } else if (buildingAge <= 15) { // TEK10 era
      return { walls: 30, roof: 25, floor: 10, windows: 20, ventilation: 10, infiltration: 5 };
    } else if (buildingAge <= 25) { // TEK97 era
      return { walls: 35, roof: 20, floor: 8, windows: 25, ventilation: 7, infiltration: 5 };
    } else { // Older buildings
      return { walls: 40, roof: 25, floor: 5, windows: 20, ventilation: 5, infiltration: 5 };
    }
  })();

  // Heat loss data with proper sourcing
  const heatLossItems = [
    { name: 'Yttervegger', value: `${heatLossBreakdown.walls}%`, source: 'TEK-analyse', color: 'bg-cyan-500', icon: '🧱' },
    { name: 'Tak', value: `${heatLossBreakdown.roof}%`, source: 'TEK-analyse', color: 'bg-emerald-500', icon: '🏠' },
    { name: 'Vinduer', value: `${heatLossBreakdown.windows}%`, source: 'TEK-analyse', color: 'bg-purple-500', icon: '🪟' },
    { name: 'Gulv', value: `${heatLossBreakdown.floor}%`, source: 'TEK-analyse', color: 'bg-blue-500', icon: '📐' },
    { name: 'Ventilasjon', value: `${heatLossBreakdown.ventilation}%`, source: 'TEK-analyse', color: 'bg-indigo-500', icon: '💨' },
  ];

  return (
    <section
      ref={ref}
      className="min-h-screen flex items-center justify-center px-4 py-20 relative"
    >
      {/* Background gradient - Northern Lights Theme */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-slate-900/50 via-purple-900/20 to-blue-900/30"
        initial={{ opacity: 0 }}
        animate={{ opacity: isInView ? 1 : 0 }}
        transition={{ duration: 1.5 }}
      />

      <div className="container mx-auto max-w-6xl relative z-10">

        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 30 }}
          transition={{ duration: 1 }}
        >
          <motion.div
            className="flex items-center justify-center space-x-2 text-orange-400 mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: isInView ? 1 : 0 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <Thermometer className="w-6 h-6" />
            <span className="text-lg font-semibold">Varmetapsanalyse</span>
          </motion.div>

          <motion.h2
            className="text-4xl lg:text-5xl font-bold text-white mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 20 }}
            transition={{ delay: 0.4 }}
          >
            Hvor forsvinner energien?
          </motion.h2>

          <motion.p
            className="text-xl text-slate-300 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: isInView ? 1 : 0 }}
            transition={{ delay: 0.6 }}
          >
            Din bygning fra {buildingData.buildingYear || 'ukjent år'} har typisk varmetap
            fordelt som vist nedenfor
          </motion.p>
        </motion.div>

        {/* Heat Loss Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Left - Visualization */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: isInView ? 1 : 0, x: isInView ? 0 : -50 }}
            transition={{ delay: 0.8 }}
          >
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm p-6">
              <CardContent className="p-0">
                <div className="space-y-4">
                  {heatLossItems.map((item, index) => (
                    <motion.div
                      key={item.name}
                      className="flex items-center space-x-4"
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: isInView ? 1 : 0, x: isInView ? 0 : -30 }}
                      transition={{ delay: 1 + index * 0.1 }}
                    >
                      <div className="text-2xl">{item.icon}</div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <span className="text-white font-medium">{item.name}</span>
                            <span className="text-xs text-slate-500 ml-2">({item.source || heatLossBreakdown.source})</span>
                          </div>
                          <span className="text-white font-bold text-lg">{item.value}</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                          <motion.div
                            className={`h-full ${item.color}`}
                            initial={{ width: 0 }}
                            animate={{ width: isInView ? `${parseInt(item.value)}%` : 0 }}
                            transition={{ delay: 1.2 + index * 0.1, duration: 0.8 }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right - Insights */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: isInView ? 1 : 0, x: isInView ? 0 : 50 }}
            transition={{ delay: 1.2 }}
          >
            <Card className="bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border-cyan-500/20 backdrop-blur-sm">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-cyan-400 mb-3">
                  Største tapspost
                </h3>
                <p className="text-slate-300 text-lg mb-4">
                  <strong className="text-white">Yttervegger ({heatLossBreakdown.walls}%)</strong> er
                  hovedårsaken til varmetap i din bygning
                  {buildingAge > 25 && " fra " + buildingData.buildingYear}.
                </p>
                <div className="flex items-center space-x-2 text-emerald-400">
                  <span className="text-sm font-medium">Isolering kan redusere dette med 60-80%</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-white mb-3">
                  Oppgraderingsrekkefølge
                </h3>
                <div className="space-y-2 text-slate-300">
                  <div className="flex justify-between">
                    <span>1. Yttervegger</span>
                    <span className="text-emerald-400">Høy effekt</span>
                  </div>
                  <div className="flex justify-between">
                    <span>2. Tak</span>
                    <span className="text-emerald-400">Høy effekt</span>
                  </div>
                  <div className="flex justify-between">
                    <span>3. Vinduer</span>
                    <span className="text-yellow-400">Medium effekt</span>
                  </div>
                  <div className="flex justify-between">
                    <span>4. Ventilasjon</span>
                    <span className="text-yellow-400">Medium effekt</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Transition to next section */}
        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: isInView ? 1 : 0 }}
          transition={{ delay: 2 }}
        >
          <p className="text-slate-400 text-sm mb-4">
            Men hvordan påvirker dette deg gjennom året?
          </p>
          <ArrowDown className="w-6 h-6 text-cyan-400 mx-auto animate-bounce" />
        </motion.div>
      </div>
    </section>
  );
}