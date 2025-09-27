'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Building, Zap, Target, MapPin, Loader2, ArrowRight, CheckCircle2, X } from "lucide-react";
import { usePropertySearch } from "@/hooks/use-property-search";
import { TrustBadges } from "@/components/landing/TrustBadges";
import { ContactFormModal } from "@/components/ContactFormModal";

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
  const [isNavigating, setIsNavigating] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);

  // Helper function to handle address selection and building detection
  const handleAddressSelection = async (address: any) => {
    // Set navigating state that persists until page unloads
    setIsNavigating(true);

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
      window.location.href = `/select-building?${params.toString()}`;
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
        window.location.href = `/select-building?${params.toString()}`;
      } else {
        // Single building - go directly to building form
        if (buildingData.buildings && buildingData.buildings.length > 0) {
          params.append('bygningsnummer', buildingData.buildings[0].bygningsnummer);
        }
        window.location.href = `/select-building?${params.toString()}`;
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
      window.location.href = `/select-building?${params.toString()}`;
    } finally {
      // Keep loading state active - don't reset since we're navigating away
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
    <div className="min-h-screen bg-[#0c0c0e] relative flex flex-col">
      {/* Northern Lights Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-emerald-400/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-cyan-400/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-violet-400/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-800/50 backdrop-blur-sm bg-[#0c0c0e]/80">
        <div className="container mx-auto px-4 py-2">
          <nav className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Zap className="w-6 h-6 text-emerald-400" />
                <div className="absolute inset-0 w-6 h-6 bg-emerald-400/20 rounded-full blur-sm animate-pulse"></div>
              </div>
              <span className="text-lg sm:text-xl font-bold text-white">SkiplumXGE</span>
            </div>
            <div className="hidden sm:flex items-center space-x-4 sm:space-x-6">
              <a href="https://www.skiplum.no/om-oss/" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-emerald-400 transition-colors text-xs sm:text-sm">Om oss</a>
              <Button
                variant="outline"
                size="sm"
                className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-400 h-7 sm:h-8 text-xs sm:text-sm px-3 sm:px-4"
                onClick={() => setShowContactForm(true)}
              >
                Kontakt
              </Button>
            </div>
          </nav>
        </div>
      </header>

      <main className="relative z-10 flex-grow">
        {/* Hero Section */}
        <section className="container mx-auto px-4 pt-8 pb-6 md:pt-12 md:pb-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2 sm:mb-3 tracking-tight">
              Spar tusenvis på
              <span className="block bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent leading-relaxed">
                energikostnadene
              </span>
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-gray-300 mb-4 sm:mb-6 leading-relaxed max-w-3xl mx-auto">
              Se energianbefalinger for ditt bygg!
            </p>


            {/* Primary Search CTA */}
            <div className="w-full max-w-xl lg:max-w-2xl mx-auto mb-3 sm:mb-4 relative z-50 px-4 sm:px-0" ref={searchRef}>
              <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader className="py-3 sm:py-4">
                  <CardTitle className="text-lg sm:text-xl text-center text-white">

                  </CardTitle>
                  <CardDescription className="text-center text-gray-400">

                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 pb-3 sm:pb-4 px-3 sm:px-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="Søk etter adresse"
                      className="h-10 sm:h-12 text-sm sm:text-base bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-emerald-400/50 focus:ring-emerald-400/20 pl-10 sm:pl-12 pr-10"
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

                  <div className="flex justify-center">
                    <Button
                      size="lg"
                      className="w-full sm:w-1/2 md:w-1/3 min-w-[100px] bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white px-3 sm:px-4 md:px-6 h-10 sm:h-12 shadow-xl shadow-emerald-500/25 text-sm sm:text-base"
                      onClick={() => {
                        if (selectedAddress) {
                          handleAddressSelection(selectedAddress);
                        }
                      }}
                      disabled={!selectedAddress || isNavigating}
                    >
                      {isNavigating ? (
                        <>
                          <Loader2 className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2 animate-spin flex-shrink-0" />
                          <span className="hidden sm:inline">Starter analyse</span>
                          <span className="sm:hidden">Start</span>
                        </>
                      ) : (
                        <>
                          <ArrowRight className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2 flex-shrink-0" />
                          <span className="hidden sm:inline">Start analyse</span>
                          <span className="sm:hidden">Start</span>
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Search Results Dropdown - only show when searching, not when selected */}
                  {showResults && query.length >= 3 && !hasSelection && (
                    <div className="relative">
                      <div className="absolute w-full mt-1 bg-gray-800/95 border border-gray-700/50 rounded-lg shadow-2xl max-h-60 overflow-auto backdrop-blur-sm z-[9999]">
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
                                  setIsNavigating(true); // Set loading state immediately

                                  // Auto-trigger analysis when address is selected (reduced delay)
                                  setTimeout(() => {
                                    handleAddressSelection(address);
                                  }, 200); // Shorter delay to reduce redirect timing issues
                                }}
                              >
                                <div className="text-white font-medium">
                                  {address.adressetekst}
                                </div>
                                <div className="text-gray-400 text-sm">
                                  {address.municipality} <span className="text-slate-500">({address.municipalityNumber})</span> • {address.postalCode} {address.postalPlace}
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
                        <CheckCircle2 className="w-4 h-4" />
                        Valgt adresse:
                      </div>
                      <div className="text-white font-medium">{selectedAddress.adressetekst}</div>
                      <div className="text-gray-400 text-sm mt-1">
                        {selectedAddress.municipality} <span className="text-slate-500">({selectedAddress.municipalityNumber})</span> • {selectedAddress.postalCode} {selectedAddress.postalPlace}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats - moved below search */}
            <div className="grid grid-cols-2 gap-4 sm:gap-6 md:gap-8 max-w-lg mx-auto mt-4 sm:mt-6">
              <div className="text-center">
                <div className="text-lg sm:text-xl font-bold text-cyan-400">Mer enn 78%</div>
                <div className="text-gray-400 text-[10px] sm:text-xs">Har besparingsmuligheter</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-xl font-bold text-violet-400">2 min</div>
                <div className="text-gray-400 text-[10px] sm:text-xs">Analysetid</div>
              </div>
            </div>


          </div>
        </section>


        {/* Features Grid */}
        <section className="container mx-auto px-4 pb-4 sm:pb-6 md:pb-8 relative z-10" id="features">

          <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
            <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-800/50 transition-all duration-300 group">
              <CardContent className="p-3 sm:p-4 md:p-5 text-center">
                <div className="relative mb-2 sm:mb-3">
                  <Search className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400 mx-auto" />
                  <div className="absolute inset-0 w-8 h-8 sm:w-10 sm:h-10 bg-emerald-400/20 rounded-full blur-sm animate-pulse mx-auto group-hover:bg-emerald-400/30"></div>
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-white mb-1 sm:mb-2">Adressesøk</h3>
                <p className="text-gray-400 text-sm leading-relaxed">

                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-800/50 transition-all duration-300 group">
              <CardContent className="p-3 sm:p-4 md:p-5 text-center">
                <div className="relative mb-2 sm:mb-3">
                  <Building className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-400 mx-auto" />
                  <div className="absolute inset-0 w-8 h-8 sm:w-10 sm:h-10 bg-cyan-400/20 rounded-full blur-sm animate-pulse mx-auto group-hover:bg-cyan-400/30"></div>
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-white mb-1 sm:mb-2">Eiendomsanalyse</h3>
                <p className="text-gray-400 text-sm leading-relaxed">

                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-800/50 transition-all duration-300 group">
              <CardContent className="p-3 sm:p-4 md:p-5 text-center">
                <div className="relative mb-2 sm:mb-3">
                  <Target className="w-8 h-8 sm:w-10 sm:h-10 text-violet-400 mx-auto" />
                  <div className="absolute inset-0 w-8 h-8 sm:w-10 sm:h-10 bg-violet-400/20 rounded-full blur-sm animate-pulse mx-auto group-hover:bg-violet-400/30"></div>
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-white mb-1 sm:mb-2">Investeringsguide</h3>
                <p className="text-gray-400 text-sm leading-relaxed">

                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-800/50 transition-all duration-300 group">
              <CardContent className="p-3 sm:p-4 md:p-5 text-center">
                <div className="relative mb-2 sm:mb-3">
                  <MapPin className="w-8 h-8 sm:w-10 sm:h-10 text-orange-400 mx-auto" />
                  <div className="absolute inset-0 w-8 h-8 sm:w-10 sm:h-10 bg-orange-400/20 rounded-full blur-sm animate-pulse mx-auto group-hover:bg-orange-400/30"></div>
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-white mb-1 sm:mb-2">Eiendomskart</h3>
                <p className="text-gray-400 text-sm leading-relaxed">

                </p>
              </CardContent>
            </Card>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-800/50 mt-auto">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="text-center text-gray-400">
            <p className="text-xs sm:text-sm">SkiplumXGE - Drevet av Skiplum | Data fra Kartverket, SSB, SINTEF og Enova</p>
          </div>
        </div>
      </footer>

      {/* Contact Form Modal */}
      <ContactFormModal
        isOpen={showContactForm}
        onClose={() => setShowContactForm(false)}
        propertyAddress={selectedAddress?.adressetekst}
      />
    </div>
  );
}