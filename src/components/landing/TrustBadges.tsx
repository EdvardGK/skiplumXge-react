'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Shield, Award, MapPin, Database, Zap, Building } from "lucide-react";

interface TrustBadge {
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  verified?: boolean;
}

interface TrustBadgesProps {
  className?: string;
  showTitle?: boolean;
}

export function TrustBadges({ className, showTitle = true }: TrustBadgesProps) {
  const trustBadges: TrustBadge[] = [
    {
      name: "Kartverket",
      description: "Offisielle adressedata",
      icon: MapPin,
      color: "text-blue-400",
      verified: true
    },
    {
      name: "SSB",
      description: "Statistisk sentralbyrå",
      icon: Database,
      color: "text-green-400",
      verified: true
    },
    {
      name: "SINTEF",
      description: "Energiforskningsdata",
      icon: Zap,
      color: "text-yellow-400",
      verified: true
    },
    {
      name: "Enova",
      description: "Energisertifikater",
      icon: Award,
      color: "text-fuchsia-400",
      verified: true
    },
    {
      name: "TEK17",
      description: "Byggeforskrifter",
      icon: Building,
      color: "text-cyan-400",
      verified: true
    },
    {
      name: "GDPR",
      description: "Personvernssikret",
      icon: Shield,
      color: "text-emerald-400",
      verified: true
    }
  ];

  return (
    <section className={`py-8 ${className}`}>
      {showTitle && (
        <div className="text-center mb-8">
          <h3 className="text-xl font-semibold text-white mb-2">
            Basert på offisielle norske data
          </h3>
          <p className="text-slate-400 text-sm">
            Vi bruker kun verifiserte kilder for nøyaktige analyser
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-4xl mx-auto">
        {trustBadges.map((badge, index) => (
          <Card
            key={index}
            className="backdrop-blur-lg bg-white/5 border-white/20 hover:bg-white/10 transition-all duration-300 group relative"
          >
            <CardContent className="p-4 text-center">
              {badge.verified && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                  <Shield className="w-2 h-2 text-white" />
                </div>
              )}

              <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 mb-2 group-hover:scale-110 transition-transform duration-300`}>
                <badge.icon className={`w-4 h-4 ${badge.color}`} />
              </div>

              <div className="text-sm font-medium text-white mb-1">
                {badge.name}
              </div>

              <div className="text-xs text-slate-400">
                {badge.description}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Trust Elements */}
      <div className="flex flex-wrap justify-center gap-6 mt-8 pt-6 border-t border-white/10">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>SSL-kryptert</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Database className="w-4 h-4 text-blue-400" />
          <span>GDPR-kompatibel</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Award className="w-4 h-4 text-yellow-400" />
          <span>Sertifisert energirådgiver</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <MapPin className="w-4 h-4 text-fuchsia-400" />
          <span>Norsk selskap</span>
        </div>
      </div>
    </section>
  );
}