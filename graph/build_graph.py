import json
import networkx as nx
from pathlib import Path

class NexusKnowledgeGraph:
    def __init__(self, processed_dir: str = "data/processed"):
        self.processed_dir = Path(processed_dir)
        self.graph = nx.MultiDiGraph() # MultiDiGraph allows multiple weighted relationships between nodes

    def build(self):
        print("Constructing NEXUS Knowledge Graph...")

        # 1. Load Resolved Entities
        entities_path = self.processed_dir / "resolved_entities.json"
        if not entities_path.exists():
            raise FileNotFoundError(f"Resolved entities not found at {entities_path}. Complete Phase 6 first.")
        
        with open(entities_path, "r") as f:
            entities = json.load(f)

        for ent in entities:
            node_id = str(ent["id"])
            ent_type = ent.get("type", "UNKNOWN")
            
            # Smart fallback type inference if marked UNKNOWN
            if ent_type == "UNKNOWN":
                if node_id.startswith("ACC_"):
                    ent_type = "BANK_ACCOUNT"
                elif node_id.isdigit() or node_id.startswith("+91"):
                    ent_type = "PHONE_NUMBER"
                elif "VEHICLE" in node_id.upper() or "MH-" in node_id.upper():
                    ent_type = "VEHICLE"
                elif node_id.startswith("P"):
                    ent_type = "PERSON"

            self.graph.add_node(
                node_id,
                type=ent_type,
                name=ent.get("canonical_name", node_id),
                aliases=ent.get("aliases", []),
                sources=ent.get("sources", []),
                confidence=ent.get("confidence", 1.0)
            )

        # 2. Load Final Relationships (Edges)
        edges_path = self.processed_dir / "final_relationships.json"
        if not edges_path.exists():
            raise FileNotFoundError(f"Final relationships not found at {edges_path}. Complete Phase 7 first.")

        with open(edges_path, "r") as f:
            relationships = json.load(f)

        for rel in relationships:
            source_id = str(rel["source"])
            target_id = str(rel["target"])

            # If source/target nodes aren't explicitly in entity nodes list yet, add them dynamically
            for node_id in [source_id, target_id]:
                if not self.graph.has_node(node_id):
                    inferred_type = "UNKNOWN"
                    if node_id.startswith("ACC_"):
                        inferred_type = "BANK_ACCOUNT"
                    elif node_id.isdigit() or node_id.startswith("+91"):
                        inferred_type = "PHONE_NUMBER"
                    elif "VEHICLE" in node_id.upper() or "MH-" in node_id.upper():
                        inferred_type = "VEHICLE"
                    elif node_id.startswith("P"):
                        inferred_type = "PERSON"

                    self.graph.add_node(node_id, type=inferred_type, name=node_id)

            self.graph.add_edge(
                source_id,
                target_id,
                relationship=rel["relationship"],
                confidence=rel["confidence"],
                source_document=rel["source_document"],
                timestamp=rel.get("timestamp"),
                evidence=rel["evidence"]
            )

        print(f"Knowledge Graph built successfully!")
        print(f"Total Nodes: {self.graph.number_of_nodes()}")
        print(f"Total Edges: {self.graph.number_of_edges()}")

        # Export graph representation for frontend/inspection
        output_dir = self.processed_dir
        output_file = output_dir / "knowledge_graph.gml"
        nx.write_gml(self.graph, output_file)
        print(f"Exported graph structure to {output_file}")

        return self.graph

if __name__ == "__main__":
    kg_builder = NexusKnowledgeGraph()
    kg_builder.build()