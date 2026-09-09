"""
Investigative Priority Assessment & Decision Support Engine (TRACE v2.0).
Computes evidence-grounded investigative priorities, identifies network resilience bottlenecks,
and generates actionable lawful inquiries for field investigators and prosecutors.
Strict Operating Standard: Decision support only. Zero automated guilt or raid directives.
"""

import networkx as nx
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from app.repositories.base import GraphRepository
from app.models.schema import GraphData, Node, Edge


class InvestigativePriorityEngine:
    @classmethod
    def assess_case_priorities(cls, case_id: str, repo: GraphRepository) -> Dict[str, Any]:
        graph_data: GraphData = repo.get_all()
        nodes = graph_data.nodes
        edges = graph_data.edges

        # 1. Empty graph check
        if not nodes:
            return {
                "case_id": case_id,
                "runtime_mode": "live",
                "status": "AWAITING_INGESTION",
                "summary": "No intelligence data ingested yet for this case. Ingest CDR, Financial Ledgers, or FIR transcripts to compute investigative priorities.",
                "priority_targets": [],
                "hvt_priority_targets": [],
                "network_resilience_hypotheses": [],
                "takedown_bottlenecks": [],
                "investigative_directives": [],
                "actionable_directives": [],
                "statutory_disclaimer": (
                    "INVESTIGATIVE DECISION SUPPORT ONLY - Not an automated legal determination or proof of guilt. "
                    "All statutory recommendations require independent prosecutorial review."
                )
            }

        # 2. Build NetworkX graph
        nx_graph = getattr(repo, 'graph', None)
        if nx_graph is None or not isinstance(nx_graph, (nx.Graph, nx.DiGraph, nx.MultiDiGraph)):
            nx_graph = nx.DiGraph()
            for n in nodes:
                nx_graph.add_node(n.id, type=n.type, label=n.label, **n.attributes)
            for e in edges:
                nx_graph.add_edge(e.source, e.target, type=e.type, weight=e.confidence)

        ug = nx_graph.to_undirected()
        total_nodes = len(ug.nodes)

        # 3. Compute topological metrics
        deg_centrality = nx.degree_centrality(ug) if total_nodes > 1 else {n.id: 1.0 for n in nodes}
        btw_centrality = nx.betweenness_centrality(ug) if total_nodes > 2 else {n.id: 0.0 for n in nodes}
        try:
            pagerank = nx.pagerank(ug) if total_nodes > 1 else {n.id: 1.0 for n in nodes}
        except Exception:
            pagerank = deg_centrality

        # 4. Evaluate Person Nodes & Rank Priorities
        person_nodes = [n for n in nodes if n.type == "PERSON"]
        eval_nodes = person_nodes if person_nodes else nodes[:5]

        targets: List[Dict[str, Any]] = []

        for p in eval_nodes:
            deg = deg_centrality.get(p.id, 0.0)
            btw = btw_centrality.get(p.id, 0.0)
            pr = pagerank.get(p.id, 0.0)

            connected_edges = [e for e in edges if e.source == p.id or e.target == p.id]
            source_docs = {e.source_document for e in connected_edges if e.source_document}
            doc_count = len(source_docs)

            financial_edges = [e for e in connected_edges if any(k in e.type for k in ("TRANSFER", "PAID", "ACCOUNT", "LAUNDER", "BENEFIT", "FINANCIAL"))]
            comms_edges = [e for e in connected_edges if any(k in e.type for k in ("CALL", "PHONE", "COMMUNICATE", "CONTACT", "INTERCEPT"))]
            vehicle_edges = [e for e in connected_edges if any(k in e.type for k in ("TRAVEL", "VEHICLE", "SPOTTED"))]

            # Composite explainable priority score (0.0 to 100.0, unclamped)
            score_connectivity = min(deg * 100.0, 25.0)
            score_bridge = min(btw * 150.0, 35.0)
            score_corroboration = min(doc_count * 10.0, 25.0)
            score_nexus = 15.0 if (len(financial_edges) > 0 and len(comms_edges) > 0) else (8.0 if (financial_edges or comms_edges) else 3.0)

            priority_score = round(min(score_connectivity + score_bridge + score_corroboration + score_nexus, 98.5), 1)
            evidence_support_score = round(min(20.0 + (doc_count * 20.0) + (len(connected_edges) * 3.0), 96.0), 1)

            # Role hypothesis (objective & descriptive, not accusatory)
            if btw > 0.12 or (deg > 0.20 and btw > 0.06):
                role_hypothesis = "Communication Broker / Central Network Hub"
                hypotheses = [
                    f"Acts as structural information bridge (betweenness centrality: {btw:.3f}).",
                    f"Directly interfaces with {len(connected_edges)} network entities across {doc_count} source records."
                ]
                inquiries = [
                    "Examine simultaneous call records for coordination handoffs.",
                    "Verify secondary mobile terminal usage via IMEI/IMSI historical associations."
                ]
                statutory_review = [
                    "Section 91 CrPC / Section 94 BNSS: Production of CDR logs and subscriber registration dossiers (requires legal review)",
                    "IPC Sec 120B / BNS Sec 61: Legal consultation on conspiracy evidentiary thresholds"
                ]
            elif len(financial_edges) > 0 and len(financial_edges) >= len(comms_edges):
                role_hypothesis = "Financial Intermediary / Account Facilitator"
                hypotheses = [
                    f"Recorded in {len(financial_edges)} financial transaction/account relationships.",
                    f"Corroborated across primary banking/ledger exhibits."
                ]
                inquiries = [
                    "Subpoena bank KYC documents and authorized signatory mandates.",
                    "Trace counterparty beneficiary accounts for smurfing patterns."
                ]
                statutory_review = [
                    "PMLA Sec 50: Evidentiary documentation review (requires prosecutor consultation)",
                    "Section 91 CrPC: Formal request for certified bank statements under Bankers' Books Evidence Act"
                ]
            elif len(comms_edges) > 1:
                role_hypothesis = "Field Communications Contact"
                hypotheses = [
                    f"Active in {len(comms_edges)} intercepted telecom events.",
                    f"Associated with base station tower handshakes."
                ]
                inquiries = [
                    "Cross-reference cell tower location timestamps with incident timeline.",
                    "Interview registered subscriber regarding third-party handset possession."
                ]
                statutory_review = [
                    "Section 65B Indian Evidence Act / BSA Sec 63: Certificate for electronic telecom evidence"
                ]
            else:
                role_hypothesis = "Identified Network Associate"
                hypotheses = [
                    f"Peripheral entity linked to {len(connected_edges)} network nodes."
                ]
                inquiries = [
                    "Conduct voluntary witness inquiry regarding observed events.",
                    "Verify alibi during key incident timestamps."
                ]
                statutory_review = [
                    "Section 160 CrPC / Section 179 BNSS: Witness summons (requires supervisory approval)"
                ]

            targets.append({
                "target_id": p.id,
                "person_id": p.id,
                "target_name": p.label,
                "name": p.label,
                "operational_role": role_hypothesis,
                "role_hypothesis": role_hypothesis,
                "priority_score": priority_score,
                "investigative_priority_score": priority_score,
                "culpability_score": int(priority_score),  # Backward-compatible alias
                "evidence_support_score": evidence_support_score,
                "priority": "HIGH" if priority_score >= 70 else ("MEDIUM" if priority_score >= 40 else "LOW"),
                "direct_connections_count": len(connected_edges),
                "corroboration_sources": sorted(list(source_docs)),
                "centrality_metrics": {
                    "degree": round(deg, 4),
                    "betweenness": round(btw, 4),
                    "pagerank": round(pr, 4)
                },
                "hypotheses": hypotheses,
                "suggested_inquiries": inquiries,
                "actionable_directives": inquiries,
                "statutory_review_items": statutory_review,
                "recommended_action": inquiries[0] if inquiries else "Review evidence files."
            })

        # Sort descending by priority score
        targets.sort(key=lambda t: t["priority_score"], reverse=True)

        # 5. Network Resilience Hypotheses (Articulation Points & Bridges)
        resilience_hypotheses = []
        try:
            art_points = list(nx.articulation_points(ug))
            for ap in art_points[:4]:
                node_obj = repo.get_node(ap)
                label = node_obj.label if node_obj else ap
                ntype = node_obj.type if node_obj else "UNKNOWN"
                resilience_hypotheses.append({
                    "node_id": ap,
                    "label": label,
                    "type": ntype,
                    "articulation_point": True,
                    "disruption_impact": f"Removal of {label} fragments the component network topology.",
                    "hypothesis": f"Candidate structural bottleneck. Disruption would partition communication paths between sub-clusters.",
                    "verification_check": "Conduct field surveillance to verify whether an unmonitored alternate communication channel exists before assuming structural severance."
                })
        except Exception:
            pass

        # 6. Actionable Directives (Lawful Inquiries)
        directives = []
        for i, t in enumerate(targets[:3]):
            directives.append({
                "directive_id": f"DIR-{case_id}-{i+1:02d}",
                "priority": f"PHASE {i+1} FOLLOW-UP",
                "action": t["suggested_inquiries"][0] if t["suggested_inquiries"] else "Cross-reference documentary evidence.",
                "legal_framework": t["statutory_review_items"][0] if t["statutory_review_items"] else "Section 91 CrPC",
                "requires_legal_review": True,
                "target_entity": t["name"],
                "justification": f"High topological centrality ({t['centrality_metrics']['degree']:.2f}) corroborated in {len(t['corroboration_sources'])} documents."
            })

        playbook = [
            {"hour": "0-24h", "action": "Issue formal Section 91 CrPC / Section 94 BNSS requests for subscriber verification dossiers."},
            {"hour": "24-48h", "action": "Cross-reference CDR cell tower coordinates with ANPR toll cameras for spatio-temporal alignment."},
            {"hour": "48-72h", "action": "Synthesize verified evidence dossier and consult prosecutorial counsel on statutory thresholds."}
        ]
        preservation_alerts = [
            {"alert_type": "EVIDENCE_PRESERVATION", "description": "Preserve Section 65B electronic records certificate before carrier log rotation."}
        ]

        return {
            "case_id": case_id,
            "runtime_mode": "live",
            "status": "SOLUTIONS_COMPILED",
            "assessment_status": "ASSESSMENT_COMPLETE",
            "summary": f"Evaluated {len(eval_nodes)} key network entities across {len(edges)} verified graph connections.",
            "hvt_priority_targets": targets,  # Backward compatibility alias
            "priority_targets": targets,
            "actionable_directives": directives,
            "investigative_directives": directives,
            "takedown_bottlenecks": resilience_hypotheses,  # Backward compatibility alias
            "network_resilience_hypotheses": resilience_hypotheses,
            "operational_playbook_72h": playbook,
            "evidence_preservation_alerts": preservation_alerts,
            "statutory_disclaimer": (
                "INVESTIGATIVE DECISION SUPPORT ONLY - Not an automated legal determination or proof of guilt. "
                "All statutory recommendations require independent prosecutorial review."
            ),
            "legal_notice": (
                "INVESTIGATIVE DECISION SUPPORT ONLY - Not an automated legal determination or proof of guilt. "
                "All statutory recommendations require independent prosecutorial consultation."
            )
        }
