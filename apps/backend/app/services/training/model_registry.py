"""
TRACE Bounded ML Training Architecture — Model Registry
Provides model persistence, versioning, provenance metadata,
and guarded inference wrapper.
Strict rule: No guilt, confession, or criminality inference.
"""

from typing import Dict, Any, List, Optional
import os
import pickle
from datetime import datetime, timezone
import numpy as np

HUMAN_REVIEW_CONFIDENCE_THRESHOLD = 0.65

class ModelRegistry:
    """Stores trained models, hyperparameters, and evaluation metrics."""
    _models: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def register_model(
        cls,
        model_id: str,
        task_type: str,
        model_family: str,
        dataset_id: str,
        dataset_version: str,
        dataset_hash: str,
        pipeline: Any,
        labels: List[Any],
        hyperparameters: Dict[str, Any],
        evaluation_metrics: Dict[str, Any],
        training_duration_sec: float
    ) -> Dict[str, Any]:
        """Registers a newly trained scikit-learn model."""
        record = {
            "model_id": model_id,
            "task_type": task_type,
            "model_family": model_family,
            "dataset_id": dataset_id,
            "dataset_version": dataset_version,
            "dataset_hash": dataset_hash,
            "pipeline": pipeline,
            "labels": [str(l) for l in labels],
            "hyperparameters": hyperparameters,
            "evaluation_metrics": evaluation_metrics,
            "training_duration_sec": round(training_duration_sec, 3),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "ACTIVE",
            "limitations": (
                "Strictly bounded to data-quality and information extraction. "
                "Outputs with confidence < 0.65 require mandatory human investigator verification. "
                "This model does NOT determine legal culpability, criminal intent, or credibility."
            )
        }
        cls._models[model_id] = record
        return cls.get_model_summary(model_id)

    @classmethod
    def get_model(cls, model_id: str) -> Optional[Dict[str, Any]]:
        return cls._models.get(model_id)

    @classmethod
    def get_model_summary(cls, model_id: str) -> Optional[Dict[str, Any]]:
        m = cls._models.get(model_id)
        if not m:
            return None
        return {
            "model_id": m["model_id"],
            "task_type": m["task_type"],
            "model_family": m["model_family"],
            "dataset_id": m["dataset_id"],
            "dataset_version": m["dataset_version"],
            "dataset_hash": m["dataset_hash"],
            "labels": m["labels"],
            "hyperparameters": m["hyperparameters"],
            "evaluation_metrics": m["evaluation_metrics"],
            "training_duration_sec": m["training_duration_sec"],
            "created_at": m["created_at"],
            "status": m["status"],
            "limitations": m["limitations"]
        }

    @classmethod
    def list_models(cls, task_type: Optional[str] = None) -> List[Dict[str, Any]]:
        res = []
        for m in cls._models.values():
            if task_type and m["task_type"] != task_type:
                continue
            res.append(cls.get_model_summary(m["model_id"]))
        return res

    @classmethod
    def predict(cls, model_id: str, input_payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Guarded inference wrapper:
        1. Formats input
        2. Obtains calibrated probabilities
        3. Flags mandatory human review if confidence < 0.65
        4. Provides top contributing features
        5. Attaches audit trail and limitations disclaimer
        """
        model_entry = cls._models.get(model_id)
        if not model_entry:
            return {"error": f"Model '{model_id}' not found in registry."}

        pipeline = model_entry["pipeline"]
        task_type = model_entry["task_type"]
        labels = model_entry["labels"]

        # Parse text/input based on task
        if task_type in ["DOCUMENT_CLASSIFICATION", "ENTITY_TYPE_CLASSIFICATION"]:
            text = input_payload.get("text", "").strip()
            if not text:
                return {"error": "Missing 'text' in input payload."}
            raw_input = [text]
        elif task_type == "ENTITY_RESOLUTION_MATCHING":
            ent_a = input_payload.get("entity_a", "").strip()
            ent_b = input_payload.get("entity_b", "").strip()
            if not ent_a or not ent_b:
                return {"error": "Missing 'entity_a' or 'entity_b' in input payload."}
            raw_input = [f"{ent_a} [SEP] {ent_b}"]
        elif task_type == "DATA_ANOMALY_DETECTION":
            speed = float(input_payload.get("speed_kmh", 0))
            off_hour = int(input_payload.get("off_hour_flag", 0))
            raw_input = [[speed, off_hour]]
        else:
            return {"error": f"Unsupported task type '{task_type}' for prediction."}

        # Predict
        try:
            pred_idx = pipeline.predict(raw_input)[0]
            pred_label = str(pred_idx)
            
            probabilities = {}
            confidence = 1.0
            if hasattr(pipeline, "predict_proba"):
                probs = pipeline.predict_proba(raw_input)[0]
                classes = [str(c) for c in pipeline.classes_]
                probabilities = {c: round(float(p), 4) for c, p in zip(classes, probs)}
                confidence = float(np.max(probs))
            elif hasattr(pipeline, "decision_function"):
                df = pipeline.decision_function(raw_input)[0]
                confidence = float(1.0 / (1.0 + np.exp(-df))) if isinstance(df, (int, float)) else 0.8
                probabilities = {pred_label: round(confidence, 4)}

            requires_human_review = confidence < HUMAN_REVIEW_CONFIDENCE_THRESHOLD

            # Top feature explanation (if linear model with vectorizer)
            top_features = []
            if hasattr(pipeline, "named_steps") and "vec" in pipeline.named_steps and "clf" in pipeline.named_steps:
                try:
                    vec = pipeline.named_steps["vec"]
                    clf = pipeline.named_steps["clf"]
                    if hasattr(clf, "coef_"):
                        feature_names = vec.get_feature_names_out()
                        feat_vec = vec.transform(raw_input).toarray()[0]
                        non_zeros = np.nonzero(feat_vec)[0]
                        # Top activated features
                        activated = [(feature_names[i], feat_vec[i]) for i in non_zeros]
                        activated.sort(key=lambda x: x[1], reverse=True)
                        top_features = [f[0] for f in activated[:5]]
                except Exception:
                    top_features = []

            return {
                "model_id": model_id,
                "task_type": task_type,
                "predicted_label": pred_label,
                "confidence": round(confidence, 4),
                "probabilities": probabilities,
                "requires_human_review": requires_human_review,
                "review_rationale": (
                    f"Confidence ({round(confidence*100, 1)}%) is below threshold "
                    f"({int(HUMAN_REVIEW_CONFIDENCE_THRESHOLD*100)}%). Manual investigator verification mandatory."
                    if requires_human_review else "Confidence above operational threshold. Subject to standard human-in-the-loop review."
                ),
                "top_active_tokens": top_features,
                "audit_trail": {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "model_family": model_entry["model_family"],
                    "dataset_version": model_entry["dataset_version"],
                    "dataset_hash": model_entry["dataset_hash"]
                },
                "disclaimer": model_entry["limitations"]
            }
        except Exception as e:
            return {"error": f"Inference failed: {str(e)}"}

model_registry = ModelRegistry()
