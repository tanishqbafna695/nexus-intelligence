"""
Audit & Test Suite for EVERY function available in TRACE.
Tests every API route function, boundary conditions, edge cases, and verifies stability.
"""

import pytest
import os
import sys
import io
from fastapi.testclient import TestClient

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "apps", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app, preload_synthetic_case

@pytest.fixture(scope="module")
def client():
    preload_synthetic_case()
    return TestClient(app)

# 1. Health and System Telemetry
def test_func_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    res2 = client.get("/api/health")
    assert res2.status_code == 200
    res3 = client.get("/")
    assert res3.status_code == 200

def test_func_system_stats(client):
    res = client.get("/api/system/stats")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "OPERATIONAL"

def test_func_system_mode(client):
    res = client.get("/api/system/mode")
    assert res.status_code == 200
    assert res.json()["runtime_mode"] == "live"

# 2. Case Management
def test_func_create_case(client):
    res = client.post("/api/cases?name=AuditCase1&description=FunctionAudit")
    assert res.status_code == 200
    cid = res.json()["id"]
    assert cid.startswith("CASE-")

def test_func_create_case_empty_name(client):
    res = client.post("/api/cases?name=   &description=Empty")
    assert res.status_code == 400

def test_func_list_cases(client):
    res = client.get("/api/cases")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_func_delete_case(client):
    c_res = client.post("/api/cases?name=ToDel&description=Del")
    cid = c_res.json()["id"]
    res = client.delete(f"/api/cases/{cid}")
    assert res.status_code == 200
    assert res.json()["status"] == "success"

# 3. Documents and Ingestion
def test_func_upload_document(client):
    file_tuple = ("audit_fir.txt", io.BytesIO(b"Devendra met Tariq at Nhava Sheva."), "text/plain")
    res = client.post("/api/cases/CASE-001/documents", files={"file": file_tuple})
    assert res.status_code == 200
    assert res.json()["filename"] == "audit_fir.txt"

def test_func_upload_document_invalid_extension(client):
    file_tuple = ("script.exe", io.BytesIO(b"malicious binary"), "application/octet-stream")
    res = client.post("/api/cases/CASE-001/documents", files={"file": file_tuple})
    assert res.status_code == 415

def test_func_run_ingestion(client):
    res = client.post("/api/cases/CASE-001/ingest")
    assert res.status_code == 200
    assert "nodes" in res.json()

def test_func_ingest_file_universal(client):
    csv_bytes = b"caller,callee,duration,timestamp\n+919811122233,+919822233344,120,2026-05-10T02:15:00\n"
    file_tuple = ("audit_cdr.csv", io.BytesIO(csv_bytes), "text/csv")
    res = client.post("/api/cases/CASE-001/ingest-file", files={"file": file_tuple})
    assert res.status_code == 200
    assert res.json()["status"] == "success"

# 4. Graph and Subgraph
def test_func_get_entities(client):
    res = client.get("/api/cases/CASE-001/entities")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_func_get_graph_full(client):
    res = client.get("/api/cases/CASE-001/graph")
    assert res.status_code == 200
    assert "nodes" in res.json()
    assert "edges" in res.json()

def test_func_get_graph_subgraph(client):
    res = client.get("/api/cases/CASE-001/graph?node_id=person_devendra&depth=1")
    assert res.status_code == 200
    assert len(res.json()["nodes"]) >= 1

def test_func_get_ego_subgraph(client):
    res = client.get("/api/cases/CASE-001/graph/ego/person_devendra?radius=2")
    assert res.status_code == 200
    assert len(res.json()["nodes"]) >= 1

def test_func_get_flow_bottlenecks(client):
    res = client.get("/api/cases/CASE-001/graph/flow-bottlenecks?source_id=person_devendra&sink_id=account_dubai")
    assert res.status_code == 200

# 5. Search and Path
def test_func_search_case(client):
    res = client.get("/api/cases/CASE-001/search?query=Devendra")
    assert res.status_code == 200
    assert len(res.json()) >= 1

def test_func_search_case_empty_query(client):
    res = client.get("/api/cases/CASE-001/search")
    assert res.status_code == 200
    assert len(res.json()) > 0

