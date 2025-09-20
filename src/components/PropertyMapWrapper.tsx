'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

interface PropertyMapProps {
  address?: string | null;
  coordinates?: { lat: number; lon: number } | null;
  className?: string;
}

// Loading component for map
const MapSkeleton = ({ className = '' }: { className?: string }) => (
  <div className={`relative w-full ${className}`}>
    <Skeleton className="w-full h-full rounded-lg" style={{ minHeight: '300px' }} />
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-muted-foreground text-sm">Laster kart...</div>
    </div>
  </div>
);

// Dynamically import PropertyMap with SSR disabled
const PropertyMap = dynamic(
  () => import('./PropertyMap'),
  {
    ssr: false,
    loading: () => <MapSkeleton />
  }
);

export function PropertyMapWrapper(props: PropertyMapProps) {
  return <PropertyMap {...props} />;
}

export default PropertyMapWrapper;