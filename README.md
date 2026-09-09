# 🛡️ TRACE — Criminal Network Intelligence & Decision-Support Platform

**TRACE** is an evidence-first, case-driven criminal intelligence and topological decision-support system designed for law enforcement investigators, special investigation teams (SIT), and criminal-intelligence analysts (SIH 2026).

> [!IMPORTANT]
> **Operating Standard — Decision Support Only**:
> TRACE is an investigator decision-support system—**not** an automated guilt, arrest, warrant, interrogation, or deception-detection machine.
> 1. It never labels an individual "guilty" from graph centrality, correlations, or model output.
> 2. All priority scores are calibrated, evidence-backed scores: *Investigative priority score*, *Evidence support score*, and *Link confidence*.
> 3. No simulated biometrics (heart rate, pupil dilation, stress percentages) or forced confessions.
> 4. Interview preparation is non-leading, evidence-led, and strictly cites exhibits with mandatory non-coercion statutory notices (Section 161 CrPC / Section 180 BNSS, Article 20(3)).
> 5. Statutory mentions explicitly mandate: *Requires independent prosecutorial and judicial review*.
> 6. Authoritative runtime mode tracking (`live` | `demo` | `offline`) with cryptographic SHA-256 provenance and audit logging.

---

## 🏛️ System Architecture

* **Backend**: FastAPI (Python 3.10+), NetworkX graph analytics, SQLite (WAL mode persistence), Pydantic v2 schemas.
* **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, 3D WebGL Canvas (Three.js/force-graph), Cytoscape.js 2D, HTML5 Audio Player.
* **Core Investigation Engines**:
  * **Investigative Priority Engine**: Computes unclamped investigative priority scores (0–100) and multi-source evidence support metrics, identifies network cut-vertices (articulation disruption nodes), and synthesizes 72-hour operational playbooks.
  * **Evidence-Led Interview Preparation Assistant**: Formulates non-leading, objective interview plans for any `PERSON` node, referencing concrete evidence IDs with mandatory Article 20(3) non-coercion advisories and SQLite audit logging.
  * **Universal Multi-Modal ETL**: Ingests telecom CDR/IPDR CSVs, banking SWIFT/wire transfers, ANPR highway toll scans, and FIR/surveillance transcripts with cryptographic SHA-256 integrity checks and PDF extraction.
  * **Audio Evidence & Intercept Transcript Suite**: Interactive waveform scrubbing, synchronized playback, speaker diarization tags, entity extraction, and audit trails.
  * **Topological Link Prediction & Graph ML**: Adamic-Adar, Resource Allocation, Jaccard coefficients, Louvain community clustering, and cut-point articulation analysis.
  * **Judicial Application Package Generator**: Section 65B-compliant evidence dossiers with SHA-256 exhibit validation and mandatory prosecutorial review notices.

---

## 🚀 Quickstart Guide

### 1. Prerequisites
* **Python**: 3.10 or higher
* **Node.js**: v18 or higher (npm v9+)
* **Git**

---

### 2. Backend Setup

```bash
# Navigate to backend directory
cd apps/backend

# (Optional) Create and activate virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install scipy pypdf

# Launch FastAPI backend server
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

* Backend API runs at: **http://127.0.0.1:8000**
* Interactive Swagger Docs: **http://127.0.0.1:8000/docs**
* Authoritative System Mode: **http://127.0.0.1:8000/api/system/mode**

---

### 3. Frontend Setup

```bash
# In a new terminal, navigate to frontend directory
cd apps/frontend

# Install dependencies
npm install

# Start local development server
npm run dev

# OR build production bundle and preview
npm run build
npm run preview
```

* TRACE Web Console runs at: **http://localhost:3000**

---

## 🧪 Running Test Suites

TRACE includes 48 comprehensive automated tests covering universal ETL, graph analytics, machine learning, security constraints, and end-to-end evidence decision support:

```bash
# Run complete test suite (48 tests, 100% passing)
pytest tests/

# Run end-to-end decision support & integrity verification test
pytest tests/test_evidence_decision_support_e2e.py

# Run exhaustive REST API test suite (38+ endpoints)
pytest tests/test_exhaustive_endpoints.py

# Run real-life landmark benchmarks (26/11, PNB Scam, Mundra Port, Pulwama)
pytest tests/test_real_life_benchmarks.py
```

---

## 📂 Repository Structure

```
Trace/
├── apps/
│   ├── backend/             # FastAPI REST service & Python reasoning engines
│   │   ├── app/
│   │   │   ├── api/         # REST router & endpoint definitions
│   │   │   ├── models/      # Pydantic v2 schemas (contracts)
│   │   │   ├── repositories/# SQLite WAL & NetworkX persistence
│   │   │   └── services/    # ETL, priority assessment, interview prep, ML
│   │   └── main.py          # FastAPI application entrypoint & synthetic cases
│   └── frontend/            # React 18 + TypeScript + 3D WebGL HUD
│       ├── src/
│       │   ├── components/  # Priority Assessment, Interview Prep, Audio Player
│       │   ├── services/    # Unified API client & offline fallbacks
│       │   └── App.tsx      # Main application state & routing
│       └── package.json
├── data/                    # Synthetic benchmarks & ground truth datasets
├── docs/                    # Architectural guidelines & operating standards
└── tests/                   # Automated unit, integration & E2E benchmark suites
```

---

## 🔒 Legal Integrity & Evidence Compliance

* **Section 65B Indian Evidence Act / Section 63 Bharatiya Sakshya Adhiniyam (BSA)**: All ingested files and exported exhibits carry cryptographic SHA-256 hashes verifying chain-of-custody.
* **Non-Coercion Compliance**: Interview preparation strictly respects Section 161 CrPC / Section 180 BNSS and Article 20(3) of the Constitution of India against self-incrimination.
* **Prosecutorial Oversight**: Automated drafts are clearly demarcated as decision-support aids requiring independent verification and filing by authorized legal counsel.

---

## 👥 Authors & License

Maintained by the TRACE Intelligence Development Team for Smart India Hackathon (SIH 2026).
