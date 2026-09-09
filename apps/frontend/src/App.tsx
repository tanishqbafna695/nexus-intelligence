import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Sparkles, Database, Upload, AlertTriangle, Filter, RefreshCw } from 'lucide-react';
import { AppShell } from './components/layout/AppShell';
import { ParticleBackground } from './components/layout/ParticleBackground';
import { GraphCanvas } from './components/graph/GraphCanvas';
import { GraphCanvas3D } from './components/graph/GraphCanvas3D';
import { GraphFilterToolbar } from './components/graph/GraphFilterToolbar';
import { DemoStorylineController } from './components/investigation/DemoStorylineController';
import { AIInvestigatorPanel } from './components/investigation/AIInvestigatorPanel';
import { EntityIntelligencePanel } from './components/entity/EntityIntelligencePanel';
import { TimelineView } from './components/timeline/TimelineView';
import { EvidenceViewer } from './components/evidence/EvidenceViewer';
import { IngestionModal } from './components/ingestion/IngestionModal';
import { AuditLogViewer } from './components/audit/AuditLogViewer';
import { PathFinderPanel } from './components/investigation/PathFinderPanel';
import { AlertPanel } from './components/investigation/AlertPanel';
import { CulpritProfilerPanel } from './components/investigation/CulpritProfilerPanel';
import { LiveStreamFeed } from './components/investigation/LiveStreamFeed';
import { GeoSpatialMapPanel } from './components/investigation/GeoSpatialMapPanel';
import { AudioEvidenceTranscriptPanel } from './components/investigation/AudioEvidenceTranscriptPanel';
import { AudioBriefingModal } from './components/investigation/AudioBriefingModal';
import { WiretapAudioInspector } from './components/investigation/WiretapAudioInspector';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import { MLModelInspector } from './components/analytics/MLModelInspector';
import { CrossSyndicateFusion } from './components/analytics/CrossSyndicateFusion';
import { ThreatForecastConsole } from './components/investigation/ThreatForecastConsole';
import { PoliceSolutionsPanel } from './components/investigation/PoliceSolutionsPanel';
import { WarrantGeneratorModal } from './components/investigation/WarrantGeneratorModal';
import { EvidenceLedger } from './components/evidence/EvidenceLedger';
import { InvestigativePriorityPanel } from './components/investigation/InvestigativePriorityPanel';
import { LandingPortal } from './components/layout/LandingPortal';
import { CaseManagerModal } from './components/layout/CaseManagerModal';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { GraphData, Node, NodeType, Case, Edge, AnalyticsResponse } from './types';
import { fetchGraph, fetchCommunities, triggerPdfDownload, fetchCases, createCase, deleteCase, checkBackendHealth, onBackendHealthChange, isDemoModeActive, setDemoModeActive, fetchAnalytics } from './services/api';
import { ClientIntelligenceEngine } from './services/clientIntelligenceEngine';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api';

const DEFAULT_CASES: Case[] = [
  { id: 'CASE-001', name: 'Operation Nexus', description: 'Port Hawala & Narcotics Contraband Syndicate', created_at: '2026-01-10', document_ids: [], node_count: 25, edge_count: 61 },
  { id: 'CASE-002', name: 'Operation Blackout', description: 'State Banking Trojan & Monero Cross-Chain Mules', created_at: '2026-02-14', document_ids: [], node_count: 12, edge_count: 10 },
  { id: 'CASE-003', name: 'Operation Vulture', description: 'Military Surplus & Maritime Port Arms Smuggling', created_at: '2026-03-01', document_ids: [], node_count: 11, edge_count: 9 },
  { id: 'CASE-004', name: 'Operation DarkNet Ghost', description: 'Encrypted Synthetics & Beach Dead-Drop Logistics', created_at: '2026-03-18', document_ids: [], node_count: 10, edge_count: 8 },
  { id: 'CASE-005', name: 'Operation Golden Falcon', description: 'Dubai-Mumbai Air Courier Gold Bullion Pipeline', created_at: '2026-04-05', document_ids: [], node_count: 11, edge_count: 8 },
];

