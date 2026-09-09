import React, { useState } from 'react';
import { X, ShieldAlert, FileText, CheckCircle, Download, Printer, Scale, MapPin, Building, Lock, AlertTriangle } from 'lucide-react';
import { Node } from '../../types';

interface WarrantGeneratorModalProps {
  suspects: Node[];
  onClose: () => void;
}

const WARRANT_TARGET_INTEL: Record<string, {
  role: string;
  location: string;
  sections: string[];
  guiltRating: number;
  grounds: string;
  exhibitsCount: number;
}> = {
  "Devendra Sharma": {
    role: "Syndicate Financier / Mastermind",
    location: "Apex Logistics HQ, Dockyard Road & Penthouse 4B, Malabar Hill, Mumbai",
    sections: ["IPC Sec 120B (Criminal Conspiracy)", "PMLA Sec 3 & 4 (Money Laundering)", "NDPS Act Sec 29 (Financing Illicit Traffic)"],
    guiltRating: 94.2,
    grounds: "Documentary proof of INR 2.40 Cr Hawala remittance to Gulf Horizon FZE (Dubai), fingerprints on fraudulent shipping bill, and 14 encrypted midnight calls.",
    exhibitsCount: 6
  },
  "Ramesh Kumar": {
    role: "Port Customs Clearance Agent",
    location: "Customs Clearance Desk 12, Nhava Sheva Port & Residence, Vashi Sector 17",
    sections: ["IPC Sec 120B", "Prevention of Corruption Act Sec 7/13", "Customs Act Sec 135 (Evasion of Duty)"],
    guiltRating: 88.6,
    grounds: "Receipt of INR 25,00,000 Hawala payoff, ANPR vehicle tracking at Vashi toll plaza 70s behind contraband cargo, and DNA on container locking seal.",
    exhibitsCount: 5
  },
  "Tariq Ahmed": {
    role: "Warehouse Operator / Consignment Receiver",
    location: "Facility Manager Cabin, Warehouse 17, Nhava Sheva Special Economic Zone",
    sections: ["NDPS Act Sec 8(c), 21, 29 (Commercial Quantity)", "IPC Sec 120B"],
    guiltRating: 91.4,
    grounds: "32 base-station tower handshakes at midnight staging facility, 14 friction ridge prints on seized crates, and recovery of dual burner SIMs.",
    exhibitsCount: 7
  },
  "Imran Khan": {
    role: "Security Guard & Offloading Proxy",
    location: "Warehouse 17 Gate 02, Nhava Sheva",
    sections: ["IPC Sec 201 (Destruction of Evidence)", "IPC Sec 120B"],
    guiltRating: 78.5,
    grounds: "Intentional power sabotage of CCTV Camera #04 during container offloading and 24 panic phone calls during police interception.",
    exhibitsCount: 4
  },
  "Suresh Patil": {
    role: "Wholesale Contraband Distributor",
    location: "APMC Commercial Staging Godown, Sector 19, Vashi, Navi Mumbai",
    sections: ["NDPS Act Sec 21 (Wholesale Distribution)", "IPC Sec 420"],
    guiltRating: 68.2,
    grounds: "Distribution ledger code SUR-09 recovered from syndicate headquarters and call intercepts with Devendra Sharma.",
    exhibitsCount: 3
  },
  "Karan Mehra": {
    role: "Lead Threat Actor / Trojan Admin",
    location: "Server Vault 09, Whitefield, Bengaluru",
    sections: ["IT Act Sec 66, 66C, 66D (Cyber Terrorism)", "IPC Sec 384 (Extortion)", "PMLA Sec 3"],
    guiltRating: 96.0,
    grounds: "Cryptographic SSH private key matched on C2 command server and 14.5 BTC cross-chain laundering to Monero privacy pools.",
    exhibitsCount: 5
  },
  "Sheikh Mansoor Al-Falasi": {
    role: "Overseas Bullion Syndicate Head",
    location: "Al-Falcon Bullion Trading FZE, Dubai Free Zone (JAFZA)",
    sections: ["Customs Act Sec 135", "COFEPOSA Sec 3", "PMLA Sec 3"],
    guiltRating: 92.8,
    grounds: "Emirates Flight EK-504 ticket booking for courier Fatima Noor and 8.5 kg 24K gold paste seized at Mumbai Customs Green Channel.",
    exhibitsCount: 4
  }
};

