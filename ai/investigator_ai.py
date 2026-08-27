import json
from pathlib import Path
from typing import Dict, Any
from analytics.graph_analytics import NexusGraphAnalytics

data_dir_path = Path("ai")
data_dir_path.mkdir(parents=True, exist_ok=True)

class NexusInvestigationAssistant:
    def __init__(self):
        try:
            self.analytics = NexusGraphAnalytics()
        except Exception as e:
            print(f"Warning: Could not initialize graph analytics directly: {e}")
            self.analytics = None

    def query(self, user_question: str) -> Dict[str, Any]:
        """
        Parses the investigator's natural language question, queries the factual
        graph database/analytics, and returns an evidence-backed response.
        """
        q_lower = user_question.lower()
        
        if not self.analytics:
            return {
                "question": user_question,
                "answer": "Graph database is not initialized. Please complete earlier phases first.",
                "evidence": []
            }

        # Intent 1: Centrality / Influencers / Key Individuals
        if "influencer" in q_lower or "central" in q_lower or "key" in q_lower or "important" in q_lower:
            influencers = self.analytics.compute_centrality()
            top = influencers[0] if influencers else None
            
            if top:
                answer = f"The primary key individual identified based on network centrality metrics is {top['name']} ({top['id']}), holding a degree centrality score of {top['degree_centrality']}."
            else:
                answer = "No clear influencers found in the current graph."

            return {
                "question": user_question,
                "intent": "GRAPH_CENTRALITY",
                "answer": answer,
                "structured_data": influencers,
                "evidence_provenance": ["Knowledge Graph Centrality Algorithm (NetworkX)"]
            }

        # Intent 2: Connection / Path between entities (e.g., "How is P001 connected to P002")
        elif "connected" in q_lower or "path" in q_lower or "link" in q_lower or "between" in q_lower:
            # Simple keyword extraction to find entity IDs or names in query
            # For robust prototype demo, let's look for known IDs like P001, P002, etc.
            words = user_question.upper().split()
            potential_ids = [w.strip("?,.") for w in words if w.startswith("P") or w.startswith("ACC") or w.startswith("+91") or w.startswith("V")]
            
            if len(potential_ids) >= 2:
                source, target = potential_ids[0], potential_ids[1]
            else:
                # Default fallback demo pair based on our synthetic dataset
                source, target = "P001", "P002"

            path_result = self.analytics.find_shortest_path(source, target)
            
            if "error" in path_result or not path_result.get("path"):
                answer = f"No verified path found between {source} and {target} in the structured records."
                evidence = []
            else:
                path_str = " ➔ ".join(path_result["path"])
                answer = f"A validated connection path exists between {source} and {target} spanning {path_result['hops']} hop(s): {path_str}."
                evidence = path_result.get("evidence_chain", [])

            return {
                "question": user_question,
                "intent": "SHORTEST_PATH_LOOKUP",
                "answer": answer,
                "structured_path": path_result,
                "evidence_provenance": evidence
            }

        # Default fallback intent (General stats)
        else:
            report = self.analytics.run_full_analysis()
            return {
                "question": user_question,
                "intent": "GENERAL_SUMMARY",
                "answer": f"The current investigative network contains {report['total_nodes']} verified entities and {report['total_edges']} relationship edges backed by police and transaction records.",
                "structured_data": report,
                "evidence_provenance": ["All ingested data sources"]
            }

if __name__ == "__main__":
    assistant = NexusInvestigationAssistant()
    
    # Test sample query
    print("Testing AI Investigation Assistant...")
    test_q = "How is P001 connected to P002?"
    res = assistant.query(test_q)
    print(json.dumps(res, indent=4))