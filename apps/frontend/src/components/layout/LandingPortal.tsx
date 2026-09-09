import React from 'react';
import {
  ShieldAlert, ShieldCheck, Terminal, Cpu, Network, Globe, Lock, ArrowRight,
  Sparkles, Radio, Activity, Zap, PlayCircle, Layers, Award, CheckCircle2,
  TrendingUp, Database, FileText
} from 'lucide-react';
import { Case } from '../../types';

interface LandingPortalProps {
  cases: Case[];
  onSelectCase: (caseId: string) => void;
  onEnterWorkspace: () => void;
}

const CASE_METRICS: Record<string, {
  riskLevel: 'CRITICAL' | 'HIGH' | 'MAXIMUM' | 'SEVERE';
  threatColor: string;
  category: string;
  codename: string;
  leadSuspect: string;
  summary: string;
}> = {
  'CASE-001': {
    riskLevel: 'CRITICAL',
    threatColor: '#EF4444',
    category: 'Port Hawala & Narcotics Contraband',
    codename: 'OP-NEXUS',
    leadSuspect: 'Victor Vance (Bridge Kingpin)',
    summary: 'Nhava Sheva maritime shipping container heist and offshore hawala funnel laundering INR 2.4 Cr.',
  },
  'CASE-002': {
    riskLevel: 'SEVERE',
    threatColor: '#F59E0B',
    category: 'State Banking Trojan & Dark Web Crypto',
    codename: 'OP-BLACKOUT',
    leadSuspect: 'Karan Mehra (Lead Threat Actor)',
    summary: 'Ransomware extortion attack on state banking server vaults with Monero cross-chain bridge laundering.',
  },
  'CASE-003': {
    riskLevel: 'MAXIMUM',
    threatColor: '#EC4899',
    category: 'Military Surplus & Maritime Port Arms',
    codename: 'OP-VULTURE',
    leadSuspect: 'Captain Kabir Rao (KA-01-MJ-9999)',
    summary: 'Interception of covert heavy weapons transit moving along Kutch highway under forged military clearance.',
  },
  'CASE-004': {
    riskLevel: 'CRITICAL',
    threatColor: '#8B5CF6',
    category: 'DarkNet Synthetics & Dead-Drop Logistics',
    codename: 'OP-DARKNET-GHOST',
    leadSuspect: 'Zack Alva (DarkNet Chemist)',
    summary: 'Encrypted Matrix network distributing synthetic narcotics with calibrated GPS beach dead-drops.',
  },
  'CASE-005': {
    riskLevel: 'MAXIMUM',
    threatColor: '#10B981',
    category: 'Dubai-Mumbai Air Courier Gold Pipeline',
    codename: 'OP-GOLDEN-FALCON',
    leadSuspect: 'Mansoor Merchant & Fatima Al-Sayed',
    summary: 'Transnational air couriers smuggling gold bullion paste with Zaveri Bazaar furnace smelter rings.',
  },
};

