import React, { useEffect, useState } from 'react';
import { ShieldAlert, Fingerprint, UserCheck, HeartCrack, Skull, HelpCircle, Activity, Heart } from 'lucide-react';
import { fetchCulpritAnalysis } from '../../services/api';

interface Suspect {
  id: string;
  name: string;
  role: string;
  personality: string;
  mental_state: string;
  alibi_validity: number;
  forensics: {
    fingerprints_found: boolean;
    dna_match: boolean;
    celltower_intersections: number;
  };
  activity_metrics: {
    yearly_call_variance: number;
    critical_year_spikes: number;
  };
  guilt_probability: number;
  reasons: string[];
}

interface Rivalry {
  source_id: string;
  source_name: string;
  target_id: string;
  target_name: string;
  type: string;
}

interface CulpritProfilerPanelProps {
  caseId: string;
  onFocusNode: (nodeId: string) => void;
}

export const CulpritProfilerPanel: React.FC<CulpritProfilerPanelProps> = ({
  caseId,
  onFocusNode,
}) => {
  const [suspects, setSuspects] = useState<Suspect[]>([]);
  const [rivalries, setRivalries] = useState<Rivalry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSuspect, setSelectedSuspect] = useState<Suspect | null>(null);

  const loadAnalysis = async () => {
    setLoading(true);
    try {
      const data = await fetchCulpritAnalysis(caseId);
      setSuspects(data.suspects);
      setRivalries(data.rivalry_network);
      if (data.suspects.length > 0) {
        setSelectedSuspect(data.suspects[0]);
      }
    } catch (err) {
      console.error('Failed to load culprit analysis', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalysis();
  }, [caseId]);

  return (
    <div
      className="card-3d panel-depth h-full rounded-xl overflow-hidden flex flex-col"
      style={{
        background: 'linear-gradient(180deg, rgba(8,9,11,0.95) 0%, rgba(6,7,10,0.98) 100%)',
        border: '1px solid rgba(6,182,212,0.15)',
        boxShadow: '0 0 50px rgba(6,182,212,0.06), inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      {/* Header */}
      <div
        className="relative flex items-center gap-2.5 px-4 py-3 shrink-0 scanlines"
        style={{
          background: 'linear-gradient(90deg, rgba(6,182,212,0.08) 0%, transparent 100%)',
          borderBottom: '1px solid rgba(6,182,212,0.12)',
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-px holo opacity-50" />
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center pulse-ring"
          style={{
            background: 'rgba(6,182,212,0.1)',
            border: '1px solid rgba(6,182,212,0.3)',
            boxShadow: '0 0 16px rgba(6,182,212,0.2)',
          }}
        >
          <Fingerprint className="w-4 h-4 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-xs font-bold tracking-widest text-cyan-300 uppercase font-mono"
            style={{ textShadow: '0 0 12px rgba(6,182,212,0.5)' }}>
            Investigative Priority Matrix
          </h2>
          <p className="text-[10px] font-mono text-slate-400">Forensics, Multi-Source Corroboration & Network Prominence</p>
        </div>
      </div>

      <div className="px-3 py-1.5 bg-cyan-950/30 border-y border-cyan-500/20 text-[9px] font-mono text-slate-400 shrink-0 flex items-center gap-1.5">
        <span className="text-cyan-400 font-bold">⚖️ DECISION SUPPORT:</span>
        <span>Scores reflect topological prominence and multi-source corroboration, not judicial proof of guilt.</span>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-xs font-mono text-slate-600">
          <Activity className="w-6 h-6 animate-spin text-cyan-500 mb-2" />
          <span>Computing Bayesian probability distribution...</span>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-12 overflow-hidden">
          
          {/* Left Column: Suspect list (5 cols) */}
          <div className="col-span-5 border-r border-white/5 flex flex-col overflow-y-auto p-3 space-y-2">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest px-1">
              Suspect List (Priority Ordered)
            </span>
            {suspects.map(suspect => {
              const isSelected = selectedSuspect?.id === suspect.id;
              const isTopPriority = suspect.guilt_probability >= 80;
              return (
                <button
                  key={suspect.id}
                  onClick={() => {
                    setSelectedSuspect(suspect);
                    onFocusNode(suspect.id);
                  }}
                  className="btn-3d text-left rounded-xl p-3 border relative overflow-hidden transition-all duration-300 flex items-center justify-between"
                  style={{
                    background: isSelected ? 'rgba(6,182,212,0.05)' : 'rgba(255,255,255,0.01)',
                    borderColor: isSelected 
                      ? (isTopPriority ? '#EF4444' : '#06B6D4')
                      : 'rgba(255,255,255,0.04)',
                    boxShadow: isSelected 
                      ? `0 0 20px ${isTopPriority ? 'rgba(239,68,68,0.1)' : 'rgba(6,182,212,0.1)'}` 
                      : 'none',
                  }}
                >
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-slate-200 truncate">{suspect.name}</h3>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{suspect.role}</p>
                  </div>

                  <div className="text-right flex-shrink-0 ml-2">
                    <span 
                      className="text-xs font-mono font-black"
                      style={{ 
                        color: isTopPriority ? '#EF4444' : (suspect.guilt_probability >= 50 ? '#F59E0B' : '#10B981'),
                        textShadow: isTopPriority ? '0 0 10px rgba(239,68,68,0.4)' : 'none'
                      }}
                    >
                      {suspect.guilt_probability}%
                    </span>
                    <p className="text-[9px] font-mono text-slate-600">Priority</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Suspect Details & Inculpatory evidence (7 cols) */}
          <div className="col-span-7 flex flex-col overflow-y-auto p-4 space-y-4">
            {selectedSuspect ? (
              <>
                {/* Header info */}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-200">{selectedSuspect.name}</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400">
                      {selectedSuspect.role}
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-slate-600 mt-0.5">Suspect Profiler ID: {selectedSuspect.id}</p>
                </div>

                {/* Grid metrics */}
                <div className="grid grid-cols-2 gap-3 text-[11px] font-mono">
                  <div className="p-3 bg-white/1 rounded-xl border border-white/5">
                    <span className="text-slate-500 block mb-1">Personality Profile</span>
                    <span className="text-slate-300 font-bold block">{selectedSuspect.personality}</span>
                  </div>
                  <div className="p-3 bg-white/1 rounded-xl border border-white/5">
                    <span className="text-slate-500 block mb-1">Mental State Evaluator</span>
                    <span className="text-slate-300 font-bold block">{selectedSuspect.mental_state}</span>
                  </div>
                </div>

                {/* Priority bar gauge */}
                <div className="p-3 bg-white/1 rounded-xl border border-white/5 space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-slate-400 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Investigative Priority Score</span>
                    <span className="font-bold text-red-400 text-glow-cyan">{selectedSuspect.guilt_probability}% priority rating</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-700"
                      style={{ 
                        width: `${selectedSuspect.guilt_probability}%`,
                        background: 'linear-gradient(90deg, #10B981 0%, #F59E0B 50%, #EF4444 100%)',
                        boxShadow: '0 0 10px rgba(239,68,68,0.5)'
                      }}
                    />
                  </div>
                </div>

                {/* Forensic details */}
                <div className="space-y-2">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                    Evidentiary Chronological Analysis
                  </span>
                  
                  <div className="card-3d p-3 rounded-xl border border-white/5 bg-white/1 space-y-2 text-[11px] font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500">DNA Traces Match:</span>
                      <span className={selectedSuspect.forensics.dna_match ? 'text-red-400 font-bold' : 'text-slate-600'}>
                        {selectedSuspect.forensics.dna_match ? 'MATCHED' : 'NO MATCH'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">ev. Crates Fingerprints:</span>
                      <span className={selectedSuspect.forensics.fingerprints_found ? 'text-red-400 font-bold' : 'text-slate-600'}>
                        {selectedSuspect.forensics.fingerprints_found ? 'DETECTED' : 'UNDETECTED'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cell-tower Spatial Intersects:</span>
                      <span className="text-cyan-400 font-bold">
                        {selectedSuspect.forensics.celltower_intersections} occurrences
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Alibi Verification Rating:</span>
                      <span 
                        className="font-bold"
                        style={{ color: selectedSuspect.alibi_validity >= 0.7 ? '#10B981' : (selectedSuspect.alibi_validity >= 0.4 ? '#F59E0B' : '#EF4444') }}
                      >
                        {(selectedSuspect.alibi_validity * 100).toFixed(0)}% Solid
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Activity Call Variance (CDR):</span>
                      <span className="text-cyan-400 font-bold">{selectedSuspect.activity_metrics.yearly_call_variance.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* Evidence timeline logs */}
                <div className="space-y-2">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                    Corroborated Evidentiary Indicators
                  </span>
                  <div className="space-y-1.5">
                    {selectedSuspect.reasons.map((reason, i) => (
                      <div 
                        key={i}
                        className="p-2.5 rounded-lg border border-white/5 text-[11px] font-mono text-slate-400 flex items-start gap-2"
                        style={{ background: 'rgba(255,255,255,0.01)' }}
                      >
                        <Skull className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suspect Rivalries target list */}
                {rivalries.filter(r => r.source_id === selectedSuspect.id).length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                      Known Suspect Hostility Targets
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {rivalries.filter(r => r.source_id === selectedSuspect.id).map((r, i) => (
                        <div 
                          key={i}
                          className="px-2.5 py-1 rounded-lg border border-red-500/20 text-[10px] font-mono text-red-400 flex items-center gap-1.5"
                          style={{ background: 'rgba(239,68,68,0.05)' }}
                        >
                          <HeartCrack className="w-3 h-3 text-red-500" />
                          <span>Hostile towards: <b>{r.target_name}</b></span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-600 font-mono text-xs">
                <HelpCircle className="w-8 h-8 mb-2 opacity-30" />
                <span>Select a suspect on the left to review telemetry profile analysis.</span>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};
