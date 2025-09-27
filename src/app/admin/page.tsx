'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Database, Settings, Type, Calculator, Flag, Building } from 'lucide-react';
import { getAllConfiguration, SupabaseConfig } from '@/lib/supabase-config';
import type { Calculation, Content, FeatureFlag, Formula, TEK17Requirement } from '@/lib/supabase-config';

export default function AdminPage() {
  const [config, setConfig] = useState<{
    calculations: Calculation[];
    content: Content[];
    featureFlags: FeatureFlag[];
    formulas: Formula[];
    tek17Requirements: TEK17Requirement[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadConfiguration = async () => {
    setLoading(true);
    try {
      const data = await getAllConfiguration();
      setConfig(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfiguration();

    // Subscribe to real-time updates
    const subscriptions = [
      SupabaseConfig.subscribeToUpdates('calculations', () => loadConfiguration()),
      SupabaseConfig.subscribeToUpdates('content', () => loadConfiguration()),
      SupabaseConfig.subscribeToUpdates('feature_flags', () => loadConfiguration()),
      SupabaseConfig.subscribeToUpdates('formulas', () => loadConfiguration()),
      SupabaseConfig.subscribeToUpdates('tek17_requirements', () => loadConfiguration()),
    ];

    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    };
  }, []);

  const refreshCache = () => {
    SupabaseConfig.clearCache();
    loadConfiguration();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading configuration...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-red-400 text-xl">Failed to load configuration</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Configuration Admin</h1>
            <p className="text-gray-400">
              Manage application settings via Supabase. Edit values in Notion for changes to sync here.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Last updated: {lastUpdated.toLocaleString('no-NO')}
            </p>
          </div>
          <Button
            onClick={refreshCache}
            className="bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Cache
          </Button>
        </div>

        {/* Configuration Tabs */}
        <Tabs defaultValue="calculations" className="space-y-4">
          <TabsList className="bg-gray-800/50 border-gray-700">
            <TabsTrigger value="calculations" className="text-white">
              <Calculator className="w-4 h-4 mr-2" />
              Calculations ({config.calculations.length})
            </TabsTrigger>
            <TabsTrigger value="tek17" className="text-white">
              <Building className="w-4 h-4 mr-2" />
              TEK17 ({config.tek17Requirements.length})
            </TabsTrigger>
            <TabsTrigger value="formulas" className="text-white">
              <Settings className="w-4 h-4 mr-2" />
              Formulas ({config.formulas.length})
            </TabsTrigger>
            <TabsTrigger value="features" className="text-white">
              <Flag className="w-4 h-4 mr-2" />
              Features ({config.featureFlags.length})
            </TabsTrigger>
            <TabsTrigger value="content" className="text-white">
              <Type className="w-4 h-4 mr-2" />
              Content ({config.content.length})
            </TabsTrigger>
          </TabsList>

          {/* Calculations Tab */}
          <TabsContent value="calculations" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {config.calculations.map((calc) => (
                <Card key={calc.id} className="bg-gray-800/50 border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-sm font-medium">
                      {calc.name}
                    </CardTitle>
                    <Badge variant="outline" className="w-fit text-xs">
                      {calc.category}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-cyan-400">
                      {calc.value} {calc.unit}
                    </div>
                    {calc.description && (
                      <p className="text-gray-400 text-xs mt-2">{calc.description}</p>
                    )}
                    {(calc.min_value !== null || calc.max_value !== null) && (
                      <p className="text-gray-500 text-xs mt-1">
                        Range: {calc.min_value ?? '∞'} - {calc.max_value ?? '∞'}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* TEK17 Requirements Tab */}
          <TabsContent value="tek17" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {config.tek17Requirements.map((req) => (
                <Card key={req.id} className="bg-gray-800/50 border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-sm font-medium">
                      {req.building_type}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-emerald-400">
                      {req.max_energy_kwh_m2} kWh/m²
                    </div>
                    {req.description && (
                      <p className="text-gray-400 text-xs mt-2">{req.description}</p>
                    )}
                    <p className="text-gray-500 text-xs mt-1">{req.source}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Formulas Tab */}
          <TabsContent value="formulas" className="space-y-4">
            <div className="space-y-4">
              {config.formulas.map((formula) => (
                <Card key={formula.id} className="bg-gray-800/50 border-gray-700">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-white text-lg">{formula.name}</CardTitle>
                      {formula.category && (
                        <Badge variant="outline">{formula.category}</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="bg-gray-900/50 p-3 rounded-md">
                      <code className="text-cyan-400 text-sm">{formula.formula}</code>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formula.variables.map((variable) => (
                        <Badge key={variable} className="bg-blue-600/20 text-blue-400">
                          {variable}
                        </Badge>
                      ))}
                    </div>
                    {formula.description && (
                      <p className="text-gray-400 text-sm">{formula.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Feature Flags Tab */}
          <TabsContent value="features" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {config.featureFlags.map((flag) => (
                <Card key={flag.id} className="bg-gray-800/50 border-gray-700">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-white text-sm font-medium">
                        {flag.feature_name}
                      </CardTitle>
                      <Badge
                        className={flag.enabled ? 'bg-green-600' : 'bg-gray-600'}
                      >
                        {flag.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {flag.description && (
                      <p className="text-gray-400 text-sm">{flag.description}</p>
                    )}
                    <p className="text-gray-500 text-xs mt-2">
                      Rollout: {flag.rollout_percentage}%
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-4">
            <div className="space-y-4">
              {config.content.map((item) => (
                <Card key={item.id} className="bg-gray-800/50 border-gray-700">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-white text-sm font-mono">
                          {item.key}
                        </CardTitle>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {item.category}
                          </Badge>
                          {item.context && (
                            <Badge variant="outline" className="text-xs">
                              {item.context}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Norwegian:</p>
                      <p className="text-white">{item.norwegian_text}</p>
                    </div>
                    {item.english_text && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">English:</p>
                        <p className="text-gray-400">{item.english_text}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Instructions */}
        <Card className="mt-8 bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">How to Edit Configuration</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-400 space-y-2">
            <p>1. Open your Notion workspace with the Supabase wrapper configured</p>
            <p>2. Edit values in the appropriate database (Calculations, TEK17, Features, etc.)</p>
            <p>3. Changes will sync to Supabase automatically or via manual trigger</p>
            <p>4. This admin panel will update in real-time when Supabase data changes</p>
            <p>5. Use the "Refresh Cache" button to force immediate updates in the app</p>
            <div className="mt-4 p-3 bg-yellow-600/10 border border-yellow-600/30 rounded-md">
              <p className="text-yellow-400 text-sm">
                <strong>Note:</strong> Run the migration scripts in Supabase first if tables don't exist yet.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}