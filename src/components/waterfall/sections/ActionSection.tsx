'use client';

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Rocket,
  Calendar,
  Phone,
  FileText,
  CheckCircle,
  Star,
  ArrowRight,
  Download,
  Mail
} from "lucide-react";

interface ActionSectionProps {
  buildingData: {
    address: string | null;
    buildingType: string | null;
    totalArea: string | null;
  };
}

export default function ActionSection({ buildingData }: ActionSectionProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-20%" });
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  const actionPlan = [
    {
      id: 'assessment',
      phase: '1',
      title: 'Gratis energikartlegging',
      description: 'Profesjonell vurdering av din bygning',
      duration: '2-3 timer',
      cost: 'Gratis',
      icon: FileText,
      color: 'from-blue-500 to-cyan-500',
      benefits: ['Detaljert energirapport', 'Prioritert tiltaksliste', 'ROI-beregninger']
    },
    {
      id: 'planning',
      phase: '2',
      title: 'Tilpasset handlingsplan',
      description: 'Skreddersyning til ditt budsjett',
      duration: '1 uke',
      cost: 'Inkludert',
      icon: Calendar,
      color: 'from-emerald-500 to-green-500',
      benefits: ['Faseinndelt plan', 'Leverandørkontakter', 'Tidsplan']
    },
    {
      id: 'implementation',
      phase: '3',
      title: 'Gjennomføring med oppfølging',
      description: 'Fra første spadetak til ferdig resultat',
      duration: '2-6 måneder',
      cost: 'Varierer',
      icon: Rocket,
      color: 'from-purple-500 to-pink-500',
      benefits: ['Prosjektledelse', 'Kvalitetskontroll', 'Garantioppfølging']
    }
  ];

  const quickActions = [
    {
      title: 'Last ned detaljert rapport',
      description: 'Komplett analyse av din bygning',
      icon: Download,
      action: () => console.log('Download report'),
      color: 'bg-gradient-to-r from-cyan-500 to-blue-500'
    },
    {
      title: 'Book gratis konsultasjon',
      description: '30 min telefonsamtale med ekspert',
      icon: Phone,
      action: () => console.log('Book consultation'),
      color: 'bg-gradient-to-r from-emerald-500 to-cyan-500'
    },
    {
      title: 'Send til e-post',
      description: 'Få analysen tilsendt for senere',
      icon: Mail,
      action: () => console.log('Email report'),
      color: 'bg-gradient-to-r from-purple-500 to-pink-500'
    }
  ];

  return (
    <section
      ref={ref}
      className="min-h-screen flex items-center justify-center px-4 py-20 relative"
    >
      {/* Final aurora background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-emerald-900/30 via-cyan-900/20 to-purple-900/30"
        initial={{ opacity: 0 }}
        animate={{ opacity: isInView ? 1 : 0 }}
        transition={{ duration: 2 }}
      />

      {/* Aurora burst effect */}
      <motion.div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: isInView ? 3 : 0, opacity: isInView ? 0.3 : 0 }}
        transition={{ delay: 1, duration: 3, ease: "easeOut" }}
      >
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-radial from-cyan-400/20 via-emerald-400/10 to-transparent rounded-full" />
      </motion.div>

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
            <Rocket className="w-6 h-6" />
            <span className="text-lg font-semibold">Din vei til energieffektivitet</span>
          </motion.div>

          <motion.h2
            className="text-4xl lg:text-6xl font-bold text-white mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: isInView ? 1 : 0 }}
            transition={{ delay: 0.4 }}
          >
            Ta steget mot fremtiden
          </motion.h2>

          <motion.p
            className="text-xl text-slate-300 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: isInView ? 1 : 0 }}
            transition={{ delay: 0.6 }}
          >
            Du har sett potensialet - nå er det tid for handling
          </motion.p>
        </motion.div>

        {/* Action Plan Timeline */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 50 }}
          transition={{ delay: 0.8 }}
        >
          <h3 className="text-2xl font-bold text-white text-center mb-8">
            3-stegs prosess til energisuksess
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {actionPlan.map((step, index) => (
              <motion.div
                key={step.id}
                className={`cursor-pointer transition-transform ${
                  selectedAction === step.id ? 'scale-105' : 'hover:scale-102'
                }`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 30 }}
                transition={{ delay: 1 + index * 0.2 }}
                onClick={() => setSelectedAction(selectedAction === step.id ? null : step.id)}
              >
                <Card className={`${
                  selectedAction === step.id
                    ? 'bg-white/10 border-white/30'
                    : 'bg-white/5 border-white/10'
                } backdrop-blur-sm transition-colors`}>
                  <CardContent className="p-6">
                    {/* Phase indicator */}
                    <div className="flex items-center space-x-3 mb-4">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${step.color} flex items-center justify-center text-white font-bold`}>
                        {step.phase}
                      </div>
                      <step.icon className="w-6 h-6 text-white" />
                    </div>

                    <h4 className="text-lg font-bold text-white mb-2">
                      {step.title}
                    </h4>

                    <p className="text-slate-300 text-sm mb-4">
                      {step.description}
                    </p>

                    <div className="flex justify-between text-xs text-slate-400 mb-4">
                      <span>Tid: {step.duration}</span>
                      <span>Kostnad: {step.cost}</span>
                    </div>

                    {/* Expandable benefits */}
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{
                        height: selectedAction === step.id ? 'auto' : 0,
                        opacity: selectedAction === step.id ? 1 : 0
                      }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2 pt-4 border-t border-white/10">
                        {step.benefits.map((benefit, i) => (
                          <div key={i} className="flex items-center space-x-2 text-sm text-slate-300">
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                            <span>{benefit}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 30 }}
          transition={{ delay: 2 }}
        >
          {quickActions.map((action, index) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 20 }}
              transition={{ delay: 2.2 + index * 0.1 }}
            >
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors group cursor-pointer">
                <CardContent className="p-6 text-center">
                  <div className={`w-16 h-16 ${action.color} rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                    <action.icon className="w-8 h-8 text-white" />
                  </div>

                  <h4 className="text-lg font-bold text-white mb-2">
                    {action.title}
                  </h4>

                  <p className="text-slate-300 text-sm mb-4">
                    {action.description}
                  </p>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full group-hover:bg-white/10"
                    onClick={action.action}
                  >
                    Start nå
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Final CTA */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 50 }}
          transition={{ delay: 2.8 }}
        >
          <Card className="bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-purple-500/20 border-gradient-to-r from-emerald-500/50 to-purple-500/50 backdrop-blur-sm inline-block">
            <CardContent className="p-8">
              <div className="flex items-center justify-center space-x-2 text-emerald-400 mb-4">
                <Star className="w-6 h-6" />
                <span className="font-semibold">Eksklusivt tilbud</span>
                <Star className="w-6 h-6" />
              </div>

              <h3 className="text-3xl font-bold text-white mb-4">
                Gratis energikartlegging
              </h3>

              <p className="text-slate-300 mb-6 max-w-lg">
                Verdi: 15.000 kr - helt gratis for de første 50 som booker.
                <br />
                <strong className="text-white">Kun 23 plasser igjen!</strong>
              </p>

              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-bold px-8 py-4 text-lg"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Book din gratis kartlegging nå
                </Button>
              </motion.div>

              <p className="text-slate-400 text-xs mt-4">
                Ingen forpliktelser • 30-dagers pengene-tilbake-garanti
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Thank you message */}
        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: isInView ? 1 : 0 }}
          transition={{ delay: 3.5 }}
        >
          <p className="text-slate-400 text-lg">
            Takk for at du utforsket din bygnings energipotensial
          </p>
          <p className="text-cyan-400 text-sm mt-2">
            Sammen bygger vi en mer energieffektiv fremtid 🌟
          </p>
        </motion.div>
      </div>
    </section>
  );
}