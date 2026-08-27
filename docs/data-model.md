# NEXUS Intelligence — Data Model

## 1. Purpose

This document defines the common data structure used across the NEXUS Intelligence system.

All modules must follow this schema.

---

# 2. Entity Types

NEXUS initially supports the following entity types:

1. PERSON
2. PHONE
3. VEHICLE
4. LOCATION
5. ORGANIZATION
6. ACCOUNT
7. CASE
8. EVENT

---

# 3. Entity Structure

Every entity should contain:

- id
- type
- properties
- source
- confidence

Example:

```json
{
  "id": "P001",
  "type": "PERSON",
  "properties": {
    "name": "Rajesh Kumar",
    "aliases": []
  },
  "source": "FIR_001",
  "confidence": 0.95
}


{
  "id": "PH001",
  "type": "PHONE",
  "properties": {
    "number": "XXXXXXXXXX"
  },
  "source": "CDR_001",
  "confidence": 0.99
}


{
  "id": "V001",
  "type": "VEHICLE",
  "properties": {
    "registration": "MH12AB1234",
    "type": "CAR"
  },
  "source": "FIR_002",
  "confidence": 0.97
}


{
  "id": "L001",
  "type": "LOCATION",
  "properties": {
    "name": "Station Road",
    "city": "Pune"
  },
  "source": "FIR_001",
  "confidence": 0.91
}


{
  "id": "O001",
  "type": "ORGANIZATION",
  "properties": {
    "name": "Example Organization"
  },
  "source": "FIR_003",
  "confidence": 0.88
}



{
  "id": "A001",
  "type": "ACCOUNT",
  "properties": {
    "account_reference": "ACC001"
  },
  "source": "TXN_001",
  "confidence": 0.99
}



{
  "id": "CASE001",
  "type": "CASE",
  "properties": {
    "case_number": "CASE-2026-001",
    "description": "Example investigation"
  },
  "source": "FIR_001",
  "confidence": 1.0
}



{
  "id": "E001",
  "type": "EVENT",
  "properties": {
    "event_type": "MEETING",
    "timestamp": "2026-08-20T14:30:00"
  },
  "source": "SURV_001",
  "confidence": 0.85
}



