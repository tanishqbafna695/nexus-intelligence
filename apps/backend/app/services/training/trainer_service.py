"""
TRACE Bounded ML Training Architecture — Trainer Service
Coordinates dataset extraction, leakage check, stratified splitting,
pipeline training (TF-IDF + LogisticRegression / RandomForest),
evaluation via ModelEvaluator, and registration in ModelRegistry.
Strict rule: Disallows any task outside data-quality and info-extraction.
"""

import time
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split

from .dataset_manager import dataset_manager, SUPPORTED_TASKS
from .evaluator import model_evaluator
from .model_registry import model_registry

class TrainerService:
    """Manages asynchronous and synchronous training jobs."""
    _jobs: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def list_jobs(cls) -> List[Dict[str, Any]]:
        return list(cls._jobs.values())

    @classmethod
    def get_job(cls, job_id: str) -> Optional[Dict[str, Any]]:
        return cls._jobs.get(job_id)

    @classmethod
    def start_training_job(cls, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Initiates a training job.
        Validates task, runs pipeline, computes metrics, registers model.
        """
        job_id = f"JOB-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"
        dataset_id = payload.get("dataset_id")
        task_type = payload.get("task_type", "DOCUMENT_CLASSIFICATION")
        model_family = payload.get("model_family", "LogisticRegression")
        hyperparameters = payload.get("hyperparameters", {})

        # Safety rule validation
        if task_type not in SUPPORTED_TASKS:
            err = f"Disallowed task: '{task_type}'. Permitted tasks: {SUPPORTED_TASKS}."
            return {"job_id": job_id, "status": "FAILED", "error": err}

        for k, v in payload.items():
            if isinstance(v, str) and any(bad in v.lower() for bad in ["guilt", "confession", "deception", "lie_detector", "culpability"]):
                return {
                    "job_id": job_id,
                    "status": "REJECTED",
                    "error": "Safety violation: Models predicting guilt, deception, or criminality are strictly forbidden."
                }

        # Initialize job record
        job_record = {
            "job_id": job_id,
            "task_type": task_type,
            "dataset_id": dataset_id,
            "model_family": model_family,
            "hyperparameters": hyperparameters,
            "status": "RUNNING",
            "progress_pct": 10,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": None,
            "error": None,
            "metrics": None,
            "model_id": None
        }
        cls._jobs[job_id] = job_record

        # Synchronous execution for deterministic completion
        start_time = time.time()
        try:
            # 1. Fetch dataset
            dataset = dataset_manager.get_dataset(dataset_id)
            if not dataset:
                job_record["status"] = "FAILED"
                job_record["error"] = f"Dataset '{dataset_id}' not found."
                return job_record

            records = dataset["records"]
            job_record["progress_pct"] = 25

            # 2. Extract X and y
            if task_type in ["DOCUMENT_CLASSIFICATION", "ENTITY_TYPE_CLASSIFICATION"]:
                X = [r["text"] for r in records]
                y = [r["label"] for r in records]
            elif task_type == "ENTITY_RESOLUTION_MATCHING":
                X = [f"{r['entity_a']} [SEP] {r['entity_b']}" for r in records]
                y = [r["label"] for r in records]
            elif task_type == "DATA_ANOMALY_DETECTION":
                X = [[float(r.get("speed_kmh", 0)), int(r.get("off_hour_flag", 0))] for r in records]
                y = [r["label"] for r in records]
            else:
                job_record["status"] = "FAILED"
                job_record["error"] = f"Unsupported task type: {task_type}"
                return job_record

            job_record["progress_pct"] = 40

            # 3. Stratified Train/Test Split (75% train, 25% test)
            test_size = float(hyperparameters.get("test_split_ratio", 0.25))
            random_seed = int(hyperparameters.get("random_seed", 42))

            # Ensure stratify works (requires >= 2 instances per class)
            class_counts = {}
            for lbl in y:
                class_counts[lbl] = class_counts.get(lbl, 0) + 1
            can_stratify = all(cnt >= 2 for cnt in class_counts.values())

            X_train, X_test, y_train, y_test, samples_train, samples_test = train_test_split(
                X, y, records,
                test_size=test_size,
                random_state=random_seed,
                stratify=y if can_stratify else None
            )

            # 4. Leakage Verification
            leakage_report = dataset_manager.check_leakage(samples_train, samples_test, task_type)
            if leakage_report["leakage_detected"]:
                job_record["status"] = "FAILED"
                job_record["error"] = f"Data leakage detected: {leakage_report['leakage_count']} records shared between train and test splits."
                return job_record

            job_record["progress_pct"] = 60

            # 5. Build Pipeline
            if task_type in ["DOCUMENT_CLASSIFICATION", "ENTITY_TYPE_CLASSIFICATION", "ENTITY_RESOLUTION_MATCHING"]:
                max_features = int(hyperparameters.get("max_features", 1000))
                vec = TfidfVectorizer(ngram_range=(1, 2), max_features=max_features)
                
                if model_family == "RandomForest":
                    n_estimators = int(hyperparameters.get("n_estimators", 100))
                    clf = RandomForestClassifier(n_estimators=n_estimators, random_state=random_seed)
                else:
                    c_param = float(hyperparameters.get("c_param", 1.0))
                    clf = LogisticRegression(C=c_param, max_iter=500, class_weight="balanced", random_state=random_seed)

                pipeline = Pipeline([
                    ("vec", vec),
                    ("clf", clf)
                ])
            else:
                # Tabular anomaly
                c_param = float(hyperparameters.get("c_param", 1.0))
                pipeline = LogisticRegression(C=c_param, max_iter=500, class_weight="balanced", random_state=random_seed)

            job_record["progress_pct"] = 75

            # 6. Fit Model
            pipeline.fit(X_train, y_train)

            # 7. Evaluate Model on Test Split
            job_record["progress_pct"] = 85
            y_pred = pipeline.predict(X_test)
            y_prob = pipeline.predict_proba(X_test) if hasattr(pipeline, "predict_proba") else None
            unique_labels = sorted(list(set(y)))

            metrics = model_evaluator.compute_metrics(
                y_true=y_test,
                y_pred=y_pred,
                y_prob=y_prob,
                labels=unique_labels,
                test_samples=samples_test
            )

            # 8. Register Model
            job_record["progress_pct"] = 95
            model_id = f"MOD-{task_type[:3]}-{model_family[:2].upper()}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
            duration = time.time() - start_time

            model_registry.register_model(
                model_id=model_id,
                task_type=task_type,
                model_family=model_family,
                dataset_id=dataset_id,
                dataset_version=dataset["version"],
                dataset_hash=dataset["sha256_hash"],
                pipeline=pipeline,
                labels=unique_labels,
                hyperparameters=hyperparameters,
                evaluation_metrics=metrics,
                training_duration_sec=duration
            )

            job_record["status"] = "COMPLETED"
            job_record["progress_pct"] = 100
            job_record["completed_at"] = datetime.now(timezone.utc).isoformat()
            job_record["model_id"] = model_id
            job_record["metrics"] = metrics

            return job_record

        except Exception as e:
            job_record["status"] = "FAILED"
            job_record["error"] = str(e)
            return job_record

trainer_service = TrainerService()
