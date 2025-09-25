'use client';

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Snowflake, Sun, ArrowDown } from "lucide-react";

interface SeasonalSectionProps {
  buildingData: {
    address: string | null;
    buildingType: string | null;
    totalArea: string | null;
  };
}

export default function SeasonalSection({ buildingData }: SeasonalSectionProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-20%" });

  // Seasonal consumption data (mock)
  const seasonalData = [
    { month: 'Jan', consumption: 180, temperature: -5, season: 'winter' },
    { month: 'Feb', consumption: 170, temperature: -3, season: 'winter' },
    { month: 'Mar', consumption: 150, temperature: 2, season: 'winter' },
    { month: 'Apr', consumption: 120, temperature: 7, season: 'spring' },
    { month: 'Mai', consumption: 90, temperature: 12, season: 'spring' },
    { month: 'Jun', consumption: 70, temperature: 16, season: 'summer' },
    { month: 'Jul', consumption: 60, temperature: 18, season: 'summer' },
    { month: 'Aug', consumption: 65, temperature: 17, season: 'summer' },
    { month: 'Sep', consumption: 85, temperature: 13, season: 'autumn' },
    { month: 'Okt', consumption: 110, temperature: 8, season: 'autumn' },
    { month: 'Nov', consumption: 140, temperature: 3, season: 'autumn' },
    { month: 'Des', consumption: 175, temperature: -2, season: 'winter' },
  ];

  return (
    <section
      ref={ref}
      className="min-h-screen flex items-center justify-center px-4 py-20 relative"
    >
      {/* Seasonal background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-cyan-900/20"
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
            className="flex items-center justify-center space-x-2 text-cyan-400 mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: isInView ? 1 : 0 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <Calendar className="w-6 h-6" />
            <span className="text-lg font-semibold">Sesonganalyse</span>
          </motion.div>

          <motion.h2
            className="text-4xl lg:text-5xl font-bold text-white mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: isInView ? 1 : 0 }}
            transition={{ delay: 0.4 }}
          >
            Energi gjennom årstidene
          </motion.h2>

          <motion.p
            className="text-xl text-slate-300 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: isInView ? 1 : 0 }}
            transition={{ delay: 0.6 }}
          >
            Norsk klima gir store sesongvariasjoner i energibruk
          </motion.p>
        </motion.div>

        {/* Seasonal Chart */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 50 }}
          transition={{ delay: 0.8 }}
        >
          {/* Winter */}
          <Card className="bg-blue-900/20 border-blue-500/30 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <Snowflake className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-blue-400 mb-2">Vinter</h3>
              <div className="text-3xl font-bold text-white mb-2">Input winter consumption kWh/m²</div>
              <p className="text-slate-300 text-sm">
                Høyeste forbruk på grunn av oppvarming
              </p>
            </CardContent>
          </Card>

          {/* Summer */}
          <Card className="bg-yellow-900/20 border-yellow-500/30 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <Sun className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-yellow-400 mb-2">Sommer</h3>
              <div className="text-3xl font-bold text-white mb-2">Input summer consumption kWh/m²</div>
              <p className="text-slate-300 text-sm">
                Laveste forbruk - kun varmtvann og ventilasjon
              </p>
            </CardContent>
          </Card>

          {/* Annual Impact */}
          <Card className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border-cyan-500/30 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-cyan-400 mb-2">Årlig variasjon</h3>
              <div className="text-3xl font-bold text-white mb-2">Input seasonal variation ratio</div>
              <p className="text-slate-300 text-sm">
                Mellom sommer og vinter
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Insights */}
        <motion.div
          className="mt-12 text-center max-w-3xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: isInView ? 1 : 0 }}
          transition={{ delay: 1.5 }}
        >
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-6">
              <p className="text-slate-300 text-lg mb-4">
                <strong className="text-white">Vinterforbruket</strong> utgjør 60{'%'} av årsforbruket.
                Bedre isolasjon kan redusere dette dramatisk.
              </p>
              <div className="text-cyan-400 font-semibold">
                Potensial for 40-50{'%'} reduksjon i vinterforbruk
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Transition */}
        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: isInView ? 1 : 0 }}
          transition={{ delay: 2 }}
        >
          <p className="text-slate-400 text-sm mb-4">
            Hva betyr dette for lommeboka?
          </p>
          <ArrowDown className="w-6 h-6 text-cyan-400 mx-auto animate-bounce" />
        </motion.div>
      </div>
    </section>
  );
}