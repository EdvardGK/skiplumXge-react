'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { stormEffects } from '@/lib/storm-theme';

interface DashboardTileProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  variant?: 'default' | 'highlight' | 'accent';
  'data-grid-position'?: string;
}

const DashboardTile: React.FC<DashboardTileProps> = ({
  id,
  children,
  className = '',
  style,
  variant = 'default',
  ...props
}) => {
  const variantClasses = {
    default: `${stormEffects.stormGlass} ${stormEffects.stormHover}`,
    highlight: `${stormEffects.stormGlass} ${stormEffects.lightningGlow} border-cyan-400/30`,
    accent: `${stormEffects.stormGlass} ${stormEffects.electricGlow} border-purple-400/30`,
  };

  return (
    <Card
      className={`
        ${variantClasses[variant]}
        transition-all duration-300
        overflow-hidden
        h-full w-full
        flex flex-col
        ${className}
      `}
      style={style}
      data-tile-id={id}
      {...props}
    >
      {children}
    </Card>
  );
};

export default DashboardTile;