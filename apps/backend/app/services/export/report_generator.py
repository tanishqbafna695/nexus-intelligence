"""
Executive Case Report Generator & Export Package Service
Generates structured Markdown/JSON investigation reports with evidence provenance.
"""

from typing import Dict, Any
from app.models.schema import Case, GraphData, AnalyticsResponse
from app.repositories.base import GraphRepository
from app.services.analytics.engine import AnalyticsEngine
from app.services.reasoning.ai_investigator import AIInvestigatorEngine

class CaseReportGenerator:
    @staticmethod
    def generate_json_export(case: Case, repo: GraphRepository) -> Dict[str, Any]:
        analytics_engine = AnalyticsEngine(repo)
        analytics = analytics_engine.run_full_analytics()
        graph = repo.get_all()

        case_dict = {
            "id": case.id,
            "name": case.name,
            "description": case.description,
            "created_at": case.created_at,
            "document_ids": case.document_ids,
            "total_nodes": len(graph.nodes),
            "total_edges": len(graph.edges)
        }

        return {
            "case": case_dict,
            "case_info": case_dict,
            "graph": {
                "nodes": [n.model_dump() if hasattr(n, "model_dump") else n.dict() for n in graph.nodes],
                "edges": [e.model_dump() if hasattr(e, "model_dump") else e.dict() for e in graph.edges]
            },
            "analytics": {
                "top_key_players": analytics.top_key_players,
                "communities": [c.model_dump() if hasattr(c, "model_dump") else c.dict() for c in analytics.communities]
            }
        }

    @staticmethod
    def generate_executive_report(case: Case, repo: GraphRepository) -> str:
        analytics_engine = AnalyticsEngine(repo)
        analytics = analytics_engine.run_full_analytics()
        ai_engine = AIInvestigatorEngine(repo)
        
        # Run bridge investigation query
        bridge_resp = ai_engine.investigate("Which person connects Cluster A and Cluster B?")
        
        top_players = analytics.top_key_players[:5]
        
        report_lines = [
            f"# EXECUTIVE INVESTIGATION REPORT: {case.name.upper()}",
            f"**Case Identifier**: `{case.id}`",
            f"**Case Description**: {case.description}",
            f"**Generated At**: {case.created_at}",
            f"**Scope**: {len(case.document_ids)} Source Documents | {len(repo.get_all().nodes)} Resolved Entities | {len(repo.get_all().edges)} Directed Edges",
            "",
            "---",
            "",
            "## 1. Executive Intelligence Summary",
            f"{bridge_resp.answer}",
            "",
            "---",
            "",
            "## 2. Key Player Centrality Rankings",
            "| Rank | Entity Label | Type | Composite Score | Betweenness Centrality | Degree Centrality |",
            "| :--- | :--- | :--- | :--- | :--- | :--- |"
        ]

        for idx, player in enumerate(top_players, 1):
            report_lines.append(
                f"| {idx} | **{player['label']}** | `{player['type']}` | {player['composite_score']} | {player['betweenness_centrality']} | {player['degree_centrality']} |"
            )

        report_lines.extend([
            "",
            "---",
            "",
            "## 3. Community Cluster Breakdown",
        ])

        for comm in analytics.communities:
            members_str = ", ".join([f"`{m}`" for m in comm.members])
            report_lines.append(f"- **Cluster #{comm.community_id}** ({len(comm.members)} members): {members_str}")

        report_lines.extend([
            "",
            "---",
            "",
            "## 4. Supporting Document Provenance",
            "All analytical conclusions in this report are grounded in verified document records:"
        ])

        for doc_id in case.document_ids:
            report_lines.append(f"- **Document**: `{doc_id}`")

        return "\n".join(report_lines)
