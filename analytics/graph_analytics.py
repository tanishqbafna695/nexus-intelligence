import json
import networkx as nx
from pathlib import Path
from typing import Dict, List, Any

class NexusGraphAnalytics:
    def __init__(self, processed_dir: str = "data/processed"):
        self.processed_dir = Path(processed_dir)
        self.graph_path = self.processed_dir / "knowledge_graph.gml"
        
        if not self.graph_path.exists():
            raise FileNotFoundError(f"Knowledge graph GML not found at {self.graph_path}. Complete Phase 8 first.")
            
        # Load the graph (using directed graph since MultiDiGraph can be converted for specific centrality algos)
        self.graph = nx.read_gml(self.graph_path)

    def compute_centrality(self) -> Dict[str, Any]:
        # Convert to simple graph or directed graph for centrality metrics
        deg_cent = nx.degree_centrality(self.graph)
        
        # Betweenness centrality helps find bridge nodes between different groups
        try:
            bet_cent = nx.betweenness_centrality(self.graph)
        except Exception:
            bet_cent = {node: 0.0 for node in self.graph.nodes()}

        # Sort nodes by degree centrality
        sorted_nodes = sorted(deg_cent.keys(), key=lambda k: deg_cent[k], reverse=True)
        
        influencers = []
        for node in sorted_nodes[:5]: # Top 5
            node_data = self.graph.nodes[node]
            influencers.append({
                "id": node,
                "name": node_data.get("name", node),
                "type": node_data.get("type", "UNKNOWN"),
                "degree_centrality": round(deg_cent[node], 4),
                "betweenness_centrality": round(bet_cent.get(node, 0.0), 4)
            })
        return influencers

    def find_shortest_path(self, source_id: str, target_id: str) -> Dict[str, Any]:
        try:
            # Use underlying undirected graph view to find connectivity paths
            undirected_g = self.graph.to_undirected()
            if not nx.has_path(undirected_g, source_id, target_id):
                return {"path": [], "evidence": "No path found between the specified entities."}
                
            path = nx.shortest_path(undirected_g, source=source_id, target=target_id)
            
            # Gather edge evidence along the path
            path_edges_evidence = []
            for i in range(len(path) - 1):
                u, v = path[i], path[i+1]
                # Extract edge data from multi-edges if available
                edge_data = self.graph.get_edge_data(u, v) or self.graph.get_edge_data(v, u)
                if edge_data:
                    # Grab the first key's data
                    first_key = list(edge_data.keys())[0]
                    details = edge_data[first_key]
                    path_edges_evidence.append({
                        "from": u,
                        "to": v,
                        "relationship": details.get("relationship", "CONNECTED"),
                        "source_document": details.get("source_document", "UNKNOWN"),
                        "evidence": details.get("evidence", "")
                    })

            return {
                "path": path,
                "hops": len(path) - 1,
                "evidence_chain": path_edges_evidence
            }
        except Exception as e:
            return {"error": str(e)}

    def run_full_analysis(self):
        print("Running NEXUS Graph Analytics...")
        influencers = self.compute_centrality()
        
        analysis_report = {
            "top_influencers": influencers,
            "total_nodes": self.graph.number_of_nodes(),
            "total_edges": self.graph.number_of_edges()
        }

        output_file = self.processed_dir / "analytics_report.json"
        with open(output_file, "w") as f:
            json.dump(analysis_report, f, indent=4)

        print(f"Analytics complete! Top influencer identified: {influencers[0]['id']} ({influencers[0]['name']})")
        print(f"Saved analytics report to {output_file}")
        return analysis_report

if __name__ == "__main__":
    analytics = NexusGraphAnalytics()
    analytics.run_full_analysis()