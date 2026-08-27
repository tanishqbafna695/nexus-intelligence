from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime

class Entity(BaseModel):
    id: str = Field(..., description="Unique entity identifier, e.g., P001, PH001")
    type: str = Field(..., description="Entity type: PERSON, PHONE, VEHICLE, LOCATION, ORGANIZATION, ACCOUNT, CASE, EVENT")
    properties: Dict[str, Any] = Field(default_factory=dict, description="Attributes like name, address, make, etc.")
    source: str = Field(..., description="Source document ID where this entity was found")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Extraction confidence score")

class Relationship(BaseModel):
    source: str = Field(..., description="Source entity ID")
    target: str = Field(..., description="Target entity ID")
    relationship: str = Field(..., description="Relationship type: KNOWS, CALLED, TRANSFERRED_MONEY, etc.")
    confidence: float = Field(..., ge=0.0, le=1.0)
    source_document: str = Field(..., description="Document ID providing the evidence")
    timestamp: Optional[datetime] = Field(None, description="Timestamp of the interaction/event")
    evidence: str = Field(..., description="Text snippet or description supporting the edge")