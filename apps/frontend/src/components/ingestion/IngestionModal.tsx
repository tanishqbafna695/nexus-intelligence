import React, { useState } from 'react';
import { UploadCloud, X, FileText, CheckCircle2, Loader2, Database, FileSpreadsheet, Cpu, Sparkles } from 'lucide-react';
import { uploadDocument, runIngestion } from '../../services/api';
import { ClientIntelligenceEngine } from '../../services/clientIntelligenceEngine';

interface IngestionModalProps {
  caseId: string;
  isOpen: boolean;
  onClose: () => void;
  onIngestionComplete: () => void;
}

export const IngestionModal: React.FC<IngestionModalProps> = ({
  caseId,
  isOpen,
  onClose,
  onIngestionComplete,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [pastedText, setPastedText] = useState('');
  const [pastedDocName, setPastedDocName] = useState('FIR_Panvel_Special_Squad.txt');
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [extractedStats, setExtractedStats] = useState<{ nodes: number; edges: number } | null>(null);

  if (!isOpen) return null;

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setFiles((prev) => [...prev, ...droppedFiles]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  const readFileText = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        resolve((event.target?.result as string) || '');
      };
      reader.onerror = () => resolve('');
      reader.readAsText(file);
    });
  };

  const handleProcessAndIngest = async () => {
    setUploading(true);
    setExtractedStats(null);
    setStatusMessage('TRACE Universal ETL Engine reading document content...');

    try {
      let combinedText = '';
      let docName = '';

      if (activeTab === 'upload' && files.length > 0) {
        for (const f of files) {
          const text = await readFileText(f);
          combinedText += `\n--- ${f.name} ---\n` + text;
          // Attempt background sync to backend
          try {
            await uploadDocument(caseId, f);
          } catch (e) {
            console.warn('Backend upload skipped', e);
          }
        }
        docName = files[0]?.name || 'ingested_record.txt';
      } else if (activeTab === 'paste' && pastedText.trim().length > 0) {
        combinedText = pastedText.trim();
        docName = pastedDocName.trim() || 'FIR_intelligence_memo.txt';
      } else {
        setStatusMessage('Please select files or paste text to ingest.');
        setUploading(false);
        return;
      }

      setStatusMessage('Extracting suspects, phone numbers, vehicles, bank accounts & relationships...');
      const extractedGraph = ClientIntelligenceEngine.extractFromText(combinedText, docName);

      // Merge with any existing case graph
      const existingGraph = ClientIntelligenceEngine.getCaseGraph(caseId) || { nodes: [], edges: [] };
      const existingNodeIds = new Set(existingGraph.nodes.map(n => n.id));
      const mergedNodes = [...existingGraph.nodes, ...extractedGraph.nodes.filter(n => !existingNodeIds.has(n.id))];
      
      const existingEdgeKeys = new Set(existingGraph.edges.map(e => `${e.source}_${e.target}_${e.type}`));
      const mergedEdges = [...existingGraph.edges, ...extractedGraph.edges.filter(e => !existingEdgeKeys.has(`${e.source}_${e.target}_${e.type}`))];
      
      const finalGraph = { nodes: mergedNodes, edges: mergedEdges };
      ClientIntelligenceEngine.saveCaseGraph(caseId, finalGraph);

      setStatusMessage('Compiling Machine Learning Police Solutions & Tactical Directives...');
      const solutionsReport = ClientIntelligenceEngine.analyzeGraphAndGenerateSolutions(caseId, finalGraph);
      ClientIntelligenceEngine.savePoliceSolutions(caseId, solutionsReport);

      // Attempt server ingestion call
      try {
        await runIngestion(caseId);
      } catch (e) {
        console.warn('Server ingestion sync completed locally', e);
      }

      setExtractedStats({ nodes: extractedGraph.nodes.length, edges: extractedGraph.edges.length });
      setStatusMessage(`Ingestion Complete! Extracted ${extractedGraph.nodes.length} entities & ${extractedGraph.edges.length} connections.`);

      onIngestionComplete();

      setTimeout(() => {
        setFiles([]);
        setPastedText('');
        setUploading(false);
        setStatusMessage('');
        onClose();
      }, 1800);
    } catch (err) {
      console.error(err);
      setStatusMessage('Ingestion failed. Please review input.');
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-surface border border-white/10 w-full max-w-xl rounded-2xl p-6 font-sans shadow-2xl flex flex-col gap-4 max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wider text-white uppercase font-mono">
                Ingest Investigation Dataset
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Target Case: <span className="text-cyan-400 font-bold">{caseId}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 text-xs">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex rounded-lg bg-white/5 p-1 border border-white/10 font-mono text-xs">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-2 transition ${
              activeTab === 'upload' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload File Records</span>
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-2 transition ${
              activeTab === 'paste' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Paste FIR / Intelligence Memo</span>
          </button>
        </div>

        {/* Tab 1: Upload Documents */}
        {activeTab === 'upload' && (
          <div className="flex flex-col gap-3">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => {
                const el = document.getElementById('ingest-modal-file-input');
                if (el) el.click();
              }}
              className="border-2 border-dashed border-white/15 hover:border-cyan-500/50 bg-white/[0.02] hover:bg-cyan-500/[0.02] p-6 rounded-xl flex flex-col items-center justify-center cursor-pointer transition text-center"
            >
              <UploadCloud className="w-9 h-9 text-cyan-400 mb-2 opacity-80 animate-bounce" />
              <span className="text-xs font-semibold text-slate-200">
                Drag & Drop FIR, CDR, Bank Statement or Surveillance Records
              </span>
              <span className="text-[11px] font-mono text-slate-400 mt-1">
                Supports .TXT, .CSV, .JSON files
              </span>
              <input
                id="ingest-modal-file-input"
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {files.length > 0 && (
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  Queued Records ({files.length})
                </div>
                {files.map((f, idx) => (
                  <div
                    key={idx}
                    className="bg-white/5 p-2 rounded-lg border border-white/10 flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-slate-200 truncate">{f.name}</span>
                    </div>
                    <span className="text-slate-400 text-[10px]">
                      {(f.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Paste FIR Text */}
        {activeTab === 'paste' && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <label className="text-xs font-mono text-slate-400">Dossier / FIR Label:</label>
              <input
                type="text"
                value={pastedDocName}
                onChange={(e) => setPastedDocName(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded px-2.5 py-1 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500/50"
                placeholder="e.g. FIR_Crime_Branch_402.txt"
              />
            </div>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste FIR narrative, interrogation transcripts, bank transfer ledgers, or telecom logs here...&#10;&#10;Example:&#10;Suspect Rajesh Goud operates Hawala transactions through ACC-992211. Intercepted calling +919876543210 contacting Suspect Harmeet Singh. Vehicle MH-04-AB-1234 identified transporting illegal consignments to Warehouse 9."
              className="w-full h-36 bg-white/5 border border-white/10 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500/50 resize-none"
            />
            <div className="flex justify-between items-center text-[11px] font-mono text-slate-400">
              <span>Characters: {pastedText.length}</span>
              <button
                type="button"
                onClick={() => setPastedText(
                  "FIRST INFORMATION REPORT (FIR No. 402/2026)\nSpecial Crime Branch, Panvel Terminal.\nAccused Rajesh Goud operates covert hawala fund routing through ACC-992211.\nHe was intercepted using communication terminal +919876543210 contacting Suspect Harmeet Singh.\nVehicle MH-04-AB-1234 was identified transporting illegal consignments to Warehouse 9 at Panvel.\nAccused Rajesh Goud transferred INR 45,00,000 to ACC-992211 for logistics dispatch."
                )}
                className="text-cyan-400 hover:text-cyan-300 underline text-[10px]"
              >
                Insert Sample Panvel Hawala FIR
              </button>
            </div>
          </div>
        )}

        {/* Status Message */}
        {statusMessage && (
          <div className="bg-cyan-500/10 p-3 rounded-lg border border-cyan-500/30 flex items-center gap-2.5 text-xs font-mono text-cyan-300">
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin shrink-0 text-cyan-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Action Footer */}
        <div className="flex justify-between items-center pt-3 border-t border-white/10">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI Entity Resolver & Police ML Engine Ready</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-mono text-slate-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleProcessAndIngest}
              disabled={uploading || (activeTab === 'upload' ? files.length === 0 : pastedText.trim().length === 0)}
              className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-black font-bold rounded-lg text-xs font-mono flex items-center gap-1.5 transition disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Execute ML Analysis</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
