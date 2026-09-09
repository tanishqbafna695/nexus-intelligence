import React, { useEffect, useRef } from 'react';
import cytoscape, { Core, EventObject } from 'cytoscape';
// @ts-ignore
import dagre from 'cytoscape-dagre';
import { GraphData, Node, NodeType } from '../../types';
import { ZoomIn, ZoomOut, RotateCcw, Crosshair } from 'lucide-react';

cytoscape.use(dagre);

interface GraphCanvasProps {
  data: GraphData;
  selectedNodeId?: string;
  highlightNodeIds?: string[];
  highlightEdgeIds?: string[];
  minConfidence?: number;
  selectedNodeTypes?: NodeType[];
  searchQuery?: string;
  layoutName?: string;
  onLayoutChange?: (layout: string) => void;
  onSelectNode: (node: Node | null) => void;
  onExpandNeighborhood?: (nodeId: string) => void;
}

const TYPE_COLORS: Record<string, string> = {
  PERSON: '#FF0055',
  PHONE: '#FFB703',
  LOCATION: '#00D2FF',
  VEHICLE: '#FF007F',
  ORGANIZATION: '#9D4EDD',
  ACCOUNT: '#00F0FF',
  DOCUMENT: '#80ED99',
  TRANSACTION: '#EC4899',
  EVENT: '#F97316',
};

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  data,
  selectedNodeId,
  highlightNodeIds = [],
  highlightEdgeIds = [],
  minConfidence = 0.5,
  selectedNodeTypes = [],
  searchQuery = '',
  layoutName = 'cose',
  onSelectNode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.style.backgroundColor = '#06070A';

    // Filter nodes and edges
    const filteredNodes = data.nodes.filter(n => {
      if (n.confidence < minConfidence) return false;
      if (selectedNodeTypes.length > 0 && !selectedNodeTypes.includes(n.type as NodeType)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q);
      }
      return true;
    });

    const activeNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = data.edges.filter(e => activeNodeIds.has(e.source) && activeNodeIds.has(e.target));

    const elements = [
      ...filteredNodes.map(n => ({
        data: {
          id: n.id,
          label: n.label,
          type: n.type,
          color: TYPE_COLORS[n.type] || '#38BDF8',
          confidence: n.confidence,
          rawNode: n,
        },
      })),
      ...filteredEdges.map(e => ({
        data: {
          id: e.id || `${e.source}_${e.target}`,
          source: e.source,
          target: e.target,
          type: e.type,
          confidence: e.confidence,
          evidence: e.evidence,
        },
      })),
    ];

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            'label': 'data(label)',
            'color': '#FFFFFF',
            'font-family': 'monospace',
            'font-size': '11px',
            'font-weight': 'bold',
            'text-valign': 'bottom',
            'text-margin-y': 6,
            'text-background-color': 'rgba(6, 9, 15, 0.95)',
            'text-background-opacity': 0.95,
            'text-background-padding': '3px',
            'text-background-shape': 'roundrectangle',
            'text-border-color': 'data(color)',
            'text-border-width': 1,
            'text-border-opacity': 0.7,
            'width': 34,
            'height': 34,
            'border-width': 2,
            'border-color': '#FFFFFF',
            'border-opacity': 0.6,
          } as any,
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': '#00FF9D',
            'width': 42,
            'height': 42,
          } as any,
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#00D2FF',
            'line-opacity': 0.5,
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#00D2FF',
            'arrow-scale': 1.2,
            'label': 'data(type)',
            'font-size': '8px',
            'font-family': 'monospace',
            'color': '#94A3B8',
            'text-background-color': '#06070A',
            'text-background-opacity': 0.85,
            'text-background-padding': '2px',
          } as any,
        },
        {
          selector: '.highlighted-node',
          style: {
            'border-color': '#00FF9D',
            'border-width': 4,
            'width': 40,
            'height': 40,
          } as any,
        },
        {
          selector: '.highlighted-edge',
          style: {
            'line-color': '#00FF9D',
            'target-arrow-color': '#00FF9D',
            'width': 3.5,
            'line-opacity': 1,
          } as any,
        },
      ],
      layout: {
        name: layoutName === '3d' ? 'cose' : layoutName,
        animate: true,
        animationDuration: 500,
        nodeRepulsion: 7000,
        idealEdgeLength: 85,
      } as any,
    });

    cy.on('tap', 'node', (evt: EventObject) => {
      const node = evt.target;
      onSelectNode(node.data('rawNode'));
    });

    cy.on('tap', (evt: EventObject) => {
      if (evt.target === cy) {
        onSelectNode(null);
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, minConfidence, selectedNodeTypes, searchQuery, layoutName]);

  // Highlight effects & Smooth Center on Selection
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.nodes().removeClass('highlighted-node');
    cy.edges().removeClass('highlighted-edge');

    highlightNodeIds.forEach(id => {
      cy.getElementById(id).addClass('highlighted-node');
    });

    highlightEdgeIds.forEach(id => {
      cy.getElementById(id).addClass('highlighted-edge');
    });

    if (selectedNodeId) {
      const targetEle = cy.getElementById(selectedNodeId);
      if (targetEle.length > 0) {
        targetEle.select();
        // Smoothly pan and zoom onto selected node
        cy.animate({
          center: { eles: targetEle },
          zoom: 1.5,
          duration: 500,
          easing: 'ease-in-out-cubic',
        });
      }
    }
  }, [highlightNodeIds, highlightEdgeIds, selectedNodeId]);

  const handleZoomIn = () => {
    if (cyRef.current) {
      cyRef.current.zoom({
        level: cyRef.current.zoom() * 1.25,
        renderedPosition: { x: cyRef.current.width() / 2, y: cyRef.current.height() / 2 },
      });
    }
  };

  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom({
        level: cyRef.current.zoom() * 0.8,
        renderedPosition: { x: cyRef.current.width() / 2, y: cyRef.current.height() / 2 },
      });
    }
  };

  const handleFit = () => {
    if (cyRef.current) {
      cyRef.current.animate({
        fit: { eles: cyRef.current.elements(), padding: 40 },
        duration: 400,
      });
    }
  };

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden bg-[#06070A]" style={{ background: '#06070A' }}>
      <div ref={containerRef} className="w-full h-full" style={{ background: '#06070A' }} />

      {/* Top Right Tactical Controls */}
      <div className="absolute top-16 right-3 flex flex-col gap-1 z-20">
        <div className="bg-black/85 backdrop-blur-md border border-white/10 rounded-xl p-1 flex flex-col gap-1 shadow-2xl">
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-1.5 rounded hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 transition"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-1.5 rounded hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 transition"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleFit}
            title="Fit Network to Screen"
            className="p-1.5 rounded hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 transition"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2D Canvas Bottom Legend */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none gap-2">
        <div className="flex flex-wrap gap-1.5 pointer-events-auto">
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
            <div
              key={type}
              className="bg-black/85 backdrop-blur-md border border-white/10 rounded px-2 py-0.5 flex items-center gap-1.5 text-[9px] font-mono text-slate-200"
            >
              <span className="w-2 h-2 rounded-sm inline-block flex-shrink-0" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
              {type}
            </div>
          ))}
        </div>
        <div className="text-[9px] font-mono text-slate-400 bg-black/85 backdrop-blur-md border border-white/10 rounded px-2.5 py-1 pointer-events-auto shrink-0">
          <span>2D Topological Canvas | Click Node to Focus | Scroll to Zoom</span>
        </div>
      </div>
    </div>
  );
};
