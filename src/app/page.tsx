'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Building, Zap, Target, MapPin, Loader2, ArrowRight, CheckCircle2, X } from "lucide-react";
import { usePropertySearch } from "@/hooks/use-property-search";
import { TrustBadges } from "@/components/landing/TrustBadges";
import { ContextualTooltip } from "@/components/ui/ContextualTooltip";

export default function LandingPage() {
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);
  const {
    query,
    setQuery,
    results,
    selectedAddress,
    setSelectedAddress,
    isLoading,
    error,
    hasSelection,
    clearSearch
  } = usePropertySearch();
  const [showResults, setShowResults] = useState(false);
  const [isCheckingBuildings, setIsCheckingBuildings] = useState(false);

  // Helper function to handle address selection and building detection
  const handleAddressSelection = async (address: any) => {
    if (!address.matrikkel?.gardsnummer || !address.matrikkel?.bruksnummer) {
      // No gnr/bnr - go directly to building form
      const params = new URLSearchParams({
        address: address.adressetekst,
        lat: address.coordinates.lat.toString(),
        lon: address.coordinates.lon.toString(),
        municipality: address.municipality,
        municipalityNumber: address.municipalityNumber || '',
        postalCode: address.postalCode,
      });
      router.push(`/building-data?${params.toString()}`);
      return;
    }

    setIsCheckingBuildings(true);

    try {
      // Check for multiple buildings using new API
      const response = await fetch(`/api/buildings/detect?gnr=${address.matrikkel.gardsnummer}&bnr=${address.matrikkel.bruksnummer}&address=${encodeURIComponent(address.adressetekst)}`);

      if (!response.ok) {
        throw new Error('Failed to detect buildings');
      }

      const buildingData = await response.json();

      const params = new URLSearchParams({
        address: address.adressetekst,
        lat: address.coordinates.lat.toString(),
        lon: address.coordinates.lon.toString(),
        municipality: address.municipality,
        municipalityNumber: address.municipalityNumber || '',
        postalCode: address.postalCode,
        gnr: address.matrikkel.gardsnummer,
        bnr: address.matrikkel.bruksnummer,
      });

      if (buildingData.hasMultipleBuildings) {
        // Multiple buildings - go to building selection page
        router.push(`/select-building?${params.toString()}`);
      } else {
        // Single building - go directly to building form
        if (buildingData.buildings && buildingData.buildings.length > 0) {
          params.append('bygningsnummer', buildingData.buildings[0].bygningsnummer);
        }
        router.push(`/building-data?${params.toString()}`);
      }
    } catch (error) {
      console.error('Failed to detect buildings:', error);
      // Fallback to building form without building data
      const params = new URLSearchParams({
        address: address.adressetekst,
        lat: address.coordinates.lat.toString(),
        lon: address.coordinates.lon.toString(),
        municipality: address.municipality,
        municipalityNumber: address.municipalityNumber || '',
        postalCode: address.postalCode,
        ...(address.matrikkel?.gardsnummer && { gnr: address.matrikkel.gardsnummer }),
        ...(address.matrikkel?.bruksnummer && { bnr: address.matrikkel.bruksnummer }),
      });
      router.push(`/building-data?${params.toString()}`);
    } finally {
      setIsCheckingBuildings(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-[#0c0c0e] relative overflow-hidden">
      {/* Northern Lights Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-emerald-400/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-cyan-400/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-violet-400/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-gray-800/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-2">
          <nav className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Zap className="w-6 h-6 text-emerald-400" />
                <div className="absolute inset-0 w-6 h-6 bg-emerald-400/20 rounded-full blur-sm animate-pulse"></div>
              </div>
              <span className="text-xl font-bold text-white">SkiplumXGE</span>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <a href="#features" className="text-gray-300 hover:text-emerald-400 transition-colors text-sm">Funksjoner</a>
              <a href="https://www.skiplum.no/om-oss/" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-emerald-400 transition-colors text-sm">Om oss</a>
              <Button variant="outline" size="sm" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-400 h-8">
                Kontakt
              </Button>
            </div>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-6 md:py-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 tracking-tight leading-normal">
              Spar tusenvis på
              <span className="block bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent pb-2">
                energikostnadene
              </span>
            </h1>

            <p className="text-base md:text-lg text-gray-300 mb-6 leading-relaxed max-w-3xl mx-auto">
              Oppdag besparingsmuligheter og TEK17-etterlevelse på minutter
            </p>


            {/* Primary Search CTA */}
            <div className="max-w-2xl mx-auto mb-4" ref={searchRef}>
              <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl text-center text-white flex items-center justify-center gap-3">
                    <Search className="w-6 h-6 text-emerald-400" />
                    Start din energianalyse
                  </CardTitle>
                  <CardDescription className="text-center text-gray-400">
                    <ContextualTooltip
                      title="Hvordan fungerer søket?"
                      content="Vi bruker Kartverkets offisielle adresseregister for å finne din eiendom. Skriv bare inn gateadresse og sted, så finner vi resten automatisk."
                    >
                      <span>Søk etter norsk adresse for å begynne</span>
                    </ContextualTooltip>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pb-4">
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Input
                        type="text"
                        placeholder="F.eks. 'Karl Johans gate 1, Oslo' eller 'Storgata 10, Bergen'"
                        className="h-12 text-base bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-emerald-400/50 focus:ring-emerald-400/20 pr-10"
                        value={query}
                        onChange={(e) => {
                          setQuery(e.target.value);
                          setShowResults(true);
                        }}
                        onFocus={() => setShowResults(true)}
                        autoComplete="off"
                      />
                      {query.length > 0 && (
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-700/50 rounded-md transition-colors"
                          onClick={() => {
                            clearSearch();
                            setShowResults(false);
                          }}
                          aria-label="Tøm søkefelt"
                        >
                          <X className="w-5 h-5 text-gray-400 hover:text-white" />
                        </button>
                      )}
                      {query.length > 0 && query.length < 3 && !hasSelection && (
                        <div className="absolute right-12 top-1/2 -translate-y-1/2">
                          <span className="text-sm text-gray-500">
                            Skriv minst 3 tegn
                          </span>
                        </div>
                      )}
                    </div>
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white px-8 h-12 whitespace-nowrap shadow-xl shadow-emerald-500/25"
                      onClick={() => {
                        if (selectedAddress) {
                          handleAddressSelection(selectedAddress);
                        }
                      }}
                      disabled={!selectedAddress || isCheckingBuildings}
                    >
                      {isCheckingBuildings ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Sjekker bygninger...
                        </>
                      ) : selectedAddress ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Starter...
                        </>
                      ) : (
                        <>
                          <ArrowRight className="w-5 h-5 mr-2" />
                          Start Analyse
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Search Results Dropdown - only show when searching, not when selected */}
                  {showResults && query.length >= 3 && !hasSelection && (
                    <div className="relative">
                      <div className="absolute w-full mt-1 bg-gray-800/95 border border-gray-700/50 rounded-lg shadow-2xl max-h-60 overflow-auto backdrop-blur-sm z-50">
                        {isLoading && (
                          <div className="p-4 text-center text-gray-400">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                            Søker etter adresser...
                          </div>
                        )}

                        {error && !isLoading && (
                          <div className="p-4 text-center text-red-400">
                            {error}
                          </div>
                        )}

                        {!isLoading && !error && results.length === 0 && (
                          <div className="p-4 text-center text-gray-400">
                            Ingen adresser funnet
                          </div>
                        )}

                        {!isLoading && results.length > 0 && (
                          <div className="py-1">
                            {results.map((address, index) => (
                              <button
                                key={index}
                                className="w-full text-left px-4 py-3 hover:bg-gray-700/50 transition-colors"
                                onClick={() => {
                                  setSelectedAddress(address);
                                  setShowResults(false);

                                  // Auto-trigger analysis when address is selected
                                  setTimeout(() => {
                                    handleAddressSelection(address);
                                  }, 500); // Small delay to show selection confirmation
                                }}
                              >
                                <div className="text-white font-medium">
                                  {address.adressetekst}
                                </div>
                                <div className="text-gray-400 text-sm">
                                  {address.municipality} • {address.postalCode}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Selected Address Confirmation */}
                  {selectedAddress && (
                    <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium mb-1">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {isCheckingBuildings ? 'Sjekker bygninger:' : 'Starter energianalyse:'}
                      </div>
                      <div className="text-white font-medium">{selectedAddress.adressetekst}</div>
                      <div className="text-gray-400 text-sm mt-1">
                        {isCheckingBuildings
                          ? 'Søker etter bygninger registrert i Enova...'
                          : 'Forbereder bygningsdata og Enova-oppslag...'
                        }
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-8 max-w-lg mx-auto">
              <div className="text-center">
                <div className="text-xl font-bold text-cyan-400">Mer enn 78%</div>
                <div className="text-gray-400 text-xs">Har besparingsmuligheter</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-violet-400">2 min</div>
                <div className="text-gray-400 text-xs">Analysetid</div>
              </div>
            </div>

          </div>
        </section>


        {/* Features Grid */}
        <section className="container mx-auto px-4 pb-16" id="features">

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-800/50 transition-all duration-300 group">
              <CardContent className="p-6 text-center">
                <div className="relative mb-4">
                  <Search className="w-12 h-12 text-emerald-400 mx-auto" />
                  <div className="absolute inset-0 w-12 h-12 bg-emerald-400/20 rounded-full blur-sm animate-pulse mx-auto group-hover:bg-emerald-400/30"></div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-3">Adressesøk</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Kartverket-integrert søk med real-time validering av norske adresser
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-800/50 transition-all duration-300 group">
              <CardContent className="p-6 text-center">
                <div className="relative mb-4">
                  <Building className="w-12 h-12 text-cyan-400 mx-auto" />
                  <div className="absolute inset-0 w-12 h-12 bg-cyan-400/20 rounded-full blur-sm animate-pulse mx-auto group-hover:bg-cyan-400/30"></div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-3">Eiendomsanalyse</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  TEK17 § 14-2 etterlevelse med energikarakter A-G klassifisering
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-800/50 transition-all duration-300 group">
              <CardContent className="p-6 text-center">
                <div className="relative mb-4">
                  <Target className="w-12 h-12 text-violet-400 mx-auto" />
                  <div className="absolute inset-0 w-12 h-12 bg-violet-400/20 rounded-full blur-sm animate-pulse mx-auto group-hover:bg-violet-400/30"></div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-3">Investeringsguide</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Konservative investeringsanbefalinger basert på faktisk energisløsing
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-800/50 transition-all duration-300 group">
              <CardContent className="p-6 text-center">
                <div className="relative mb-4">
                  <MapPin className="w-12 h-12 text-orange-400 mx-auto" />
                  <div className="absolute inset-0 w-12 h-12 bg-orange-400/20 rounded-full blur-sm animate-pulse mx-auto group-hover:bg-orange-400/30"></div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-3">Eiendomskart</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Interaktiv visualisering med bygningsomriss og eiendomsgrenser
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-800/50 mt-8">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-gray-400">
            <p>SkiplumXGE - Drevet av Skiplum | Data fra Kartverket, SSB, SINTEF og Enova</p>
          </div>
        </div>
      </footer>
    </div>
  );
}