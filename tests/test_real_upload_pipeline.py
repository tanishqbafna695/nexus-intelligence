"""
Permanent Regression Test Suite for TRACE Data Pipeline & Culprit Analysis Engine.
Verifies end-to-end flow: Case Creation -> Multi-Modal File Upload (varied headers) ->
Ingestion Pipeline -> Knowledge Graph Construction -> Dynamic Graph-Driven Culprit Analysis.
Ensures real uploaded data drives every output instead of fallback demo content.
"""

import io
import pytest
from fastapi.testclient import TestClient
import sys
import os

# Add backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "apps", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_real_upload_pipeline_and_culprit_analysis(client):
    print("\n=====================================================================")
    print("STARTING END-TO-END PIPELINE VERIFICATION WITH REAL UPLOADED DATA")
    print("=====================================================================")

    # 1. Create a new case via API
    create_resp = client.post("/api/cases?name=Operation%20Thunderbolt&description=Real%20Syndicate%20Investigation")
    assert create_resp.status_code == 200, f"Create case failed: {create_resp.text}"
    case_data = create_resp.json()
    case_id = case_data["id"]
    print(f"[STEP 1] Created New Investigation Case: ID={case_id}, Name='{case_data['name']}'")

    # 2. Upload three real files with realistic, varied column headers
    # File A: Real FIR text with natural phrasing
    fir_content = """FIRST INFORMATION REPORT (FIR No. 881/2026)
Special Crime Branch Zone 1, Mumbai.
Registered under Section 111 BNS, Section 120-B IPC, Section 3 PMLA.

Summary of Investigation:
During ongoing intelligence surveillance, suspect Kabir Singhania was identified as the syndicate mastermind directing money layering and logistics.
Investigating officers interrogated Sameer Merchant, proprietor of Merchant Cargo, who confessed to transporting illicit cargo across checkpoints using Vehicle MH-02-CD-5678.
Financial surveillance established that financier Rahul Varma authorized foreign Hawala remittances through Account ACC-HAWALA-7711.
Suspect Kabir Singhania was intercepted operating primary communication terminal +919811223344.
Sameer Merchant was observed contacting courier Pooja Shah (Phone: +919822334455) to coordinate terminal delivery at Warehouse 12.
"""

    # File B: CDR CSV with varied header names (caller_phone, callee_phone, call_duration, tower_id)
    cdr_csv_content = """caller_phone,callee_phone,call_duration,tower_id,timestamp
9811223344,9822334455,240,TOWER_AIRPORT_01,2026-04-10T11:00:00
9811223344,9833445566,180,TOWER_AIRPORT_01,2026-04-10T11:30:00
9822334455,9844556677,95,TOWER_DOCKS_03,2026-04-10T12:15:00
9833445566,9844556677,150,TOWER_CITY_09,2026-04-10T13:00:00
"""

    # File C: Financial ledger CSV with varied headers (remitter_name, beneficiary_name, from_account, to_account)
    financial_csv_content = """remitter_name,beneficiary_name,from_account,to_account,amount,mode,date
Rahul Varma,Kabir Singhania,ACC-HAWALA-7711,ACC-OFFSHORE-001,5000000,SWIFT,2026-04-10
Kabir Singhania,Sameer Merchant,ACC-OFFSHORE-001,ACC-CARGO-2233,750000,RTGS,2026-04-11
Rahul Varma,Pooja Shah,ACC-HAWALA-7711,ACC-MULE-9900,120000,IMPS,2026-04-11
"""

    # Upload File A: FIR
    files_fir = {"file": ("fir_thunderbolt.txt", io.BytesIO(fir_content.encode("utf-8")), "text/plain")}
    up_fir = client.post(f"/api/cases/{case_id}/documents", files=files_fir)
    assert up_fir.status_code == 200, f"Upload FIR failed: {up_fir.text}"

    # Upload File B: CDR
    files_cdr = {"file": ("telecom_logs.csv", io.BytesIO(cdr_csv_content.encode("utf-8")), "text/csv")}
    up_cdr = client.post(f"/api/cases/{case_id}/documents", files=files_cdr)
    assert up_cdr.status_code == 200, f"Upload CDR failed: {up_cdr.text}"

    # Upload File C: Financial Ledger
    files_fin = {"file": ("wire_transfers.csv", io.BytesIO(financial_csv_content.encode("utf-8")), "text/csv")}
    up_fin = client.post(f"/api/cases/{case_id}/documents", files=files_fin)
    assert up_fin.status_code == 200, f"Upload Ledger failed: {up_fin.text}"

    print(f"[STEP 2] Successfully uploaded 3 distinct records (FIR, Telecom CDR, Financial Ledger).")

    # 3. Call Ingestion Pipeline
    ingest_resp = client.post(f"/api/cases/{case_id}/ingest")
    assert ingest_resp.status_code == 200, f"Ingest failed: {ingest_resp.text}"
    ingest_data = ingest_resp.json()
    print(f"[STEP 3] Ingestion Pipeline Executed. Extracted {len(ingest_data['nodes'])} nodes, {len(ingest_data['edges'])} edges.")

    # 4. Call /graph
    graph_resp = client.get(f"/api/cases/{case_id}/graph")
    assert graph_resp.status_code == 200, f"Get graph failed: {graph_resp.text}"
    graph_data = graph_resp.json()
    total_nodes = len(graph_data["nodes"])
    total_edges = len(graph_data["edges"])
    print(f"[STEP 4] Live Graph Retrieved: {total_nodes} total nodes, {total_edges} total edges.")

    # Verify node extraction
    person_nodes = [n for n in graph_data["nodes"] if n["type"] == "PERSON"]
    phone_nodes = [n for n in graph_data["nodes"] if n["type"] == "PHONE"]
    account_nodes = [n for n in graph_data["nodes"] if n["type"] == "ACCOUNT"]
    print(f"         Breakdown: {len(person_nodes)} PERSON, {len(phone_nodes)} PHONE, {len(account_nodes)} ACCOUNT nodes.")

    assert len(person_nodes) >= 3, f"Expected at least 3 PERSON nodes, got {len(person_nodes)}"
    assert len(phone_nodes) >= 2, f"Expected at least 2 PHONE nodes, got {len(phone_nodes)}"
    assert len(account_nodes) >= 2, f"Expected at least 2 ACCOUNT nodes, got {len(account_nodes)}"

    # 5. Call /culprit-analysis
    culprit_resp = client.get(f"/api/cases/{case_id}/culprit-analysis")
    assert culprit_resp.status_code == 200, f"Culprit analysis failed: {culprit_resp.text}"
    culprit_data = culprit_resp.json()
    suspects = culprit_data["suspects"]

    print("\n=====================================================================")
    print(f"[STEP 5] CULPRIT ANALYSIS RESULTS FOR CASE: {case_id}")
    print(f"Total Nodes Extracted: {total_nodes}")
    print(f"Total Edges Extracted: {total_edges}")
    print(f"Total Suspects Evaluated: {len(suspects)}")
    print("---------------------------------------------------------------------")
    print("TOP 3 SUSPECTS BY GUILT PROBABILITY:")

    for idx, s in enumerate(suspects[:3], start=1):
        print(f"  #{idx}. {s['name']} (ID: {s['id']})")
        print(f"      Guilt Probability: {s['guilt_probability']}%")
        print(f"      Role: {s.get('role', 'N/A')}")
        print(f"      Betweenness Centrality: {s.get('betweenness_centrality', 'N/A')}")
        print(f"      Degree Centrality: {s.get('degree_centrality', 'N/A')}")
        print(f"      Corroborating Sources: {s.get('corroborating_sources_count', 'N/A')}")
        print(f"      Computed Structural Reasons:")
        for r in s.get("reasons", []):
            print(f"        • {r}")
        print("")

    # 6. Confirm guilt scores differ meaningfully between suspects (not all identical)
    guilt_scores = [s["guilt_probability"] for s in suspects]
    print(f"All Suspect Guilt Probabilities: {guilt_scores}")
    assert len(set(guilt_scores)) > 1, f"FAIL: All guilt scores were identical! {guilt_scores}"

    # 7. Confirm top suspect reasons cite real structural signals
    top_suspect = suspects[0]
    all_top_reasons = " ".join(top_suspect["reasons"]).lower()
    structural_signals = ["centrality", "bottleneck", "corroborat", "financial", "telecom", "bridge", "connectivity"]
    assert any(sig in all_top_reasons for sig in structural_signals), \
        f"FAIL: Top suspect reasons did not cite real structural signals! Got: {top_suspect['reasons']}"

    # Confirm old hardcoded demo text is completely absent
    assert "nhava sheva cargo container" not in all_top_reasons, \
        "FAIL: Found hardcoded Nhava Sheva cargo container text in dynamic case output!"

    print("=====================================================================")
    print(">>> VERIFICATION SUCCESS: Real case data fully drives ingestion, graph, and culprit analysis! <<<")
    print("=====================================================================\n")


if __name__ == "__main__":
    from main import app
    c = TestClient(app)
    test_real_upload_pipeline_and_culprit_analysis(c)
