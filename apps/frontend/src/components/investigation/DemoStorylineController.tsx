import React, { useState } from 'react';
import { Play, ChevronRight, ChevronLeft, Sparkles, CheckCircle2, RotateCcw } from 'lucide-react';
import { askInvestigator } from '../../services/api';

interface DemoStorylineControllerProps {
  caseId: string;
  onSelectTab: (tab: string) => void;
  onApplyHighlight: (nodes: string[], edges: string[]) => void;
  onViewEvidence: (evidenceId: string) => void;
  onSelectNodeById: (nodeId: string) => void;
  onExportReport: () => void;
}

interface StepDef {
  number: number;
  title: string;
  actionDesc: string;
  run: () => Promise<void> | void;
}

export const DemoStorylineController: React.FC<DemoStorylineControllerProps> = ({
  caseId,
  onSelectTab,
  onApplyHighlight,
  onViewEvidence,
  onSelectNodeById,
  onExportReport,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [running, setRunning] = useState(false);

  const steps: StepDef[] = [
    {
      number: 1,
      title: "1. Open Case",
      actionDesc: "Switch to Case Workspace & reset view",
      run: () => {
        onSelectTab('workspace');
        onApplyHighlight([], []);
      },
    },
    {
      number: 2,
      title: "2. Inspect Records",
      actionDesc: "Open source evidence document fir_019.txt",
      run: () => {
        onViewEvidence('fir_019.txt');
      },
    },
    {
      number: 3,
      title: "3. Entity Resolution",
      actionDesc: "Inspect extracted canonical graph on canvas",
      run: () => {
        onSelectTab('network');
      },
    },
    {
      number: 4,
      title: "4. Network Intelligence",
      actionDesc: "Switch to Intelligence Analytics dashboard",
      run: () => {
        onSelectTab('analytics');
      },
    },
    {
      number: 5,
      title: "5. Ask AI Bridge",
      actionDesc: "Ask: 'Which person connects Cluster A and Cluster B?'",
      run: async () => {
        onSelectTab('workspace');
        const res = await askInvestigator("Which person connects Cluster A and Cluster B?", caseId);
        if (res.highlight_nodes.length > 0) {
          onApplyHighlight(res.highlight_nodes, res.highlight_edges);
        }
      },
    },
    {
      number: 6,
      title: "6. Focus Bridge Node",
      actionDesc: "Focus Victor Vance (person_victor)",
      run: () => {
        onSelectNodeById('person_victor');
      },
    },
    {
      number: 7,
      title: "7. Ask Multi-Hop Path",
      actionDesc: "Ask: 'How are Devendra Sharma and Tariq Ahmed connected?'",
      run: async () => {
        const res = await askInvestigator("How are Devendra Sharma and Tariq Ahmed connected?", caseId);
        if (res.highlight_nodes.length > 0) {
          onApplyHighlight(res.highlight_nodes, res.highlight_edges);
        }
      },
    },
    {
      number: 8,
      title: "8. Event Timeline",
      actionDesc: "Switch to Chronological Event Timeline",
      run: () => {
        onSelectTab('timeline');
      },
    },
    {
      number: 9,
      title: "9. Export Executive Report",
      actionDesc: "Generate downloadable Markdown Executive Report",
      run: () => {
        onExportReport();
      },
    },
  ];

  const handleExecuteStep = async (stepIdx: number) => {
    if (stepIdx < 0 || stepIdx >= steps.length || running) return;
    setRunning(true);
    setCurrentStep(stepIdx);
    try {
      await steps[stepIdx].run();
    } catch (err) {
      console.error(err);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div
      className="border-b border-white/10 px-4 py-2 flex items-center justify-between font-sans text-xs"
      style={{ background: '#090B10' }}
    >
      <div className="flex items-center gap-2 font-mono">
        <Sparkles className="w-4 h-4 text-accent-cyan animate-pulse" />
        <span className="font-semibold text-text-primary uppercase tracking-wider">
          Guided Presentation Mode
        </span>
        <span className="text-[10px] bg-accent-cyan/10 text-accent-cyan px-2 py-0.5 rounded border border-accent-cyan/20">
          Step {currentStep + 1} of {steps.length}
        </span>
      </div>

      {/* Stepper Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleExecuteStep(currentStep - 1)}
          disabled={currentStep === 0 || running}
          className="p-1 rounded bg-surface-elevated hover:bg-surface border border-surface-border text-text-secondary disabled:opacity-30 transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1">
          {steps.map((s, idx) => (
            <button
              key={s.number}
              onClick={() => handleExecuteStep(idx)}
              className={`px-2.5 py-1 rounded font-mono text-[11px] transition ${
                idx === currentStep
                  ? 'bg-accent-cyan text-background font-bold shadow-md'
                  : idx < currentStep
                  ? 'bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30'
                  : 'bg-surface-elevated text-text-muted hover:text-text-secondary'
              }`}
            >
              {s.number}
            </button>
          ))}
        </div>

        <button
          onClick={() => handleExecuteStep(currentStep + 1)}
          disabled={currentStep === steps.length - 1 || running}
          className="p-1 rounded bg-surface-elevated hover:bg-surface border border-surface-border text-text-secondary disabled:opacity-30 transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Current Step Description */}
      <div className="flex items-center gap-3">
        <span className="text-text-secondary font-mono text-[11px]">
          {steps[currentStep].actionDesc}
        </span>
        <button
          onClick={() => handleExecuteStep(currentStep)}
          disabled={running}
          className="bg-accent-emerald hover:bg-accent-emerald/80 text-background px-3 py-1 rounded font-semibold flex items-center gap-1.5 transition text-[11px]"
        >
          <Play className="w-3 h-3 fill-current" /> {running ? 'Running...' : 'Execute'}
        </button>
      </div>
    </div>
  );
};
