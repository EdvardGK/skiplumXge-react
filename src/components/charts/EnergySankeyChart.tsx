'use client';

import React from 'react';
import { stormColors } from '@/lib/storm-theme';

interface SankeyNode {
  id: string;
  name: string;
  color: string;
  value: number;
  type: 'source' | 'system' | 'usage';
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
  color: string;
}

interface EnergySankeyChartProps {
  totalEnergyConsumption: number;
  heatingSystem: string;
  className?: string;
}

export default function EnergySankeyChart({
  totalEnergyConsumption,
  heatingSystem,
  className = ''
}: EnergySankeyChartProps) {
  // Generate energy flow data based on Norwegian building standards
  const generateEnergyFlowData = () => {
    const nodes: SankeyNode[] = [
      // Energy sources
      {
        id: 'electricity',
        name: 'Elektrisitet',
        color: stormColors.lightning.cyan,
        value: totalEnergyConsumption,
        type: 'source'
      },

      // Building systems
      {
        id: 'heating',
        name: 'Oppvarming',
        color: stormColors.lightning.thunder,
        value: totalEnergyConsumption * 0.7, // 70% typically for heating
        type: 'system'
      },
      {
        id: 'lighting',
        name: 'Belysning',
        color: stormColors.lightning.gold,
        value: totalEnergyConsumption * 0.15, // 15% for lighting
        type: 'system'
      },
      {
        id: 'ventilation',
        name: 'Ventilasjon',
        color: stormColors.lightning.electric,
        value: totalEnergyConsumption * 0.10, // 10% for ventilation
        type: 'system'
      },
      {
        id: 'other',
        name: 'Øvrig',
        color: stormColors.lightning.aurora,
        value: totalEnergyConsumption * 0.05, // 5% other systems
        type: 'system'
      },

      // End uses
      {
        id: 'comfort',
        name: 'Komfort',
        color: stormColors.energyGrades.A,
        value: totalEnergyConsumption * 0.85,
        type: 'usage'
      },
      {
        id: 'waste',
        name: 'Sløsing',
        color: stormColors.energyGrades.F,
        value: totalEnergyConsumption * 0.15,
        type: 'usage'
      }
    ];

    const links: SankeyLink[] = [
      // From electricity to systems
      {
        source: 'electricity',
        target: 'heating',
        value: totalEnergyConsumption * 0.7,
        color: stormColors.lightning.thunder + '60'
      },
      {
        source: 'electricity',
        target: 'lighting',
        value: totalEnergyConsumption * 0.15,
        color: stormColors.lightning.gold + '60'
      },
      {
        source: 'electricity',
        target: 'ventilation',
        value: totalEnergyConsumption * 0.10,
        color: stormColors.lightning.electric + '60'
      },
      {
        source: 'electricity',
        target: 'other',
        value: totalEnergyConsumption * 0.05,
        color: stormColors.lightning.aurora + '60'
      },

      // From systems to end uses
      {
        source: 'heating',
        target: 'comfort',
        value: totalEnergyConsumption * 0.6,
        color: stormColors.energyGrades.A + '60'
      },
      {
        source: 'heating',
        target: 'waste',
        value: totalEnergyConsumption * 0.1,
        color: stormColors.energyGrades.F + '60'
      },
      {
        source: 'lighting',
        target: 'comfort',
        value: totalEnergyConsumption * 0.12,
        color: stormColors.energyGrades.A + '60'
      },
      {
        source: 'lighting',
        target: 'waste',
        value: totalEnergyConsumption * 0.03,
        color: stormColors.energyGrades.F + '60'
      },
      {
        source: 'ventilation',
        target: 'comfort',
        value: totalEnergyConsumption * 0.08,
        color: stormColors.energyGrades.A + '60'
      },
      {
        source: 'ventilation',
        target: 'waste',
        value: totalEnergyConsumption * 0.02,
        color: stormColors.energyGrades.F + '60'
      },
      {
        source: 'other',
        target: 'comfort',
        value: totalEnergyConsumption * 0.05,
        color: stormColors.energyGrades.A + '60'
      }
    ];

    return { nodes, links };
  };

  const { nodes, links } = generateEnergyFlowData();

  // Simple Sankey visualization using SVG
  const width = 480;
  const height = 300;
  const nodeWidth = 16;
  const nodePadding = 20;

  // Position nodes in three columns
  const getNodePosition = (node: SankeyNode, index: number) => {
    const columnWidth = width / 4;
    let x = 0;
    let y = 0;

    if (node.type === 'source') {
      x = columnWidth * 0.7;
      y = height / 2;
    } else if (node.type === 'system') {
      x = columnWidth * 2;
      y = 60 + (index - 1) * 45; // Adjusted for smaller spacing
    } else {
      x = columnWidth * 3.2;
      y = height / 2.5 + (index > 4 ? 60 : 0); // Adjusted positioning
    }

    return { x, y };
  };

  return (
    <div className={`${className}`}>

      <div className="w-full h-full overflow-hidden">
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Gradient definitions for flow lines */}
            <linearGradient id="flowGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={stormColors.lightning.cyan} stopOpacity={0.8}/>
              <stop offset="100%" stopColor={stormColors.lightning.thunder} stopOpacity={0.3}/>
            </linearGradient>
            <linearGradient id="flowGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={stormColors.lightning.thunder} stopOpacity={0.8}/>
              <stop offset="100%" stopColor={stormColors.energyGrades.A} stopOpacity={0.3}/>
            </linearGradient>
            <linearGradient id="wasteGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={stormColors.lightning.thunder} stopOpacity={0.8}/>
              <stop offset="100%" stopColor={stormColors.energyGrades.F} stopOpacity={0.6}/>
            </linearGradient>
          </defs>

          {/* Draw flow paths */}
          {links.map((link, index) => {
            const sourceNode = nodes.find(n => n.id === link.source);
            const targetNode = nodes.find(n => n.id === link.target);
            if (!sourceNode || !targetNode) return null;

            const sourcePos = getNodePosition(sourceNode, nodes.indexOf(sourceNode));
            const targetPos = getNodePosition(targetNode, nodes.indexOf(targetNode));

            const strokeWidth = Math.max(2, (link.value / totalEnergyConsumption) * 40);
            const isWaste = link.target === 'waste';

            return (
              <g key={index}>
                {/* Glow effect */}
                <path
                  d={`M ${sourcePos.x + nodeWidth} ${sourcePos.y} Q ${(sourcePos.x + targetPos.x) / 2} ${sourcePos.y} ${targetPos.x} ${targetPos.y}`}
                  stroke={isWaste ? stormColors.energyGrades.F : stormColors.lightning.cyan}
                  strokeWidth={strokeWidth + 4}
                  fill="none"
                  opacity={0.3}
                  filter="blur(2px)"
                />
                {/* Main flow line */}
                <path
                  d={`M ${sourcePos.x + nodeWidth} ${sourcePos.y} Q ${(sourcePos.x + targetPos.x) / 2} ${sourcePos.y} ${targetPos.x} ${targetPos.y}`}
                  stroke={isWaste ? "url(#wasteGradient)" : "url(#flowGradient1)"}
                  strokeWidth={strokeWidth}
                  fill="none"
                  opacity={0.8}
                />
              </g>
            );
          })}

          {/* Draw nodes */}
          {nodes.map((node, index) => {
            const pos = getNodePosition(node, index);
            const height = Math.max(20, (node.value / totalEnergyConsumption) * 120);

            return (
              <g key={node.id}>
                {/* Node glow */}
                <rect
                  x={pos.x - 2}
                  y={pos.y - height/2 - 2}
                  width={nodeWidth + 4}
                  height={height + 4}
                  fill={node.color}
                  opacity={0.3}
                  rx={6}
                  filter="blur(3px)"
                />
                {/* Main node */}
                <rect
                  x={pos.x}
                  y={pos.y - height/2}
                  width={nodeWidth}
                  height={height}
                  fill={node.color}
                  rx={4}
                  opacity={0.9}
                />
                {/* Node label */}
                <text
                  x={pos.x + nodeWidth + 8}
                  y={pos.y}
                  fill="white"
                  fontSize="10"
                  fontWeight="semibold"
                  dominantBaseline="middle"
                >
                  {node.name}
                </text>
                {/* Node value */}
                <text
                  x={pos.x + nodeWidth + 8}
                  y={pos.y + 12}
                  fill="#94a3b8"
                  fontSize="9"
                  dominantBaseline="middle"
                >
                  {Math.round(node.value).toLocaleString()} kWh
                </text>
              </g>
            );
          })}

          {/* Column labels */}
          <text x={width * 0.18} y={25} fill="#94a3b8" fontSize="12" fontWeight="bold" textAnchor="middle">
            Kilde
          </text>
          <text x={width * 0.5} y={25} fill="#94a3b8" fontSize="12" fontWeight="bold" textAnchor="middle">
            Systemer
          </text>
          <text x={width * 0.82} y={25} fill="#94a3b8" fontSize="12" fontWeight="bold" textAnchor="middle">
            Sluttbruk
          </text>
        </svg>
      </div>

      {/* Energy efficiency insights */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="text-center p-3 bg-slate-800/50 rounded">
            <div className="text-emerald-400 font-semibold mb-1">
              {Math.round((totalEnergyConsumption * 0.85))} kWh
            </div>
            <div className="text-slate-300 text-xs">Nyttig energi</div>
          </div>

          <div className="text-center p-3 bg-slate-800/50 rounded">
            <div className="text-red-400 font-semibold mb-1">
              {Math.round((totalEnergyConsumption * 0.15))} kWh
            </div>
            <div className="text-slate-300 text-xs">Energisløsing</div>
          </div>

          <div className="text-center p-3 bg-slate-800/50 rounded">
            <div className="text-cyan-400 font-semibold mb-1">
              {Math.round(((totalEnergyConsumption * 0.85) / totalEnergyConsumption) * 100)}%
            </div>
            <div className="text-slate-300 text-xs">Effektivitet</div>
          </div>
        </div>
    </div>
  );
}