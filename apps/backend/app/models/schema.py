"""
Canonical Pydantic Data Models for TRACE Criminal Network Analysis System
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, field_validator
from datetime import datetime, timezone

def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

# Node Types & Relationship Types taxonomy — strict allowlists
NODE_TYPES = {
    "PERSON", "PHONE", "EMAIL", "VEHICLE", "LOCATION",
    "ORGANIZATION", "ACCOUNT", "TRANSACTION", "CASE",
    "EVENT", "DOCUMENT", "SOCIAL_ACCOUNT"
}

RELATIONSHIP_TYPES = {
    "CALLED", "CONTACTED", "LOCATED_AT", "TRAVELLED_TO", "OWNED", "OWNS",
    "REGISTERED_TO", "TRANSFERRED_TO", "WORKS_FOR", "ASSOCIATED_WITH",
    "RELATED_TO", "PARTICIPATED_IN", "MENTIONED_IN", "PAID",
    "RECEIVED", "CONNECTED_TO", "USES", "OPERATES", "OPERATES_FROM",
    "DISPATCHED", "INTERCEPTED_AT", "COORDINATES_WITH", "CONSIGNED_TO", "DEPOSITED_TO"
}

class Node(BaseModel):
    id: str = Field(max_length=256)
    type: str = Field(max_length=64)
    label: str = Field(max_length=512)
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    attributes: Dict[str, Any] = Field(default_factory=dict)
    is_possible_duplicate: bool = False
    canonical_id: Optional[str] = Field(default=None, max_length=256)
    created_at: str = Field(default_factory=utc_now_iso)

    @field_validator("type")
    @classmethod
    def validate_node_type(cls, v: str) -> str:
        """Enforce node type against the canonical taxonomy allowlist."""
        upper_v = v.upper().strip()
        if upper_v not in NODE_TYPES:
            # Accept gracefully for flexibility but normalise to UNKNOWN
            return "UNKNOWN"
        return upper_v

class Edge(BaseModel):
    id: Optional[str] = Field(default=None, max_length=256)
    source: str = Field(max_length=256)
    target: str = Field(max_length=256)
    type: str = Field(max_length=64)
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    source_document: str = Field(max_length=512)
    timestamp: str = Field(default_factory=utc_now_iso)
    extraction_method: str = Field(default="ner+rule", max_length=64)
    evidence: str = Field(default="", max_length=2048)
    attributes: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("type")
    @classmethod
    def validate_edge_type(cls, v: str) -> str:
        """Enforce edge type against the canonical taxonomy allowlist."""
        upper_v = v.upper().strip()
        if upper_v not in RELATIONSHIP_TYPES:
            return "RELATED_TO"
        return upper_v

class Document(BaseModel):
    id: str
    filename: str
    file_type: str
    content: str
    uploaded_at: str = Field(default_factory=utc_now_iso)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class Case(BaseModel):
    id: str
    name: str
    description: str
    created_at: str = Field(default_factory=utc_now_iso)
    document_ids: List[str] = Field(default_factory=list)
    node_count: int = 0
    edge_count: int = 0

class GraphData(BaseModel):
    nodes: List[Node]
    edges: List[Edge]

class CentralityMetrics(BaseModel):
    degree_centrality: Dict[str, float]
    betweenness_centrality: Dict[str, float]
    pagerank: Dict[str, float]

class CommunityResult(BaseModel):
    community_id: int
    members: List[str]

class AnalyticsResponse(BaseModel):
    centrality: CentralityMetrics
    communities: List[CommunityResult]
    top_key_players: List[Dict[str, Any]]

class InvestigatorQueryRequest(BaseModel):
    case_id: str = Field(max_length=32)
    question: str = Field(max_length=1000)

class InvestigatorResponse(BaseModel):
    answer: str
    query: Dict[str, Any]
    results: List[Dict[str, Any]]
    evidence: List[str]
    highlight_nodes: List[str]
    highlight_edges: List[str]
    confidence: float

# ---------------------------------------------------------------------------
# Decision-Support & Evidentiary Pipeline Schemas (TRACE v2.0)
# ---------------------------------------------------------------------------

class InvestigativePriorityTarget(BaseModel):
    person_id: str
    name: str
    role_hypothesis: str
    priority_score: float = Field(ge=0.0, le=100.0)
    investigative_priority_score: Optional[float] = None
    evidence_support_score: float = Field(ge=0.0, le=100.0)
    centrality_metrics: Dict[str, float] = Field(default_factory=dict)
    corroboration_sources: List[str] = Field(default_factory=list)
    hypotheses: List[str] = Field(default_factory=list)
    statutory_review_items: List[str] = Field(default_factory=list)
    suggested_inquiries: List[str] = Field(default_factory=list)
    actionable_directives: List[str] = Field(default_factory=list)

class InvestigativePriorityResponse(BaseModel):
    case_id: str
    runtime_mode: str = "live"
    status: str
    summary: str
    priority_targets: List[InvestigativePriorityTarget] = Field(default_factory=list)
    network_resilience_hypotheses: List[Dict[str, Any]] = Field(default_factory=list)
    investigative_directives: List[Dict[str, Any]] = Field(default_factory=list)
    statutory_disclaimer: str = (
        "INVESTIGATIVE DECISION SUPPORT ONLY - Not an automated legal determination or proof of guilt. "
        "All statutory recommendations require independent prosecutorial review."
    )
    legal_notice: Optional[str] = (
        "INVESTIGATIVE DECISION SUPPORT ONLY - Not an automated legal determination or proof of guilt. "
        "All statutory recommendations require independent prosecutorial consultation."
    )


class AudioTranscriptSegment(BaseModel):
    segment_id: int
    start_time_seconds: float
    end_time_seconds: float
    speaker: str
    text: str
    entities: List[str] = Field(default_factory=list)
    evidence_id: str
    is_edited: bool = False
    edited_by: Optional[str] = None

class AudioTranscriptResponse(BaseModel):
    case_id: str
    audio_url: str
    audio_filename: str
    duration_seconds: float
    segments: List[AudioTranscriptSegment] = Field(default_factory=list)
    sha256_hash: Optional[str] = None

class MLModelEvaluationResponse(BaseModel):
    case_id: str
    status: str
    document_classification_metrics: Dict[str, Any] = Field(default_factory=dict)
    entity_extraction_metrics: Dict[str, Any] = Field(default_factory=dict)
    graph_modularity_score: float = 0.0
    link_prediction_metrics: Dict[str, Any] = Field(default_factory=dict)
    evaluation_notes: str = ""

