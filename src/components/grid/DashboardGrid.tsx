'use client';

import React from 'react';

// Simple equal-width columns - no complexity
const EQUAL_COLUMNS = 4;
const COLUMN_PERCENTAGE = 100 / EQUAL_COLUMNS;

export interface DashboardLayoutDefinition {
  rows: number;
  cols: number;
  layout: string[][];
}

export interface GridPosition {
  gridColumn: string;
  gridRow: string;
  colSpan: number;
  rowSpan: number;
}

interface DashboardGridProps {
  layout: DashboardLayoutDefinition;
  className?: string;
  debug?: boolean;
  children: React.ReactNode;
}

function generateGridPositions(layout: string[][]): Record<string, GridPosition> {
  const positions: Record<string, GridPosition> = {};
  const processed = new Set<string>();

  layout.forEach((row, rowIndex) => {
    row.forEach((cellName, colIndex) => {
      if (processed.has(cellName)) return;

      // Find the bounds of this cell (how far it spans)
      let maxCol = colIndex;
      let maxRow = rowIndex;

      // Check horizontal span
      for (let c = colIndex + 1; c < row.length; c++) {
        if (row[c] === cellName) maxCol = c;
        else break;
      }

      // Check vertical span
      for (let r = rowIndex + 1; r < layout.length; r++) {
        if (layout[r][colIndex] === cellName) maxRow = r;
        else break;
      }

      // Calculate grid positions using Fibonacci columns
      const startCol = colIndex + 1;
      const endCol = maxCol + 2;
      const startRow = rowIndex + 1;
      const endRow = maxRow + 2;

      positions[cellName] = {
        gridColumn: `${startCol} / ${endCol}`,
        gridRow: `${startRow} / ${endRow}`,
        colSpan: maxCol - colIndex + 1,
        rowSpan: maxRow - rowIndex + 1
      };

      processed.add(cellName);
    });
  });

  return positions;
}

function validateLayout(layout: string[][]): string[] {
  const errors: string[] = [];
  const cellPositions = new Map<string, Array<{row: number, col: number}>>();

  // Track all positions for each cell
  layout.forEach((row, rowIndex) => {
    row.forEach((cellName, colIndex) => {
      if (!cellPositions.has(cellName)) {
        cellPositions.set(cellName, []);
      }
      cellPositions.get(cellName)!.push({row: rowIndex, col: colIndex});
    });
  });

  // Check for gaps in multi-cell components
  cellPositions.forEach((positions, cellName) => {
    if (positions.length > 1) {
      const rows = [...new Set(positions.map(p => p.row))].sort();
      const cols = [...new Set(positions.map(p => p.col))].sort();

      // Check if it forms a rectangle
      const expectedPositions = rows.length * cols.length;
      if (positions.length !== expectedPositions) {
        errors.push(`Cell "${cellName}" doesn't form a proper rectangle`);
      }
    }
  });

  return errors;
}

const DashboardGrid: React.FC<DashboardGridProps> = ({
  layout,
  className = '',
  debug = false,
  children
}) => {
  const positions = generateGridPositions(layout.layout);
  const errors = validateLayout(layout.layout);

  // Log validation errors in development
  if (process.env.NODE_ENV === 'development' && errors.length > 0) {
    console.warn('Dashboard Layout Validation Errors:', errors);
  }

  // Create CSS Grid template with equal columns and viewport-based row heights
  const gridTemplateColumns = `repeat(${EQUAL_COLUMNS}, 1fr)`;
  const gridTemplateRows = `repeat(${layout.rows}, calc((100vh - 180px) / ${layout.rows}))`;

  return (
    <div className={`dashboard-grid ${className}`}>
      <div
        className="grid gap-2 w-full h-full overflow-hidden"
        style={{
          gridTemplateColumns,
          gridTemplateRows,
        }}
      >
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child) && (child.props as any)?.id) {
            const position = positions[(child.props as any).id];
            if (position) {
              return React.cloneElement(child as any, {
                style: {
                  gridColumn: position.gridColumn,
                  gridRow: position.gridRow,
                  ...(child.props as any)?.style,
                },
                'data-grid-position': `${position.colSpan}x${position.rowSpan}`,
              });
            }
          }
          return child;
        })}

        {debug && (
          <GridDebugOverlay
            layout={layout}
            positions={positions}
            errors={errors}
          />
        )}
      </div>

      {debug && (
        <div className="mt-4 p-4 bg-slate-800/50 rounded-lg text-xs text-slate-300">
          <div className="font-semibold mb-2">Equal Grid Debug:</div>
          <div>Columns: {EQUAL_COLUMNS} equal columns ({COLUMN_PERCENTAGE}% each)</div>
          <div>Rows: {layout.rows} (240px each)</div>
          {errors.length > 0 && (
            <div className="mt-2 text-red-400">
              Errors: {errors.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface GridDebugOverlayProps {
  layout: DashboardLayoutDefinition;
  positions: Record<string, GridPosition>;
  errors: string[];
}

const GridDebugOverlay: React.FC<GridDebugOverlayProps> = ({ layout, positions, errors }) => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Grid lines */}
      <div className="absolute inset-0 grid gap-2" style={{
        gridTemplateColumns: `repeat(${EQUAL_COLUMNS}, 1fr)`,
        gridTemplateRows: `repeat(${layout.rows}, calc((100vh - 180px) / ${layout.rows}))`,
      }}>
        {Array.from({ length: layout.cols * layout.rows }).map((_, i) => (
          <div key={i} className="border border-cyan-400/30 bg-cyan-400/5 flex items-center justify-center text-xs text-cyan-400">
            {Math.floor(i / layout.cols) + 1},{(i % layout.cols) + 1}
          </div>
        ))}
      </div>

      {/* Cell labels */}
      {Object.entries(positions).map(([cellName, position]) => (
        <div
          key={cellName}
          className="absolute bg-purple-500/20 border border-purple-400 flex items-center justify-center text-xs text-purple-300 font-mono"
          style={{
            gridColumn: position.gridColumn,
            gridRow: position.gridRow,
          }}
        >
          {cellName}
          <br />
          {position.colSpan}x{position.rowSpan}
        </div>
      ))}
    </div>
  );
};

export default DashboardGrid;
export { generateGridPositions, validateLayout };