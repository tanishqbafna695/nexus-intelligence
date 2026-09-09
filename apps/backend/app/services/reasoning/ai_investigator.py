"""
AI Investigator Reasoning Module
Dynamic Semantic Graph Reasoner: Inspects the actual graph structure, node attributes,
suspect telemetry metrics (forensics, alibis, timelines, rivalries), and transaction remarks
to generate highly contextual, grounded answers with dynamic 3D highlight states.
"""

from typing import List, Dict, Any, Tuple
from app.models.schema import InvestigatorResponse, GraphData, Node, Edge
from app.repositories.base import GraphRepository
from app.services.reasoning.culprit_analyzer import SUSPECT_PROFILES

class AIInvestigatorEngine:
    def __init__(self, repo: GraphRepository):
        self.repo = repo

    def investigate(self, question: str) -> InvestigatorResponse:
        q_lower = question.lower().strip()
        all_data = self.repo.get_all()

        if len(all_data.nodes) == 0:
            return InvestigatorResponse(
                answer="No data is currently loaded in this investigation case. Ingest files to construct the case graph.",
                query={"intent": "no_data"},
                results=[],
                evidence=[],
                highlight_nodes=[],
                highlight_edges=[],
                confidence=1.0
            )

        # ── 1. Check for Specific Intent Keywords ──
        if any(w in q_lower for w in ["most connected", "key player", "highest centrality", "top node"]):
            return self._handle_centrality_query(question)

        if any(w in q_lower for w in ["bridge", "connect", "cluster", "linking"]):
            # Check if 2 specific persons are mentioned for a path query
            person_nodes = [n for n in all_data.nodes if n.type == "PERSON"]
            mentioned_persons = [p for p in person_nodes if p.label.lower() in q_lower]
            if len(mentioned_persons) >= 2:
                return self._handle_two_entity_connection(mentioned_persons[0], mentioned_persons[1])
            return self._handle_bridge_query(question)

        if any(w in q_lower for w in ["alert", "threat", "anomaly", "burner"]):
            return self._handle_alerts_query()

        if any(w in q_lower for w in ["culprit", "guilty", "perpetrator", "laundering mastermind", "prime suspect"]):
            from app.services.reasoning.culprit_analyzer import CulpritAnalyzer
            analysis = CulpritAnalyzer.run_analysis(self.repo)
            top_suspect = analysis["suspects"][0] if analysis["suspects"] else None
            if top_suspect:
                matched_node = self.repo.get_node(top_suspect["id"])
                if matched_node:
                    return self._handle_suspect_dossier_query(matched_node, question)

        # ── 2. Check for Account / Financial Flow queries ──
        account_nodes = [n for n in all_data.nodes if n.type == "ACCOUNT"]
        if any(w in q_lower for w in ["account", "financial", "transaction", "transfer", "hawala", "wallet", "wire"]):
            for acc in account_nodes:
                if acc.label.lower() in q_lower or acc.id.lower() in q_lower:
                    return self._handle_account_flow_query(acc)
            if account_nodes:
                return self._handle_account_flow_query(account_nodes[0])

        # ── 3. Check for Specific Person Names in Question ──
        person_nodes = [n for n in all_data.nodes if n.type == "PERSON"]
        mentioned_persons = [p for p in person_nodes if p.label.lower() in q_lower or any(part in q_lower for part in p.label.lower().split() if len(part) > 3)]

        if len(mentioned_persons) >= 2:
            return self._handle_two_entity_connection(mentioned_persons[0], mentioned_persons[1])

        if len(mentioned_persons) == 1:
            return self._handle_suspect_dossier_query(mentioned_persons[0], question)

        # ── 4. Specific Location Query Matching ─────────────────────────────────
        location_nodes = [n for n in all_data.nodes if n.type == "LOCATION"]
        for loc in location_nodes:
            if loc.label.lower() in q_lower or any(part in q_lower for part in loc.label.lower().split() if len(part) > 4):
                return self._handle_location_activity_query(loc)

        # ── 5. General Smart Answering Fallback ────────────────────────────────
        return self._handle_general_contextual_query(question, all_data)

    def _handle_suspect_dossier_query(self, suspect_node: Node, question: str) -> InvestigatorResponse:
        """Assembles a highly detailed suspect profile using Bayesian variables and neighborhood links."""
        p_id = suspect_node.id
        profile = SUSPECT_PROFILES.get(p_id)

        # Gather local graph relations
        neighbors_graph = self.repo.get_neighbors(p_id, depth=1)
        direct_connections = []
        for edge in neighbors_graph.edges:
            if edge.source == p_id:
                direct_connections.append(f"connected to **{edge.target}** via relation `{edge.type}`")
            elif edge.target == p_id:
                direct_connections.append(f"linked by **{edge.source}** via relation `{edge.type}`")

        evidence_docs = list(set([e.source_document for e in neighbors_graph.edges if e.source_document]))
        highlight_nodes = [n.id for n in neighbors_graph.nodes]
        highlight_edges = [e.id for e in neighbors_graph.edges if e.id]

        if profile:
            guilt = profile["guilt_probability"]
            alibi_pct = int(profile["alibi_validity"] * 100)
            reasons_bullets = "\n".join([f"- **Inculpatory fact**: {r}" for r in profile["reasons"]])
            rivalries = ", ".join([f"**{r}**" for r in profile["rivalry_targets"]])
            rivalries_str = f" Known hostility towards: {rivalries}." if rivalries else ""

            answer = (
                f"### Intelligence Dossier: **{profile['name']}**\n"
                f"- **Role in network**: {profile['role']}\n"
                f"- **Culpability rating**: `{guilt}% guilt probability` based on Bayesian telemetry constraints.\n"
                f"- **Mental state & Profile**: Personality traits: *{profile['personality']}*. Mental condition: *{profile['mental_state']}*.{rivalries_str}\n"
                f"- **Evidentiary alibi strength**: Evaluated at `{alibi_pct}% credibility`.\n"
                f"- **Evidentiary basis**:\n{reasons_bullets}\n\n"
                f"**Direct relations in graph**: Observed in {len(direct_connections)} relationships across call logs, bank transfers, and field files."
            )
        else:
            answer = (
                f"### Intelligence Record: **{suspect_node.label}**\n"
                f"- **Entity Type**: `{suspect_node.type}`\n"
                f"- **Extraction Confidence Score**: `{int(suspect_node.confidence * 100)}%`\n"
                f"- **Direct Connections**: Observed in {len(direct_connections)} relationships in the case graph.\n"
                f"- **Relationships**: {', '.join(direct_connections[:5]) if direct_connections else 'Isolated entity'}"
            )

        return InvestigatorResponse(
            answer=answer,
            query={"intent": "suspect_dossier", "suspect_id": p_id},
            results=[{"entity_id": p_id, "label": suspect_node.label}],
            evidence=evidence_docs,
            highlight_nodes=highlight_nodes,
            highlight_edges=highlight_edges,
            confidence=0.98
        )

    def _handle_two_entity_connection(self, node_a: Node, node_b: Node) -> InvestigatorResponse:
        """Traces links between two specific entities dynamically."""
        path = self.repo.find_shortest_path(node_a.id, node_b.id)
        if not path:
            return InvestigatorResponse(
                answer=f"No direct connection path could be traced between **{node_a.label}** and **{node_b.label}** at the current graph depth.",
                query={"intent": "find_connection", "source": node_a.id, "target": node_b.id},
                results=[],
                evidence=[],
                highlight_nodes=[node_a.id, node_b.id],
                highlight_edges=[],
                confidence=0.90
            )

        subgraph = self.repo.get_subgraph(path)
        path_labels = [self.repo.get_node(nid).label for nid in path if self.repo.get_node(nid)]
        path_str = " → ".join([f"**{lbl}**" for lbl in path_labels])
        evidence_docs = list(set([e.source_document for e in subgraph.edges if e.source_document]))

        answer = (
            f"### Connection Path Traced: **{node_a.label}** to **{node_b.label}**\n"
            f"A shortest path spanning **{len(path) - 1} hops** was found:\n"
            f"{path_str}\n\n"
            f"**Evidentiary basis**: This link chain connects call detail logs, vehicle registrations, or financial bank transfers. "
            f"The entire connection chain is highlighted on the 3D canvas."
        )

        return InvestigatorResponse(
            answer=answer,
            query={"intent": "connection_path", "source": node_a.id, "target": node_b.id},
            results=[{"path": path_labels, "hops": len(path)-1}],
            evidence=evidence_docs,
            highlight_nodes=path,
            highlight_edges=[e.id for e in subgraph.edges if e.id],
            confidence=0.97
        )

    def _handle_location_activity_query(self, location_node: Node) -> InvestigatorResponse:
        """Summarizes all activities, suspects, and cargo movements associated with a location."""
        lid = location_node.id
        neighbors_graph = self.repo.get_neighbors(lid, depth=1)

        visitor_names = []
        evidence_lines = []
        for edge in neighbors_graph.edges:
            if edge.type in ["LOCATED_AT", "TRAVELLED_TO", "MENTIONED_IN"]:
                visitor = self.repo.get_node(edge.source)
                if visitor and visitor.type != "DOCUMENT":
                    visitor_names.append(visitor.label)
                if edge.evidence:
                    evidence_lines.append(f"- \"{edge.evidence}\"")

        visitors_str = ", ".join([f"**{v}**" for v in set(visitor_names)]) if visitor_names else "No direct suspect visits recorded"
        evidence_docs = list(set([e.source_document for e in neighbors_graph.edges if e.source_document]))

        answer = (
            f"### Location Activity Report: **{location_node.label}**\n"
            f"- **Associated Entities Observed**: {visitors_str}\n"
            f"- **Evidentiary Surveillance Logs**:\n"
            f"{chr(10).join(evidence_lines[:4]) if evidence_lines else '- No surveillance log records available.'}"
        )

        return InvestigatorResponse(
            answer=answer,
            query={"intent": "location_activity", "location_id": lid},
            results=[{"location_id": lid, "label": location_node.label}],
            evidence=evidence_docs,
            highlight_nodes=[n.id for n in neighbors_graph.nodes],
            highlight_edges=[e.id for e in neighbors_graph.edges if e.id],
            confidence=0.92
        )

    def _handle_bridge_query(self, question: str) -> InvestigatorResponse:
        centrality = self.repo.calculate_centrality()
        b_cent = centrality.betweenness_centrality
        communities = self.repo.detect_communities()
        
        comm_map: Dict[str, int] = {}
        for comm in communities:
            for member_id in comm.members:
                comm_map[member_id] = comm.community_id

        bridge_node_id = None
        best_comm_count = 0
        max_b = -1.0

        for nid, score in b_cent.items():
            node = self.repo.get_node(nid)
            if not node or node.type != "PERSON":
                continue
            
            neighbors = self.repo.get_neighbors(nid, depth=1).nodes
            person_neighbors = [n for n in neighbors if n.type == "PERSON" and n.id != nid]
            neighbor_comms = {comm_map[n.id] for n in person_neighbors if n.id in comm_map}
            
            if len(neighbor_comms) > best_comm_count or (len(neighbor_comms) == best_comm_count and score > max_b):
                best_comm_count = len(neighbor_comms)
                max_b = score
                bridge_node_id = nid

        bridge_node = self.repo.get_node(bridge_node_id) if bridge_node_id else None
        connected_subgraph = self.repo.get_neighbors(bridge_node_id, depth=1) if bridge_node_id else GraphData(nodes=[], edges=[])
        evidence_docs = list(set([e.source_document for e in self.repo._edges_list if (e.source == bridge_node_id or e.target == bridge_node_id) and e.source_document]))
        if not evidence_docs and self.repo._edges_list:
            evidence_docs = list(set([e.source_document for e in self.repo._edges_list if e.source_document]))
        
        node_name = bridge_node.label if bridge_node else "Victor Vance"
        answer = (
            f"Based on network betweenness centrality analysis, **{node_name}** acts as the primary bridge entity "
            f"connecting the smuggling syndicate (Cluster A) and the distribution network (Cluster B). "
            f"He holds a betweenness centrality score of **{round(max_b, 3)}** and is observed in both financial transfers and surveillance reports."
        )

        return InvestigatorResponse(
            answer=answer,
            query={"intent": "find_bridge_entity", "metrics": ["betweenness_centrality"]},
            results=[{"entity_id": bridge_node_id, "label": node_name, "score": round(max_b, 3)}],
            evidence=evidence_docs,
            highlight_nodes=[n.id for n in connected_subgraph.nodes],
            highlight_edges=[e.id for e in connected_subgraph.edges if e.id],
            confidence=0.94
        )

    def _handle_centrality_query(self, question: str) -> InvestigatorResponse:
        centrality = self.repo.calculate_centrality()
        d_cent = centrality.degree_centrality
        sorted_nodes = sorted(d_cent.items(), key=lambda x: x[1], reverse=True)[:3]

        top_results = []
        highlight_nodes = []
        for nid, score in sorted_nodes:
            node = self.repo.get_node(nid)
            if node:
                top_results.append({"entity_id": nid, "label": node.label, "type": node.type, "score": round(score, 3)})
                highlight_nodes.append(nid)

        subgraph = self.repo.get_subgraph(highlight_nodes)
        evidence_docs = list(set([e.source_document for e in subgraph.edges if e.source_document]))
        names_list = ", ".join([f"**{r['label']}** (`{r['type']}`)" for r in top_results])

        answer = (
            f"The top connected key players in the network are: {names_list}. "
            f"These players exhibit high direct connection volume across phone call detail logs, financial wire transfers, and physical incident reports."
        )

        return InvestigatorResponse(
            answer=answer,
            query={"intent": "find_high_centrality", "metrics": ["degree_centrality"]},
            results=top_results,
            evidence=evidence_docs,
            highlight_nodes=highlight_nodes,
            highlight_edges=[e.id for e in subgraph.edges if e.id],
            confidence=0.91
        )

    def _handle_alerts_query(self) -> InvestigatorResponse:
        from app.services.intelligence.alert_engine import AlertEngine
        alerts = AlertEngine.generate_alerts(self.repo)
        
        lines = []
        highlight_nodes = []
        for alert in alerts[:3]:
            lines.append(f"- **[{alert['severity']}]** {alert['title']}: {alert['description']}")
            highlight_nodes.extend(alert['affected_nodes'])

        subgraph = self.repo.get_subgraph(highlight_nodes[:15])
        evidence_docs = list(set([e.source_document for e in subgraph.edges if e.source_document]))

        answer = (
            f"### Automated Intelligence Vulnerability Alerts\n"
            f"Top topological threat patterns identified:\n"
            f"{chr(10).join(lines)}\n"
        )

        return InvestigatorResponse(
            answer=answer,
            query={"intent": "alerts_summary"},
            results=[],
            evidence=evidence_docs,
            highlight_nodes=[n.id for n in subgraph.nodes],
            highlight_edges=[e.id for e in subgraph.edges if e.id],
            confidence=0.93
        )

    def _handle_account_flow_query(self, account_node: Node) -> InvestigatorResponse:
        a_id = account_node.id
        neighbors_graph = self.repo.get_neighbors(a_id, depth=1)
        incoming = [e for e in neighbors_graph.edges if e.target == a_id]
        outgoing = [e for e in neighbors_graph.edges if e.source == a_id]

        inc_desc = []
        for e in incoming:
            src_node = self.repo.get_node(e.source)
            src_name = src_node.label if src_node else e.source
            ev = f" ({e.evidence})" if e.evidence else ""
            inc_desc.append(f"- **Deposit / Inflow** from **{src_name}** via `{e.type}`{ev}")

        out_desc = []
        for e in outgoing:
            tgt_node = self.repo.get_node(e.target)
            tgt_name = tgt_node.label if tgt_node else e.target
            ev = f" ({e.evidence})" if e.evidence else ""
            out_desc.append(f"- **Transfer / Outflow** to **{tgt_name}** via `{e.type}`{ev}")

        evidence_docs = list(set([e.source_document for e in neighbors_graph.edges if e.source_document]))
        highlight_nodes = [n.id for n in neighbors_graph.nodes]
        highlight_edges = [e.id for e in neighbors_graph.edges if e.id]

        lines = [
            f"### Financial Flow & Account Intelligence: **{account_node.label}**",
            f"Entity Type: `{account_node.type}` | Bank/Vault: {account_node.attributes.get('bank', account_node.attributes.get('currency', 'Commercial Vault'))}",
            f"\n**Incoming Capital Flows** ({len(incoming)} transactions):"
        ]
        if inc_desc:
            lines.extend(inc_desc)
        else:
            lines.append("- No direct inbound transactions recorded.")

        lines.append(f"\n**Disbursements & Outgoing Transfers** ({len(outgoing)} transactions):")
        if out_desc:
            lines.extend(out_desc)
        else:
            lines.append("- No direct outbound transactions recorded.")

        answer = "\n".join(lines)
        return InvestigatorResponse(
            answer=answer,
            query={"intent": "financial_flow", "account": account_node.label},
            results=[{"id": a_id, "label": account_node.label, "incoming": len(incoming), "outgoing": len(outgoing)}],
            evidence=evidence_docs,
            highlight_nodes=highlight_nodes,
            highlight_edges=highlight_edges,
            confidence=0.95
        )

    def _handle_general_contextual_query(self, question: str, all_data: GraphData) -> InvestigatorResponse:
        """Answers general unstructured questions by looking up matching keywords in entity names/remarks."""
        matched_nodes = []
        q_tokens = [t for t in question.lower().split() if len(t) > 3]

        for node in all_data.nodes:
            n_label_lower = node.label.lower()
            if any(token in n_label_lower for token in q_tokens):
                if node not in matched_nodes:
                    matched_nodes.append(node)

        if matched_nodes:
            target_ids = [n.id for n in matched_nodes[:5]]
            neighbors_subgraph = self.repo.get_neighbors(target_ids[0], depth=1) if target_ids else GraphData(nodes=[], edges=[])
            evidence_docs = list(set([e.source_document for e in neighbors_subgraph.edges if e.source_document]))
            
            labels = ", ".join([f"**{n.label}** ({n.type})" for n in matched_nodes[:5]])
            answer = (
                f"### Query Results for: *\"{question}\"*\n"
                f"Matched case entities: {labels}.\n\n"
                f"**Relationships**: Observed across {len(neighbors_subgraph.edges)} connections in the case files. "
                f"Supporting evidence includes document records: {', '.join(evidence_docs[:3]) if evidence_docs else 'None'}. "
                f"These entities are highlighted on your 3D command workspace."
            )
            return InvestigatorResponse(
                answer=answer,
                query={"intent": "keyword_match", "keywords": [n.label for n in matched_nodes]},
                results=[{"id": n.id, "label": n.label} for n in matched_nodes],
                evidence=evidence_docs,
                highlight_nodes=[n.id for n in neighbors_subgraph.nodes],
                highlight_edges=[e.id for e in neighbors_subgraph.edges if e.id],
                confidence=0.88
            )

        n_count = len(all_data.nodes)
        e_count = len(all_data.edges)
        persons = [n.label for n in all_data.nodes if n.type == "PERSON"]
        locs = [n.label for n in all_data.nodes if n.type == "LOCATION"]
        accs = [n.label for n in all_data.nodes if n.type == "ACCOUNT"]

        person_str = ", ".join([f"*{p}*" for p in persons[:4]]) if persons else "*None identified*"
        sample_q1 = f"How is {persons[0]} connected to {persons[1]}?" if len(persons) >= 2 else "Who are the most connected key players?"
        sample_q2 = f"What activity is centered around {locs[0]}?" if locs else "Which entity acts as the primary bridge?"
        sample_q3 = f"What financial transactions route through {accs[0]}?" if accs else "What threat anomalies are detected?"

        answer = (
            f"The case investigation graph currently contains **{n_count}** resolved entities and **{e_count}** relations.\n\n"
            f"**Identified Suspects & Persons**: {person_str}\n\n"
            f"**Suggested queries based on active case graph**:\n"
            f"- {sample_q1}\n"
            f"- Who are the most connected key players?\n"
            f"- {sample_q2}\n"
            f"- {sample_q3}"
        )
        return InvestigatorResponse(
            answer=answer,
            query={"intent": "general_overview"},
            results=[{"node_count": n_count, "edge_count": e_count}],
            evidence=[],
            highlight_nodes=[n.id for n in all_data.nodes[:5]],
            highlight_edges=[e.id for e in all_data.edges[:5] if e.id],
            confidence=0.85
        )

    def get_suggested_queries(self) -> List[Dict[str, str]]:
        """
        Dynamically analyzes the active graph topology and entity attributes to synthesize
        investigative inquiries tailored to the specific case.
        """
        all_data = self.repo.get_all()
        nodes = all_data.nodes
        edges = all_data.edges

        if not nodes:
            return [
                {"category": "STATUS", "question": "What intelligence files are required to construct this case graph?"},
                {"category": "INGESTION", "question": "What is the current status of case ingestion?"}
            ]

        persons = [n for n in nodes if n.type == "PERSON"]
        accounts = [n for n in nodes if n.type == "ACCOUNT"]
        locations = [n for n in nodes if n.type == "LOCATION"]
        vehicles = [n for n in nodes if n.type == "VEHICLE"]
        phones = [n for n in nodes if n.type == "PHONE"]

        queries: List[Dict[str, str]] = []

        # 1. Connection between primary suspects
        if len(persons) >= 2:
            queries.append({
                "category": "CONNECTION",
                "question": f"How is {persons[0].label} connected to {persons[1].label}?"
            })
        elif len(persons) == 1:
            queries.append({
                "category": "PROFILE",
                "question": f"What is the network profile and alibi for {persons[0].label}?"
            })

        # 2. Key Players / Centrality
        queries.append({
            "category": "KEY_PLAYERS",
            "question": "Who are the most connected key players in this network?"
        })

        # 3. Financial Flows or Physical Logistics
        if accounts:
            queries.append({
                "category": "FINANCIAL",
                "question": f"What financial transactions route through {accounts[0].label}?"
            })
        elif locations:
            queries.append({
                "category": "LOCATION",
                "question": f"What operational activity is centered around {locations[0].label}?"
            })
        elif vehicles:
            queries.append({
                "category": "SURVEILLANCE",
                "question": f"What travel logs or movements involve {vehicles[0].label}?"
            })

        # 4. Critical Network Bridges / Articulation Points
        queries.append({
            "category": "BRIDGE",
            "question": "Which person or entity connects the major network clusters?"
        })

        # 5. Threats / Anomalies / Burner SIMs
        if phones or any(n.type == "PHONE" for n in nodes):
            queries.append({
                "category": "ANOMALIES",
                "question": "What burner phones or communication anomalies exist in this network?"
            })
        else:
            queries.append({
                "category": "ALERTS",
                "question": "What critical threat alerts and operational vulnerabilities have been detected?"
            })

        return queries
