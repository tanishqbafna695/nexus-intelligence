import React, { useState, useEffect } from 'react';
import {
  Scale, AlertTriangle, FileText, CheckCircle2,
  RefreshCw, Lock, Database, ShieldAlert,
  Search, ExternalLink, HelpCircle, Network
} from 'lucide-react';
import { fetchPoliceSolutions } from '../../services/api';

interface InvestigativePriorityPanelProps {
  caseId: string;
  onOpenWarrantModal?: () => void;
  onOpenIngestionModal?: () => void;
}

export const InvestigativePriorityPanel: React.FC<InvestigativePriorityPanelProps> = ({
  caseId,
  onOpenWarrantModal,
  onOpenIngestionModal
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTarget, setSelectedTarget] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchPoliceSolutions(caseId);
      setData(res);
      const targets = res?.priority_targets || res?.hvt_priority_targets || [];
      if (targets.length > 0) {
        setSelectedTarget(targets[0]);
      }
    } catch (err) {
      console.error('Error fetching investigative priorities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [caseId]);

  if (loading) {
    return (
      <div className="h-full card-3d rounded-xl flex flex-col items-center justify-center p-8 text-xs font-mono text-cyan-400 gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
        <div className="tracking-widest uppercase animate-pulse">
          Computing Calibrated Priority Assessments & Corroboration Metrics...
        </div>
      </div>
    );
  }

  const targets: any[] = data?.priority_targets || data?.hvt_priority_targets || [];
  const resilienceHypotheses: any[] = data?.network_resilience_hypotheses || data?.takedown_bottlenecks || [];
  const directives: any[] = data?.investigative_directives || data?.actionable_directives || [];

  if (data?.status === 'AWAITING_INGESTION' || targets.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="card-3d max-w-lg w-full p-8 rounded-2xl border border-white/10 bg-surface/95 shadow-2xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
            <Database className="w-7 h-7 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold font-mono text-white uppercase tracking-wider">
              No Data Ingested for Case {caseId}
            </h3>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              The Investigative Priority Assessment Engine requires ingested case records (CDR telecom logs, bank transactions, ANPR sightings, or FIR transcripts) to compute evidence-backed priority rankings.
            </p>
          </div>
          <button
            onClick={onOpenIngestionModal}
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold transition flex items-center gap-2 mx-auto shadow-[0_0_20px_rgba(6,182,212,0.3)]"
          >
            <span>Ingest Investigation Records Now</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-3 font-sans overflow-hidden p-1">
      {/* ── Top Header HUD ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between card-3d p-4 rounded-xl border border-white/10 bg-surface/90 shadow-xl gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold font-mono text-slate-100 uppercase tracking-wider">
                Investigative Priority Assessment
              </h2>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                DECISION SUPPORT
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Calibrated Topological Priority & Evidentiary Corroboration for Case {caseId}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onOpenWarrantModal && (
            <button
              onClick={onOpenWarrantModal}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold flex items-center gap-1.5 transition"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Judicial Application Brief</span>
            </button>
          )}
          <button
            onClick={loadData}
            title="Re-evaluate Case Graph"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-cyan-400 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mandatory Statutory Disclaimer Notice */}
      <div className="px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center gap-2">
        <ShieldAlert className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span>
          <strong className="text-slate-300">OPERATIONAL NOTICE:</strong> Decision support only. Scores reflect topological prominence and multi-source corroboration, not proof of guilt. All statutory suggestions require independent prosecutorial consultation.
        </span>
      </div>

      {/* ── Main Content Grid ─────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-12 gap-3 overflow-hidden">
        {/* Left Column: Priority Roster & Network Resilience (5 cols) */}
        <div className="col-span-5 h-full flex flex-col gap-3 overflow-hidden">
          {/* Priority Targets List */}
          <div className="card-3d p-4 rounded-xl border border-white/10 bg-surface/95 flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
              <span className="text-xs font-mono font-bold text-cyan-300 uppercase flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-cyan-400" />
                Investigative Priority Roster ({targets.length})
              </span>
              <span className="text-[10px] font-mono text-slate-500">Ranked by Topological Evidence Nexus</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {targets.map((target) => {
                const targetId = target.person_id || target.target_id;
                const isSelected = (selectedTarget?.person_id || selectedTarget?.target_id) === targetId;
                const score = target.priority_score ?? target.culpability_score ?? 50;
                const supportScore = target.evidence_support_score ?? 70;

                return (
                  <div
                    key={targetId}
                    onClick={() => setSelectedTarget(target)}
                    className={`p-3 rounded-xl border cursor-pointer transition flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                        : 'bg-black/40 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-white truncate">
                        {target.name || target.target_name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                          Priority: {score}%
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-cyan-300 font-mono font-semibold">
                      {target.role_hypothesis || target.operational_role}
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-white/5">
                      <span>Support: {supportScore}%</span>
                      <span>{target.direct_connections_count || 0} Direct Links</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Network Resilience Hypotheses Card */}
          <div className="card-3d p-4 rounded-xl border border-white/10 bg-surface/95 max-h-48 overflow-y-auto">
            <span className="text-xs font-mono font-bold text-amber-300 uppercase flex items-center gap-1.5 mb-2">
              <Lock className="w-4 h-4 text-amber-400" />
              Network Resilience Hypotheses ({resilienceHypotheses.length})
            </span>
            <div className="space-y-2">
              {resilienceHypotheses.map((b, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs font-mono space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-200">{b.label}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 uppercase">ARTICULATION POINT</span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                    {b.hypothesis || b.disruption_impact}
                  </p>
                  {b.verification_check && (
                    <p className="text-[10px] text-amber-300/80 font-mono italic">
                      Check: {b.verification_check}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Selected Target Dossier & Directives (7 cols) */}
        <div className="col-span-7 h-full flex flex-col gap-3 overflow-y-auto pr-1">
          {selectedTarget ? (
            <>
              {/* Target Detail Card */}
              <div className="card-3d p-5 rounded-xl border border-white/10 bg-surface/95 space-y-4">
                <div className="flex items-start justify-between border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-base font-bold font-mono text-white">
                      {selectedTarget.name || selectedTarget.target_name}
                    </h3>
                    <p className="text-xs text-cyan-400 font-mono mt-0.5">
                      {selectedTarget.role_hypothesis || selectedTarget.operational_role}
                    </p>
                  </div>
                </div>

                {/* Centrality Metrics HUD */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Degree Centrality</span>
                    <div className="text-sm font-bold font-mono text-cyan-300 mt-1">
                      {selectedTarget.centrality_metrics?.degree ?? '0.00'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Betweenness Brokerage</span>
                    <div className="text-sm font-bold font-mono text-amber-300 mt-1">
                      {selectedTarget.centrality_metrics?.betweenness ?? '0.00'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Evidence Corroboration</span>
                    <div className="text-sm font-bold font-mono text-emerald-400 mt-1">
                      {selectedTarget.corroboration_sources?.length || 1} Document(s)
                    </div>
                  </div>
                </div>

                {/* Hypotheses */}
                <div className="space-y-2">
                  <span className="text-xs font-mono font-bold text-slate-300 uppercase">
                    Investigative Hypotheses
                  </span>
                  <ul className="space-y-1 text-xs text-slate-300 font-sans">
                    {(selectedTarget.hypotheses || [selectedTarget.recommended_action]).map((h: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-cyan-400 font-mono">•</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Statutory Review Items */}
                <div className="space-y-2">
                  <span className="text-xs font-mono font-bold text-slate-300 uppercase">
                    Statutory Provisions for Prosecutorial Review
                  </span>
                  <div className="space-y-1.5">
                    {(selectedTarget.statutory_review_items || ["Section 91 CrPC: Production of documents"]).map((item: string, idx: number) => (
                      <div key={idx} className="p-2 rounded bg-black/30 border border-white/5 text-[11px] font-mono text-slate-400 flex items-start gap-2">
                        <Scale className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actionable Follow-Up Directives */}
              <div className="card-3d p-4 rounded-xl border border-white/10 bg-surface/95 space-y-3">
                <span className="text-xs font-mono font-bold text-cyan-300 uppercase flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  Recommended Investigative Inquiries ({directives.length})
                </span>
                <div className="space-y-2">
                  {directives.map((dir, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1.5 text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{dir.directive_id || `INQUIRY-${idx+1}`}</span>
                        <span className="text-[10px] text-cyan-400">{dir.legal_framework}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 font-sans">{dir.action}</p>
                      {dir.requires_legal_review && (
                        <div className="text-[10px] text-amber-400 font-mono">
                          Requires prosecutor consultation before issuance.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="card-3d p-8 rounded-xl border border-white/10 bg-surface/95 text-center text-xs font-mono text-slate-500">
              Select an entity from the Priority Roster to inspect evidentiary details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default InvestigativePriorityPanel;
