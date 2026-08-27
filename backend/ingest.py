import json
import pandas as pd
from pathlib import Path
from typing import Dict, List, Any

class DataIngestionPipeline:
    def __init__(self, data_dir: str = "data/synthetic"):
        self.data_dir = Path(data_dir)
        self.processed_entities: List[Dict[str, Any]] = []
        self.processed_relationships: List[Dict[str, Any]] = []

    def load_csv(self, filename: str) -> pd.DataFrame:
        file_path = self.data_dir / filename
        if not file_path.exists():
            raise FileNotFoundError(f"Required synthetic file missing: {file_path}")
        return pd.read_csv(file_path)

    def ingest_fir(self):
        df = self.load_csv("fir.csv")
        for _, row in df.iterrows():
            # Example parsing logic for FIR source records
            self.processed_relationships.append({
                "source": "P001",
                "target": "P002",
                "relationship": "ASSOCIATED_WITH",
                "confidence": 0.92,
                "source_document": row["fir_id"],
                "timestamp": f"{row['date']}T00:00:00",
                "evidence": row["description"]
            })
        print(f"Ingested {len(df)} records from FIR source.")

    def ingest_cdr(self):
        df = self.load_csv("cdr.csv")
        for _, row in df.iterrows():
            self.processed_relationships.append({
                "source": row["caller_phone"],
                "target": row["receiver_phone"],
                "relationship": "CALLED",
                "confidence": 0.99,
                "source_document": "CDR_LOG_BATCH",
                "timestamp": row["timestamp"],
                "evidence": f"Call via cell tower {row['cell_tower']} lasting {row['duration_sec']}s"
            })
        print(f"Ingested {len(df)} records from CDR source.")

    def ingest_transactions(self):
        df = self.load_csv("transactions.csv")
        for _, row in df.iterrows():
            self.processed_relationships.append({
                "source": row["sender_account"],
                "target": row["receiver_account"],
                "relationship": "TRANSFERRED_MONEY",
                "confidence": 0.98,
                "source_document": f"TXN_LOG_{row['institution']}",
                "timestamp": row["timestamp"],
                "evidence": f"Transfer of amount {row['amount']}"
            })
        print(f"Ingested {len(df)} records from Financial Transactions source.")

    def run_pipeline(self):
        print("Starting Data Ingestion Pipeline...")
        self.ingest_fir()
        self.ingest_cdr()
        self.ingest_transactions()
        
        # Save processed outputs
        output_path = Path("data/processed")
        output_path.mkdir(parents=True, exist_ok=True)
        
        output_file = output_path / "ingested_edges.json"
        with open(output_file, "w") as f:
            json.dump(self.processed_relationships, f, indent=4)
            
        print(f"Pipeline complete! Successfully processed {len(self.processed_relationships)} total relationship edges.")
        print(f"Saved structured output to {output_file}")

if __name__ == "__main__":
    pipeline = DataIngestionPipeline()
    pipeline.run_pipeline()