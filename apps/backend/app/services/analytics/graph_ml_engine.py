"""
Graph Machine Learning & Topological Link Prediction Engine
Implements mathematical link prediction algorithms (Adamic-Adar, Resource Allocation, Jaccard, Preferential Attachment),
Spectral Random-Walk embeddings, Hawala circular layering cycle detection, and Articulation Point vulnerability analysis.
"""

import math
import numpy as np
import networkx as nx
from typing import List, Dict, Any, Tuple, Optional
from app.repositories.base import GraphRepository
from app.models.schema import Node, Edge

class GraphMLEngine:
    def __init__(self, repo: GraphRepository):
        self.repo = repo
        self._nx_graph = getattr(repo, 'graph', None)
        if self._nx_graph is None:
            # Reconstruct NetworkX DiGraph if not directly accessible
            self._nx_graph = nx.DiGraph()
            all_data = repo.get_all()
            for n in all_data.nodes:
                self._nx_graph.add_node(n.id, type=n.type, label=n.label, confidence=n.confidence)
            for e in all_data.edges:
                self._nx_graph.add_edge(e.source, e.target, id=e.id, type=e.type, confidence=e.confidence)

    def get_undirected_graph(self) -> nx.Graph:
        """Returns undirected copy for symmetric topological neighbor analysis."""
        return self._nx_graph.to_undirected()

    # ── 1. Mathematical Link Prediction Suite ────────────────────────────────
    def predict_missing_links(self, top_k: int = 10, min_score: float = 0.15) -> List[Dict[str, Any]]:
        """
        Predicts hidden/unobserved conspirator relationships using topological link prediction.
        Combines Adamic-Adar, Resource Allocation, Jaccard Index, and Preferential Attachment.
        """
        ug = self.get_undirected_graph()
        nodes = list(ug.nodes())
        num_nodes = len(nodes)
        
        if num_nodes < 3:
            return []

        predicted_links = []
        node_map = {n.id: n for n in self.repo.get_all().nodes}

        # Iterate over all non-adjacent pairs (u, v) where u != v and not connected
        for i in range(num_nodes):
            u = nodes[i]
            neighbors_u = set(ug.neighbors(u))
            deg_u = len(neighbors_u)

            for j in range(i + 1, num_nodes):
                v = nodes[j]
                
                # Skip if edge already exists in directed or undirected graph
                if ug.has_edge(u, v):
                    continue

                neighbors_v = set(ug.neighbors(v))
                deg_v = len(neighbors_v)
                
                common_neighbors = neighbors_u.intersection(neighbors_v)
                num_common = len(common_neighbors)

                if num_common == 0 and (deg_u == 0 or deg_v == 0):
                    continue

                # 1. Adamic-Adar Index: sum(1 / log(|N(z)|)) for z in common_neighbors
                adamic_adar = 0.0
                for z in common_neighbors:
                    deg_z = ug.degree(z)
                    if deg_z > 1:
                        adamic_adar += 1.0 / math.log(deg_z)

                # 2. Resource Allocation Index: sum(1 / |N(z)|) for z in common_neighbors
                resource_alloc = 0.0
                for z in common_neighbors:
                    deg_z = ug.degree(z)
                    if deg_z > 0:
                        resource_alloc += 1.0 / deg_z

                # 3. Jaccard Similarity Coefficient: |N(u) ∩ N(v)| / |N(u) ∪ N(v)|
                union_neighbors = neighbors_u.union(neighbors_v)
                jaccard = (num_common / len(union_neighbors)) if len(union_neighbors) > 0 else 0.0

                # 4. Preferential Attachment: |N(u)| * |N(v)|
                preferential = float(deg_u * deg_v) / max(float(num_nodes * 2), 1.0)

                # Composite Link Probability Score (Calibrated Logistic Sigmoid)
                # Weights: Adamic-Adar (40%), Resource Allocation (30%), Jaccard (20%), Preferential Attachment (10%)
                linear_comb = (0.45 * adamic_adar) + (0.35 * resource_alloc) + (0.15 * jaccard * 5.0) + (0.05 * preferential)
                link_prob = float(1.0 / (1.0 + math.exp(-2.5 * linear_comb + 1.2)))
                
                # Boost confidence if both are persons or high-centrality entities
                u_node = node_map.get(u)
                v_node = node_map.get(v)
                if u_node and v_node:
                    if u_node.type == "PERSON" and v_node.type == "PERSON":
                        link_prob = min(link_prob * 1.15, 0.98)

                if link_prob >= min_score and num_common > 0:
                    common_labels = [node_map.get(z).label if node_map.get(z) else z for z in common_neighbors]
                    predicted_links.append({
                        "source_id": u,
                        "source_label": u_node.label if u_node else u,
                        "source_type": u_node.type if u_node else "UNKNOWN",
                        "target_id": v,
                        "target_label": v_node.label if v_node else v,
                        "target_type": v_node.type if v_node else "UNKNOWN",
                        "link_probability": round(link_prob, 4),
                        "adamic_adar_score": round(adamic_adar, 4),
                        "resource_allocation_score": round(resource_alloc, 4),
                        "jaccard_coefficient": round(jaccard, 4),
                        "shared_intermediaries_count": num_common,
                        "shared_intermediaries": common_labels[:5],
                        "inference_rationale": (
                            f"High structural co-occurrence via {num_common} mutual contacts "
                            f"({', '.join(common_labels[:2])}). Strong likelihood of covert coordination."
                        )
                    })

        # Sort descending by predicted link probability
        predicted_links.sort(key=lambda x: x["link_probability"], reverse=True)
        return predicted_links[:top_k]

    # ── 2. Hawala Smurfing & Circular Laundering Cycles ───────────────────────
    def detect_money_laundering_cycles(self, max_cycle_length: int = 6) -> List[Dict[str, Any]]:
        """
        Detects circular financial structuring, smurfing, and Hawala layering loops
        using Tarjan's / Johnson's elementary cycle decomposition.
        """
        cycles_found = []
        node_map = {n.id: n for n in self.repo.get_all().nodes}

        # Filter subgraph to financial / transfer / associated relations
        financial_edges = [
            (u, v, d) for u, v, d in self._nx_graph.edges(data=True)
            if any(t in d.get("type", "").upper() for t in ["TRANSFER", "TRANSACTION", "TX", "WIRE", "PAID", "FINANCIAL", "CALL", "ASSOCIATED", "MEETING"])
        ]
        
        sub_g = nx.DiGraph()
        for u, v, d in financial_edges:
            sub_g.add_edge(u, v, **d)

        try:
            raw_cycles = list(nx.simple_cycles(sub_g))
        except Exception:
            raw_cycles = []

        for c in raw_cycles:
            cycle_len = len(c)
            if 3 <= cycle_len <= max_cycle_length:
                # Compute cycle risk metrics
                path_labels = [node_map.get(nid).label if node_map.get(nid) else nid for nid in c]
                path_types = [node_map.get(nid).type if node_map.get(nid) else "UNKNOWN" for nid in c]
                
                # Check for bank accounts or shell companies in cycle
                has_financial = any(t in ["ACCOUNT", "ORGANIZATION"] for t in path_types)
                risk_score = 70.0 + (min(cycle_len, 5) * 5.0) + (10.0 if has_financial else 0.0)

                cycles_found.append({
                    "cycle_id": f"CYCLE_{len(cycles_found) + 1}",
                    "length": cycle_len,
                    "nodes": c,
                    "node_labels": path_labels,
                    "node_types": path_types,
                    "risk_score": min(risk_score, 99.0),
                    "pattern_type": "Circular Hawala Layering Loop" if has_financial else "Closed Conspirator Relay Circuit",
                    "description": f"Circular chain connecting {' → '.join(path_labels[:4])} → {path_labels[0]}."
                })

        cycles_found.sort(key=lambda x: x["risk_score"], reverse=True)
        return cycles_found[:10]

    # ── 3. Network Articulation Points (Critical Cut-Vertices) ────────────────
    def analyze_network_vulnerability(self) -> Dict[str, Any]:
        """
        Identifies articulation points (cut-vertices) and bridges whose tactical neutralization
        will shatter the criminal network into disconnected clusters.
        """
        ug = self.get_undirected_graph()
        node_map = {n.id: n for n in self.repo.get_all().nodes}

        if len(ug.nodes) < 2:
            return {"articulation_points": [], "bridges": [], "network_resilience_index": 1.0}

        try:
            art_points = list(nx.articulation_points(ug))
        except Exception:
            art_points = []

        try:
            bridges = list(nx.bridges(ug))
        except Exception:
            bridges = []

        # Calculate network resilience index (0 = brittle / bottlenecked, 100 = decentralized mesh)
        density = nx.density(ug)
        resilience = round(density * 100.0, 1)

        critical_targets = []
        for ap in art_points:
            n = node_map.get(ap)
            deg = ug.degree(ap)
            betweenness = nx.betweenness_centrality(ug).get(ap, 0.0)

            critical_targets.append({
                "id": ap,
                "label": n.label if n else ap,
                "type": n.type if n else "UNKNOWN",
                "degree": deg,
                "betweenness": round(betweenness, 4),
                "impact": "CRITICAL_BOTTLENECK",
                "tactical_value": "Arresting or freezing this node severs network operational continuity."
            })

        critical_targets.sort(key=lambda x: x["betweenness"], reverse=True)

        bridge_list = []
        for u, v in bridges:
            u_n = node_map.get(u)
            v_n = node_map.get(v)
            bridge_list.append({
                "source_id": u,
                "source_label": u_n.label if u_n else u,
                "target_id": v,
                "target_label": v_n.label if v_n else v,
                "description": f"Critical communication/transit bridge between {u_n.label if u_n else u} and {v_n.label if v_n else v}."
            })

        return {
            "network_resilience_index": resilience,
            "is_vulnerable_to_decapitation": len(critical_targets) > 0,
            "critical_articulation_targets": critical_targets,
            "sole_transit_bridges": bridge_list,
            "total_cut_vertices": len(art_points),
            "total_bridges": len(bridges)
        }

    # ── 4. Spectral Node Embeddings & Structural Similarity ───────────────────
    def compute_structural_embeddings(self) -> Dict[str, List[float]]:
        """
        Computes continuous dense structural embeddings via truncated random walk transition matrices.
        Allows cosine distance clustering of functionally equivalent conspirators.
        """
        ug = self.get_undirected_graph()
        nodes = list(ug.nodes())
        n_count = len(nodes)
        
        if n_count == 0:
            return {}

        dim = min(8, n_count)
        # Normalized Laplacian Matrix
        try:
            L = nx.normalized_laplacian_matrix(ug).toarray()
            eigenvalues, eigenvectors = np.linalg.eigh(L)
            # Take first 'dim' eigenvectors as spectral coordinates
            embedding_matrix = eigenvectors[:, :dim]
            
            embeddings = {}
            for idx, nid in enumerate(nodes):
                vec = embedding_matrix[idx].tolist()
                embeddings[nid] = [round(float(x), 4) for x in vec]
            return embeddings
        except Exception:
            # Fallback simple degree/neighbor vector
            return {nid: [round(ug.degree(nid) / max(n_count, 1), 4)] for nid in nodes}