def test_func_find_shortest_path(client):
    res = client.get("/api/cases/CASE-001/path?source_node=person_devendra&target_node=loc_wh17")
    assert res.status_code == 200
    assert "nodes" in res.json()
    assert "edges" in res.json()

def test_func_find_shortest_path_unconnected(client):
    res = client.get("/api/cases/CASE-001/path?source_node=non_existent_1&target_node=non_existent_2")
    assert res.status_code == 200
    assert res.json() == {"nodes": [], "edges": []}

# 6. Analytics and Reasoning
def test_func_run_analytics(client):
    res = client.post("/api/cases/CASE-001/analytics")
    assert res.status_code == 200
    assert "centrality" in res.json()

def test_func_get_communities(client):
    res = client.get("/api/cases/CASE-001/communities")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_func_get_alerts(client):
    res = client.get("/api/cases/CASE-001/alerts")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_func_investigate_case(client):
    res = client.post("/api/cases/CASE-001/investigate", json={"case_id": "CASE-001", "question": "Who are key players?"})
    assert res.status_code == 200
    assert "answer" in res.json()

def test_func_investigate_case_empty_question(client):
    res = client.post("/api/cases/CASE-001/investigate", json={"case_id": "CASE-001", "question": "   "})
    assert res.status_code == 400

def test_func_get_case_suggested_questions(client):
    res = client.get("/api/cases/CASE-001/investigate/suggested-questions")
    assert res.status_code == 200
    assert "suggested_questions" in res.json()
    assert len(res.json()["suggested_questions"]) >= 2

def test_func_get_evidence(client):
    # Retrieve existing document ID
    c_res = client.get("/api/cases/CASE-001/graph")
    doc_id = c_res.json()["edges"][0]["source_document"]
    res = client.get(f"/api/evidence/{doc_id}")
    assert res.status_code == 200
    assert "content" in res.json()

def test_func_get_evidence_not_found(client):
    res = client.get("/api/evidence/NON_EXISTENT_EVIDENCE_9999")
    assert res.status_code == 404

# 7. Exports and Audit
def test_func_export_case_json(client):
    res = client.get("/api/cases/CASE-001/export/json")
    assert res.status_code == 200
    assert "case" in res.json()

def test_func_export_case_report(client):
    res = client.get("/api/cases/CASE-001/export/report")
    assert res.status_code == 200
    assert "report_markdown" in res.json()

def test_func_export_case_pdf(client):
    res = client.get("/api/cases/CASE-001/export/pdf")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"

def test_func_get_case_audit(client):
    res = client.get("/api/cases/CASE-001/audit")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

# 8. Culprit, Threat, Interrogation
def test_func_run_culprit_analysis(client):
    res = client.get("/api/cases/CASE-001/culprit-analysis")
    assert res.status_code == 200
    assert "suspects" in res.json()

def test_func_get_threat_forecast(client):
    res = client.get("/api/cases/CASE-001/threat-forecast")
    assert res.status_code == 200
    assert "current_syndicate_phase" in res.json()

def test_func_interrogate_suspect(client):
    payload = {
        "suspect_id": "person_tariq",
        "question": "Did you receive the shipment at Warehouse 17?",
        "evidence_presented": ["CDR Tower hit at Warehouse 17"],
        "current_stress": 30
    }
    res = client.post("/api/cases/CASE-001/interrogate", json=payload)
    assert res.status_code == 200
    assert "response" in res.json()

def test_func_get_interrogation_history(client):
    res = client.get("/api/cases/CASE-001/interrogate/history?suspect_id=person_tariq")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

# 10. Audio Transcripts and Segment Editing
def test_func_get_case_audio_transcripts(client):
    res = client.get("/api/cases/CASE-001/audio-transcripts")
    assert res.status_code == 200
    assert "recordings" in res.json()

def test_func_edit_audio_transcript_segment(client):
    payload = {
        "recording_id": "REC-WIRETAP-NX-01",
        "segment_id": "SEG-001",
        "corrected_text": "Victor, the container is arriving at 03:00 AM.",
        "corrected_speaker": "Devendra Sharma",
        "officer_badge_id": "OFFICER-44",
        "correction_rationale": "Clarified audio channel"
    }
    res = client.post("/api/cases/CASE-001/audio-transcripts/edit-segment", json=payload)
    assert res.status_code == 200
    assert res.json()["status"] == "SUCCESS"

