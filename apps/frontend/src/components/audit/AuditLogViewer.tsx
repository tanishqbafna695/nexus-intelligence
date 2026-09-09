import React, { useEffect, useState } from 'react';
import { ShieldCheck, X, Clock, User, FileText } from 'lucide-react';

interface AuditLogEntry {
  id: string;
  case_id: string;
  action_type: string;
  details: string;
  user: string;
  timestamp: string;
}

interface AuditLogViewerProps {
  caseId: string;
  isOpen: boolean;
  onClose: () => void;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api';

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ caseId, isOpen, onClose }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch(`${API_BASE}/cases/${caseId}/audit`)
      .then((res) => res.json())
      .then((data) => setLogs(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [caseId, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-surface-border w-full max-w-xl max-h-[80vh] rounded-lg p-4 font-sans shadow-2xl flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-border pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-accent-emerald" />
            <h3 className="text-sm font-semibold tracking-wider text-text-primary uppercase font-mono">
              Immutable Chain of Evidence Audit Trail
            </h3>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary p-1 text-xs">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Audit Log Entries List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs font-mono">
          {loading ? (
            <div className="text-center py-12 text-text-muted">Loading case audit logs...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-text-muted">No audit entries logged for this case yet.</div>
          ) : (
            logs.map((entry) => (
              <div
                key={entry.id}
                className="bg-surface-elevated p-3 rounded border border-surface-border space-y-1"
              >
                <div className="flex items-center justify-between text-text-muted text-[11px]">
                  <span className="text-accent-cyan font-bold">{entry.action_type}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="text-text-primary">{entry.details}</div>
                <div className="flex items-center gap-2 text-[10px] text-text-muted pt-0.5">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" /> {entry.user}</span>
                  <span>• Entry ID: {entry.id}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-surface-border">
          <button
            onClick={onClose}
            className="px-3 py-1 bg-surface border border-surface-border rounded text-xs font-mono text-text-primary hover:bg-surface-elevated"
          >
            Close Audit Trail
          </button>
        </div>
      </div>
    </div>
  );
};
