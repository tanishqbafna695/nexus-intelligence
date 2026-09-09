"""
TRACE Bounded ML Training Subsystem
Provides dataset management, cryptographic fingerprinting, rigorous scikit-learn evaluation,
and guarded model registration for data-quality and info-extraction tasks only.
"""

from .dataset_manager import dataset_manager, DatasetManager, SUPPORTED_TASKS, TASK_SCHEMAS
from .evaluator import model_evaluator, ModelEvaluator
from .model_registry import model_registry, ModelRegistry
from .trainer_service import trainer_service, TrainerService

__all__ = [
    "dataset_manager",
    "DatasetManager",
    "SUPPORTED_TASKS",
    "TASK_SCHEMAS",
    "model_evaluator",
    "ModelEvaluator",
    "model_registry",
    "ModelRegistry",
    "trainer_service",
    "TrainerService"
]