# 11. Cross-Syndicate and Spatio-Temporal
def test_func_get_cross_syndicate_fusion(client):
    res = client.get("/api/cross-syndicate-fusion")
    assert res.status_code == 200

def test_func_get_cross_case_intelligence(client):
    res = client.get("/api/cross-case-intelligence")
    assert res.status_code == 200

def test_func_get_spatio_temporal_convoys(client):
    res = client.get("/api/cases/CASE-001/spatio-temporal/convoys")
    assert res.status_code == 200

def test_func_get_silent_hour_bursts(client):
    res = client.get("/api/cases/CASE-001/spatio-temporal/silent-bursts")
    assert res.status_code == 200

# 12. Judicial, Red Flags, Timeline, Sanitization
def test_func_get_chargesheet(client):
    res = client.get("/api/cases/CASE-001/chargesheet")
    assert res.status_code == 200
    assert "brief_facts_of_case" in res.json()

def test_func_get_case_red_flags(client):
    res = client.get("/api/cases/CASE-001/red-flags")
    assert res.status_code == 200

def test_func_get_case_timeline(client):
    res = client.get("/api/cases/CASE-001/timeline")
    assert res.status_code == 200

def test_func_export_sanitized_intel(client):
    res = client.post("/api/cases/CASE-001/export-sanitized-intel", json={"clearance_level": "SECRET"})
    assert res.status_code == 200

def test_func_get_investigative_priorities(client):
    res = client.get("/api/cases/CASE-001/investigative-priorities")
    assert res.status_code == 200

# 13. Graph ML and Training
def test_func_get_link_predictions(client):
    res = client.get("/api/cases/CASE-001/ml/link-predictions?top_k=5")
    assert res.status_code == 200

def test_func_get_laundering_cycles(client):
    res = client.get("/api/cases/CASE-001/ml/laundering-cycles")
    assert res.status_code == 200

def test_func_get_network_vulnerability(client):
    res = client.get("/api/cases/CASE-001/ml/network-vulnerability")
    assert res.status_code == 200

def test_func_get_ml_performance_metrics(client):
    res = client.get("/api/cases/CASE-001/ml/performance-metrics")
    assert res.status_code == 200

def test_func_train_dataset_endpoint(client):
    res = client.post("/api/cases/CASE-001/ml/train-dataset", json={"dataset_type": "CDR", "records": []})
    assert res.status_code == 200

def test_func_list_ml_tasks(client):
    res = client.get("/api/ml/tasks")
    assert res.status_code == 200
    assert "supported_tasks" in res.json()

def test_func_list_ml_datasets(client):
    res = client.get("/api/ml/datasets")
    assert res.status_code == 200

def test_func_get_ml_dataset_not_found(client):
    res = client.get("/api/ml/datasets/UNKNOWN_DATASET")
    assert res.status_code == 404

def test_func_register_ml_dataset_validation_fail(client):
    res = client.post("/api/ml/datasets/register", json={"name": ""})
    assert res.status_code == 400

def test_func_start_ml_training_invalid_task(client):
    res = client.post("/api/ml/train", json={"task_type": "PROHIBITED_GUILT_MODEL"})
    assert res.status_code == 400

def test_func_list_ml_jobs(client):
    res = client.get("/api/ml/jobs")
    assert res.status_code == 200

def test_func_get_ml_job_not_found(client):
    res = client.get("/api/ml/jobs/NON_EXISTENT_JOB")
    assert res.status_code == 404

def test_func_list_ml_models(client):
    res = client.get("/api/ml/models")
    assert res.status_code == 200

def test_func_get_ml_model_not_found(client):
    res = client.get("/api/ml/models/UNKNOWN_MODEL")
    assert res.status_code == 404

def test_func_predict_ml_model_not_found(client):
    res = client.post("/api/ml/models/UNKNOWN_MODEL/predict", json={"features": [1, 2]})
    assert res.status_code in [400, 404]
