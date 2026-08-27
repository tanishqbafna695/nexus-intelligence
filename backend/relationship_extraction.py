import json
from pathlib import Path
from typing import Dict, List, Any

class RelationshipExtractor:
    def __init__(self, processed_dir: str = "data/processed"):
        self.processed_dir = Path(processed_dir)

    def extract(self):
        print("Starting Relationship Extraction Pipeline...")
        
        edges_path = self.processed_dir / "ingested_edges.json"
        if not edges_path.exists():
            raise FileNotFoundError(f"Ingested edges not found at {edges_path}. Run Phase 4 first.")

        with open(edges_path, "r") as f:
            raw_edges = json.load(f)

        refined_relationships = []
        for edge in raw_edges:
            # Validate and enrich edge schema according to our Common Data Model
            refined_edge = {
                "source": edge["source"],
                "target": edge["target"],
                "relationship": edge["relationship"],
                "confidence": edge["confidence"],
                "source_document": edge["source_document"],
                "timestamp": edge.get("timestamp"),
                "evidence": edge["evidence"]
            }
            refined_relationships.append(refined_edge)

        # Save finalized relationships
        output_file = self.processed_dir / "final_relationships.json"
        with open(output_file, "w") as f:
            json.dump(refined_relationships, f, indent=4)

        print(f"Relationship Extraction complete! Extracted {len(refined_relationships)} validated edges.")
        print(f"Saved relationship output to {output_file}")

if __name__ == "__main__":
    extractor = RelationshipExtractor()
    extractor.extract()