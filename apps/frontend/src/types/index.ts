export type NodeType = 
  | 'PERSON' 
  | 'PHONE' 
  | 'EMAIL' 
  | 'VEHICLE' 
  | 'LOCATION' 
  | 'ORGANIZATION' 
  | 'ACCOUNT' 
  | 'TRANSACTION' 
  | 'CASE' 
  | 'EVENT' 
  | 'DOCUMENT' 
  | 'SOCIAL_ACCOUNT';

export type RelationshipType = 
  | 'CALLED' 
  | 'CONTACTED' 
  | 'LOCATED_AT' 
  | 'TRAVELLED_TO' 
  | 'OWNED' 
  | 'OWNS'
  | 'REGISTERED_TO' 
  | 'TRANSFERRED_TO' 
  | 'WORKS_FOR' 
  | 'ASSOCIATED_WITH' 
  | 'RELATED_TO' 
  | 'PARTICIPATED_IN' 
  | 'MENTIONED_IN' 
  | 'PAID' 
  | 'RECEIVED' 
  | 'CONNECTED_TO'
  | 'USES'
  | 'OPERATES'
  | 'OPERATES_FROM'
  | 'DISPATCHED'
  | 'INTERCEPTED_AT'
  | 'COORDINATES_WITH'
  | 'DEPOSITED_TO'
  | string;

export interface Node {
  id: string;
  type: NodeType;
  label: string;
  confidence: number;
  attributes?: Record<string, any>;
  is_possible_duplicate?: boolean;
  canonical_id?: string;
  created_at?: string;
}

export interface Edge {
  id?: string;
  source: string;
  target: string;
  type: RelationshipType;
  confidence: number;
  source_document: string;
  timestamp?: string;
  extraction_method?: string;
  evidence?: string;
  attributes?: Record<string, any>;
}

export interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

export interface Case {
  id: string;
  name: string;
  description: string;
  created_at: string;
  document_ids: string[];
  node_count: number;
  edge_count: number;
}

export interface KeyPlayer {
  id: string;
  label: string;
  type: NodeType;
  composite_score: number;
  degree_centrality: number;
  betweenness_centrality: number;
  pagerank: number;
}

export interface AnalyticsResponse {
  centrality: {
    degree_centrality: Record<string, number>;
    betweenness_centrality: Record<string, number>;
    pagerank: Record<string, number>;
  };
  communities: Array<{
    community_id: number;
    members: string[];
  }>;
  top_key_players: KeyPlayer[];
}

export interface InvestigatorResponse {
  answer: string;
  query: Record<string, any>;
  results: Array<Record<string, any>>;
  evidence: string[];
  highlight_nodes: string[];
  highlight_edges: string[];
  confidence: number;
}

export interface EvidenceDocument {
  id: string;
  filename: string;
  file_type: string;
  content: string;
  uploaded_at: string;
}

export type RuntimeMode = 'live' | 'demo' | 'offline';

export interface InvestigativePriorityTarget {
  person_id: string;
  name: string;
  role_hypothesis: string;
  priority_score: number;
  evidence_support_score: number;
  centrality_metrics: Record<string, number>;
  corroboration_sources: string[];
  hypotheses: string[];
  statutory_review_items: string[];
  suggested_inquiries: string[];
}

export interface InvestigativePriorityResponse {
  case_id: string;
  runtime_mode: string;
  status: string;
  summary: string;
  priority_targets: InvestigativePriorityTarget[];
  network_resilience_hypotheses: Array<{
    node_id: string;
    label: string;
    type: string;
    articulation_point: boolean;
    hypothesis: string;
    verification_check: string;
  }>;
  investigative_directives: Array<{
    directive_id: string;
    priority: string;
    action: string;
    legal_framework: string;
    requires_legal_review: boolean;
    target_entity: string;
  }>;
  statutory_disclaimer: string;
}

export interface AudioTranscriptSegment {
  segment_id: number;
  start_time_seconds: number;
  end_time_seconds: number;
  speaker: string;
  text: string;
  entities: string[];
  evidence_id: string;
  is_edited?: boolean;
  edited_by?: string;
}

export interface AudioTranscriptResponse {
  case_id: string;
  audio_url: string;
  audio_filename: string;
  duration_seconds: number;
  segments: AudioTranscriptSegment[];
  sha256_hash?: string;
}

export interface MLModelEvaluationResponse {
  case_id: string;
  status: string;
  document_classification_metrics: {
    accuracy: number;
    f1_macro: number;
    evaluated_documents: number;
    classes_detected: string[];
  };
  entity_extraction_metrics: {
    precision: number;
    recall: number;
    f1_score: number;
    total_entities_evaluated: number;
  };
  graph_modularity_score: number;
  link_prediction_metrics: {
    mean_reciprocal_rank: number;
    top_5_hit_rate: number;
  };
  evaluation_notes: string;
}

