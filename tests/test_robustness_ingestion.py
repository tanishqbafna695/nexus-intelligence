"""
Robustness Test Suite: Ingestion Pipeline Boundaries & Edge Cases
"""

import io
import pytest
import os
import sys
from fastapi.testclient import TestClient

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "apps", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app
from app.services.ingestion.ocr_service import OCRNormalizer

@pytest.fixture
def client():
    return TestClient(app)

def test_empty_file_upload(client):
    case_resp = client.post("/api/cases?name=Test%20Empty%20Files")
    case_id = case_resp.json()["id"]

    # 0-byte TXT
    resp_txt = client.post(
        f"/api/cases/{case_id}/documents",
        files={"file": ("empty.txt", io.BytesIO(b""), "text/plain")}
    )
    assert resp_txt.status_code == 200
    assert resp_txt.json()["filename"] == "empty.txt"

    # 0-byte CSV
    resp_csv = client.post(
        f"/api/cases/{case_id}/documents",
        files={"file": ("empty.csv", io.BytesIO(b""), "text/csv")}
    )
    assert resp_csv.status_code == 200
    assert resp_csv.json()["filename"] == "empty.csv"

    # Ingesting empty case produces 0 extracted entities (excluding document exhibits)
    ing_resp = client.post(f"/api/cases/{case_id}/ingest")
    assert ing_resp.status_code == 200
    extracted_entities = [n for n in ing_resp.json()["nodes"] if n.get("type") != "DOCUMENT"]
    assert len(extracted_entities) == 0

def test_malformed_csv_upload(client):
    case_resp = client.post("/api/cases?name=Test%20Malformed%20CSV")
    case_id = case_resp.json()["id"]

    # Malformed CSV with jagged columns and non-escaped quotes
    bad_csv = b"""caller,receiver,duration
9811223344,9822334455
corrupt_line_with_no_commas_whatsoever
9811223344,9833445566,300,extra_unmapped_column,another_column
"""
    resp = client.post(
        f"/api/cases/{case_id}/documents",
        files={"file": ("malformed.csv", io.BytesIO(bad_csv), "text/csv")}
    )
    assert resp.status_code == 200
    ing_resp = client.post(f"/api/cases/{case_id}/ingest")
    assert ing_resp.status_code == 200

def test_malformed_json_upload(client):
    case_resp = client.post("/api/cases?name=Test%20Malformed%20JSON")
    case_id = case_resp.json()["id"]

    # Broken JSON syntax
    bad_json = b'{"sender": "ACC101", "receiver": "ACC202", "amount": 50000'
    resp = client.post(
        f"/api/cases/{case_id}/documents",
        files={"file": ("broken.json", io.BytesIO(bad_json), "application/json")}
    )
    assert resp.status_code == 200
    ing_resp = client.post(f"/api/cases/{case_id}/ingest")
    assert ing_resp.status_code == 200

def test_unsupported_file_extension_rejection(client):
    case_resp = client.post("/api/cases?name=Test%20Unsupported%20Ext")
    case_id = case_resp.json()["id"]

    # .exe extension
    resp = client.post(
        f"/api/cases/{case_id}/documents",
        files={"file": ("malware.exe", io.BytesIO(b"MZ\x90\x00"), "application/octet-stream")}
    )
    assert resp.status_code == 415
    assert "Unsupported file type" in resp.json()["detail"]

    # .sh extension
    resp_sh = client.post(
        f"/api/cases/{case_id}/documents",
        files={"file": ("script.sh", io.BytesIO(b"#!/bin/bash\necho 1"), "application/x-sh")}
    )
    assert resp_sh.status_code == 415

def test_oversize_file_rejection(client):
    case_resp = client.post("/api/cases?name=Test%20Oversize%20File")
    case_id = case_resp.json()["id"]

    # 10MB + 1 byte payload
    oversize_bytes = b"X" * (10 * 1024 * 1024 + 1)
    resp = client.post(
        f"/api/cases/{case_id}/documents",
        files={"file": ("huge.txt", io.BytesIO(oversize_bytes), "text/plain")}
    )
    assert resp.status_code == 413
    assert "exceeds" in resp.json()["detail"].lower()

def test_ocr_normalizer_corrections():
    dirty_text = "Sus\u200bpect K\ufb01bir \ufb02ed to   Ware\nhouse 17   \r\nwith INR 50,00,000."
    cleaned = OCRNormalizer.normalize(dirty_text)
    
    assert "\u200b" not in cleaned
    assert "fi" in cleaned or "fl" in cleaned or "Kabir" in cleaned
    assert "17" in cleaned
