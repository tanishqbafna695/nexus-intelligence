import React, { useState } from 'react';
import { X, Search, Trash2, Plus, FolderGit2, Check, AlertTriangle, Layers, Database } from 'lucide-react';
import { Case } from '../../types';

interface CaseManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  cases: Case[];
  activeCaseId: string;
  onSelectCase: (caseId: string) => void;
  onCreateCase: (name: string, description: string) => Promise<void>;
  onDeleteCase: (caseId: string) => Promise<void>;
  onOpenIngestion: () => void;
}

export const CaseManagerModal: React.FC<CaseManagerModalProps> = ({
  isOpen,
  onClose,
  cases,
  activeCaseId,
  onSelectCase,
  onCreateCase,
  onDeleteCase,
  onOpenIngestion,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [newCaseName, setNewCaseName] = useState('');
  const [newCaseDesc, setNewCaseDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const filteredCases = cases.filter(
    (c) =>
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaseName.trim() || isCreating) return;
    setIsCreating(true);
    try {
      await onCreateCase(newCaseName.trim(), newCaseDesc.trim() || 'Criminal Network Investigation');
      setNewCaseName('');
      setNewCaseDesc('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!caseToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await onDeleteCase(caseToDelete);
      setCaseToDelete(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-surface border border-white/10 w-full max-w-2xl rounded-2xl p-6 font-sans shadow-2xl flex flex-col gap-5 max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-mono text-white uppercase tracking-wider">
                Case Management Hub
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Switch, Search, Create, or Expunge Criminal Investigation Cases
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cases by ID, operation name, or narrative..."
            className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition"
          />
        </div>

        {/* Create New Case Form */}
        <form onSubmit={handleCreate} className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-cyan-300 uppercase flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              New Operational Case
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={newCaseName}
              onChange={(e) => setNewCaseName(e.target.value)}
              placeholder="Case Name (e.g. Operation Hawk)"
              className="bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
            <input
              type="text"
              value={newCaseDesc}
              onChange={(e) => setNewCaseDesc(e.target.value)}
              placeholder="Description / Syndicate Type"
              className="bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!newCaseName.trim() || isCreating}
              className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-mono text-xs font-bold rounded-lg transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              {isCreating ? 'Creating...' : 'Create Case'}
            </button>
          </div>
        </form>

        {/* Cases List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-72">
          {filteredCases.length === 0 ? (
            <div className="text-center py-8 text-xs font-mono text-slate-500">
              No matching criminal cases found for "{searchQuery}".
            </div>
          ) : (
            filteredCases.map((c) => {
              const isActive = c.id === activeCaseId;
              return (
                <div
                  key={c.id}
                  className={`p-3.5 rounded-xl border transition flex items-center justify-between gap-3 ${
                    isActive
                      ? 'bg-cyan-500/10 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                      : 'bg-black/40 border-white/5 hover:border-white/20'
                  }`}
                >
                  <div
                    onClick={() => {
                      onSelectCase(c.id);
                      onClose();
                    }}
                    className="cursor-pointer flex-1 space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-cyan-300">{c.id}</span>
                      <span className="font-mono text-xs text-white font-bold">{c.name}</span>
                      {isActive && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans line-clamp-1">{c.description}</p>
                    <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
                      <span>{c.node_count || 0} Nodes</span>
                      <span>•</span>
                      <span>{c.edge_count || 0} Edges</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        onSelectCase(c.id);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-300 hover:text-white transition"
                    >
                      Select
                    </button>
                    <button
                      onClick={() => setCaseToDelete(c.id)}
                      title="Permanently expunge this case"
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Delete Confirmation Modal Overlay */}
        {caseToDelete && (
          <div className="p-4 rounded-xl bg-red-950/70 border border-red-500/40 flex items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
              <div>
                <div className="text-xs font-mono font-bold text-white uppercase">
                  Permanently Expunge {caseToDelete}?
                </div>
                <div className="text-[11px] text-slate-300">
                  This will delete all nodes, telephone intercepts, financial ledgers, and dossiers for this case.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setCaseToDelete(null)}
                className="px-3 py-1.5 rounded-lg bg-white/10 text-white font-mono text-xs hover:bg-white/20 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold transition"
              >
                {isDeleting ? 'Expunging...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 pt-4">
          <span className="text-[11px] font-mono text-slate-500">
            Total Active Operations: {cases.length}
          </span>
          <button
            onClick={() => {
              onClose();
              onOpenIngestion();
            }}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Ingest Data to Active Case</span>
          </button>
        </div>
      </div>
    </div>
  );
};
