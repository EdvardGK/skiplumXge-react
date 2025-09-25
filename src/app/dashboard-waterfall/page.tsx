'use client';

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Zap, Settings, Download, Share } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";

// Import waterfall sections
import PropertyHeroSection from "@/components/waterfall/sections/PropertyHeroSection";
import HeatLossSection from "@/components/waterfall/sections/HeatLossSection";
import SeasonalSection from "@/components/waterfall/sections/SeasonalSection";
import InvestmentSection from "@/components/waterfall/sections/InvestmentSection";
import ComparisonSection from "@/components/waterfall/sections/ComparisonSection";
import ActionSection from "@/components/waterfall/sections/ActionSection";
import DashboardToggle from "@/components/DashboardToggle";

// Loading component
function WaterfallLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Zap className="w-16 h-16 text-cyan-400 mx-auto mb-4 animate-pulse" />
          <h1 className="text-2xl font-bold text-white mb-2">Laster energihistorie...</h1>
          <p className="text-slate-400">Forbereder din bygnings energireise</p>
        </div>
      </div>
    </div>
  );
}

function WaterfallContent() {
  const searchParams = useSearchParams();
  const addressParam = searchParams.get('address');

  // Scroll progress tracking
  const { scrollYProgress } = useScroll();
  const backgroundOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.3]);

  // Handle missing address
  if (!addressParam) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center text-slate-400">
          <h1 className="text-2xl font-bold text-white mb-2">Mangler adresseinformasjon</h1>
          <p className="mb-4">Gå tilbake til søket for å starte energianalysen.</p>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/'}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tilbake til søk
          </Button>
        </div>
      </div>
    );
  }

  // Extract building parameters
  const buildingData = {
    address: addressParam,
    buildingType: searchParams.get('buildingType'),
    totalArea: searchParams.get('totalArea'),
    heatedArea: searchParams.get('heatedArea'),
    buildingYear: searchParams.get('buildingYear'),
    lat: searchParams.get('lat'),
    lon: searchParams.get('lon'),
    priceZone: searchParams.get('priceZone'),
    heatingSystem: searchParams.get('heatingSystem'),
    lightingSystem: searchParams.get('lightingSystem'),
    ventilationSystem: searchParams.get('ventilationSystem'),
    hotWaterSystem: searchParams.get('hotWaterSystem'),
    energyClass: searchParams.get('energyClass'),
    energyConsumption: searchParams.get('energyConsumption'),
  };

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-x-hidden">
      {/* Aurora Background */}
      <motion.div
        className="fixed inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"
        style={{ opacity: backgroundOpacity }}
      />

      {/* Aurora Effects Overlay */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
            x: [0, 50, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-1/3 right-1/4 w-64 h-64 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.4, 0.2, 0.4],
            x: [0, -30, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-slate-700/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-300 hover:text-white px-2 py-1"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="w-3 h-3 mr-1" />
                Tilbake
              </Button>
              <div className="flex items-center space-x-2">
                <Zap className="w-6 h-6 text-cyan-400" />
                <span className="text-xl font-bold text-white">SkiplumXGE</span>
              </div>
              {addressParam && (
                <div className="ml-6 flex items-center space-x-2">
                  <span className="text-slate-400">•</span>
                  <span className="text-cyan-400 font-medium">{addressParam}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                    Waterfall View
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <DashboardToggle
                currentPath="/dashboard-waterfall"
                searchParams={searchParams}
              />

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground px-2 py-1 text-xs"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Rapport
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-secondary text-secondary-foreground hover:bg-secondary px-2 py-1 text-xs"
                >
                  <Share className="w-3 h-3 mr-1" />
                  Del
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Waterfall Sections */}
      <main className="relative z-10">
        {/* Act 1: The Cold Open - Your Building's Energy Portrait */}
        <PropertyHeroSection buildingData={buildingData} />

        {/* Act 2: The Heat Map - Where Your Energy Escapes */}
        <HeatLossSection buildingData={buildingData} />

        {/* Act 3: The Seasons Cycle - Energy Through Norwegian Seasons */}
        <SeasonalSection buildingData={buildingData} />

        {/* Act 4: The Money Waterfall - From Waste to Wealth */}
        <InvestmentSection buildingData={buildingData} />

        {/* Act 5: The Comparison - You're Not Alone */}
        <ComparisonSection buildingData={buildingData} />

        {/* Act 6: The Action Plan - Path to Excellence */}
        <ActionSection buildingData={buildingData} />
      </main>

      {/* Scroll Progress Indicator */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 to-emerald-400 origin-left z-50"
        style={{ scaleX: scrollYProgress }}
      />

      {/* Dashboard ready indicator */}
      <div data-waterfall-ready="true" className="hidden" />
    </div>
  );
}

// Main exported component with Suspense boundary
export default function DashboardWaterfall() {
  return (
    <Suspense fallback={<WaterfallLoading />}>
      <WaterfallContent />
    </Suspense>
  );
}