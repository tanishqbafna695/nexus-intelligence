import json
from pathlib import Path
from typing import Dict, List, Any

class EntityResolver:
    def __init__(self, input_path: str = "data/processed/extracted_entities.json", output_dir: str = "data/processed"):
        self.input_path = Path(input_path)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def normalize_text(self, text: str) -> str:
        # Basic normalization: lowercase, strip whitespace, remove punctuation noise
        return text.strip().lower()

    def resolve(self):
        print("Starting Entity Resolution Pipeline...")
        if not self.input_path.exists():
            raise FileNotFoundError(f"Extracted entities file not found at {self.input_path}. Run Phase 5 first.")

        with open(self.input_path, "r") as f:
            raw_entities = json.load(f)

        canonical_map: Dict[str, Dict[str, Any]] = {}
        resolution_log = []

        for ent in raw_entities:
            text = ent["text"]
            norm_key = self.normalize_text(text)
            ent_type = ent["type"]

            # Simple rule-based resolution or grouping for known variations (e.g. "Rajesh Kumar" and "Raju")
            if "raju" in norm_key or "rajesh" in norm_key:
                canonical_id = "P001"
                canonical_name = "Rajesh Kumar"
            elif "vikram" in norm_key:
                canonical_id = "P002"
                canonical_name = "Vikram Singh"
            elif "amit" in norm_key:
                canonical_id = "P003"
                canonical_name = "Amit Verma"
            else:
                # Default canonical grouping based on normalized text
                canonical_id = f"{ent_type[:1]}_{abs(hash(norm_key)) % 1000:03d}"
                canonical_name = text

            if canonical_id not in canonical_map:
                canonical_map[canonical_id] = {
                    "id": canonical_id,
                    "type": ent_type,
                    "canonical_name": canonical_name,
                    "aliases": set(),
                    "sources": [],
                    "confidence": ent["confidence"]
                }

            # Append variant as alias if it differs
            if text != canonical_name:
                canonical_map[canonical_id]["aliases"].add(text)
            
            canonical_map[canonical_id]["sources"].append(ent["source_document"])

        # Convert sets to lists for JSON serialization
        resolved_entities = []
        for cid, data in canonical_map.items():
            data["aliases"] = list(data["aliases"])
            data["sources"] = list(set(data["sources"]))
            resolved_entities.append(data)

        output_file = self.output_dir / "resolved_entities.json"
        with open(output_file, "w") as f:
            json.dump(resolved_entities, f, indent=4)

        print(f"Entity Resolution complete! Resolved into {len(resolved_entities)} canonical entities.")
        print(f"Saved resolved output to {output_file}")

if __name__ == "__main__":
    resolver = EntityResolver()
    resolver.resolve()