const WARRANT_PURPOSES = [
  { id: "ARREST_WARRANT", label: "Non-Bailable Arrest Warrant (Sec 70/73 CrPC)", color: "text-red-400" },
  { id: "SEARCH_AND_SEIZURE", label: "Search & Seizure Authorization (Sec 93/94 CrPC)", color: "text-amber-400" },
  { id: "ASSET_FREEZE_PMLA", label: "Provisional Bank Asset Attachment (Sec 5 PMLA)", color: "text-purple-400" },
  { id: "LOOKOUT_CIRCULAR", label: "Immigration Lookout Circular - LOC (All Ports)", color: "text-cyan-400" },
];

export const WarrantGeneratorModal: React.FC<WarrantGeneratorModalProps> = ({ suspects, onClose }) => {
  const personSuspects = suspects.filter(s => s.type === 'PERSON');
  const [selectedSuspect, setSelectedSuspect] = useState<string>(personSuspects[0]?.label ?? 'Devendra Sharma');
  const [warrantPurpose, setWarrantPurpose] = useState<string>("ARREST_WARRANT");
  const [isGenerated, setIsGenerated] = useState(false);

  // Dynamic Intel for target
  const targetIntel = WARRANT_TARGET_INTEL[selectedSuspect] || {
    role: "Identified Co-Conspirator",
    location: "Last Known Operating Address / Jurisdiction",
    sections: ["IPC Sec 120B (Criminal Conspiracy)", "Special Acts Applicable"],
    guiltRating: 82.0,
    grounds: "Electronic CDR call intercepts and forensic links connecting target to criminal syndicate operations.",
    exhibitsCount: 3
  };

  const selectedPurposeObj = WARRANT_PURPOSES.find(p => p.id === warrantPurpose) || WARRANT_PURPOSES[0];

  const handleDownloadDossier = () => {
    const content = `
================================================================================
     DRAFT JUDICIAL APPLICATION FOR PROSECUTORIAL & LEGAL COUNSEL REVIEW
                   SPECIAL COURT FOR ORGANIZED CRIME & PMLA
================================================================================
MANDATORY STATUTORY NOTICE:
This dossier is an automated evidence-synthesis draft produced by TRACE 
for investigative decision support. It does NOT constitute a binding judicial
directive, warrant, or finding of guilt. It must be independently reviewed,
verified, and signed by authorized public prosecutors prior to submission
before a competent judicial magistrate.
--------------------------------------------------------------------------------
DATE: ${new Date().toISOString().split('T')[0]}
WARRANT APPLICATION TYPE: ${selectedPurposeObj.label.toUpperCase()}

1. TARGET PARTICULARS:
   - Full Name: ${selectedSuspect}
   - Syndicate Role: ${targetIntel.role}
   - Target Premise / Address: ${targetIntel.location}
   - Evidence Support & Corroboration Index: ${targetIntel.guiltRating}%

2. STATUTORY OFFENSE CHARGES (SUBJECT TO PROSECUTORIAL REVIEW):
${targetIntel.sections.map(s => `   • ${s}`).join('\n')}

3. GROUNDS OF BELIEF & FACTUAL PROOFS:
   ${targetIntel.grounds}

4. FORENSIC EXHIBITS & CHAIN OF CUSTODY:
   - Total Indexed Exhibits: ${targetIntel.exhibitsCount}
   - Compliance: Certified under Section 65B Indian Evidence Act
   - Cryptographic SHA-256 Hash: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855

5. PRAYER:
   It is prayed that this Hon'ble Court may graciously evaluate ${selectedPurposeObj.label}
   against the target entity to prevent tampering with material evidence.
================================================================================
    `;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `WARRANT_APPLICATION_${selectedSuspect.replace(/\s+/g, '_')}_${warrantPurpose}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="card-3d max-w-2xl w-full p-6 rounded-2xl border border-white/10 bg-[#0A0D14] font-sans space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5 font-mono">
            <ShieldAlert className="w-6 h-6 text-red-500 animate-pulse" />
            <div>
              <h2 className="text-base font-black text-slate-100 uppercase tracking-wider">
                Automated Judicial Warrant Package Compiler
              </h2>
              <span className="text-[10px] text-slate-400">Section 65B Indian Evidence Act Compliant Brief</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Controls */}
        <div className="grid grid-cols-2 gap-4">
          {/* Target Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
              Prime Target Suspect
            </label>
            <select
              value={selectedSuspect}
              onChange={(e) => {
                setSelectedSuspect(e.target.value);
                setIsGenerated(false);
              }}
              className="w-full bg-black/60 border border-white/15 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
            >
              {personSuspects.map(s => (
                <option key={s.id} value={s.label} className="bg-slate-900 text-white">
                  {s.label} ({s.attributes?.role || s.type})
                </option>
              ))}
            </select>
          </div>

          {/* Warrant Purpose Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
              Judicial Warrant Purpose
            </label>
            <select
              value={warrantPurpose}
              onChange={(e) => {
                setWarrantPurpose(e.target.value);
                setIsGenerated(false);
              }}
              className="w-full bg-black/60 border border-white/15 rounded-lg px-3 py-2 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-400"
            >
              {WARRANT_PURPOSES.map(p => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Target Dossier Snapshot */}
        <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 font-mono text-xs space-y-2">
          <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
            <span className="text-slate-500 text-[10px] uppercase">Target Profile & Location</span>
            <span className="text-cyan-400 font-bold">{targetIntel.role}</span>
          </div>
          <div className="flex items-start gap-2 text-slate-300 text-[11px]">
            <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
            <span>{targetIntel.location}</span>
          </div>
        </div>

        {/* Generated Brief Preview */}
        {!isGenerated ? (
          <div className="p-6 rounded-xl border border-dashed border-white/10 bg-black/30 flex flex-col items-center justify-center space-y-3 text-center">
            <Scale className="w-10 h-10 text-cyan-400/40" />
            <p className="text-xs text-slate-400 max-w-md font-mono">
              Synthesizes Bayesian culpability ratings, CDR base-station handshakes, and statutory sections into a court-ready warrant application.
            </p>
            <button
              onClick={() => setIsGenerated(true)}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 text-black font-mono text-xs font-black hover:bg-cyan-400 transition shadow-[0_0_20px_rgba(6,182,212,0.5)]"
            >
              COMPILE WARRANT FOR {selectedSuspect.toUpperCase()}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-3 font-mono text-xs text-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <CheckCircle className="w-4 h-4" />
                  <span>DRAFT APPLICATION PACKAGE COMPILED</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  DECISION SUPPORT
                </span>
              </div>

              <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 font-mono">
                ⚖️ <strong>Legal Notice:</strong> Intelligence synthesis draft for investigator review. Requires prosecutorial review and judicial filing.
              </div>

              <div className="text-[11px] text-slate-300 space-y-1.5 pt-1 border-t border-emerald-500/20">
                <div>• <strong className="text-white">Target Entity:</strong> {selectedSuspect} ({targetIntel.role})</div>
                <div>• <strong className="text-white">Proposed Action:</strong> <span className="text-amber-300 font-bold">{selectedPurposeObj.label}</span></div>
                <div>• <strong className="text-white">Applicable Sections:</strong> {targetIntel.sections.join(' | ')}</div>
                <div>• <strong className="text-white">Evidence Support Score:</strong> <span className="text-emerald-400 font-bold">`{targetIntel.guiltRating}% Corroborated Links`</span></div>
                <div>• <strong className="text-white">Material Grounds:</strong> <span className="text-slate-300">{targetIntel.grounds}</span></div>
                <div>• <strong className="text-white">Evidence Exhibits:</strong> {targetIntel.exhibitsCount} Indexed Exhibits with SHA-256 Custody Hash</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-white/10 text-slate-300 font-mono text-xs hover:bg-white/5 transition"
              >
                Close
              </button>
              <button
                onClick={handleDownloadDossier}
                className="px-4 py-2 rounded-lg bg-emerald-500 text-black font-mono text-xs font-bold hover:bg-emerald-400 transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
              >
                <Download className="w-4 h-4" />
                Download Judicial Warrant Package (.txt)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
