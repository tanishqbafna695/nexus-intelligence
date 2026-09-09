"""
Performance & Stress Test Suite
"""

import time
import pytest
import os
import sys

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "apps", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.repositories.networkx_repo import NetworkXGraphRepository
from app.models.schema import Node, Edge
from app.services.analytics.engine import AnalyticsEngine
from app.services.analytics.graph_ml_engine import GraphMLEngine

def test_1000_node_graph_analytics_performance():
    repo = NetworkXGraphRepository()
    
    # 1. Generate 1,000 nodes
    node_types = ["PERSON", "PHONE", "ACCOUNT", "LOCATION", "VEHICLE"]
    for i in range(1000):
        ntype = node_types[i % len(node_types)]
        repo.add_node(Node(id=f"node_{i}", type=ntype, label=f"Entity {i}", confidence=0.85))

    # 2. Generate 2,500 edges with scale-free distribution
    import random
    random.seed(42)
    edge_types = ["CONTACTED", "TRANSFERRED_TO", "TRAVELLED_TO", "COORDINATES_WITH"]
    for j in range(2500):
        src = f"node_{random.randint(0, 999)}"
        tgt = f"node_{random.randint(0, 999)}"
        if src != tgt:
            repo.add_edge(Edge(
                source=src, target=tgt,
                type=edge_types[j % len(edge_types)],
                confidence=0.80,
                source_document="stress_dataset.csv"
            ))

    # 3. Benchmark Centrality & Community Detection
    start = time.perf_counter()
    engine = AnalyticsEngine(repo)
    analytics = engine.run_full_analytics()
    duration = time.perf_counter() - start

    print(f"\n1,000 Nodes / 2,500 Edges Analytics Latency: {duration:.3f}s")
    assert duration < 5.0, f"Analytics computation took {duration:.3f}s, exceeding 5.0s benchmark."
    assert len(analytics.centrality.degree_centrality) == 1000
    assert len(analytics.top_key_players) <= 1000

def test_graph_ml_cycle_and_link_prediction_stress():
    repo = NetworkXGraphRepository()
    for i in range(20):
        repo.add_node(Node(id=f"n_{i}", type="ACCOUNT", label=f"Account {i}", confidence=0.9))

    # Create a 3-hop circular laundering loop
    repo.add_edge(Edge(source="n_0", target="n_1", type="TRANSFERRED_TO", confidence=0.9, source_document="doc"))
    repo.add_edge(Edge(source="n_1", target="n_2", type="TRANSFERRED_TO", confidence=0.9, source_document="doc"))
    repo.add_edge(Edge(source="n_2", target="n_0", type="TRANSFERRED_TO", confidence=0.9, source_document="doc"))

    start = time.perf_counter()
    ml_engine = GraphMLEngine(repo)
    cycles = ml_engine.detect_money_laundering_cycles()
    links = ml_engine.predict_missing_links(top_k=5)
    duration = time.perf_counter() - start

    print(f"Cycle & Link ML Stress Latency: {duration:.3f}s")
    assert duration < 1.0
    assert len(cycles) >= 1
