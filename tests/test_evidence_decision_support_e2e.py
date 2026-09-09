"""
End-to-End Decision Support & Evidence Integrity Verification Test
Verifies:
1. Cryptographic SHA-256 hashing during universal file ingestion
2. Investigative Priority Engine (unclamped priority & evidence support scores, legal disclaimers)
3. Authoritative Runtime Mode API
"""

import os
import sys
import hashlib
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "apps", "backend"))

from main import app, preload_synthetic_case
from app.api.router import CASES_DB, DOCUMENTS_DB

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_test_case():
    preload_synthetic_case()

def test_system_runtime_mode():
    response = client.get("/api/system/mode")
    assert response.status_code == 200
    data = response.json()
    assert "mode" in data
    assert data["mode"] in ["live", "demo", "offline"]
    assert "timestamp" in data
    assert "version" in data

def test_universal_ingestion_sha256_hash():
    # Ingest text FIR file
    file_bytes = b"FIR #9901: Intercept recorded suspect Devendra Sharma transferring funds via ACC-8899."
    expected_sha256 = hashlib.sha256(file_bytes).hexdigest()
    
    response = client.post(
        "/api/cases/CASE-001/ingest-file",
        files={"file": ("fir_test_9901.txt", file_bytes, "text/plain")}
    )
    assert response.status_code == 200
    doc = response.json()
    assert doc["sha256_hash"] == expected_sha256
    assert doc["filename"] == "fir_test_9901.txt"
    assert doc["status"] == "success"

def test_investigative_priorities_decision_support():
    response = client.get("/api/cases/CASE-001/investigative-priorities")
    assert response.status_code == 200
    data = response.json()
    
    assert data["status"] in ["PRIORITIES_ASSESSED", "SOLUTIONS_COMPILED"]
    assert "legal_notice" in data
    # Must enforce decision support language
    assert "decision support" in data["legal_notice"].lower()
    assert "proof of guilt" in data["legal_notice"].lower()
    assert "not an automated" in data["legal_notice"].lower()
    
    # Check priority targets
    targets = data["priority_targets"]
    assert len(targets) > 0
    for target in targets:
        assert "investigative_priority_score" in target
        assert "evidence_support_score" in target
        assert 0 <= target["investigative_priority_score"] <= 100
        assert 0 <= target["evidence_support_score"] <= 100
        # No automated guilt labels
        assert "guilty" not in target.get("label", "").lower()
        # Statutory items must state legal/statutory review requirement
        for item in target.get("statutory_review_items", []):
            assert "review" in item.lower() or "sec" in item.lower() or "statutory" in item.lower() or "counsel" in item.lower() or "consultation" in item.lower()
