"""
Robustness Test Suite: Graph Analytics Boundaries & Disclaimers
"""

import pytest
import os
import sys
from fastapi.testclient import TestClient

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "apps", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app
from app.repositories.networkx_repo import NetworkXGraphRepository
from app.models.schema import Node, Edge
from app.services.analytics.engine import AnalyticsEngine
from app.services.analytics.graph_ml_engine import GraphMLEngine
from app.services.reasoning.investigative_priority_engine import InvestigativePriorityEngine

@pytest.fixture
def client():
    return TestClient(app)

def test_empty_graph_analytics():
    repo = NetworkXGraphRepository()
    engine = AnalyticsEngine(repo)
    analytics = engine.run_full_analytics()
    assert analytics.centrality.degree_centrality == {}
    assert analytics.centrality.betweenness_centrality == {}
    assert analytics.centrality.pagerank == {}
    assert analytics.communities == []
    assert analytics.top_key_players == []

    # Priority engine on empty graph
    priorities = InvestigativePriorityEngine.assess_case_priorities("CASE-EMPTY", repo)
    assert priorities["priority_targets"] == []
    assert "statutory_disclaimer" in priorities

def test_single_node_graph_analytics():
    repo = NetworkXGraphRepository()
    repo.add_node(Node(id="person_loner", type="PERSON", label="Loner Suspect", confidence=0.9))
    
    engine = AnalyticsEngine(repo)
    analytics = engine.run_full_analytics()
    assert "person_loner" in analytics.centrality.degree_centrality
    assert analytics.centrality.betweenness_centrality["person_loner"] == 0.0
    assert len(analytics.communities) == 1

def test_disconnected_clusters():
    repo = NetworkXGraphRepository()
    # Cluster A
    repo.add_node(Node(id="p1", type="PERSON", label="Person 1", confidence=0.9))
    repo.add_node(Node(id="p2", type="PERSON", label="Person 2", confidence=0.9))
    repo.add_edge(Edge(source="p1", target="p2", type="COORDINATES_WITH", confidence=0.9, source_document="doc1"))
    
    # Cluster B (isolated)
    repo.add_node(Node(id="p3", type="PERSON", label="Person 3", confidence=0.9))
    repo.add_node(Node(id="p4", type="PERSON", label="Person 4", confidence=0.9))
    repo.add_edge(Edge(source="p3", target="p4", type="TRANSFERRED_TO", confidence=0.9, source_document="doc2"))

    engine = GraphMLEngine(repo)
    vuln = engine.analyze_network_vulnerability()
    assert vuln["total_cut_vertices"] == 0  # No bridge between disconnected clusters

def test_centrality_is_not_guilt_guarantee():
    """
    Critical requirement: Graph centrality indicates structural connectivity,
    NOT legal culpability or guilt.
    """
    repo = NetworkXGraphRepository()
    # Receptionist / Public Switchboard with highest degree centrality
    repo.add_node(Node(id="receptionist", type="PERSON", label="Desk Receptionist", confidence=0.99))
    for i in range(10):
        call_id = f"caller_{i}"
        repo.add_node(Node(id=call_id, type="PERSON", label=f"Caller {i}", confidence=0.8))
        repo.add_edge(Edge(source=call_id, target="receptionist", type="CONTACTED", confidence=0.8, source_document="cdr"))

    priorities = InvestigativePriorityEngine.assess_case_priorities("CASE-RECEPTIONIST", repo)
    # Ensure disclaimer explicitly states that investigative priority is not a legal guilt determination
    assert "statutory_disclaimer" in priorities
    assert "guilt" in priorities["statutory_disclaimer"].lower()