import { OFFLINE_CASES, OFFLINE_GRAPHS, OFFLINE_ANALYTICS } from './data/caseDatasets';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('portal');
  const [caseId, setCaseId] = useState<string>(() => {
    const expunged = ClientIntelligenceEngine.getExpungedCaseIds();
    if (!expunged.has('CASE-001')) return 'CASE-001';
    const saved = ClientIntelligenceEngine.getSavedCases();
    if (saved.length > 0) return saved[0].id;
    const remainingDemo = OFFLINE_CASES.filter(c => !expunged.has(c.id));
    return remainingDemo.length > 0 ? remainingDemo[0].id : 'CASE-001';
  });
  const [cases, setCases] = useState<Case[]>(() => {
    const expunged = ClientIntelligenceEngine.getExpungedCaseIds();
    const saved = ClientIntelligenceEngine.getSavedCases();
    const remainingDemo = OFFLINE_CASES.filter(c => !expunged.has(c.id));
    const merged = [...saved, ...remainingDemo.filter(c => !saved.some(s => s.id === c.id))];
    return merged.length > 0 ? merged : [];
  });
  const [graphData, setGraphData] = useState<GraphData>(() => {
    const expunged = ClientIntelligenceEngine.getExpungedCaseIds();
    if (isDemoModeActive() && !expunged.has('CASE-001')) {
      return OFFLINE_GRAPHS['CASE-001'] || { nodes: [], edges: [] };
    }
    return { nodes: [], edges: [] };
  });
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [highlightNodes, setHighlightNodes] = useState<string[]>([]);
  const [highlightEdges, setHighlightEdges] = useState<string[]>([]);
  const [viewingEvidenceId, setViewingEvidenceId] = useState<string | null>(null);
  
  // 2D / 3D Canvas Mode
  const [is3DMode, setIs3DMode] = useState<boolean>(true);

  // Modals
  const [isIngestionOpen, setIsIngestionOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isWarrantOpen, setIsWarrantOpen] = useState(false);
  const [isCaseManagerOpen, setIsCaseManagerOpen] = useState(false);
  const [isBriefingOpen, setIsBriefingOpen] = useState(false);

  // Graph Layout & Filtering State
  const [layoutName, setLayoutName] = useState<string>('cose');
  const [minConfidence, setMinConfidence] = useState<number>(0.5);
  const [selectedNodeTypes, setSelectedNodeTypes] = useState<NodeType[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Backend Health & Demo Mode States
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(isDemoModeActive());

  useEffect(() => {
    checkBackendHealth().then(setIsBackendHealthy);
    const unsub = onBackendHealthChange(setIsBackendHealthy);
    return unsub;
  }, []);

  // Phase 7 States
  const [leftSubTab, setLeftSubTab] = useState<string>('agent');
  const [analyticsSubTab, setAnalyticsSubTab] = useState<string>('overview');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsResponse | null>(null);
  const [maxTimestamp, setMaxTimestamp] = useState<string | null>(null);
  const [showCommunities, setShowCommunities] = useState<boolean>(false);
  const [communities, setCommunities] = useState<Array<{ community_id: number; members: string[] }>>(OFFLINE_ANALYTICS['CASE-001'].communities);

  const handleCreateCase = async (name: string, desc: string) => {
    const newCase = await createCase(name, desc);
    setCases(prev => [newCase, ...prev.filter(c => c.id !== newCase.id)]);
    setCaseId(newCase.id);
    setGraphData({ nodes: [], edges: [] });
    setCurrentTab('workspace');
    setIsIngestionOpen(true);
  };

  const handleDeleteCase = async (cid: string) => {
    await deleteCase(cid);
    const updated = cases.filter(c => c.id !== cid);
    if (updated.length === 0) {
      const freshCase = await createCase('Operation Alpha', 'Fresh Operational Investigation');
      setCases([freshCase]);
      setCaseId(freshCase.id);
      setGraphData({ nodes: [], edges: [] });
      setCommunities([]);
    } else {
      setCases(updated);
      if (caseId === cid) {
        const nextCaseId = updated[0].id;
        setCaseId(nextCaseId);
      }
    }
  };

  const loadCaseData = async (cid: string = caseId) => {
    const demoActive = isDemoModeActive();
    try {
      const gData = await fetchGraph(cid);
      if (gData && Array.isArray(gData.nodes) && gData.nodes.length > 0) {
        setGraphData(gData);
      } else if (demoActive && OFFLINE_GRAPHS[cid]) {
        setGraphData(OFFLINE_GRAPHS[cid]);
      } else {
        setGraphData(gData || { nodes: [], edges: [] });
      }
    } catch (err) {
      console.error("Failed to load graph data", err);
      if (demoActive && OFFLINE_GRAPHS[cid]) {
        setGraphData(OFFLINE_GRAPHS[cid]);
      } else {
        setGraphData({ nodes: [], edges: [] });
      }
    }

    try {
      const commData = await fetchCommunities(cid);
      if (commData && Array.isArray(commData)) {
        setCommunities(commData);
      } else if (demoActive && OFFLINE_ANALYTICS[cid]?.communities) {
        setCommunities(OFFLINE_ANALYTICS[cid].communities);
      } else {
        setCommunities([]);
      }
    } catch (err) {
      console.error("Failed to load communities", err);
      if (demoActive && OFFLINE_ANALYTICS[cid]?.communities) {
        setCommunities(OFFLINE_ANALYTICS[cid].communities);
      } else {
        setCommunities([]);
      }
    }

    try {
      const cList = await fetchCases();
      if (Array.isArray(cList) && cList.length > 0) {
        setCases(cList);
      }
    } catch (err) {
      console.error("Failed to fetch cases list", err);
      const expunged = ClientIntelligenceEngine.getExpungedCaseIds();
      setCases(prev => prev.length > 0 ? prev : OFFLINE_CASES.filter(c => !expunged.has(c.id)));
    }
  };

  useEffect(() => {
    loadCaseData(caseId);
    setMaxTimestamp(null); // Reset timeline filter on case switch
  }, [caseId]);

  const handleApplyHighlight = (nodes: string[], edges: string[]) => {
    setHighlightNodes(nodes);
    setHighlightEdges(edges);
  };

  // Load analytics data when the Intelligence Analytics tab opens (Plan Phase 2)
  useEffect(() => {
    if (currentTab === 'analytics' && caseId) {
      fetchAnalytics(caseId).then(setAnalyticsData).catch(() => setAnalyticsData(null));
    }
  }, [currentTab, caseId]);

  const handleAnalyticsSelectNode = (nodeId: string) => {
    const node = graphData.nodes.find(n => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
      setCurrentTab('workspace');
    }
  };

  const handleToggleNodeType = (type: NodeType) => {
    setSelectedNodeTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleExportReport = async () => {
    try {
      await triggerPdfDownload(caseId);
    } catch (err) {
      console.error("PDF Export failed", err);
    }
  };

  const handleExpandNeighborhood = async (nodeId: string) => {
    try {
      const subGraph = await fetchGraph(caseId, nodeId);
      setGraphData((prev) => {
        const existingNodeIds = new Set(prev.nodes.map((n) => n.id));
        const newNodes = subGraph.nodes.filter((n) => !existingNodeIds.has(n.id));
        
        const existingEdgeIds = new Set(prev.edges.map((e) => `${e.source}_${e.target}_${e.type}`));
        const newEdges = subGraph.edges.filter((e) => !existingEdgeIds.has(`${e.source}_${e.target}_${e.type}`));

        return {
          nodes: [...prev.nodes, ...newNodes],
          edges: [...prev.edges, ...newEdges],
        };
      });
    } catch (err) {
      console.error(err);
    }
  };



  const handleInjectStreamData = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    setGraphData(prev => {
      const existingNodeIds = new Set(prev.nodes.map(n => n.id));
      const filteredNewNodes = newNodes.filter(n => !existingNodeIds.has(n.id));

      const existingEdgeIds = new Set(prev.edges.map(e => e.id));
      const filteredNewEdges = newEdges.filter(e => !e.id || !existingEdgeIds.has(e.id));

      if (filteredNewNodes.length === 0 && filteredNewEdges.length === 0) return prev;

      return {
        nodes: [...prev.nodes, ...filteredNewNodes],
        edges: [...prev.edges, ...filteredNewEdges],
      };
    });
  }, []);

  // Compute actively filtered graph data: combines timeline playback, confidence threshold, node types, and search query
  const activeGraphData = useMemo(() => {
    // 1. Time filter
    const timeFilteredEdges = maxTimestamp
      ? graphData.edges.filter(e => e.timestamp && new Date(e.timestamp).getTime() <= new Date(maxTimestamp).getTime())
      : graphData.edges;

    const activeNodeIdsFromTime = new Set(timeFilteredEdges.flatMap(e => [e.source, e.target]));
    const timeFilteredNodes = maxTimestamp
      ? graphData.nodes.filter(n => activeNodeIdsFromTime.has(n.id) || (n.created_at && new Date(n.created_at).getTime() <= new Date(maxTimestamp).getTime()))
      : graphData.nodes;

    // 2. Threshold, Type, and Search Query filters
    const filteredNodes = timeFilteredNodes.filter(n => {
      if (typeof minConfidence === 'number' && n.confidence < minConfidence) return false;
      if (selectedNodeTypes.length > 0 && !selectedNodeTypes.includes(n.type as NodeType)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchLabel = n.label && n.label.toLowerCase().includes(q);
        const matchId = n.id && n.id.toLowerCase().includes(q);
        const matchType = n.type && n.type.toLowerCase().includes(q);
        return matchLabel || matchId || matchType;
      }
      return true;
    });

    const activeNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = timeFilteredEdges.filter(e => activeNodeIds.has(e.source) && activeNodeIds.has(e.target));

    return {
      nodes: filteredNodes,
      edges: filteredEdges
    };
  }, [graphData, maxTimestamp, minConfidence, selectedNodeTypes, searchQuery]);

  // If active filter causes selected node to be hidden, cleanly clear selection
  useEffect(() => {
    if (selectedNode && !activeGraphData.nodes.some(n => n.id === selectedNode.id)) {
      setSelectedNode(null);
    }
  }, [activeGraphData, selectedNode]);

  return (
    <>
      {/* 3D animated deep-space starfield behind everything */}
      <ParticleBackground />

      <AppShell
      currentTab={currentTab}
      onTabChange={setCurrentTab}
      cases={cases}
      currentCaseId={caseId}
      onCaseChange={(cid) => {
        setCaseId(cid);
        setSelectedNode(null);
      }}
      nodeCount={graphData.nodes.length}
      edgeCount={graphData.edges.length}
      onUploadClick={() => setIsIngestionOpen(true)}
      onAuditClick={() => setIsAuditOpen(true)}
      onBriefingClick={() => setIsBriefingOpen(true)}
      onExportClick={handleExportReport}
      onWarrantClick={() => setIsWarrantOpen(true)}
      onOpenCaseManager={() => setIsCaseManagerOpen(true)}
      onDeleteActiveCase={handleDeleteCase}
      runtimeMode={isDemoMode ? 'demo' : isBackendHealthy ? 'live' : 'offline'}
    >
      {/* Live Engine Status Warning Banner */}
      {!isBackendHealthy && (
        <div className="bg-amber-950/90 border-b border-amber-500/40 px-4 py-2 flex items-center justify-between text-xs text-amber-300 font-mono shrink-0 shadow-lg z-50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
            <span>
              <strong>Live TRACE Engine Offline (http://127.0.0.1:8000)</strong> — Running in client sandbox. Outputs are derived from your real uploaded records.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                const ok = await checkBackendHealth();
                if (ok) loadCaseData(caseId);
              }}
              className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 transition text-[11px]"
            >
              Retry Server
            </button>
            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300">
              <input
                type="checkbox"
                checked={isDemoMode}
                onChange={(e) => {
                  setDemoModeActive(e.target.checked);
                  setIsDemoMode(e.target.checked);
                  loadCaseData(caseId);
                }}
                className="rounded border-slate-600 bg-slate-800 text-cyan-500"
              />
              <span>Demo Fallback Mode</span>
            </label>
          </div>
        </div>
      )}

      {/* Persistent Synthetic Demo Data Warning Banner */}
      {isDemoMode && (
        <div className="bg-amber-950/80 border-b border-amber-500/50 px-4 py-2 flex items-center justify-between text-xs text-amber-200 font-mono shrink-0 shadow-lg z-50">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 text-[10px]">
              SYNTHETIC DEMO DATA
            </span>
            <span>
              Synthetic demo mode active. Graphs and intelligence entities are pre-packaged simulations for demonstration purposes only.
            </span>
          </div>
          <button
            onClick={() => {
              setDemoModeActive(false);
              setIsDemoMode(false);
              loadCaseData(caseId);
            }}
            className="px-2.5 py-1 rounded bg-amber-500/30 hover:bg-amber-500/40 border border-amber-500/50 text-amber-100 transition text-[11px] font-bold"
          >
            Switch to Live Case Mode
          </button>
        </div>
      )}

      {/* Mission Briefing Landing Portal */}
      {currentTab === 'portal' && (
        <LandingPortal
          cases={cases}
          onSelectCase={(cid: string) => {
            setCaseId(cid);
            setCurrentTab('workspace');
          }}
          onEnterWorkspace={() => setCurrentTab('workspace')}
        />
      )}

      {/* Workspace & Grid Views */}
      {currentTab === 'workspace' && (
        <div className="flex flex-col h-full gap-2">
          {/* Top Presentation Stepper Controller */}
          <DemoStorylineController
            caseId={caseId}
            onSelectTab={setCurrentTab}
            onApplyHighlight={handleApplyHighlight}
            onViewEvidence={setViewingEvidenceId}
            onSelectNodeById={(nid) => {
              const node = graphData.nodes.find((n) => n.id === nid);
              if (node) setSelectedNode(node);
            }}
            onExportReport={handleExportReport}
          />

          <div className="grid grid-cols-12 gap-3 flex-1 overflow-hidden">
            {/* Left: Intelligence Tools Panel (3 cols) */}
            <div className="col-span-3 h-full flex flex-col gap-2">
              {/* Tab Selector */}
              <div className="flex bg-black/60 p-1 rounded-xl border border-white/5 shrink-0">
                {['agent', 'audio', 'wiretap', 'path', 'alerts', 'culprits'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setLeftSubTab(tab);
                      setHighlightNodes([]);
                      setHighlightEdges([]);
                    }}
                    className="flex-1 btn-3d py-1.5 text-[9px] font-mono font-bold uppercase tracking-wider rounded-lg transition-all"
                    style={{
                      background: leftSubTab === tab ? 'rgba(6,182,212,0.12)' : 'transparent',
                      border: leftSubTab === tab ? '1px solid rgba(6,182,212,0.3)' : '1px solid transparent',
                      color: leftSubTab === tab ? '#06B6D4' : '#64748B',
                    }}
                  >
                    {tab === 'agent' ? 'Agent' : tab === 'audio' ? 'Audio' : tab === 'wiretap' ? 'Wiretap' : tab === 'path' ? 'Path' : tab === 'alerts' ? 'Alerts' : 'Culprits'}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-hidden min-h-0">
                {leftSubTab === 'agent' && (
                  <div className="h-full flex flex-col min-h-0 overflow-hidden">
                    <AIInvestigatorPanel
                      caseId={caseId}
                      graphData={activeGraphData}
                      onApplyHighlight={handleApplyHighlight}
                      onViewEvidence={setViewingEvidenceId}
                      onNavigateToAudio={() => setLeftSubTab('audio')}
                    />
                  </div>
                )}
                {leftSubTab === 'audio' && (
                  <div className="h-full flex flex-col min-h-0 overflow-hidden">
                    <AudioEvidenceTranscriptPanel
                      caseId={caseId}
                      graphData={activeGraphData}
                      onSelectEntity={(entityName) => {
                        const node = graphData.nodes.find(n => 
                          n.label.toLowerCase().includes(entityName.toLowerCase()) || 
                          n.id.toLowerCase().includes(entityName.toLowerCase())
                        );
                        if (node) setSelectedNode(node);
                      }}
                      onNavigateToInvestigator={() => setLeftSubTab('agent')}
                    />
                  </div>
                )}
                {leftSubTab === 'wiretap' && (
                  <WiretapAudioInspector />
                )}
                {leftSubTab === 'path' && (
                  <PathFinderPanel
                    caseId={caseId}
                    graphData={activeGraphData}
                    onHighlightPath={handleApplyHighlight}
                    onClearHighlight={() => {
                      setHighlightNodes([]);
                      setHighlightEdges([]);
                    }}
                  />
                )}
                {leftSubTab === 'alerts' && (
                  <AlertPanel
                    caseId={caseId}
                    onHighlightPattern={handleApplyHighlight}
                    onClearHighlight={() => {
                      setHighlightNodes([]);
                      setHighlightEdges([]);
                    }}
                  />
                )}
                {leftSubTab === 'culprits' && (
                  <CulpritProfilerPanel
                    caseId={caseId}
                    onFocusNode={(nodeId) => {
                      const node = graphData.nodes.find(n => n.id === nodeId);
                      if (node) setSelectedNode(node);
                    }}
                  />
                )}
              </div>
            </div>

            {/* Center: Graph Canvas with 2D / 3D Mode Toggle & Filter Toolbar (6 cols) */}
            <div className="col-span-6 h-full flex flex-col gap-3 relative">
              {/* 2D / 3D Mode Switcher + Communities Overlay Toggle */}
              <div className="absolute top-3 left-3 z-10 bg-surface/90 backdrop-blur-md p-1 rounded-lg border border-surface-border flex items-center gap-1.5 font-mono text-xs shadow-xl">
                <button
                  onClick={() => setIs3DMode(false)}
                  className={`px-2.5 py-1 rounded transition ${
                    !is3DMode
                      ? 'bg-accent-cyan text-background font-bold shadow-md'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  2D
                </button>
                <button
                  onClick={() => setIs3DMode(true)}
                  className={`px-2.5 py-1 rounded transition flex items-center gap-1 ${
                    is3DMode
                      ? 'bg-accent-cyan text-background font-bold shadow-md'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>3D WebGL</span>
                </button>
                <span className="w-px h-4 bg-white/10" />
                <button
                  onClick={() => setShowCommunities(!showCommunities)}
                  className={`px-2 py-1 rounded transition flex items-center gap-1 ${
                    showCommunities
                      ? 'bg-accent-emerald/20 border border-accent-emerald/40 text-accent-emerald font-bold'
                      : 'text-text-secondary hover:text-text-primary border border-transparent'
                  }`}
                >
                  ⛃ Clusters: {showCommunities ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Filter Toolbar (Movable & Collapsible) */}
              <div className="absolute top-3 right-3 z-30 pointer-events-auto">
                <GraphFilterToolbar
                  minConfidence={minConfidence}
                  onConfidenceChange={setMinConfidence}
                  selectedNodeTypes={selectedNodeTypes}
                  onToggleNodeType={handleToggleNodeType}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  totalNodeCount={graphData.nodes.length}
                  filteredNodeCount={activeGraphData.nodes.length}
                  onResetFilters={() => {
                    setMinConfidence(0.5);
                    setSelectedNodeTypes([]);
                    setSearchQuery('');
                  }}
                />
              </div>

              {/* Graph Canvas Component (2D / 3D Switchable) or Empty / Filtered State */}
              <div className="flex-1 relative">
                {graphData.nodes.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4 bg-black/40 border border-white/5 rounded-xl">
                    <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                      <Database className="w-8 h-8 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-bold font-mono text-white uppercase tracking-wider">
                        Case {caseId} Dossier Ready For Intelligence Ingestion
                      </h3>
                      <p className="text-xs text-slate-400 font-sans max-w-md">
                        No graph nodes or phone intercepts exist yet for this investigation. Ingest CDR call detail logs, SWIFT bank records, or FIR text files to run the forensic analysis engine.
                      </p>
                    </div>
                    <button
                      onClick={() => setIsIngestionOpen(true)}
                      className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold transition flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Ingest Investigation Records</span>
                    </button>
                  </div>
                ) : activeGraphData.nodes.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4 bg-black/50 border border-white/10 rounded-xl backdrop-blur-md">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Filter className="w-8 h-8 animate-pulse" />
                    </div>
                    <div className="space-y-1.5 text-center">
                      <h3 className="text-base font-bold font-mono text-white uppercase tracking-wider">
                        No Entities Match Active Graph Filters
                      </h3>
                      <p className="text-xs text-slate-400 font-sans max-w-md">
                        {graphData.nodes.length} entities are loaded for Case {caseId}, but none match current filter criteria (Confidence ≥ {(minConfidence * 100).toFixed(0)}%{selectedNodeTypes.length > 0 ? `, Types: ${selectedNodeTypes.join(', ')}` : ''}{searchQuery ? `, Search: "${searchQuery}"` : ''}).
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setMinConfidence(0.5);
                        setSelectedNodeTypes([]);
                        setSearchQuery('');
                      }}
                      className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold transition flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Reset Filters</span>
                    </button>
                  </div>
                ) : is3DMode ? (
                  <GraphCanvas3D
                    data={activeGraphData}
                    selectedNodeId={selectedNode?.id}
                    highlightNodeIds={highlightNodes}
                    highlightEdgeIds={highlightEdges}
                    minConfidence={minConfidence}
                    selectedNodeTypes={selectedNodeTypes}
                    searchQuery={searchQuery}
                    onSelectNode={setSelectedNode}
                    onExpandNeighborhood={handleExpandNeighborhood}
                    communities={communities}
                    showCommunities={showCommunities}
                    totalNodeCount={graphData.nodes.length}
                  />
                ) : (
                  <GraphCanvas
                    data={activeGraphData}
                    selectedNodeId={selectedNode?.id}
                    highlightNodeIds={highlightNodes}
                    highlightEdgeIds={highlightEdges}
                    minConfidence={minConfidence}
                    selectedNodeTypes={selectedNodeTypes}
                    searchQuery={searchQuery}
                    layoutName={layoutName}
                    onLayoutChange={setLayoutName}
                    onSelectNode={setSelectedNode}
                    onExpandNeighborhood={handleExpandNeighborhood}
                  />
                )}
              </div>

              {/* Live Intercept Stream Simulator Feed Ticker */}
              <LiveStreamFeed onInjectData={handleInjectStreamData} />
            </div>

            {/* Right: Entity Intelligence Panel (3 cols) */}
            <div className="col-span-3 h-full">
              <EntityIntelligencePanel
                node={selectedNode}
                edges={activeGraphData.edges}
                onClose={() => setSelectedNode(null)}
                onExpand={handleExpandNeighborhood}
              />
            </div>
          </div>
        </div>
      )}

      {/* Priority Assessment Tab */}
      {currentTab === 'investigative_priorities' && (
        <div className="h-full">
          <ErrorBoundary fallbackTitle="Investigative Priority Engine Intercept">
            <InvestigativePriorityPanel
              caseId={caseId}
              onOpenWarrantModal={() => setIsWarrantOpen(true)}
              onOpenIngestionModal={() => setIsIngestionOpen(true)}
            />
          </ErrorBoundary>
        </div>
      )}

      {/* Tactical Solutions Tab: 72h playbook + legal sections (PS: actionable intelligence) */}
      {currentTab === 'police_solutions' && (
        <div className="h-full">
          <ErrorBoundary fallbackTitle="Tactical Solutions Engine Intercept">
            <PoliceSolutionsPanel
              caseId={caseId}
              onOpenWarrantModal={() => setIsWarrantOpen(true)}
              onOpenIngestionModal={() => setIsIngestionOpen(true)}
            />
          </ErrorBoundary>
        </div>
      )}

      {/* Intelligence Analytics Tab: Overview / ML Inspector / Cross-Syndicate Fusion (Plan Phase 2) */}
      {currentTab === 'analytics' && (
        <div className="h-full flex flex-col gap-2">
          <div className="flex bg-black/60 p-1 rounded-xl border border-white/5 shrink-0">
            {['overview', 'ml', 'fusion'].map((sub) => (
              <button
                key={sub}
                onClick={() => setAnalyticsSubTab(sub)}
                className="flex-1 btn-3d py-1.5 text-[9px] font-mono font-bold uppercase tracking-wider rounded-lg transition-all"
                style={{
                  background: analyticsSubTab === sub ? 'rgba(6,182,212,0.12)' : 'transparent',
                  border: analyticsSubTab === sub ? '1px solid rgba(6,182,212,0.3)' : '1px solid transparent',
                  color: analyticsSubTab === sub ? '#06B6D4' : '#64748B',
                }}
              >
                {sub === 'overview' ? 'Analytics Overview' : sub === 'ml' ? 'ML Inspector' : 'Cross-Syndicate Fusion'}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden min-h-0">
            {analyticsSubTab === 'overview' && (
              <AnalyticsDashboard analytics={analyticsData} onSelectNode={handleAnalyticsSelectNode} />
            )}
            {analyticsSubTab === 'ml' && (
              <MLModelInspector
                caseId={caseId}
                onFocusNode={handleAnalyticsSelectNode}
                onApplyHighlight={handleApplyHighlight}
              />
            )}
            {analyticsSubTab === 'fusion' && (
              <CrossSyndicateFusion onSelectCase={(cid) => { setCaseId(cid); setCurrentTab('workspace'); }} />
            )}
          </div>
        </div>
      )}

      {/* Threat Forecast Tab: Markov-chain syndicate phase prediction (PS: suspicious patterns) */}
      {currentTab === 'forecast' && (
        <div className="h-full">
          <ThreatForecastConsole caseId={caseId} />
        </div>
      )}

      {/* Network Canvas Only Tab */}
      {currentTab === 'network' && (
        <div className="h-full relative">
          {/* Floating 2D / 3D toggle in full screen canvas */}
          <div className="absolute top-3 left-3 z-10 bg-surface/90 backdrop-blur-md p-1 rounded-lg border border-surface-border flex items-center gap-1.5 font-mono text-xs shadow-xl">
            <button
              onClick={() => setIs3DMode(false)}
              className={`px-2.5 py-1 rounded transition ${
                !is3DMode
                  ? 'bg-accent-cyan text-background font-bold shadow-md'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              2D
            </button>
            <button
              onClick={() => setIs3DMode(true)}
              className={`px-2.5 py-1 rounded transition flex items-center gap-1 ${
                is3DMode
                  ? 'bg-accent-cyan text-background font-bold shadow-md'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>3D WebGL</span>
            </button>
            <span className="w-px h-4 bg-white/10" />
            <button
              onClick={() => setShowCommunities(!showCommunities)}
              className={`px-2.5 py-1 rounded transition flex items-center gap-1 ${
                showCommunities
                  ? 'bg-accent-emerald/20 border border-accent-emerald/40 text-accent-emerald font-bold'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              ⛃ Communities: {showCommunities ? 'ON' : 'OFF'}
            </button>
          </div>

          {is3DMode ? (
            <GraphCanvas3D
              data={activeGraphData}
              selectedNodeId={selectedNode?.id}
              highlightNodeIds={highlightNodes}
              highlightEdgeIds={highlightEdges}
              onSelectNode={setSelectedNode}
              onExpandNeighborhood={handleExpandNeighborhood}
              communities={communities}
              showCommunities={showCommunities}
            />
          ) : (
            <GraphCanvas
              data={activeGraphData}
              selectedNodeId={selectedNode?.id}
              highlightNodeIds={highlightNodes}
              highlightEdgeIds={highlightEdges}
              onSelectNode={setSelectedNode}
              onExpandNeighborhood={handleExpandNeighborhood}
            />
          )}
        </div>
      )}

      {/* Timeline Tab */}
      {currentTab === 'timeline' && (
        <div className="grid grid-cols-12 gap-3 h-full">
          {/* Timeline Controller Panel */}
          <div className="col-span-4 h-full">
            <TimelineView
              edges={graphData.edges}
              onTimeFilterChange={setMaxTimestamp}
              onSelectEdge={(edge) => {
                const node = graphData.nodes.find(n => n.id === edge.source);
                if (node) setSelectedNode(node);
                setCurrentTab('workspace');
              }}
            />
          </div>

          {/* Connected Time-series Graph View */}
          <div className="col-span-8 h-full bg-slate-950/20 border border-white/5 rounded-xl overflow-hidden relative">
            <GraphCanvas3D
              data={activeGraphData}
              selectedNodeId={selectedNode?.id}
              highlightNodeIds={highlightNodes}
              highlightEdgeIds={highlightEdges}
              minConfidence={minConfidence}
              selectedNodeTypes={selectedNodeTypes}
              searchQuery={searchQuery}
              onSelectNode={setSelectedNode}
              onExpandNeighborhood={handleExpandNeighborhood}
              communities={communities}
              showCommunities={showCommunities}
            />
          </div>
        </div>
      )}

      {/* Geo-Spatial Map Tab */}
      {currentTab === 'geospatial' && (
        <div className="h-full">
          <ErrorBoundary fallbackTitle="Geo-Spatial Radar Intercept">
            <GeoSpatialMapPanel
              caseId={caseId}
              nodes={graphData.nodes}
              onSelectNode={(nid) => {
                const node = graphData.nodes.find(n => n.id === nid);
                if (node) setSelectedNode(node);
                setCurrentTab('workspace');
              }}
            />
          </ErrorBoundary>
        </div>
      )}

      {/* Forensic Chain-of-Custody Ledger Tab */}
      {currentTab === 'ledger' && (
        <div className="h-full">
          <EvidenceLedger
            caseId={caseId}
          />
        </div>
      )}

      {/* Evidence Viewer Modal */}
      <EvidenceViewer
        evidenceId={viewingEvidenceId}
        onClose={() => setViewingEvidenceId(null)}
      />

      {/* Drag & Drop Ingestion Modal */}
      <IngestionModal
        caseId={caseId}
        isOpen={isIngestionOpen}
        onClose={() => setIsIngestionOpen(false)}
        onIngestionComplete={() => loadCaseData(caseId)}
      />

      {/* Audit Log Trail Modal */}
      <AuditLogViewer
        caseId={caseId}
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
      />

      {/* Court Arrest Warrant Generator Modal */}
      {isWarrantOpen && (
        <WarrantGeneratorModal
          suspects={graphData.nodes.filter(n => n.type === 'PERSON')}
          onClose={() => setIsWarrantOpen(false)}
        />
      )}


      {/* Voice Briefing Audio Modal */}
      <AudioBriefingModal
        caseId={caseId}
        isOpen={isBriefingOpen}
        onClose={() => setIsBriefingOpen(false)}
      />

      {/* Case Management Hub Modal */}
      <CaseManagerModal
        isOpen={isCaseManagerOpen}
        onClose={() => setIsCaseManagerOpen(false)}
        cases={cases}
        activeCaseId={caseId}
        onSelectCase={(cid) => {
          setCaseId(cid);
          loadCaseData(cid);
        }}
        onCreateCase={handleCreateCase}
        onDeleteCase={handleDeleteCase}
        onOpenIngestion={() => setIsIngestionOpen(true)}
      />
    </AppShell>
    </>
  );
};
export default App;
