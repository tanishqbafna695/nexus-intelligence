# TRACE — Feature Integration Plan (Wire the 9 Dead Components)

**Goal:** Make every built feature reachable in the UI. Current state: 9 fully-coded
components + 2 stubbed API functions are unused. All 9 have working backend endpoints
(except where noted) — this is pure frontend wiring.

**Ground rules per phase:**
1. One phase = one commit. Typecheck (`npx tsc --noEmit`) + `npx vite build` before committing.
2. Never touch working features — only add imports, tabs, state, and buttons.
3. Test in the browser after each phase: server up (`uvicorn main:app --port 8000` + `npm run dev`), click every new element.

**Key finding (do this first):** two API client functions are stubs that silently
return fake data and MUST be un-stubbed or the wired components will show empty states:
- `fetchThreatForecast` (services/api.ts ~line 656) → returns `{ current_syndicate_phase: 'INCEPTION' }` — backend endpoint `GET /cases/{id}/threat-forecast` EXISTS.
- `fetchCrossSyndicateFusion` (~line 561) → returns `{ fusion_clusters: [] }` — backend endpoint `GET /cross-syndicate-fusion` EXISTS.

Pattern for both: copy the fetch shape from `fetchCulpritAnalysis` (try/catch →
return backend JSON → fall back to current stub value on failure).

---

## Phase 0 — Safety baseline (~10 min)
- [ ] `git checkout -b feature/wire-dead-components` from the current branch.
- [ ] `cd apps/frontend && npx tsc --noEmit` — record that it passes BEFORE any change.
- [ ] Commit nothing; just confirm clean baseline.

## Phase 1 — Zero-dependency quick wins (~30 min)
*Two components need almost no props — instant demo value.*

**1a. AudioBriefingModal** — props: `{ caseId, isOpen, onClose }`
- [ ] `App.tsx`: import it, add `const [isBriefingOpen, setIsBriefingOpen] = useState(false)`.
- [ ] Render modal next to the other modals at the bottom of App.
- [ ] `AppShell.tsx`: add a "Voice Briefing" button (Volume2 icon) beside Audit/Export
      and a new `onBriefingClick?: () => void` prop.
- [ ] Pass the prop through `App.tsx`.

**1b. WiretapAudioInspector** — no props interface; self-contained (mock transcript built in)
- [ ] `App.tsx`: import it; in the left-panel sub-tab row add `'wiretap'` to the
      `['agent', 'audio', 'path', 'alerts', 'culprits']` array (label "Wiretap").
- [ ] Add render branch: `{leftSubTab === 'wiretap' && <WiretapAudioInspector />}`.
- [ ] Later (Phase 5): swap its MOCK_TRANSCRIPT for real `/cases/{id}/audio-transcripts` data.

**Verify:** Voice Briefing button opens modal with audio; Wiretap tab renders transcript.

## Phase 2 — Analytics suite: 1 new top-level tab with 3 sub-tabs (~60 min)
*All three analytics components are self-fetching; only props plumbing needed.*

- [ ] `AppShell.tsx`: add tab `{ id: 'analytics', label: 'Intelligence Analytics', icon: BarChart3 }`.
- [ ] `App.tsx`: import the 3 components; add state `const [analyticsSubTab, setAnalyticsSubTab] = useState('overview')`.
- [ ] Fetch once when tab opens: `const [analyticsData, setAnalyticsData] = useState<AnalyticsResponse | null>(null)`
      and `useEffect(() => { if (currentTab === 'analytics') fetchAnalytics(caseId).then(setAnalyticsData); }, [currentTab, caseId])`.
- [ ] Render block for `currentTab === 'analytics'`:
  - Sub-tab `overview` → `<AnalyticsDashboard analytics={analyticsData} onSelectNode={(nid) => { const n = graphData.nodes.find(n => n.id === nid); if (n) setSelectedNode(n); setCurrentTab('workspace'); }} />`
  - Sub-tab `ml` → `<MLModelInspector caseId={caseId} onFocusNode={...same as above} onApplyHighlight={handleApplyHighlight} />`
  - Sub-tab `fusion` → `<CrossSyndicateFusion onSelectCase={(cid) => { setCaseId(cid); setCurrentTab('workspace'); }} />`
