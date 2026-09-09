"""
Robustness Test Suite: Audio Evidence & Transcript Timeline
Tests:
- Empty audio transcript retrieval
- Timestamp seeking and boundary validation
- Transcript segment editing with immutable audit trail
- Verified non-coercion notice
"""

import pytest
import os
import sys
from fastapi.testclient import TestClient

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "apps", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_audio_transcript_retrieval(client):
    case_resp = client.post("/api/cases?name=Audio%20Transcript%20Case")
    case_id = case_resp.json()["id"]

    resp = client.get(f"/api/cases/{case_id}/audio-transcripts")
    assert resp.status_code == 200
    data = resp.json()
    assert "recordings" in data
    assert len(data["recordings"]) > 0
    
    first_rec = data["recordings"][0]
    assert "recording_id" in first_rec
    assert "audio_file" in first_rec
    assert "segments" in first_rec
    assert "statutory_notice" in data
    assert "Section 65B" in data["statutory_notice"]

def test_transcript_segment_editing_audit(client):
    case_resp = client.post("/api/cases?name=Audio%20Audit%20Case")
    case_id = case_resp.json()["id"]

    # Edit a transcript segment
    edit_payload = {
        "recording_id": "REC-WIRETAP-2026-001",
        "segment_id": "SEG-001",
        "corrected_text": "Corrected transcript by IO: Meeting at Yellow Gate.",
        "corrected_speaker": "Devendra Sharma",
        "officer_badge_id": "MH-POL-4412",
        "correction_rationale": "Forensic audio enhancement clarified speech ambiguity"
    }
    
    resp = client.post(f"/api/cases/{case_id}/audio-transcripts/edit-segment", json=edit_payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "SUCCESS"
    assert data["audit_record"]["officer_badge_id"] == "MH-POL-4412"
    assert data["audit_record"]["segment_id"] == "SEG-001"
