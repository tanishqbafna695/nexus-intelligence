import json
import pandas as pd
from pathlib import Path

def generate_data():
    output_dir = Path("data/synthetic")
    output_dir.mkdir(parents=True, exist_ok=True)

    # 1. FIR Data (Unstructured/Semi-structured police reports)
    fir_data = [
        {"fir_id": "FIR_001", "date": "2026-08-01", "description": "Rajesh Kumar (Alias: Raju) spotted near downtown bank during suspicious gathering with Vikram Singh."},
        {"fir_id": "FIR_002", "date": "2026-08-05", "description": "Vehicle MH-12-AB-1234 registered under Amit Verma involved in reckless driving near warehouse location L02."},
    ]
    pd.DataFrame(fir_data).to_csv(output_dir / "fir.csv", index=False)

    # 2. CDR Data (Call Detail Records)
    cdr_data = [
        {"caller_phone": "+919876543210", "receiver_phone": "+919123456789", "timestamp": "2026-08-02T14:30:00", "duration_sec": 340, "cell_tower": "TOWER_A"},
        {"caller_phone": "+919123456789", "receiver_phone": "+919988776655", "timestamp": "2026-08-03T09:15:00", "duration_sec": 120, "cell_tower": "TOWER_B"},
    ]
    pd.DataFrame(cdr_data).to_csv(output_dir / "cdr.csv", index=False)

    # 3. Financial Transactions
    txn_data = [
        {"sender_account": "ACC_001", "receiver_account": "ACC_002", "amount": 50000.0, "timestamp": "2026-08-02T16:00:00", "institution": "State Bank"},
        {"sender_account": "ACC_002", "receiver_account": "ACC_003", "amount": 45000.0, "timestamp": "2026-08-04T11:20:00", "institution": "Global Bank"},
    ]
    pd.DataFrame(txn_data).to_csv(output_dir / "transactions.csv", index=False)

    # 4. Surveillance Reports
    surv_data = [
        {"person_name": "Rajesh Kumar", "location": "Warehouse L02", "timestamp": "2026-08-06T22:00:00", "vehicle_reg": "MH-12-AB-1234", "observation": "Meeting unknown intermediaries."},
    ]
    pd.DataFrame(surv_data).to_csv(output_dir / "surveillance.csv", index=False)

    # 5. Ground Truth (Expected Network Edges for Evaluation)
    ground_truth = {
        "nodes": [
            {"id": "P001", "type": "PERSON", "name": "Rajesh Kumar", "aliases": ["Raju"]},
            {"id": "P002", "type": "PERSON", "name": "Vikram Singh", "aliases": []},
            {"id": "P003", "type": "PERSON", "name": "Amit Verma", "aliases": []},
            {"id": "PH01", "type": "PHONE", "number": "+919876543210"},
            {"id": "PH02", "type": "PHONE", "number": "+919123456789"},
            {"id": "V01", "type": "VEHICLE", "registration": "MH-12-AB-1234"},
            {"id": "L02", "type": "LOCATION", "name": "Warehouse L02"},
            {"id": "ACC01", "type": "ACCOUNT", "reference": "ACC_001"},
            {"id": "ACC02", "type": "ACCOUNT", "reference": "ACC_002"}
        ],
        "relationships": [
            {"source": "P001", "target": "P002", "relationship": "ASSOCIATED_WITH", "evidence": "FIR_001"},
            {"source": "PH01", "target": "PH02", "relationship": "CALLED", "evidence": "CDR_001"},
            {"source": "P003", "target": "V01", "relationship": "OWNS_VEHICLE", "evidence": "FIR_002"},
            {"source": "P001", "target": "V01", "relationship": "SEEN_WITH_VEHICLE", "evidence": "SURV_001"},
            {"source": "ACC01", "target": "ACC02", "relationship": "TRANSFERRED_MONEY", "evidence": "TXN_001"}
        ]
    }

    with open(output_dir / "ground_truth.json", "w") as f:
        json.dump(ground_truth, f, indent=4)

    print("Synthetic dataset and ground truth successfully generated in data/synthetic/!")

if __name__ == "__main__":
    generate_data()