- [ ] **Un-stub `fetchCrossSyndicateFusion`** (see pattern above).

**Verify:** Analytics tab loads overview charts, ML metrics populate, fusion clusters render (non-empty with backend running).

## Phase 3 — Tactical intelligence: 2 tabs + un-stub forecast (~45 min)

**3a. ThreatForecastConsole** — props: `{ caseId }`
- [ ] **Un-stub `fetchThreatForecast`** first (copy shape from `fetchCulpritAnalysis`).
- [ ] New tab `{ id: 'forecast', label: 'Threat Forecast', icon: TrendingUp }`.
- [ ] Render: `{currentTab === 'forecast' && <ThreatForecastConsole caseId={caseId} />}`.

**3b. PoliceSolutionsPanel** — props: `{ caseId, onOpenWarrantModal?, onOpenIngestionModal? }`
- [ ] Merge into the existing `investigative_priorities` tab as a second section, OR give it
      its own tab `{ id: 'police_solutions', label: 'Tactical Solutions', icon: ShieldCheck }`
      (own tab is cleaner; InvestigativePriorityPanel already has `onOpenWarrantModal`).
- [ ] Render with `onOpenWarrantModal={() => setIsWarrantOpen(true)}` and
      `onOpenIngestionModal={() => setIsIngestionOpen(true)}`.

**Verify:** Forecast shows 5-phase Markov state machine with data; Solutions shows 72h playbook.

## Phase 4 — Suspect Interrogation Simulator (~30 min)
*Needs PERSON nodes passed in — wire from graph state.*

- [ ] Add tab `{ id: 'interrogation', label: 'Interview Prep', icon: MessageSquare }`.
- [ ] Render: `{currentTab === 'interrogation' && <SuspectInterrogationSimulator caseId={caseId} suspects={graphData.nodes.filter(n => n.type === 'PERSON')} />}`
- [ ] Confirm the `/cases/{id}/interrogate` POST endpoint returns live data; if demo mode,
      the component's internal fallback chat handles it (verify by clicking a suspect and sending a question).

**Verify:** Suspect list populates; a question returns a scripted/evidence-led reply.

## Phase 5 — Mission Replay + demo storyline integration (~45 min)
*Most state-heavy: needs graphData + highlight callbacks.*

- [ ] Add tab `{ id: 'replay', label: 'Mission Replay', icon: PlayCircle }`.
- [ ] Render: `{currentTab === 'replay' && <MissionReplayPlayer caseId={caseId} graphData={activeGraphData} onApplyHighlight={handleApplyHighlight} onSelectNode={setSelectedNode} />}`
- [ ] `DemoStorylineController.tsx`: add replay steps to the guided stepper so presenters
      can jump into the replay during the SIH demo.
- [ ] **Upgrade WiretapAudioInspector** (deferred from Phase 1): replace MOCK_TRANSCRIPT
      with `fetchCaseAudioTranscripts(caseId)` (API function already exists).

**Verify:** Replay steps advance the timeline, highlight nodes on the canvas, and clicking a step selects the right node.

## Phase 6 — Hardening + docs (~30 min)
- [ ] `npx tsc --noEmit && npx vite build` — both green.
- [ ] Backend: `pytest tests/test_exhaustive_endpoints.py` — the newly-consumed endpoints
      (`threat-forecast`, `cross-syndicate-fusion`, `police-solutions`, `interrogate`) all covered.
- [ ] Full manual pass through every tab in the browser; fix any empty-state handling.
- [ ] Update `AGENTS.md`: tab list changed (7 → 12 tabs), note the two un-stubbed API functions.
- [ ] Commit per phase (already done incrementally) and push the branch for the maintainer's PR.

---

## Final tab order in AppShell (after all phases)
1. Mission Portal  2. Case Workspace  3. Intelligence Analytics  4. Priority Assessment
5. Tactical Solutions  6. Threat Forecast  7. Interview Prep  8. Mission Replay
9. Forensic Ledger  10. Network Canvas  11. Timeline  12. Geo Radar

**Effort total:** ~4 hours of wiring, zero new backend work, zero new dependencies.
