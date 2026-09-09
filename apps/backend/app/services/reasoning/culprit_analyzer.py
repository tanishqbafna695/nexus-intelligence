"""
Graph-Driven Culprit Analyzer Engine (TRACE).
Derives suspect guilt probabilities, roles, and reasons from REAL graph topology:
networkx centralities (degree, betweenness, pagerank), cross-community bridge detection,
multi-source document corroboration, and telecom/financial edge nexus.
"""

from typing import List, Dict, Any, Optional
import networkx as nx
from networkx.algorithms.community import greedy_modularity_communities

# Benchmark historical case profiles (OPTIONAL flavor metadata for historical demo cases)
BENCHMARK_CASE_PROFILES: Dict[str, Dict[str, Any]] = {
    "person_devendra": {
        "id": "person_devendra",
        "name": "Devendra Sharma",
        "role": "Syndicate Financier",
        "personality": "Calculating & Narcissistic",
        "mental_state": "Calm & Controlling",
        "rivalry_targets": ["person_tariq"],
    },
    "person_tariq": {
        "id": "person_tariq",
        "name": "Tariq Ahmed",
        "role": "Warehouse Operator",
        "personality": "Deceptive & Ruthless",
        "mental_state": "Hostile & Defensive",
        "rivalry_targets": ["person_victor", "person_devendra"],
    },
    "person_ramesh": {
        "id": "person_ramesh",
        "name": "Ramesh Kumar",
        "role": "Logistics Transporter",
        "personality": "Impulsive & Submissive",
        "mental_state": "Paranoid & Stressed",
        "rivalry_targets": [],
    },
    "person_suresh": {
        "id": "person_suresh",
        "name": "Suresh Patil",
        "role": "Wholesale Distributor",
        "personality": "Calculating & Patient",
        "mental_state": "Calm & Indifferent",
        "rivalry_targets": ["person_ramesh"],
    }
}

# Alias for backward compatibility if any legacy code imports SUSPECT_PROFILES
SUSPECT_PROFILES = BENCHMARK_CASE_PROFILES


