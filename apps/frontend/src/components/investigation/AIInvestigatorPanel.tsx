import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Send, FileText, CheckCircle2, AlertCircle, ArrowRight, Brain, Zap, RotateCcw, Headphones, Tag } from 'lucide-react';
import { InvestigatorResponse, GraphData } from '../../types';
import { askInvestigator, fetchCaseSuggestedQuestions } from '../../services/api';

interface AIInvestigatorPanelProps {
  caseId: string;
  graphData?: GraphData;
  onApplyHighlight: (nodes: string[], edges: string[]) => void;
  onViewEvidence: (evidenceId: string) => void;
  onNavigateToAudio?: () => void;
}

export const AIInvestigatorPanel: React.FC<AIInvestigatorPanelProps> = ({
  caseId,
  graphData,
  onApplyHighlight,
  onViewEvidence,
  onNavigateToAudio,
}) => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<InvestigatorResponse | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const [suggestedQueries, setSuggestedQueries] = useState<Array<{ category: string; question: string }>>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalyzedCase, setLastAnalyzedCase] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Execute Graph Investigation Query
  const executeQuestion = useCallback(async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    try {
      const res = await askInvestigator(trimmed, caseId);
      setResponse(res);
      if (res.highlight_nodes && res.highlight_nodes.length > 0) {
        onApplyHighlight(res.highlight_nodes, res.highlight_edges || []);
      }
    } catch (err) {
      console.error('Investigation execution error:', err);
    } finally {
      setLoading(false);
    }
  }, [caseId, loading, onApplyHighlight]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeQuestion(question);
  };

  // Dynamically analyze the case graph and formulate tailored questions
  const analyzeCaseAndGenerateQuestions = useCallback(async (showLoading: boolean = false) => {
    if (showLoading) setIsAnalyzing(true);
    try {
      const questions = await fetchCaseSuggestedQuestions(caseId, graphData);
      setSuggestedQueries(questions);
      setLastAnalyzedCase(caseId);
    } catch (err) {
      console.warn('Failed to formulate dynamic questions:', err);
    } finally {
      if (showLoading) setIsAnalyzing(false);
    }
  }, [caseId, graphData]);

  // Re-analyze whenever caseId changes or when new nodes/edges are ingested
  useEffect(() => {
    if (caseId !== lastAnalyzedCase) {
      setResponse(null); // Clear previous case's answer
      setQuestion('');
    }
    analyzeCaseAndGenerateQuestions(true);
  }, [caseId, graphData?.nodes.length, graphData?.edges.length, analyzeCaseAndGenerateQuestions]);

  const nodeCount = graphData?.nodes.length ?? 0;
  const edgeCount = graphData?.edges.length ?? 0;

  return (
    <div
      className="card-3d panel-depth flex flex-col h-full rounded-xl overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(6,7,10,0.95) 0%, rgba(8,10,15,0.98) 100%)',
        border: '1px solid rgba(6,182,212,0.15)',
        boxShadow: '0 0 40px rgba(6,182,212,0.05), inset 0 1px 0 rgba(6,182,212,0.08)',
      }}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div
        className="relative flex items-center justify-between px-4 py-3 shrink-0"
        style={{
          background: 'linear-gradient(90deg, rgba(6,182,212,0.08) 0%, transparent 100%)',
          borderBottom: '1px solid rgba(6,182,212,0.1)',
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-px holo opacity-40" />
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: 'rgba(6,182,212,0.12)',
              border: '1px solid rgba(6,182,212,0.3)',
              boxShadow: '0 0 16px rgba(6,182,212,0.15)',
            }}
          >
            <Brain className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold tracking-widest text-cyan-300 uppercase font-mono"
                style={{ textShadow: '0 0 12px rgba(6,182,212,0.5)' }}>
                AI Investigator
              </h2>
              <span
                className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold tracking-wider"
                style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}
              >
                LIVE
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-500">
              Grounded Graph Reasoning • {caseId}
            </p>
          </div>
        </div>

        {/* Case Analysis Pill & Re-analyze trigger */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => analyzeCaseAndGenerateQuestions(true)}
            disabled={isAnalyzing}
            title="Re-analyze graph topology & formulate inquiries"
            className="p-1 rounded hover:bg-cyan-500/10 text-slate-400 hover:text-cyan-300 transition flex items-center gap-1 text-[10px] font-mono"
          >
            <RotateCcw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="hidden sm:inline">Analyze</span>
          </button>
          {onNavigateToAudio && (
            <button
              onClick={onNavigateToAudio}
              className="px-2 py-1 rounded text-[10px] font-mono font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition flex items-center gap-1"
              title="Switch to Audio Intercept Transcripts"
            >
              <Headphones className="w-3 h-3" />
              <span>Audio</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Case Telemetry Sub-header ─────────────────────────────────────── */}
      <div className="px-4 py-1.5 bg-black/40 border-b border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400 shrink-0">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span>Graph Ingested: <strong className="text-slate-200">{nodeCount}</strong> entities • <strong className="text-slate-200">{edgeCount}</strong> edges</span>
        </span>
        <span className="text-[9px] uppercase tracking-wider text-cyan-400/80">
          Engine Calibrated
        </span>
      </div>

      {/* ── Dynamic Suggested Questions (Engine Analyzed) ────────────────── */}
      <div className="flex flex-col gap-1 px-3 pt-2.5 pb-1 shrink-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[9px] font-mono text-cyan-400/90 uppercase tracking-widest font-semibold flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
            <span>Formulated Inquiries ({suggestedQueries.length})</span>
          </span>
          <span className="text-[9px] font-mono text-slate-500">Click to execute</span>
        </div>
        <div className="flex flex-col gap-1 max-h-36 overflow-y-auto pr-1 scrollbar-cyan">
          {suggestedQueries.map((item, i) => (
            <button
              key={i}
              onClick={() => {
                setQuestion(item.question);
                executeQuestion(item.question);
              }}
              className="btn-3d text-left text-[11px] px-2.5 py-1.5 rounded-lg font-mono transition-all flex items-start gap-1.5 group"
              style={{
                background: 'rgba(6,182,212,0.03)',
                border: '1px solid rgba(6,182,212,0.1)',
                color: '#94A3B8',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(6,182,212,0.08)';
                (e.currentTarget as HTMLButtonElement).style.color = '#38BDF8';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(6,182,212,0.3)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(6,182,212,0.03)';
                (e.currentTarget as HTMLButtonElement).style.color = '#94A3B8';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(6,182,212,0.1)';
              }}
            >
              <span className="text-[8px] px-1 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-wider shrink-0 mt-0.5 font-bold">
                {item.category}
              </span>
              <span className="truncate flex-1 group-hover:underline text-[10.5px]">
                {item.question}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Query Input ──────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="flex gap-2 px-3 pt-2 shrink-0">
        <div
          className="flex-1 relative"
          style={{
            transform: inputFocused ? 'perspective(600px) translateZ(4px)' : 'perspective(600px) translateZ(0)',
            transition: 'transform 0.2s ease',
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder={`Ask about suspects, accounts, or connections in ${caseId}…`}
            maxLength={500}
            className="w-full bg-transparent text-xs text-slate-200 font-mono px-3 py-2 rounded-lg focus:outline-none placeholder-slate-600"
            style={{
              background: inputFocused ? 'rgba(6,182,212,0.06)' : 'rgba(255,255,255,0.02)',
              border: inputFocused
                ? '1px solid rgba(6,182,212,0.5)'
                : '1px solid rgba(255,255,255,0.08)',
              boxShadow: inputFocused ? '0 0 20px rgba(6,182,212,0.12)' : 'none',
              transition: 'all 0.2s ease',
            }}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="btn-3d flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition-all shrink-0"
          style={{
            background: loading
              ? 'rgba(6,182,212,0.1)'
              : 'linear-gradient(135deg, rgba(6,182,212,0.4) 0%, rgba(16,185,129,0.3) 100%)',
            border: '1px solid rgba(6,182,212,0.5)',
            color: '#06B6D4',
            boxShadow: '0 0 16px rgba(6,182,212,0.15)',
            opacity: !question.trim() ? 0.4 : 1,
          }}
        >
          {loading ? (
            <Zap className="w-3.5 h-3.5 animate-pulse" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
        </button>
      </form>

      {/* ── Response Area (Smooth Scrolling & Non-trapping) ──────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-2.5 pb-3 scrollbar-cyan">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-36 gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(6,182,212,0.1)',
                border: '1px solid rgba(6,182,212,0.3)',
                boxShadow: '0 0 30px rgba(6,182,212,0.2)',
                animation: 'float3d 1.2s ease-in-out infinite',
              }}
            >
              <Sparkles className="w-5 h-5 text-cyan-400" style={{ animation: 'spin 2s linear infinite' }} />
            </div>
            <div className="text-xs font-mono text-slate-500 text-center">
              <p className="text-cyan-400 animate-pulse font-semibold">Running Graph Intelligence Query…</p>
              <p className="text-slate-600 mt-0.5 text-[10px]">Analyzing {nodeCount} entities & topology paths</p>
            </div>
          </div>
        ) : response ? (
          <div
            className="card-3d rounded-xl overflow-hidden space-y-3"
            style={{
              background: 'rgba(6,182,212,0.04)',
              border: '1px solid rgba(6,182,212,0.15)',
              boxShadow: '0 0 30px rgba(6,182,212,0.06)',
              animation: 'fadeSlideIn 0.3s cubic-bezier(0.23,1,0.32,1) forwards',
            }}
          >
            {/* Answer Content */}
            <div className="p-3.5">
              <p className="text-xs leading-relaxed text-slate-200 font-sans whitespace-pre-line">
                {response.answer}
              </p>
            </div>

            {/* Confidence & Intent Badge */}
            <div className="px-3.5 pb-1">
              <div className="flex justify-between text-[10px] font-mono mb-1">
                <span className="text-slate-500">Reasoning Confidence</span>
                <span className="text-emerald-400 font-bold">{(response.confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div
                  className="h-1 rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(100, Math.max(15, response.confidence * 100))}%`,
                    background: 'linear-gradient(90deg, #10B981, #06B6D4)',
                    boxShadow: '0 0 8px rgba(6,182,212,0.5)',
                  }}
                />
              </div>
              {response.query?.intent && (
                <div className="flex justify-between text-[9px] font-mono mt-1.5">
                  <span className="text-slate-500">
                    Intent: <span className="text-cyan-400 font-semibold">{response.query.intent}</span>
                  </span>
                </div>
              )}
            </div>

            {/* 3D Highlight Button */}
            {response.highlight_nodes && response.highlight_nodes.length > 0 && (
              <button
                onClick={() => onApplyHighlight(response.highlight_nodes, response.highlight_edges || [])}
                className="btn-3d w-full flex items-center justify-center gap-2 py-2 text-xs font-mono font-semibold transition-all"
                style={{
                  background: 'rgba(16,185,129,0.08)',
                  borderTop: '1px solid rgba(16,185,129,0.15)',
                  color: '#10B981',
                }}
              >
                <span>Highlight {response.highlight_nodes.length} Nodes in Canvas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Evidence Documents */}
            {response.evidence && response.evidence.length > 0 && (
              <div className="px-3.5 pb-3 pt-2 border-t border-white/5">
                <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1.5">Evidence Records</p>
                <div className="space-y-1">
                  {response.evidence.map((ev, i) => (
                    <button
                      key={i}
                      onClick={() => onViewEvidence(ev)}
                      className="btn-3d w-full text-left flex items-center gap-2 text-[10px] font-mono px-2 py-1.5 rounded-lg transition-all"
                      style={{
                        background: 'rgba(6,182,212,0.03)',
                        border: '1px solid rgba(6,182,212,0.08)',
                        color: '#06B6D4',
                      }}
                    >
                      <FileText className="w-3 h-3 shrink-0" />
                      <span className="truncate">{ev}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center h-32 rounded-xl text-center px-4"
            style={{ border: '1px dashed rgba(255,255,255,0.06)' }}
          >
            <AlertCircle className="w-6 h-6 mb-1.5 text-slate-600" />
            <p className="text-[11px] font-mono text-slate-400">
              Select a formulated inquiry above or ask a custom question
            </p>
            <p className="text-[9px] font-mono text-slate-600 mt-1">
              Grounded across all {nodeCount} case graph entities
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIInvestigatorPanel;
