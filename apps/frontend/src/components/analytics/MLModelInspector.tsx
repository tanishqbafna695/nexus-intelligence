import React, { useState, useEffect } from 'react';
import {
  Cpu, Network, GitCommit, CheckCircle2, TrendingUp, AlertTriangle,
  Play, RefreshCw, BarChart2, ShieldAlert, Layers, Hash, Zap, ArrowRight,
  Database, Activity, Sparkles
} from 'lucide-react';
import {
  fetchMLPerformanceMetrics,
  fetchLinkPredictions,
  fetchLaunderingCycles,
  fetchNetworkVulnerability,
  trainDataset
} from '../../services/api';

interface MLModelInspectorProps {
  caseId: string;
  onFocusNode?: (nodeId: string) => void;
  onApplyHighlight?: (nodeIds: string[], edgeIds: string[]) => void;
}

export const MLModelInspector: React.FC<MLModelInspectorProps> = ({
  caseId,
  onFocusNode,
  onApplyHighlight,
}) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [linkPredictions, setLinkPredictions] = useState<any[]>([]);
  const [launderingCycles, setLaunderingCycles] = useState<any[]>([]);
  const [vulnerability, setVulnerability] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeMLTab, setActiveMLTab] = useState<'LINKS' | 'CYCLES' | 'VULNERABILITY' | 'TRAINER'>('LINKS');
  const [trainingStatus, setTrainingStatus] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [mRes, lRes, cRes, vRes] = await Promise.all([
        fetchMLPerformanceMetrics(caseId),
        fetchLinkPredictions(caseId, 10),
        fetchLaunderingCycles(caseId),
        fetchNetworkVulnerability(caseId),
      ]);
      setMetrics(mRes);
      setLinkPredictions(lRes);
      setLaunderingCycles(cRes);
      setVulnerability(vRes);
    } catch (err) {
      console.error('Failed to load ML model telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [caseId]);

  const handleSimulateBatchTraining = async (datasetType: string) => {
    setTrainingStatus(`Ingesting & calibrating on ${datasetType} records...`);
    try {
      const res = await trainDataset(caseId, datasetType, [
        { sample_field: "telemetry_01", confidence: 0.99 },
        { sample_field: "telemetry_02", confidence: 0.95 }
      ]);
      setTrainingStatus(`✅ ${res.message}`);
      setTimeout(() => setTrainingStatus(null), 4000);
      loadData();
    } catch (err) {
      setTrainingStatus("❌ Training batch failed");
    }
  };

  if (loading || !metrics) {
    return (
      <div className="h-full card-3d rounded-xl flex items-center justify-center p-8 text-xs font-mono text-cyan-400 animate-pulse">
        <Activity className="w-5 h-5 animate-spin mr-2" />
        Running Topological Graph Neural & Bayesian Belief Network Mathematical Inference...
      </div>
    );
  }

  const dMetrics = metrics.dataset_validation_metrics;

  return (
    <div className="h-full flex flex-col gap-3 font-sans overflow-hidden p-1">
      {/* ── Top Header HUD ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between card-3d p-3 rounded-xl border border-white/5 bg-surface/90">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(0,210,255,0.3)]">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[9px] font-bold border border-cyan-500/40">
                PRO-ML ENGINE v3.5
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">MATHEMATICALLY CALIBRATED</span>
            </div>
            <h2 className="text-sm font-bold font-mono text-slate-100 uppercase tracking-wider">
              Machine Learning & Topological Prediction Lab ({caseId})
            </h2>
          </div>
        </div>

        {/* Sub-Tab Navigation Bar */}
        <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-xl border border-white/10 font-mono text-xs">
          {[
            { id: 'LINKS', label: 'Link Prediction', count: linkPredictions.length },
            { id: 'CYCLES', label: 'Laundering Loops', count: launderingCycles.length },
            { id: 'VULNERABILITY', label: 'Cut-Vertices', count: vulnerability?.total_cut_vertices || 0 },
            { id: 'TRAINER', label: 'Dataset Trainer', count: null },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveMLTab(t.id as any)}
              className={`px-3 py-1 rounded-lg transition text-[11px] font-bold flex items-center gap-1.5 ${
                activeMLTab === t.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(0,210,255,0.2)]'
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              <span>{t.label}</span>
              {t.count !== null && (
                <span className="px-1.5 py-0.2 rounded bg-white/10 text-[9px] text-cyan-400">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Key Mathematical Metric Cards ─────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 shrink-0 font-mono">
        <div className="card-3d p-3 rounded-xl border border-white/5 bg-surface/90 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
            <BarChart2 className="w-3.5 h-3.5 text-cyan-400" /> ROC-AUC Score
          </span>
          <div className="text-xl font-bold text-cyan-300">
            {(dMetrics.roc_auc_score * 100).toFixed(1)}%
          </div>
          <span className="text-[9px] text-slate-400 block">Mann-Whitney Wilcoxon Index</span>
        </div>

        <div className="card-3d p-3 rounded-xl border border-white/5 bg-surface/90 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Precision @ Top-3
          </span>
          <div className="text-xl font-bold text-emerald-400">
            {(dMetrics.precision_at_3 * 100).toFixed(1)}%
          </div>
          <span className="text-[9px] text-slate-400 block">Suspect Ranking Precision</span>
        </div>

        <div className="card-3d p-3 rounded-xl border border-white/5 bg-surface/90 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-purple-400" /> Brier Calibration Loss
          </span>
          <div className="text-xl font-bold text-purple-300">
            {dMetrics.brier_calibration_loss}
          </div>
          <span className="text-[9px] text-emerald-400 block">Optimal Calibration (&lt; 0.10)</span>
        </div>

        <div className="card-3d p-3 rounded-xl border border-white/5 bg-surface/90 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
            <Network className="w-3.5 h-3.5 text-amber-400" /> Network Resilience
          </span>
          <div className="text-xl font-bold text-amber-300">
            {vulnerability?.network_resilience_index}%
          </div>
          <span className="text-[9px] text-slate-400 block">
            {vulnerability?.total_cut_vertices} Articulation Cut-Points
          </span>
        </div>
      </div>

      {/* ── Active Tab Display Area ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pr-1 min-h-[300px]">
        {/* Tab 1: Topological Link Predictions */}
        {activeMLTab === 'LINKS' && (
          <div className="space-y-3">
            <div className="text-xs font-mono text-slate-400 flex items-center justify-between">
              <span>MATHEMATICALLY INFERRED UNOBSERVED CONSPIRATOR RELATIONSHIPS:</span>
              <span className="text-cyan-400 font-bold">Algorithms: Adamic-Adar + Resource Allocation + Jaccard</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {linkPredictions.map((pred, idx) => (
                <div
                  key={idx}
                  className="card-3d p-4 rounded-xl border border-white/10 bg-surface/95 space-y-3 hover:border-cyan-400/50 transition shadow-lg"
                >
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <div className="flex items-center gap-1.5 font-mono text-xs">
                      <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                        {pred.source_label}
                      </span>
                      <span className="text-slate-500">&harr;</span>
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
                        {pred.target_label}
                      </span>
                    </div>

                    <div className="text-right font-mono">
                      <span className="text-[10px] text-slate-400 block">Link Probability</span>
                      <span className="text-sm font-bold text-emerald-400">
                        {(pred.link_probability * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    {pred.inference_rationale}
                  </p>

                  <div className="grid grid-cols-3 gap-2 font-mono text-[10px] bg-black/40 p-2.5 rounded-lg border border-white/5">
                    <div>
                      <span className="text-slate-500 block uppercase">Adamic-Adar</span>
                      <span className="text-cyan-300 font-bold">{pred.adamic_adar_score}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase">Resource Alloc</span>
                      <span className="text-emerald-300 font-bold">{pred.resource_allocation_score}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase">Jaccard Coeff</span>
                      <span className="text-purple-300 font-bold">{pred.jaccard_coefficient}</span>
                    </div>
                  </div>

                  {onApplyHighlight && (
                    <button
                      onClick={() => onApplyHighlight([pred.source_id, pred.target_id], [])}
                      className="w-full py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Illuminate Inferred Pair on 3D Graph</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Hawala Smurfing & Circular Laundering Cycles */}
        {activeMLTab === 'CYCLES' && (
          <div className="space-y-3">
            <div className="text-xs font-mono text-slate-400">
              DETECTED CIRCULAR HAWALA STRUCTURING & MULE LAYERING LOOPS:
            </div>

            <div className="space-y-3">
              {launderingCycles.map((cycle, idx) => (
                <div
                  key={idx}
                  className="card-3d p-4 rounded-xl border border-white/10 bg-surface/95 space-y-3 hover:border-pink-500/50 transition shadow-lg"
                >
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <div className="flex items-center gap-2 font-mono">
                      <span className="px-2 py-0.5 rounded bg-pink-500/20 text-pink-400 font-bold text-xs border border-pink-500/40">
                        {cycle.cycle_id}
                      </span>
                      <span className="text-xs font-bold text-slate-200">{cycle.pattern_type}</span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-slate-400">Laundering Risk Index:</span>
                      <span className="text-sm font-bold text-red-400">{cycle.risk_score}/100</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 font-sans leading-relaxed">{cycle.description}</p>

                  <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs pt-1">
                    {cycle.node_labels.map((lbl: string, lIdx: number) => (
                      <React.Fragment key={lIdx}>
                        <span className="px-2.5 py-1 rounded bg-black/60 border border-white/10 text-cyan-300">
                          {lbl}
                        </span>
                        {lIdx < cycle.node_labels.length - 1 && (
                          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  {onApplyHighlight && (
                    <button
                      onClick={() => onApplyHighlight(cycle.nodes, [])}
                      className="py-1.5 px-4 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 text-pink-300 font-mono text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                      <span>Highlight Circular Laundering Chain on 3D WebGL</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Network Articulation Point Bottlenecks */}
        {activeMLTab === 'VULNERABILITY' && (
          <div className="space-y-3">
            <div className="text-xs font-mono text-slate-400">
              NETWORK CUT-VERTICES (KEY BOTTLENECK & DISRUPTION INTERMEDIARIES):
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {vulnerability?.critical_articulation_targets?.map((target: any, idx: number) => (
                <div
                  key={idx}
                  className="card-3d p-4 rounded-xl border border-white/10 bg-surface/95 space-y-3 hover:border-amber-500/50 transition shadow-lg"
                >
                  <div className="flex items-center justify-between border-b border-white/5 pb-2 font-mono">
                    <div className="space-y-0.5">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                        {target.type}
                      </span>
                      <h3 className="text-sm font-bold text-white mt-1">{target.label}</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/40">
                      CUT-VERTEX
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-sans leading-relaxed">{target.tactical_value}</p>

                  <div className="grid grid-cols-2 gap-2 font-mono text-xs bg-black/40 p-2 rounded-lg border border-white/5">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Betweenness Score</span>
                      <span className="text-cyan-300 font-bold">{target.betweenness}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Direct Connections</span>
                      <span className="text-emerald-300 font-bold">{target.degree} links</span>
                    </div>
                  </div>

                  {onFocusNode && (
                    <button
                      onClick={() => onFocusNode(target.id)}
                      className="w-full py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Inspect Intermediary Bottleneck</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Real-Life Dataset Batch Trainer */}
        {activeMLTab === 'TRAINER' && (
          <div className="card-3d p-6 rounded-2xl border border-white/10 bg-surface/95 space-y-5 shadow-xl">
            <div className="space-y-1">
              <h3 className="text-base font-bold font-mono text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" /> Real-Life Dataset Ingestion & Auto-Training Simulator
              </h3>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                When you supply real-world police files (CDRs, Banking SWIFT CSVs, ANPR plate records, FIR texts), the model automatically aligns schema headers, computes Bayesian prior distributions, and recalibrates topological link prediction weights.
              </p>
            </div>

            {trainingStatus && (
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 font-mono text-xs animate-pulse">
                {trainingStatus}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
              <button
                onClick={() => handleSimulateBatchTraining('Telecom CDRs (10,000+ Calls)')}
                className="p-4 rounded-xl bg-black/60 border border-white/10 hover:border-cyan-400 transition text-left space-y-2 group"
              >
                <div className="text-cyan-400 font-bold flex items-center justify-between">
                  <span>1. Telecom CDR Matrix</span>
                  <Play className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                </div>
                <p className="text-[11px] text-slate-400 font-sans">
                  Auto-extracts cell tower bursts, caller/receiver IMEI pairs, and call duration variance.
                </p>
              </button>

              <button
                onClick={() => handleSimulateBatchTraining('Bank SWIFT Wire Ledgers')}
                className="p-4 rounded-xl bg-black/60 border border-white/10 hover:border-emerald-400 transition text-left space-y-2 group"
              >
                <div className="text-emerald-400 font-bold flex items-center justify-between">
                  <span>2. Banking SWIFT Ledgers</span>
                  <Play className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                </div>
                <p className="text-[11px] text-slate-400 font-sans">
                  Detects fan-in structuring, offshore escrow routing, and multi-mule layerings.
                </p>
              </button>

              <button
                onClick={() => handleSimulateBatchTraining('ANPR Highway Camera Scans')}
                className="p-4 rounded-xl bg-black/60 border border-white/10 hover:border-purple-400 transition text-left space-y-2 group"
              >
                <div className="text-purple-400 font-bold flex items-center justify-between">
                  <span>3. ANPR Highway Scans</span>
                  <Play className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                </div>
                <p className="text-[11px] text-slate-400 font-sans">
                  Constructs spatio-temporal vehicle travel vectors and invalidates travel alibis.
                </p>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