export const LandingPortal: React.FC<LandingPortalProps> = ({ cases, onSelectCase, onEnterWorkspace }) => {
  return (
    <div className="w-full h-full overflow-y-auto bg-[#06070A] text-slate-100 font-sans p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* ── Top Classification Header ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-cyan-500/20 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_25px_rgba(0,210,255,0.3)]">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-mono text-[10px] font-black tracking-widest uppercase border border-red-500/40">
                TOP SECRET // TRACE INTEL DIRECTIVE
              </span>
              <span className="text-[10px] font-mono text-slate-400">OPERATION FUSION</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black font-mono text-white uppercase tracking-wider mt-0.5">
              TRACE // CRIMINAL INTELLIGENCE & FORENSIC FUSION
            </h1>
          </div>
        </div>

        {/* Live Telemetry Pill */}
        <div className="flex items-center gap-2.5 bg-black/80 border border-white/10 px-4 py-2 rounded-xl font-mono text-xs text-slate-200 shadow-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
          <span>SECURITY PROTOCOL: <span className="text-emerald-400 font-bold">ARMED & ACTIVE</span></span>
        </div>
      </div>

      {/* ── Hero Presentation Banner (Enlarged, Spacious & Non-Compressed) ──── */}
      <div
        className="card-3d p-6 md:p-10 rounded-2xl border border-cyan-500/40 relative overflow-hidden bg-[#0A0D14] space-y-6 shadow-2xl"
        style={{
          boxShadow: '0 0 50px rgba(0, 210, 255, 0.12), inset 0 1px 0 rgba(6, 182, 212, 0.2)',
        }}
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="space-y-4 max-w-3xl">
            <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold tracking-widest uppercase">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span>Next-Generation Criminal Network & Bayesian Forensic Reasoning Platform</span>
            </div>

            <h2 className="text-2xl md:text-4xl font-black font-mono text-white tracking-tight leading-tight">
              Autonomous 3D Spatial Knowledge Graph & Bayesian Culpability Matrix
            </h2>

            <p className="text-sm md:text-base text-slate-300 font-sans leading-relaxed">
              Multi-modal forensic data ingestion of Call Detail Records (CDRs), First Information Reports (FIRs), SWIFT bank wire ledgers, ANPR vehicle plate scans, and DNA biometric forensic reports. Uncover hidden kingpins, money mule rings, and bridge conspirators in real-time WebGL.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={onEnterWorkspace}
                className="px-6 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-black transition flex items-center gap-2 shadow-[0_0_30px_rgba(0,210,255,0.5)] transform hover:scale-105"
              >
                <span>LAUNCH COMMAND WORKSPACE</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* System Capabilities HUD Grid */}
          <div className="grid grid-cols-2 gap-3 w-full lg:w-96 shrink-0 font-mono text-xs">
            <div className="p-3.5 rounded-xl border border-white/10 bg-black/60 space-y-1.5 hover:border-cyan-400/40 transition">
              <div className="text-[10px] text-slate-400 uppercase flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-cyan-400" /> AI Investigator
              </div>
              <div className="text-cyan-300 font-bold text-xs">SEMANTIC REASONER</div>
              <span className="text-[10px] text-slate-400 block font-sans">Grounded evidence citations</span>
            </div>

            <div className="p-3.5 rounded-xl border border-white/10 bg-black/60 space-y-1.5 hover:border-emerald-400/40 transition">
              <div className="text-[10px] text-slate-400 uppercase flex items-center gap-1.5">
                <Network className="w-4 h-4 text-emerald-400" /> Dual Canvas
              </div>
              <div className="text-emerald-300 font-bold text-xs">3D WebGL / 2D Cytoscape</div>
              <span className="text-[10px] text-slate-400 block font-sans">Zero fog luminous nodes</span>
            </div>

            <div className="p-3.5 rounded-xl border border-white/10 bg-black/60 space-y-1.5 hover:border-purple-400/40 transition">
              <div className="text-[10px] text-slate-400 uppercase flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-purple-400" /> Geo Radar
              </div>
              <div className="text-purple-300 font-bold text-xs">DYNAMIC GIS SATELLITE</div>
              <span className="text-[10px] text-slate-400 block font-sans">Real-time GPS cell towers</span>
            </div>

            <div className="p-3.5 rounded-xl border border-white/10 bg-black/60 space-y-1.5 hover:border-red-400/40 transition">
              <div className="text-[10px] text-slate-400 uppercase flex items-center gap-1.5">
                <Award className="w-4 h-4 text-red-400" /> Priority Matrix
              </div>
              <div className="text-red-300 font-bold text-xs">FORENSIC & ALIBI PROFILER</div>
              <span className="text-[10px] text-slate-400 block font-sans">Calibrated evidence weight & priority scoring</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Active Investigation Dossiers Grid (Spacious & Interactive) ──────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2 font-mono">
            <Layers className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-bold text-white uppercase tracking-wider">
              Active Investigation Dossiers ({cases.length} Operative Networks)
            </span>
          </div>
          <span className="text-xs font-mono text-slate-400">CLICK ANY DOSSIER TO LOAD WORKSPACE</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {cases.map(c => {
            const meta = CASE_METRICS[c.id] || {
              riskLevel: 'HIGH',
              threatColor: '#00D2FF',
              category: 'Criminal Syndicate Investigation',
              codename: c.id,
              leadSuspect: 'Under Active Surveillance',
              summary: c.description || 'Active criminal intelligence case file.',
            };

            return (
              <div
                key={c.id}
                onClick={() => onSelectCase(c.id)}
                className="card-3d p-6 rounded-2xl border border-white/10 bg-[#0C0F17] hover:border-cyan-400/60 transition cursor-pointer flex flex-col justify-between space-y-4 group hover:shadow-[0_0_30px_rgba(0,210,255,0.25)]"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded bg-black/60 border border-white/10 text-xs font-mono text-cyan-400 font-bold">
                      {meta.codename}
                    </span>

                    <span
                      className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border"
                      style={{
                        color: meta.threatColor,
                        borderColor: `${meta.threatColor}40`,
                        background: `${meta.threatColor}15`,
                      }}
                    >
                      {meta.riskLevel} THREAT
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold font-mono text-white group-hover:text-cyan-300 transition">
                      {c.name}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{meta.category}</p>
                  </div>

                  <p className="text-xs text-slate-300 font-sans leading-relaxed line-clamp-3">
                    {meta.summary}
                  </p>

                  <div className="p-2.5 rounded-xl bg-black/50 border border-white/5 font-mono text-[11px] space-y-1">
                    <div className="text-slate-400">
                      Primary Target: <span className="text-white font-bold">{meta.leadSuspect}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between font-mono text-xs text-slate-400">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-bold group-hover:translate-x-1 transition">
                    <span>OPEN DOSSIER</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] text-slate-400">ID: {c.id}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
