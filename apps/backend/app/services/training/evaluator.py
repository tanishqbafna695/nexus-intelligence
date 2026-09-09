"""
TRACE Bounded ML Training Architecture — Model Evaluator
Computes honest, rigorous evaluation metrics using scikit-learn.
Includes multi-class precision, recall, macro-F1, per-class breakdown,
confusion matrix, Brier calibration, and categorized error sample analysis.
Strict rule: No guilt, confession, or criminality scores.
"""

from typing import Dict, Any, List, Optional
import numpy as np
from sklearn.metrics import (
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix,
    brier_score_loss
)

class ModelEvaluator:
    """Evaluates classification models with full honesty and auditability."""

    @staticmethod
    def compute_metrics(
        y_true: List[Any],
        y_pred: List[Any],
        y_prob: Optional[np.ndarray] = None,
        labels: Optional[List[str]] = None,
        test_samples: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Computes standard multi-class metrics, confusion matrix, calibration,
        and extracts error samples for manual forensic review.
        """
        if len(y_true) == 0 or len(y_pred) == 0:
            return {"error": "Empty ground truth or predictions"}

        if labels is None:
            labels = sorted(list(set(y_true) | set(y_pred)))

        # 1. Aggregate metrics
        macro_f1 = float(f1_score(y_true, y_pred, labels=labels, average="macro", zero_division=0))
        micro_f1 = float(f1_score(y_true, y_pred, labels=labels, average="micro", zero_division=0))
        weighted_f1 = float(f1_score(y_true, y_pred, labels=labels, average="weighted", zero_division=0))
        
        macro_prec = float(precision_score(y_true, y_pred, labels=labels, average="macro", zero_division=0))
        macro_rec = float(recall_score(y_true, y_pred, labels=labels, average="macro", zero_division=0))

        # 2. Per-class report
        class_report = classification_report(
            y_true, y_pred, labels=labels, output_dict=True, zero_division=0
        )
        per_class = {}
        for lbl in labels:
            str_lbl = str(lbl)
            if str_lbl in class_report:
                per_class[str_lbl] = {
                    "precision": round(float(class_report[str_lbl]["precision"]), 4),
                    "recall": round(float(class_report[str_lbl]["recall"]), 4),
                    "f1_score": round(float(class_report[str_lbl]["f1-score"]), 4),
                    "support": int(class_report[str_lbl]["support"])
                }

        # 3. Confusion Matrix
        cm = confusion_matrix(y_true, y_pred, labels=labels)
        cm_matrix = cm.tolist()

        # 4. Calibration (Brier Score)
        brier_score = None
        if y_prob is not None and len(labels) == 2:
            try:
                # Binary calibration
                # Convert y_true to binary 0/1
                pos_label = labels[1]
                bin_true = [1 if y == pos_label else 0 for y in y_true]
                brier_score = round(float(brier_score_loss(bin_true, y_prob[:, 1])), 4)
            except Exception:
                brier_score = None

        # 5. Error Samples (False Positives and False Negatives)
        error_samples = []
        if test_samples and len(test_samples) == len(y_true):
            for i, (yt, yp) in enumerate(zip(y_true, y_pred)):
                if yt != yp:
                    sample_info = {
                        "index": i,
                        "sample_snippet": str(test_samples[i].get("text") or test_samples[i].get("entity_a", ""))[:120],
                        "true_label": yt,
                        "predicted_label": yp,
                        "error_type": "MISCLASSIFICATION",
                        "confidence": round(float(np.max(y_prob[i])), 4) if y_prob is not None else None,
                        "source_provenance": test_samples[i].get("origin", "Test Split Record")
                    }
                    error_samples.append(sample_info)

        return {
            "macro_f1": round(macro_f1, 4),
            "micro_f1": round(micro_f1, 4),
            "weighted_f1": round(weighted_f1, 4),
            "macro_precision": round(macro_prec, 4),
            "macro_recall": round(macro_rec, 4),
            "labels": [str(l) for l in labels],
            "per_class": per_class,
            "confusion_matrix": {
                "labels": [str(l) for l in labels],
                "matrix": cm_matrix
            },
            "calibration": {
                "brier_score": brier_score,
                "note": "Lower Brier score indicates better calibrated probability outputs."
            },
            "error_sample_count": len(error_samples),
            "error_samples": error_samples[:20],  # Return top 20 error samples for review
            "limitations_note": (
                "Metrics calculated strictly on held-out test split. Performance in production "
                "depends on data distribution similarity. All outputs require human analyst verification. "
                "Models do NOT infer culpability, guilt, or criminal intent."
            )
        }

model_evaluator = ModelEvaluator()
