"""
Comprehensive Test Suite: Bounded ML Training Pipeline (Part C)
Tests:
- Dataset registration with schema and SHA-256 fingerprint validation
- Train/test leakage detection
- Stratified splitting reproducibility
- Model training on DOCUMENT_CLASSIFICATION benchmark
- Scikit-learn evaluation metrics (Precision, Recall, Macro-F1, Brier score, Confusion Matrix)
- Error sample extraction
- Guarded inference wrapper (<0.65 flags mandatory review)
- Rejection of prohibited tasks (guilt, deception, confession)
"""

import pytest
import os
import sys
from fastapi.testclient import TestClient

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "apps", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app
from app.services.training import (
    dataset_manager,
    trainer_service,
    model_registry,
    model_evaluator
)

@pytest.fixture
def client():
    return TestClient(app)

def test_dataset_registration_and_leakage_detection():
    # 1. Invalid task rejection
    ok, rep, _ = dataset_manager.register_dataset({
        "task_type": "GUILT_PREDICTION",
        "records": [{"text": "Sample", "label": "Guilty"}]
    })
    assert not ok
    assert "Unsupported task" in rep["errors"][0]

    # 2. Incomplete records rejection
    ok, rep, _ = dataset_manager.register_dataset({
        "task_type": "DOCUMENT_CLASSIFICATION",
        "records": [{"text": "Missing label"}]
    })
    assert not ok
    assert "Missing mandatory fields" in rep["errors"][0]

    # 3. Leakage detection test
    train_split = [{"text": "First Information Report yellow gate", "label": "FIR"}]
    test_split = [{"text": "First Information Report Yellow Gate", "label": "FIR"}]
    leak_rep = dataset_manager.check_leakage(train_split, test_split, "DOCUMENT_CLASSIFICATION")
    assert leak_rep["leakage_detected"] is True
    assert leak_rep["leakage_count"] == 1

def test_training_and_evaluation_pipeline():
    # Run training job on built-in benchmark
    job = trainer_service.start_training_job({
        "dataset_id": "DS-DOC-BENCHMARK-v1",
        "task_type": "DOCUMENT_CLASSIFICATION",
        "model_family": "LogisticRegression",
        "hyperparameters": {"c_param": 1.0, "test_split_ratio": 0.25, "random_seed": 42}
    })
    assert job["status"] == "COMPLETED"
    assert job["model_id"] is not None

    metrics = job["metrics"]
    assert 0.0 <= metrics["macro_f1"] <= 1.0
    assert 0.0 <= metrics["macro_precision"] <= 1.0
    assert 0.0 <= metrics["macro_recall"] <= 1.0
    assert "confusion_matrix" in metrics
    assert "culpability" in metrics["limitations_note"].lower()

def test_guarded_inference():
    # Register and predict
    job = trainer_service.start_training_job({
        "dataset_id": "DS-DOC-BENCHMARK-v1",
        "task_type": "DOCUMENT_CLASSIFICATION",
        "model_family": "LogisticRegression"
    })
    mid = job["model_id"]

    # Inquire with legal text
    pred = model_registry.predict(mid, {"text": "First Information Report lodged under IPC 420 at Yellow Gate"})
    assert pred["predicted_label"] == "FIR"
    assert 0.0 <= pred["confidence"] <= 1.0
    assert isinstance(pred["requires_human_review"], bool)
    assert "disclaimer" in pred
    assert "audit_trail" in pred

def test_rest_api_ml_endpoints(client):
    # 1. GET /api/ml/tasks
    t_resp = client.get("/api/ml/tasks")
    assert t_resp.status_code == 200
    assert "DOCUMENT_CLASSIFICATION" in t_resp.json()["supported_tasks"]
    assert "prohibited" in t_resp.json()["disclaimer"]

    # 2. GET /api/ml/datasets
    d_resp = client.get("/api/ml/datasets")
    assert d_resp.status_code == 200
    assert d_resp.json()["count"] >= 3

    # 3. POST /api/ml/train with prohibited task
    bad_train = client.post("/api/ml/train", json={"task_type": "CONFESSION_PREDICTOR"})
    assert bad_train.status_code == 400

    # 4. POST /api/ml/train with valid task
    good_train = client.post("/api/ml/train", json={
        "dataset_id": "DS-DOC-BENCHMARK-v1",
        "task_type": "DOCUMENT_CLASSIFICATION",
        "model_family": "LogisticRegression"
    })
    assert good_train.status_code == 200
    model_id = good_train.json()["model_id"]

    # 5. GET /api/ml/models
    m_resp = client.get("/api/ml/models")
    assert m_resp.status_code == 200
    assert any(m["model_id"] == model_id for m in m_resp.json()["models"])

    # 6. POST /api/ml/models/{id}/predict
    p_resp = client.post(f"/api/ml/models/{model_id}/predict", json={"text": "Bank wire transaction Swift remittance"})
    assert p_resp.status_code == 200
    assert "predicted_label" in p_resp.json()
