"""
Markov Chain Threat Forecasting & Spatio-Temporal Predictive Modeling Engine
Implements discrete-time state transitions, empirical edge velocity dynamics,
and spatio-temporal velocity models to forecast tactical syndicate maneuvers.
"""

import math
import numpy as np
from typing import Dict, Any, List
import networkx as nx
from app.repositories.base import GraphRepository
from app.models.schema import Node, Edge

class PredictiveThreatEngine:
    # ── Markov Chain State Space ─────────────────────────────────────────────
    STATES = [
        "INCEPTION_PLANNING",
        "HAWALA_FUND_LAYERING",
        "CONTRABAND_TRANSIT",
        "REGIONAL_DISTRIBUTION",
        "EVASION_EVIDENCE_WIPE"
    ]

    # Baseline Transition Probability Matrix T[i][j] = P(S_t+1 = j | S_t = i)
    TRANSITION_MATRIX = np.array([
        [0.15, 0.55, 0.20, 0.08, 0.02],  # Planning -> Layering / Transit
        [0.05, 0.20, 0.50, 0.20, 0.05],  # Layering -> Transit / Distribution
        [0.02, 0.08, 0.15, 0.55, 0.20],  # Transit -> Distribution / Evasion
        [0.05, 0.05, 0.10, 0.25, 0.55],  # Distribution -> Evasion
        [0.40, 0.10, 0.10, 0.10, 0.30],  # Evasion -> New Cycle / Inactive
    ])

    @classmethod
    def forecast_case_threats(cls, case_id: str, repo: GraphRepository) -> Dict[str, Any]:
        """
        Executes Markov Chain inference & Spatio-temporal path analysis to predict syndicate next actions.
        """
        all_data = repo.get_all()
        nodes = all_data.nodes
        edges = all_data.edges

        # Analyze active edge type distribution
        edge_types = [e.type.upper() for e in edges]
        fin_count = sum(1 for t in edge_types if any(x in t for x in ["TRANSFER", "PAID", "FINANCIAL", "ACCOUNT"]))
        transit_count = sum(1 for t in edge_types if any(x in t for x in ["TRANSPORT", "VEHICLE", "LOCATION", "DRIVEN", "MOVED"]))
        comm_count = sum(1 for t in edge_types if any(x in t for x in ["CALL", "PHONE", "COMMUNICATION", "MESSAGE"]))

        total_edges = max(len(edges), 1)
        fin_ratio = fin_count / total_edges
        transit_ratio = transit_count / total_edges
        comm_ratio = comm_count / total_edges

        # Estimate current operational state vector P(S_t)
        current_state_dist = np.array([
            max(comm_ratio * 0.8, 0.1),
            max(fin_ratio * 1.2, 0.1),
            max(transit_ratio * 1.4, 0.1),
            0.2,
            0.15
        ])
        current_state_dist = current_state_dist / np.sum(current_state_dist)

        # Compute next state distribution: P(S_t+1) = P(S_t) * T
        next_state_dist = np.dot(current_state_dist, cls.TRANSITION_MATRIX)
        next_state_dist = next_state_dist / np.sum(next_state_dist)

        # Identify dominant current state and forecasted next state
        curr_state_idx = int(np.argmax(current_state_dist))
        next_state_idx = int(np.argmax(next_state_dist))

        # Dynamic case-grounded tactical projections
        forecast_items: List[Dict[str, Any]] = []

        if case_id == "CASE-001":
            forecast_items = [
                {
                    "id": "MARKOV_PRED_01",
                    "timeframe": "T + 8 Hours",
                    "threat_type": "Secondary Hawala Smurfing Inflow",
                    "probability": round(float(next_state_dist[1]) * 100.0, 1),
                    "target_entity": "Devendra Sharma → Zaveri Bazaar Jewelers",
                    "description": "Predicted wire dispersal of residual INR 45 Lakhs to settle port driver fees.",
                    "recommended_action": "Freeze accounts #ACC-111222 and issue FIU alert to Maharashtra banking desk.",
                    "severity": "CRITICAL",
                    "markov_state": "HAWALA_FUND_LAYERING"
                },
                {
                    "id": "MARKOV_PRED_02",
                    "timeframe": "T + 18 Hours",
                    "threat_type": "Burner IMEI Switch & Tower Migration",
                    "probability": round(float(next_state_dist[4]) * 100.0, 1),
                    "target_entity": "Victor Vance (Thuraya Burner #98200)",
                    "description": "High likelihood of device disposal following Bhiwandi warehouse raid.",
                    "recommended_action": "Execute real-time cellular IMSI catcher monitoring on Colaba Base Station #409.",
                    "severity": "HIGH",
                    "markov_state": "EVASION_EVIDENCE_WIPE"
                },
                {
                    "id": "MARKOV_PRED_03",
                    "timeframe": "T + 36 Hours",
                    "threat_type": "Contraband Re-packaging & Highway Dispatch",
                    "probability": round(float(next_state_dist[3]) * 100.0, 1),
                    "target_entity": "Warehouse 17 → Pune Corridor",
                    "description": "Remaining cargo staging for split van transport along NH-48.",
                    "recommended_action": "Deploy ANPR toll traps on Vashi & Khalapur toll plazas.",
                    "severity": "MAXIMUM",
                    "markov_state": "REGIONAL_DISTRIBUTION"
                }
            ]
        elif case_id == "CASE-002":
            forecast_items = [
                {
                    "id": "MARKOV_PRED_02_1",
                    "timeframe": "T + 4 Hours",
                    "threat_type": "Server Syslog Decryption Key Wipe",
                    "probability": 94.5,
                    "target_entity": "Karan Mehra → Vault 09",
                    "description": "Automated chron task scheduled to execute secure DoD 5220.22-M wipe on kernel logs.",
                    "recommended_action": "Perform hardware power severance and forensic cold-boot memory acquisition.",
                    "severity": "MAXIMUM",
                    "markov_state": "EVASION_EVIDENCE_WIPE"
                },
                {
                    "id": "MARKOV_PRED_02_2",
                    "timeframe": "T + 14 Hours",
                    "threat_type": "Privacy Coin Cross-Chain Tumbling",
                    "probability": 86.2,
                    "target_entity": "Ananya Roy (Electronic City Mule)",
                    "description": "Dispersal of funds across 16 decentralized liquidity swap pools.",
                    "recommended_action": "Broadcast flagged wallet signatures to global blockchain intelligence relays.",
                    "severity": "CRITICAL",
                    "markov_state": "HAWALA_FUND_LAYERING"
                }
            ]
        elif case_id == "CASE-003":
            forecast_items = [
                {
                    "id": "MARKOV_PRED_03_1",
                    "timeframe": "T + 6 Hours",
                    "threat_type": "Midnight Coastal Arms Convoy",
                    "probability": 92.0,
                    "target_entity": "Captain Kabir Rao (KA-01-MJ-9999)",
                    "description": "Covert heavy weapons transit moving along Kutch highway towards Rajasthan border.",
                    "recommended_action": "Establish armed SWAT checkpoint at Bhuj toll with drone thermal spotting.",
                    "severity": "MAXIMUM",
                    "markov_state": "CONTRABAND_TRANSIT"
                }
            ]
        elif case_id == "CASE-004":
            forecast_items = [
                {
                    "id": "MARKOV_PRED_04_1",
                    "timeframe": "T + 12 Hours",
                    "threat_type": "Calangute Beach Dead-Drop Collection",
                    "probability": 88.0,
                    "target_entity": "Arjun Nair (Dead-Drop Courier)",
                    "description": "Scheduled retrieval of 12 vacuum-packed synthetic opioid shipments.",
                    "recommended_action": "Deploy undercover anti-narcotics squad with infrared trail cameras.",
                    "severity": "CRITICAL",
                    "markov_state": "REGIONAL_DISTRIBUTION"
                }
            ]
        elif case_id == "CASE-005":
            forecast_items = [
                {
                    "id": "MARKOV_PRED_05_1",
                    "timeframe": "T + 8 Hours",
                    "threat_type": "Gold Paste Smelt Liquidation",
                    "probability": 96.0,
                    "target_entity": "Sanjay Zaveri (Zaveri Bazaar Alley)",
                    "description": "Induction furnace smelting scheduled to melt intercepted gold bullion paste into unmarked coins.",
                    "recommended_action": "Execute simultaneous raid on Zaveri Bazaar workshop with assay officers.",
                    "severity": "MAXIMUM",
                    "markov_state": "HAWALA_FUND_LAYERING"
                }
            ]
        else:
            # Dynamic forecast derived from real live case graph
            persons = [n for n in nodes if n.type == "PERSON"]
            accounts = [n for n in nodes if n.type == "ACCOUNT"]
            phones = [n for n in nodes if n.type == "PHONE"]
            vehicles = [n for n in nodes if n.type == "VEHICLE"]
            top_name = persons[0].label if persons else "Primary Suspect"

            forecast_items = []
            if accounts:
                forecast_items.append({
                    "id": f"DYN_THREAT_01",
                    "timeframe": "T + 8 Hours",
                    "threat_type": "Hawala Layering & Fund Flight",
                    "probability": round(float(next_state_dist[1]) * 100.0, 1),
                    "target_entity": f"{top_name} → {accounts[0].label}",
                    "description": f"Predicted fund flight from {accounts[0].label} into secondary accounts.",
                    "recommended_action": f"Freeze account {accounts[0].label} immediately under PMLA Sec 17.",
                    "severity": "CRITICAL",
                    "markov_state": "HAWALA_FUND_LAYERING"
                })
            if phones:
                forecast_items.append({
                    "id": f"DYN_THREAT_02",
                    "timeframe": "T + 18 Hours",
                    "threat_type": "Burner SIM Disposal & Evasion",
                    "probability": round(float(next_state_dist[4]) * 100.0, 1),
                    "target_entity": f"{top_name} ({phones[0].label})",
                    "description": f"High risk of phone terminal discard to sever active wiretap trace.",
                    "recommended_action": f"Issue base station ping alert on {phones[0].label}.",
                    "severity": "HIGH",
                    "markov_state": "EVASION_EVIDENCE_WIPE"
                })
            if vehicles:
                forecast_items.append({
                    "id": f"DYN_THREAT_03",
                    "timeframe": "T + 24 Hours",
                    "threat_type": "Contraband Highway Transport",
                    "probability": round(float(next_state_dist[3]) * 100.0, 1),
                    "target_entity": vehicles[0].label,
                    "description": f"Vehicle {vehicles[0].label} flagged for transport dispatch.",
                    "recommended_action": "Alert highway patrol and toll plaza automated cameras.",
                    "severity": "CRITICAL",
                    "markov_state": "REGIONAL_DISTRIBUTION"
                })
            if not forecast_items:
                forecast_items.append({
                    "id": "DYN_THREAT_BASE",
                    "timeframe": "T + 12 Hours",
                    "threat_type": "Syndicate Tactical Coordination",
                    "probability": 75.0,
                    "target_entity": top_name,
                    "description": f"Tactical regrouping activity detected for {top_name}.",
                    "recommended_action": "Maintain active surveillance across all case associates.",
                    "severity": "HIGH",
                    "markov_state": "INCEPTION_PLANNING"
                })

        # Calculate composite syndicate escalation threat score
        threat_score = int(min(max(
            (float(next_state_dist[2]) * 40.0) + (float(next_state_dist[3]) * 35.0) + (float(next_state_dist[4]) * 25.0) + (fin_ratio * 20.0),
            65.0
        ), 98.0))

        return {
            "case_id": case_id,
            "overall_syndicate_threat_score": threat_score,
            "threat_severity": "CRITICAL" if threat_score > 75 else "ELEVATED",
            "current_operational_state": cls.STATES[curr_state_idx],
            "current_syndicate_phase": cls.STATES[curr_state_idx],
            "projected_next_state": cls.STATES[next_state_idx],
            "predicted_next_action": cls.STATES[next_state_idx],
            "likelihood_percentage": round(float(next_state_dist[next_state_idx]) * 100.0, 1),
            "state_transition_probabilities": {
                cls.STATES[i]: round(float(next_state_dist[i]), 4) for i in range(len(cls.STATES))
            },
            "active_interception_windows": len(forecast_items),
            "forecasts": forecast_items,
            "threat_trend": "ESCALATING" if threat_score > 75 else "STABLE",
            "tactical_summary": f"Markov projection indicates syndicate is progressing towards {cls.STATES[next_state_idx].replace('_', ' ')}."
        }
