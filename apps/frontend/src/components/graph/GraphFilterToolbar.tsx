import React, { useState, useRef } from 'react';
import { Filter, Sliders, Search, RefreshCw, GripHorizontal, ChevronDown, ChevronUp, RotateCcw, X } from 'lucide-react';
import { NodeType } from '../../types';

interface GraphFilterToolbarProps {
  minConfidence: number;
  onConfidenceChange: (val: number) => void;
  selectedNodeTypes: NodeType[];
  onToggleNodeType: (type: NodeType) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onResetFilters: () => void;
  totalNodeCount?: number;
  filteredNodeCount?: number;
}

const ALL_TYPES: NodeType[] = [
  'PERSON', 'PHONE', 'LOCATION', 'VEHICLE', 'ORGANIZATION', 'ACCOUNT', 'DOCUMENT'
];

export const GraphFilterToolbar: React.FC<GraphFilterToolbarProps> = ({
  minConfidence,
  onConfidenceChange,
  selectedNodeTypes,
  onToggleNodeType,
  searchQuery,
  onSearchChange,
  onResetFilters,
  totalNodeCount,
  filteredNodeCount,
}) => {
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0
  });

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, input, textarea, a')) return;
    e.preventDefault();
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: position.x,
      startY: position.y,
    };
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;
    setPosition({
      x: dragStartRef.current.startX + dx,
      y: dragStartRef.current.startY + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handleResetPosition = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPosition({ x: 0, y: 0 });
  };

  const hasActiveFilters = minConfidence > 0.5 || selectedNodeTypes.length > 0 || searchQuery.trim().length > 0;
  const isFiltered = typeof totalNodeCount === 'number' && typeof filteredNodeCount === 'number';

  return (
    <div
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        touchAction: 'none',
      }}
      className={`bg-black/90 backdrop-blur-xl border border-white/15 rounded-xl text-xs font-sans shadow-[0_10px_35px_rgba(0,0,0,0.7)] select-none z-30 transition-shadow ${
        isDragging ? 'shadow-cyan-500/25 border-cyan-500/60 ring-1 ring-cyan-500/40' : ''
      } ${isCollapsed ? 'w-64 p-2.5' : 'w-72 p-3 space-y-2.5'}`}
    >
      {/* Draggable Header Bar */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleResetPosition}
        className="flex items-center justify-between border-b border-white/10 pb-2 cursor-grab active:cursor-grabbing group select-none"
        title="Click and drag to move filter panel anywhere on canvas. Double-click to reset position."
      >
        <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-white uppercase tracking-wider">
          <GripHorizontal className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition" />
          <Filter className="w-3.5 h-3.5 text-cyan-400" />
          <span>Filters</span>
          {hasActiveFilters && (
            <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-mono border border-cyan-500/40">
              Active
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Position Reset Button */}
          {(position.x !== 0 || position.y !== 0) && (
            <button
              onClick={handleResetPosition}
              title="Snap back to default position"
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}

          {/* Reset Filters */}
          <button
            onClick={onResetFilters}
            title="Reset filters to default"
            className="text-[10px] font-mono text-slate-400 hover:text-cyan-300 p-1 rounded hover:bg-white/10 flex items-center gap-1 transition"
          >
            <RefreshCw className="w-3 h-3" />
          </button>

          {/* Collapse / Expand Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expand filters" : "Collapse filters"}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Entity count stats badge */}
      {isFiltered && (
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-0.5">
          <span>Active Entities:</span>
          <span className={`font-bold ${filteredNodeCount === 0 ? 'text-amber-400' : 'text-cyan-300'}`}>
            {filteredNodeCount} / {totalNodeCount} nodes
          </span>
        </div>
      )}

      {/* Collapsed State Summary */}
      {isCollapsed ? (
        <div
          onClick={() => setIsCollapsed(false)}
          className="cursor-pointer text-[10px] font-mono text-slate-400 hover:text-cyan-300 flex items-center justify-between pt-1"
        >
          <span>{hasActiveFilters ? 'Filters applied (click to expand)' : 'Click to customize filters'}</span>
          <Sliders className="w-3 h-3 text-cyan-400" />
        </div>
      ) : (
        <>
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search entity by label or ID..."
              className="w-full bg-black/60 border border-white/10 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Confidence Threshold Slider */}
          <div>
            <div className="flex justify-between text-slate-300 font-mono text-[11px] mb-1">
              <span className="flex items-center gap-1">
                <Sliders className="w-3 h-3 text-emerald-400" />
                Min Confidence
              </span>
              <span className="text-emerald-400 font-semibold font-mono">
                {(minConfidence * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.0"
              step="0.05"
              value={minConfidence}
              onChange={(e) => onConfidenceChange(parseFloat(e.target.value))}
              className="w-full accent-emerald-400 bg-black/60 h-1.5 rounded cursor-pointer"
            />
          </div>

          {/* Node Type Filter Chips */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider font-bold">
                Filter Entity Types
              </span>
              {selectedNodeTypes.length > 0 && (
                <button
                  onClick={() => ALL_TYPES.forEach(t => selectedNodeTypes.includes(t) && onToggleNodeType(t))}
                  className="text-[9px] font-mono text-cyan-400 hover:underline"
                >
                  Clear types
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_TYPES.map((type) => {
                const active = selectedNodeTypes.includes(type);
                return (
                  <button
                    key={type}
                    onClick={() => onToggleNodeType(type)}
                    className={`px-2 py-0.5 rounded font-mono text-[10px] transition border ${
                      active
                        ? 'bg-cyan-500/25 text-cyan-300 border-cyan-500/50 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                        : 'bg-black/50 text-slate-400 border-white/10 hover:border-white/25 hover:text-slate-200'
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
