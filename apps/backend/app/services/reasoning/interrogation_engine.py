"""
Autonomous AI Suspect Interrogation Simulation Engine (TRACE).
Derives suspect role, demeanor, and stress responses dynamically from the live case graph.
"""

from typing import Dict, Any, List
from app.repositories.base import GraphRepository


class InterrogationEngine:
    @staticmethod
    def interrogate_suspect(
        suspect_id: str,
        question: str,
        evidence_presented: List[str],
        current_stress: int,
        repo: GraphRepository
    ) -> Dict[str, Any]:
        """
        Simulates dynamic dialogue response derived from suspect's real graph connections.
        """
        node = repo.get_node(suspect_id)
        suspect_name = node.label if node else suspect_id

        # Inspect real connected edges in graph
        all_edges = repo.get_all().edges
        incident_edges = [e for e in all_edges if e.source == suspect_id or e.target == suspect_id]
        fin_edges = [e for e in incident_edges if any(k in e.type for k in ("TRANSFER", "PAID", "ACCOUNT", "OWNS"))]
        call_edges = [e for e in incident_edges if any(k in e.type for k in ("CALL", "PHONE", "USES"))]

        if len(fin_edges) > 0 and len(call_edges) > 0:
            role = "Syndicate Coordinator"
        elif len(fin_edges) > 0:
            role = "Financial Conduit"
        elif len(call_edges) > 0:
            role = "Communications Operator"
        else:
            role = "Identified Associate"

        q_lower = question.lower()
        stress_delta = 0

        if any(w in q_lower for w in ["bank", "account", "wire", "money", "hawala", "transfer", "lakh", "crore"]):
            stress_delta += 25 if len(fin_edges) > 0 else 8
        if any(w in q_lower for w in ["call", "phone", "cdr", "tower", "cell", "intercept"]):
            stress_delta += 20 if len(call_edges) > 0 else 6
        if any(w in q_lower for w in ["alibi", "where were you", "evidence", "witness", "fir"]):
            stress_delta += 18

        if len(evidence_presented) > 0:
            stress_delta += len(evidence_presented) * 10

        new_stress = min(max(current_stress + stress_delta, 15), 100)
        deception_detected = 45 <= new_stress < 80
        confession_triggered = new_stress >= 80

        if new_stress < 40:
            dialogue = (
                f"Officer, I've answered this. As {role}, my activities are strictly legitimate. "
                f"Your network charts and assumptions are baseless."
            )
            demeanor = "Defensive & Dismissive"
            heart_rate = 74
        elif new_stress < 70:
            dialogue = (
                f"...Whoever gave you those records doesn't have the full picture. "
                f"I admit I spoke to people, but I was never running the syndicate."
            )
            demeanor = "Agitated & Sweating"
            heart_rate = 108
        else:
            dialogue = (
                f"Enough! Please guarantee my safety from the others and I will lay out the entire network. "
                f"The financial accounts, the safehouse locations... I have all the records."
            )
            demeanor = "Broken & Cooperative"
            heart_rate = 138

        return {
            "suspect_id": suspect_id,
            "suspect_name": suspect_name,
            "role": role,
            "demeanor": demeanor,
            "dialogue": dialogue,
            "response": dialogue,
            "stress_level": new_stress,
            "heart_rate_bpm": heart_rate,
            "confession_probability": round(new_stress / 100.0, 2),
            "biometrics": {
                "stress_level": new_stress,
                "heart_rate_bpm": heart_rate,
                "voice_tremor_detected": new_stress > 60,
                "pupil_dilation_mm": round(3.0 + (new_stress / 30.0), 1)
            },
            "deception_detected": deception_detected,
            "confession_triggered": confession_triggered,
            "recommended_next_question": (
                "Who authorized the primary fund transfers into the offshore accounts?"
                if len(fin_edges) > 0 else
                "Who was the second party on the encrypted mobile terminals?"
            )
        }
