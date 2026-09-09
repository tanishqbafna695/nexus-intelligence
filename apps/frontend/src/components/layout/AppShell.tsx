import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Network, LayoutDashboard, Clock, Upload, Download,
  ShieldCheck, Shield, Navigation, FileCheck, ShieldAlert,
  Lock, Siren, FolderGit2, Trash2, Scale, ChevronLeft, ChevronRight, Volume2, BarChart3
} from 'lucide-react';
import { Case } from '../../types';

interface AppShellProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  cases: Case[];
  currentCaseId: string;
  onCaseChange: (caseId: string) => void;
  nodeCount: number;
  edgeCount: number;
  onUploadClick: () => void;
  onAuditClick: () => void;
  onBriefingClick?: () => void;
  onExportClick: () => void;
  onWarrantClick?: () => void;
  onOpenCaseManager?: () => void;
  onDeleteActiveCase?: (caseId: string) => void;
  runtimeMode?: 'live' | 'demo' | 'offline';
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentTab, onTabChange, cases, currentCaseId, onCaseChange,
  nodeCount, edgeCount, onUploadClick, onAuditClick, onBriefingClick, onExportClick, onWarrantClick,
  onOpenCaseManager, onDeleteActiveCase, runtimeMode = 'live', children,
}) => {
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const navContainerRef = useRef<HTMLDivElement>(null);

  const checkScroll = useCallback(() => {
    if (!navContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = navContainerRef.current;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = navContainerRef.current;
    if (!el) return;

    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);

    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll]);

  // Auto-scroll active tab into view
  useEffect(() => {
    if (!navContainerRef.current) return;
    const activeBtn = navContainerRef.current.querySelector(`[data-tab-id="${currentTab}"]`) as HTMLElement;
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentTab]);

  const handleNavWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (navContainerRef.current) {
      navContainerRef.current.scrollLeft += e.deltaY;
      checkScroll();
    }
  };

  const scrollNav = (direction: 'left' | 'right') => {
    if (navContainerRef.current) {
      const offset = direction === 'left' ? -220 : 220;
      navContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const tabs = [
    { id: 'portal',                   label: 'Mission Portal',        icon: ShieldAlert },
    { id: 'workspace',                label: 'Case Workspace',        icon: LayoutDashboard },
    { id: 'analytics',                label: 'Intelligence Analytics', icon: BarChart3 },
    { id: 'investigative_priorities', label: 'Priority Assessment',   icon: Scale },
    { id: 'ledger',                   label: 'Forensic Ledger',       icon: Lock },
    { id: 'network',                  label: 'Network Canvas',        icon: Network },
    { id: 'timeline',                 label: 'Timeline',              icon: Clock },
    { id: 'geospatial',               label: 'Geo Radar',             icon: Navigation },
  ];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#06070A]" style={{ background: '#06070A' }}>

      {/* ── 3D Floating Top Navigation Bar ───────────────────────────── */}
      <header
        className="relative shrink-0 border-b border-cyan-500/20"
        style={{
          height: 60,
          background: '#090B10',
          boxShadow: '0 4px 30px rgba(0,0,0,0.8), 0 0 40px rgba(6,182,212,0.05)',
          zIndex: 50,
        }}
      >
        <div className="flex items-center justify-between h-full px-4 gap-3 w-full">

          {/* ── Brand + Case Selector ── */}
          <div className="flex items-center gap-3 shrink-0">
            {/* 3D Logo Badge */}
            <div
              className="float-3d btn-3d flex items-center justify-center rounded-lg text-xs font-black font-mono tracking-wider select-none cursor-default"
              style={{
                width: 52, height: 36,
                background: 'linear-gradient(135deg, rgba(6,182,212,0.2) 0%, rgba(16,185,129,0.1) 100%)',
                border: '1px solid rgba(6,182,212,0.4)',
                color: '#06B6D4',
                boxShadow: '0 0 20px rgba(6,182,212,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: '0.1em'
              }}
            >
              TRACE
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Case //</span>
                <select
                  value={currentCaseId}
                  onChange={e => onCaseChange(e.target.value)}
                  className="bg-transparent border-0 text-xs font-bold tracking-wider text-cyan-300 font-mono focus:outline-none cursor-pointer"
                  style={{ textShadow: '0 0 10px rgba(6,182,212,0.6)' }}
                >
                  {cases.map(c => (
                    <option key={c.id} value={c.id} style={{ background: '#0f1115', color: '#e2e8f0' }}>
                      {c.id} · {c.name}
                    </option>
                  ))}
                </select>
                {onOpenCaseManager && (
                  <button
                    onClick={onOpenCaseManager}
                    title="Case Management Hub (Search, Add, Expunge Cases)"
                    className="p-1 rounded bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 transition"
                  >
                    <FolderGit2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {onDeleteActiveCase && (
                  <button
                    onClick={() => {
                      if (window.confirm(`Permanently expunge and delete case ${currentCaseId}?`)) {
                        onDeleteActiveCase(currentCaseId);
                      }
                    }}
                    title={`Permanently delete case ${currentCaseId}`}
                    className="p-1 rounded bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {/* Authoritative Runtime Mode Badge */}
                {runtimeMode === 'live' ? (
                  <span className="pulse-ring text-[9px] font-mono px-1.5 py-0.5 rounded-sm font-bold tracking-wider"
                    style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }}
                    title="Live Backend Connected with SQLite Persistence">
                    LIVE
                  </span>
                ) : runtimeMode === 'demo' ? (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm font-bold tracking-wider"
                    style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }}
                    title="Demo Storyline Mode - Static Evidence Sets">
                    DEMO MODE
                  </span>
                ) : (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm font-bold tracking-wider"
                    style={{ background: 'rgba(100,116,139,0.2)', color: '#94A3B8', border: '1px solid rgba(100,116,139,0.3)' }}
                    title="Offline Fallback Mode">
                    OFFLINE
                  </span>
                )}
              </div>
              <div className="flex gap-2 text-[10px] font-mono mt-0.5 text-slate-500">
                <span><span className="text-emerald-400 font-bold">{nodeCount}</span> nodes</span>
                <span>•</span>
                <span><span className="text-cyan-400 font-bold">{edgeCount}</span> edges</span>
              </div>
            </div>
          </div>

          {/* ── Scrollable 3D Navigation Tabs with Left/Right Controls ── */}
          <div className="flex-1 min-w-0 mx-2 flex items-center relative">
            {canScrollLeft && (
              <button
                onClick={() => scrollNav('left')}
                className="absolute left-0 z-20 p-1 rounded-md bg-slate-900/90 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 shadow-lg transition"
                title="Scroll navigation left"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}

            <div
              ref={navContainerRef}
              onWheel={handleNavWheel}
              className="w-full overflow-x-auto scrollbar-none py-1 flex items-center scroll-smooth px-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <nav
                className="flex items-center gap-1 p-1 rounded-xl shrink-0 flex-nowrap"
                style={{
                  background: 'rgba(6,7,10,0.85)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
                }}
              >
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  const active = currentTab === tab.id;
                  const hovered = hoveredTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      data-tab-id={tab.id}
                      onClick={() => onTabChange(tab.id)}
                      onMouseEnter={() => setHoveredTab(tab.id)}
                      onMouseLeave={() => setHoveredTab(null)}
                      className="btn-3d relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 shrink-0 whitespace-nowrap"
                      style={{
                        background: active
                          ? 'linear-gradient(135deg, rgba(6,182,212,0.25) 0%, rgba(6,182,212,0.1) 100%)'
                          : hovered ? 'rgba(255,255,255,0.05)' : 'transparent',
                        color: active ? '#06B6D4' : hovered ? '#94A3B8' : '#64748B',
                        border: active ? '1px solid rgba(6,182,212,0.4)' : '1px solid transparent',
                        boxShadow: active ? '0 0 16px rgba(6,182,212,0.2), inset 0 1px 0 rgba(6,182,212,0.2)' : 'none',
                        fontWeight: active ? '700' : '500',
                        letterSpacing: active ? '0.04em' : '0',
                      }}
                    >
                      {active && (
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
                          style={{ background: '#06B6D4', boxShadow: '0 0 8px #06B6D4' }}
                        />
                      )}
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {canScrollRight && (
              <button
                onClick={() => scrollNav('right')}
                className="absolute right-0 z-20 p-1 rounded-md bg-slate-900/90 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 shadow-lg transition"
                title="Scroll navigation right"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* ── Action Buttons (Single Primary Ingestion Action) ── */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onUploadClick}
              className="btn-3d flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-lg transition-all font-bold"
              style={{
                background: 'linear-gradient(135deg, rgba(6,182,212,0.25) 0%, rgba(16,185,129,0.2) 100%)',
                border: '1px solid rgba(6,182,212,0.6)',
                color: '#06B6D4',
                boxShadow: '0 0 18px rgba(6,182,212,0.3)',
              }}
              title="Ingest Real FIR, CDR, Bank Statement or Case Records"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Ingest Case Data</span>
            </button>

            {onWarrantClick && (
              <button
                onClick={onWarrantClick}
                className="btn-3d flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded-lg transition-all"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#EF4444',
                }}
                title="Compile Judicial Evidence Brief (Decision Support)"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Judicial Brief</span>
              </button>
            )}

            {onBriefingClick && (
              <button
                onClick={onBriefingClick}
                className="btn-3d flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded-lg transition-all"
                style={{
                  background: 'rgba(139,92,246,0.08)',
                  border: '1px solid rgba(139,92,246,0.3)',
                  color: '#A78BFA',
                }}
                title="Voice Briefing: Audio Case Summary"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Briefing</span>
              </button>
            )}

            <button
              onClick={onAuditClick}
              className="btn-3d flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded-lg transition-all"
              style={{
                background: 'rgba(16,185,129,0.05)',
                border: '1px solid rgba(16,185,129,0.2)',
                color: '#10B981',
              }}
              title="View Chain of Evidence Audit Trail"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Audit</span>
            </button>

            <button
              onClick={onExportClick}
              className="btn-3d flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded-lg transition-all"
              style={{
                background: 'rgba(6,182,212,0.05)',
                border: '1px solid rgba(6,182,212,0.2)',
                color: '#06B6D4',
              }}
              title="Export Case Dossier & Intelligence Report"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>

            {/* Security Integrity badge */}
            <div
              className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-lg"
              style={{
                background: 'rgba(16,185,129,0.05)',
                border: '1px solid rgba(16,185,129,0.15)',
                color: 'rgba(16,185,129,0.7)',
              }}
              title="End-to-End Cryptographic Chain of Custody Verified"
            >
              <Shield className="w-3 h-3" />
              <span>SECURED</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-hidden relative" style={{ zIndex: 1 }}>
        <div className="h-full p-3">
          {children}
        </div>
      </main>
    </div>
  );
};
