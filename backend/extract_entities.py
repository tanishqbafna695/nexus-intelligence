import re
import json
import spacy
import pandas as pd
from pathlib import Path
from typing import Dict, List, Any

class NLPEntityExtractor:
    def __init__(self, synthetic_dir: str = "data/synthetic", output_dir: str = "data/processed"):
        self.synthetic_dir = Path(synthetic_dir)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Load free local spaCy model
        print("Loading local spaCy model (en_core_web_sm)...")
        self.nlp = spacy.load("en_core_web_sm")

    def extract_phones_and_vehicles(self, text: str) -> Dict[str, List[str]]:
        phone_pattern = r"\+91\d{10}|\b\d{10}\b"
        vehicle_pattern = r"\b[A-Z]{2}-\d{2}-[A-Z]{1,2}-\d{4}\b"
        
        phones = re.findall(phone_pattern, text)
        vehicles = re.findall(vehicle_pattern, text)
        return {"phones": phones, "vehicles": vehicles}

    def process_text_records(self) -> List[Dict[str, Any]]:
        extracted_entities = []
        
        # 1. Process FIR records
        fir_path = self.synthetic_dir / "fir.csv"
        if fir_path.exists():
            df_fir = pd.read_csv(fir_path)
            for _, row in df_fir.iterrows():
                text = row["description"]
                doc = self.nlp(text)
                
                for ent in doc.ents:
                    if ent.label_ in ["PERSON", "ORG", "GPE", "LOC"]:
                        extracted_entities.append({
                            "text": ent.text,
                            "type": "LOCATION" if ent.label_ in ["GPE", "LOC"] else ent.label_,
                            "source_document": row["fir_id"],
                            "confidence": 0.88,
                            "method": "spaCy_NER"
                        })
                
                patterns = self.extract_phones_and_vehicles(text)
                for phone in patterns["phones"]:
                    extracted_entities.append({
                        "text": phone,
                        "type": "PHONE",
                        "source_document": row["fir_id"],
                        "confidence": 0.99,
                        "method": "Regex"
                    })
                for veh in patterns["vehicles"]:
                    extracted_entities.append({
                        "text": veh,
                        "type": "VEHICLE",
                        "source_document": row["fir_id"],
                        "confidence": 0.95,
                        "method": "Regex"
                    })

        # 2. Process Surveillance reports
        surv_path = self.synthetic_dir / "surveillance.csv"
        if surv_path.exists():
            df_surv = pd.read_csv(surv_path)
            for _, row in df_surv.iterrows():
                extracted_entities.append({
                    "text": row["person_name"],
                    "type": "PERSON",
                    "source_document": "SURV_LOG",
                    "confidence": 0.95,
                    "method": "Structured_Field"
                })
                extracted_entities.append({
                    "text": row["location"],
                    "type": "LOCATION",
                    "source_document": "SURV_LOG",
                    "confidence": 0.95,
                    "method": "Structured_Field"
                })
                extracted_entities.append({
                    "text": row["vehicle_reg"],
                    "type": "VEHICLE",
                    "source_document": "SURV_LOG",
                    "confidence": 0.99,
                    "method": "Structured_Field"
                })

        return extracted_entities

    def run(self):
        print("Running NLP Entity Extraction Pipeline...")
        entities = self.process_text_records()
        
        unique_entities = {json.dumps(e, sort_keys=True): e for e in entities}.values()
        final_list = list(unique_entities)
        
        output_file = self.output_dir / "extracted_entities.json"
        with open(output_file, "w") as f:
            json.dump(final_list, f, indent=4)
            
        print(f"Extraction complete! Extracted {len(final_list)} unique entities.")
        print(f"Saved extracted entities to {output_file}")

if __name__ == "__main__":
    extractor = NLPEntityExtractor()
    extractor.run()