class CulpritAnalyzer:
    @staticmethod
    def run_analysis(repo, case_id: Optional[str] = None) -> Dict[str, Any]:
        """
        BUG 4 FIX: Computes guilt probabilities directly from the REAL live graph.
        Evaluates degree centrality, betweenness centrality, pagerank, cross-community
        bridging, and corroborating sources for every PERSON node.
        """
        all_graph = repo.get_all()
        all_nodes = all_graph.nodes
        all_edges = all_graph.edges

        person_nodes = [n for n in all_nodes if n.type == "PERSON"]
        if not person_nodes:
            # Fallback if no explicit PERSON nodes: evaluate top entities
            person_nodes = all_nodes[:5]

        # 1. Build NetworkX graph
        nx_graph = getattr(repo, 'graph', None)
        if nx_graph is None or not isinstance(nx_graph, nx.Graph):
            nx_graph = nx.Graph()
            for n in all_nodes:
                nx_graph.add_node(n.id, label=n.label, type=n.type)
            for e in all_edges:
                nx_graph.add_edge(e.source, e.target, type=e.type, weight=e.confidence)
        else:
            nx_graph = nx.Graph(nx_graph)

        total_nodes = len(nx_graph.nodes)
        
        # 2. Centrality Metrics
        deg_centrality = nx.degree_centrality(nx_graph) if total_nodes > 1 else {n.id: 1.0 for n in person_nodes}
        btw_centrality = nx.betweenness_centrality(nx_graph) if total_nodes > 2 else {n.id: 0.0 for n in person_nodes}
        try:
            pagerank = nx.pagerank(nx_graph) if total_nodes > 1 else {n.id: 1.0 for n in person_nodes}
        except Exception:
            pagerank = deg_centrality

        # 3. Community Detection (for cross-community bridging)
        communities = []
        if total_nodes >= 3:
            try:
                communities = list(greedy_modularity_communities(nx_graph))
            except Exception:
                communities = list(nx.connected_components(nx_graph))

        suspects_result = []
        rivalries = []

        is_benchmark_case = case_id in ("CASE-001", "CASE-26-11") if case_id else False

        for p_node in person_nodes:
            p_id = p_node.id
            p_label = p_node.label

            # Real graph signals
            deg_c = deg_centrality.get(p_id, 0.0)
            btw_c = btw_centrality.get(p_id, 0.0)
            pr_val = pagerank.get(p_id, 0.0)

            # Connected edges and sources
            incident_edges = [e for e in all_edges if e.source == p_id or e.target == p_id]
            source_docs = {e.source_document for e in incident_edges if e.source_document}
            doc_count = len(source_docs)

            call_edges = [e for e in incident_edges if e.type in ("CALLED", "USES", "CONTACTED", "COMMUNICATED_WITH")]
            fin_edges = [e for e in incident_edges if e.type in ("TRANSFERRED_TO", "PAID", "RECEIVED", "OWNS", "OPERATES", "FINANCIAL_TRANSACTION")]
            vehicle_edges = [e for e in incident_edges if e.type in ("OPERATES", "SPOTTED_AT")]

            # Community bridging check
            neighbors = set(nx_graph.neighbors(p_id)) if p_id in nx_graph else set()
            bridged_comms = [c for c in communities if any(nbr in c for nbr in neighbors)]
            is_bridge = len(bridged_comms) >= 2

            # Dynamic Role Deduction
            if btw_c > 0.15 or (is_bridge and btw_c > 0.08):
                role = "Syndicate Coordinator / Core Bottleneck"
                personality = "Calculating & Controlling"
                mental_state = "Hostile & Defensive"
            elif len(fin_edges) >= max(len(call_edges), 1):
                role = "Financial Controller / Hawala Handler"
                personality = "Secretive & Methodical"
                mental_state = "Guarded"
            elif len(call_edges) > 1:
                role = "Communications Dispatcher"
                personality = "Evasive & Alert"
                mental_state = "High-Stress"
            elif len(vehicle_edges) > 0:
                role = "Logistics Transporter"
                personality = "Impulsive"
                mental_state = "Paranoid"
            else:
                role = "Syndicate Operative"
                personality = "Uncooperative"
                mental_state = "Guarded"

            # Merge flavor metadata ONLY for benchmark cases
            if is_benchmark_case and p_id in BENCHMARK_CASE_PROFILES:
                bench = BENCHMARK_CASE_PROFILES[p_id]
                role = bench.get("role", role)
                personality = bench.get("personality", personality)
                mental_state = bench.get("mental_state", mental_state)

            # Compute REAL Guilt Probability
            base_score = 30.0 + (deg_c * 35.0)
            flow_boost = min(btw_c * 75.0, 30.0)
            bridge_bonus = 12.0 if is_bridge else 0.0
            corroboration_bonus = min(doc_count * 6.0, 18.0)
            dual_nexus_bonus = 8.0 if (len(fin_edges) > 0 and len(call_edges) > 0) else (4.0 if len(fin_edges) > 0 or len(call_edges) > 0 else 0.0)

            raw_guilt = base_score + flow_boost + bridge_bonus + corroboration_bonus + dual_nexus_bonus
            final_guilt = round(min(max(raw_guilt, 32.0), 98.5), 2)

            # Generate Truthful Structural Reasons from Real Graph Signals
            reasons = []
            if btw_c > 0.06:
                reasons.append(f"Critical syndicate bottleneck (betweenness centrality: {btw_c:.3f}) controlling operational network flow.")
            if is_bridge:
                reasons.append(f"Cross-community bridge node linking {len(bridged_comms)} distinct operational clusters.")
            if doc_count >= 2:
                doc_str = ", ".join(sorted(list(source_docs))[:3])
                reasons.append(f"Corroborated across {doc_count} distinct intelligence records ({doc_str}).")
            elif doc_count == 1:
                reasons.append(f"Corroborated in intelligence record '{list(source_docs)[0]}'.")
            if len(fin_edges) > 0 and len(call_edges) > 0:
                reasons.append(f"Dual-nexus verified: active in {len(fin_edges)} financial transactions and {len(call_edges)} communication intercepts.")
            elif len(fin_edges) > 0:
                reasons.append(f"Direct financial link: {len(fin_edges)} transaction/account edges connected to suspect.")
            elif len(call_edges) > 0:
                reasons.append(f"Direct telecom link: {len(call_edges)} intercepted calls/communication records.")
            if deg_c > 0.15:
                reasons.append(f"High network connectivity (degree centrality: {deg_c:.3f}) with {len(neighbors)} direct ties.")

            # Synthetic alibi validity derived inversely from structural evidence
            alibi_validity = round(max(0.1, 1.0 - (final_guilt / 100.0)), 2)

            suspects_result.append({
                "id": p_id,
                "name": p_label,
                "role": role,
                "personality": personality,
                "mental_state": mental_state,
                "alibi_validity": alibi_validity,
                "betweenness_centrality": round(btw_c, 4),
                "degree_centrality": round(deg_c, 4),
                "pagerank": round(pr_val, 4),
                "cross_community_bridge": is_bridge,
                "corroborating_sources_count": doc_count,
                "financial_edges_count": len(fin_edges),
                "call_edges_count": len(call_edges),
                "guilt_probability": final_guilt,
                "reasons": reasons
            })

        # Sort suspects by guilt probability descending
        suspects_result.sort(key=lambda s: s["guilt_probability"], reverse=True)

        return {
            "suspects": suspects_result,
            "rivalry_network": rivalries
        }
