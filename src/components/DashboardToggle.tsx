'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LayoutGrid, Waves, ArrowRight, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ReadonlyURLSearchParams } from 'next/navigation';

interface DashboardToggleProps {
  currentPath: string;
  searchParams?: URLSearchParams | ReadonlyURLSearchParams;
}

export default function DashboardToggle({ currentPath, searchParams }: DashboardToggleProps) {
  const router = useRouter();
  const [isAnimating, setIsAnimating] = useState(false);

  const isWaterfall = currentPath.includes('dashboard-waterfall');
  const queryString = searchParams ? searchParams.toString() : '';

  const switchDashboard = () => {
    setIsAnimating(true);

    // Determine target path
    const targetPath = isWaterfall ? '/dashboard' : '/dashboard-waterfall';

    // Add a slight delay for visual feedback
    setTimeout(() => {
      if (queryString) {
        router.push(`${targetPath}?${queryString}`);
      } else {
        router.push(targetPath);
      }

      // Reset animation state after navigation attempt
      setTimeout(() => {
        setIsAnimating(false);
      }, 500);
    }, 300);
  };

  return (
    <Card className="bg-card/50 border-border backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isWaterfall ? (
              <Waves className="w-5 h-5 text-aurora-cyan" />
            ) : (
              <LayoutGrid className="w-5 h-5 text-blue-400" />
            )}
            <div>
              <div className="text-sm font-semibold text-foreground">
                {isWaterfall ? 'Waterfall Dashboard' : 'Grid Dashboard'}
              </div>
              <div className="text-xs text-text-tertiary">
                {isWaterfall ? '3D visuell historie' : 'BI-stil oversikt'}
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className={`
              border-border text-foreground hover:bg-muted transition-all duration-300
              ${isAnimating ? 'scale-95 opacity-50' : 'hover:scale-105'}
            `}
            onClick={switchDashboard}
            disabled={isAnimating}
          >
            {isAnimating ? (
              <div className="animate-spin w-4 h-4 border-2 border-foreground border-t-transparent rounded-full" />
            ) : (
              <>
                {isWaterfall ? (
                  <>
                    <LayoutGrid className="w-4 h-4 mr-2" />
                    Grid View
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Waterfall View
                  </>
                )}
                <ArrowRight className="w-3 h-3 ml-1" />
              </>
            )}
          </Button>
        </div>

        {/* Feature highlight */}
        <div className="mt-3 pt-3 border-t border-border">
          <div className="text-xs text-text-tertiary">
            {isWaterfall ? (
              <>
                <span className="text-aurora-cyan">Aktiv:</span> 3D bygning, aurora-effekter, narrativ flyt
              </>
            ) : (
              <>
                <span className="text-blue-400">Aktiv:</span> Rask oversikt, alle data synlige
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}