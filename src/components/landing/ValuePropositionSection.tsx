'use client';

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Shield, Calculator, Zap } from "lucide-react";

interface ValuePropositionSectionProps {
  className?: string;
}

export function ValuePropositionSection({ className }: ValuePropositionSectionProps) {
  const benefits = [
    {
      icon: Calculator,
      title: "Spar opptil 92.400 kr årlig",
      description: "Identifiser konkrete besparingsmuligheter basert på faktisk energisløsing",
      color: "text-emerald-400"
    },
    {
      icon: Shield,
      title: "TEK17 etterlevelse",
      description: "Sikre at din eiendom oppfyller norske energikrav § 14-2",
      color: "text-cyan-400"
    },
    {
      icon: TrendingUp,
      title: "Investeringsguide",
      description: "Få konservative anbefalinger for energioppgraderinger med ROI-beregning",
      color: "text-fuchsia-400"
    }
  ];

  return (
    <section className={`py-16 ${className}`}>
      <div className="max-w-6xl mx-auto text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-2 mb-6">
          <Zap className="w-4 h-4 text-cyan-400" />
          <span className="text-cyan-400 text-sm font-medium">Offisielle norske data</span>
        </div>

        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
          Oppdag din eiendoms
          <span className="block bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            skjulte energipotensial
          </span>
        </h2>

        <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
          Få profesjonell energianalyse på 2 minutter. Basert på data fra Kartverket, SSB, SINTEF og Enova.
          <strong className="text-white"> Over 1.000 eiendommer analysert.</strong>
        </p>
      </div>

      {/* Benefits Grid */}
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {benefits.map((benefit, index) => (
          <Card
            key={index}
            className="backdrop-blur-lg bg-white/5 border-white/20 hover:bg-white/10 transition-all duration-300 group"
          >
            <CardContent className="p-6 text-center">
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <benefit.icon className={`w-6 h-6 ${benefit.color}`} />
              </div>

              <h3 className="text-lg font-bold text-white mb-3">
                {benefit.title}
              </h3>

              <p className="text-slate-400 text-sm leading-relaxed">
                {benefit.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Social Proof Stats */}
      <div className="flex flex-wrap justify-center gap-8 mt-12 pt-8 border-t border-white/10">
        <div className="text-center">
          <div className="text-2xl font-bold text-cyan-400">1.000+</div>
          <div className="text-slate-400 text-sm">Analyserte eiendommer</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-400">92%</div>
          <div className="text-slate-400 text-sm">Fant besparingsmuligheter</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-fuchsia-400">2 min</div>
          <div className="text-slate-400 text-sm">Gjennomsnittlig analysetid</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-400">100%</div>
          <div className="text-slate-400 text-sm">Offisielle norske data</div>
        </div>
      </div>
    </section>
  );
}