'use client';

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, Target, ArrowDown } from "lucide-react";

import type { RealEnergyData } from '@/hooks/use-real-energy-data';

interface InvestmentSectionProps {
  buildingData: {
    address: string | null;
    buildingType: string | null;
    totalArea: string | null;
  };
  energyAnalysis?: any;
  realEnergyData?: RealEnergyData;
}

export default function InvestmentSection({ buildingData, energyAnalysis, realEnergyData }: InvestmentSectionProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-20%" });

  // Investment calculations - use real data when available
  const hasData = energyAnalysis && energyAnalysis.annualWasteCost > 0;
  const electricityPrice = realEnergyData?.average36MonthPrice || realEnergyData?.currentPricing?.totalPrice || 2.80;

  const annualWaste = hasData
    ? `${Math.round(energyAnalysis.annualWasteCost).toLocaleString('nb-NO')} kr`
    : 'Krever: Bygningsdata';

  const investmentRoom = hasData
    ? `${Math.round(energyAnalysis.investmentRoom).toLocaleString('nb-NO')} kr`
    : 'Krever: Energianalyse';

  const dataSource = hasData
    ? `SINTEF/TEK17 • ${electricityPrice.toFixed(2)} kr/kWh (${realEnergyData?.priceZone || 'NO1'})`
    : 'Mangler grunnlagsdata';

  // Calculate real investment amounts using SINTEF percentages
  const heatingInvestment = hasData ? Math.round(energyAnalysis.investmentRoom * 0.70) : 0;
  const lightingInvestment = hasData ? Math.round(energyAnalysis.investmentRoom * 0.15) : 0;
  const otherInvestment = hasData ? Math.round(energyAnalysis.investmentRoom * 0.15) : 0;

  // Calculate annual savings (investment / 7 year payback)
  const heatingSaving = hasData ? Math.round(heatingInvestment / 7) : 0;
  const lightingSaving = hasData ? Math.round(lightingInvestment / 7) : 0;
  const otherSaving = hasData ? Math.round(otherInvestment / 7) : 0;

  const investmentOptions = [
    {
      name: 'Varmepumpe',
      cost: hasData ? `${heatingInvestment.toLocaleString('nb-NO')} kr` : 'Krever data',
      annualSaving: hasData ? `${heatingSaving.toLocaleString('nb-NO')} kr` : '-',
      paybackYears: hasData ? '7' : '-',
      percentage: 70,
      impact: 'Høy',
      color: 'from-cyan-500 to-emerald-500',
      source: 'SINTEF (70% av investering)'
    },
    {
      name: 'LED belysning',
      cost: hasData ? `${lightingInvestment.toLocaleString('nb-NO')} kr` : 'Krever data',
      annualSaving: hasData ? `${lightingSaving.toLocaleString('nb-NO')} kr` : '-',
      paybackYears: hasData ? '7' : '-',
      percentage: 15,
      impact: 'Medium',
      color: 'from-purple-500 to-cyan-500',
      source: 'SINTEF (15% av investering)'
    },
    {
      name: 'Isolering/Vinduer',
      cost: hasData ? `${otherInvestment.toLocaleString('nb-NO')} kr` : 'Krever data',
      annualSaving: hasData ? `${otherSaving.toLocaleString('nb-NO')} kr` : '-',
      paybackYears: hasData ? '7' : '-',
      percentage: 15,
      impact: 'Medium',
      color: 'from-blue-500 to-purple-500',
      source: 'SINTEF (15% av investering)'
    }
  ];

  return (
    <section
      ref={ref}
      className="min-h-screen flex items-center justify-center px-4 py-20 relative"
    >
      {/* Waterfall background effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-emerald-900/30 to-blue-900/20"
        initial={{ opacity: 0 }}
        animate={{ opacity: isInView ? 1 : 0 }}
        transition={{ duration: 2 }}
      />

      {/* Animated money particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => {
          // Deterministic pseudo-random values based on index (fixes hydration mismatch)
          const getPseudoRandom = (index: number, seed: number = 1) => {
            const x = Math.sin(index * seed) * 10000;
            return x - Math.floor(x);
          };

          // Round to 2 decimal places to avoid precision differences
          const leftPos = Math.round(getPseudoRandom(i, 12.345) * 10000) / 100;
          const duration = Math.round((8 + getPseudoRandom(i, 23.456) * 4) * 100) / 100;
          const delay = Math.round(getPseudoRandom(i, 34.567) * 800) / 100;

          return (
            <motion.div
              key={i}
              className="absolute text-2xl"
              style={{
                left: `${leftPos}%`,
                top: '-5%'
              }}
              animate={{
                y: ['0vh', '110vh'],
                rotate: [0, 360],
                opacity: [0, 1, 1, 0]
              }}
              transition={{
                duration: duration,
                repeat: Infinity,
                delay: delay,
                ease: "linear"
              }}
            >
              💰
            </motion.div>
          );
        })}
      </div>

      <div className="container mx-auto max-w-6xl relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 30 }}
          transition={{ duration: 1 }}
        >
          <motion.div
            className="flex items-center justify-center space-x-2 text-emerald-400 mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: isInView ? 1 : 0 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <DollarSign className="w-6 h-6" />
            <span className="text-lg font-semibold">Investeringsanalyse</span>
          </motion.div>

          <motion.h2
            className="text-4xl lg:text-5xl font-bold text-white mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: isInView ? 1 : 0 }}
            transition={{ delay: 0.4 }}
          >
            Fra sløsing til gevinst
          </motion.h2>

          <motion.p
            className="text-xl text-slate-300 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: isInView ? 1 : 0 }}
            transition={{ delay: 0.6 }}
          >
            Din energisløsing kan bli til lønnsom investering
          </motion.p>
        </motion.div>

        {/* Investment Waterfall */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">

          {/* Current Waste */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 50 }}
            transition={{ delay: 0.8 }}
          >
            <Card className="bg-red-900/20 border-red-500/30 backdrop-blur-sm text-center">
              <CardContent className="p-6">
                <div className="text-red-400 text-4xl mb-4">💸</div>
                <h3 className="text-xl font-bold text-red-400 mb-2">Årlig sløsing</h3>
                <div className="text-3xl font-bold text-white mb-2">
                  {annualWaste}
                </div>
                <p className="text-slate-300 text-sm">
                  Penger som forsvinner i unødvendig energibruk
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Arrow */}
          <div className="flex items-center justify-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: isInView ? 1 : 0 }}
              transition={{ delay: 1.2, type: "spring" }}
              className="text-4xl"
            >
              ➡️
            </motion.div>
          </div>

          {/* Investment Room */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 50 }}
            transition={{ delay: 1.4 }}
          >
            <Card className="bg-cyan-900/20 border-cyan-500/30 backdrop-blur-sm text-center">
              <CardContent className="p-6">
                <div className="text-cyan-400 text-4xl mb-4">✨</div>
                <h3 className="text-xl font-bold text-cyan-400 mb-2">Investeringsrom</h3>
                <div className="text-3xl font-bold text-white mb-2">
                  {investmentRoom}
                </div>
                <p className="text-slate-300 text-sm">
                  Budsjett for lønnsome energitiltak
                </p>
                <p className="text-xs text-slate-500 mt-2">Kilde: {dataSource}</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Investment Options */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 30 }}
          transition={{ delay: 1.8 }}
        >
          {investmentOptions.map((option, index) => (
            <motion.div
              key={option.name}
              initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
              animate={{ opacity: isInView ? 1 : 0, x: isInView ? 0 : (index % 2 === 0 ? -30 : 30) }}
              transition={{ delay: 2 + index * 0.1 }}
            >
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-white">{option.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      option.impact === 'Høy' ? 'bg-emerald-500/20 text-emerald-400' :
                      option.impact === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {option.impact} effekt
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Investering:</span>
                      <span className="text-white font-semibold">
                        {option.cost}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Årlig besparelse:</span>
                      <span className="text-emerald-400 font-semibold">
                        {option.annualSaving}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Tilbakebetaling:</span>
                      <span className="text-cyan-400 font-semibold">
                        {option.paybackYears} år
                      </span>
                    </div>

                    {/* Progress bar showing investment vs. room */}
                    <div className="mt-4">
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <motion.div
                          className={`h-2 rounded-full bg-gradient-to-r ${option.color}`}
                          initial={{ width: 0 }}
                          animate={{ width: isInView ? '50%' : 0 }}
                          transition={{ delay: 2.5 + index * 0.1, duration: 1 }}
                        />
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {option.source}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: isInView ? 1 : 0 }}
          transition={{ delay: 3 }}
        >
          <Card className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-cyan-500/30 backdrop-blur-sm inline-block">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-white mb-3">
                Klar for å ta steget?
              </h3>
              <p className="text-slate-300 mb-4">
                Få personlig rådgivning om energioppgradering
              </p>
              <Button className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600">
                <TrendingUp className="w-4 h-4 mr-2" />
                Bestill konsultasjon
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Transition */}
        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: isInView ? 1 : 0 }}
          transition={{ delay: 3.5 }}
        >
          <p className="text-slate-400 text-sm mb-4">
            Hvordan står du sammenlignet med naboene?
          </p>
          <ArrowDown className="w-6 h-6 text-cyan-400 mx-auto animate-bounce" />
        </motion.div>
      </div>
    </section>
  );
}