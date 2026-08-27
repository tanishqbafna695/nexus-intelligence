# NEXUS Intelligence — System Architecture

## Objective

NEXUS is an AI-powered investigator-assistance platform for analyzing fragmented crime-related data and discovering relationships between entities.

## Core Pipeline

Data Sources
    ↓
Data Ingestion
    ↓
Entity Extraction
    ↓
Entity Resolution
    ↓
Relationship Extraction
    ↓
Knowledge Graph
    ↓
Graph Analytics
    ↓
AI Investigation Layer
    ↓
Investigator Dashboard

## Initial Technology Stack

### Backend
- Python
- FastAPI

### Data Processing
- pandas
- Pydantic

### NLP / AI
- Hugging Face Transformers
- Local/open-weight AI models

### Graph
- NetworkX

### Database
- SQLite initially

### Frontend
- Streamlit initially

## Design Principles

1. Evidence-backed results
2. Source and timestamp attached to relationships
3. Confidence scores
4. AI cannot invent graph facts
5. Graph/database is the factual source
6. Synthetic data contains known ground truth
7. Components must remain replaceable
8. Build end-to-end before adding advanced features