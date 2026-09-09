"""
Exhaustive Integration Test Suite for ALL 38+ TRACE REST Endpoints & Edge Cases.
Validates inputs, security boundaries, database synchronization, and algorithmic outputs.
"""

import os
import sys
import unittest
import io
from fastapi.testclient import TestClient

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "apps", "backend"))

from main import app
from app.repositories.sqlite_repo import SQLiteRepository


class TestExhaustiveEndpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from main import preload_synthetic_case
        preload_synthetic_case()
        cls.client = TestClient(app)
        cls.test_case_id = "CASE-TEST-INT"


    def test_01_health_and_root_endpoints(self):
        """Test root and health status endpoints."""
        for path in ["/", "/health", "/api/health", "/api/v1/health"]:
            res = self.client.get(path)
            self.assertEqual(res.status_code, 200, f"Failed at {path}")
            data = res.json()
            self.assertEqual(data["status"], "online")
            self.assertIn("TRACE", data["system"])

    def test_02_system_stats_endpoint(self):
        """Test /api/system/stats endpoint."""
        res = self.client.get("/api/system/stats")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "OPERATIONAL")
        self.assertIn("SQLite WAL Mode", data["database_storage"])
        self.assertTrue(data["total_cases"] >= 5)

    def test_03_case_management_lifecycle(self):
        """Test creating, listing, and validating case operations."""
        # 1. List cases
        res = self.client.get("/api/cases")
        self.assertEqual(res.status_code, 200)
        cases = res.json()
        self.assertTrue(len(cases) >= 5)

        # 2. Create case
        res_create = self.client.post("/api/cases?name=Operation+Thunderbolt&description=Special+Testing+Case")
        self.assertEqual(res_create.status_code, 200)
        new_case = res_create.json()
        self.assertIn("CASE-", new_case["id"])
        self.assertEqual(new_case["name"], "Operation Thunderbolt")

        # 3. Path traversal & invalid case ID rejection
        res_bad = self.client.get("/api/cases/INVALID@CASE!/graph")
        self.assertEqual(res_bad.status_code, 400)

    def test_04_document_upload_and_universal_etl(self):
        """Test uploading CDR and SWIFT files via universal ETL."""
        cdr_csv = """caller,callee,duration,timestamp,cell_tower,imei
+919811122233,+919822233344,142,2026-05-10T02:15:00,Tower_Nhava_409,IMEI_889977
+919822233344,+919833344455,65,2026-05-10T02:30:00,Tower_Nhava_409,IMEI_112233
"""
        file_payload = ("test_cdr.csv", io.BytesIO(cdr_csv.encode("utf-8")), "text/csv")
        res = self.client.post(
            f"/api/cases/{self.test_case_id}/ingest-file",
            files={"file": file_payload}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertTrue(data["extracted_nodes_count"] >= 2)

    def test_05_graph_and_subgraph_retrieval(self):
        """Test retrieving full graph and depth-limited ego-subgraph."""
        # 1. Full graph
        res = self.client.get("/api/cases/CASE-001/graph")
        self.assertEqual(res.status_code, 200)
        gdata = res.json()
        self.assertTrue(len(gdata["nodes"]) >= 20)
        self.assertTrue(len(gdata["edges"]) >= 50)

        # 2. Subgraph around specific node
        res_sub = self.client.get("/api/cases/CASE-001/graph?node_id=person_devendra&depth=1")
        self.assertEqual(res_sub.status_code, 200)
        sub_data = res_sub.json()
        self.assertTrue(len(sub_data["nodes"]) >= 1)

    def test_06_analytics_centrality_and_communities(self):
        """Test analytics execution and Louvain community detection."""
        # 1. Analytics
        res_an = self.client.post("/api/cases/CASE-001/analytics")
        self.assertEqual(res_an.status_code, 200)
        an = res_an.json()
        self.assertIn("centrality", an)
        self.assertIn("top_key_players", an)

        # 2. Communities
        res_comm = self.client.get("/api/cases/CASE-001/communities")
        self.assertEqual(res_comm.status_code, 200)
        comm = res_comm.json()
        self.assertTrue(len(comm) >= 1)

    def test_07_ai_investigator_query(self):
        """Test AI reasoning semantic query engine."""
        payload = {"case_id": "CASE-001", "question": "Who is financing the contraband and Hawala transfers?"}
        res = self.client.post("/api/cases/CASE-001/investigate", json=payload)
        self.assertEqual(res.status_code, 200)
        ans = res.json()
        self.assertIn("answer", ans)
        self.assertTrue(len(ans["answer"]) > 10)
        self.assertIn("confidence", ans)

    def test_08_shortest_path_finder(self):
        """Test shortest connection path calculation between entities."""
        res = self.client.get("/api/cases/CASE-001/path?source_node=person_devendra&target_node=loc_wh17")
        self.assertEqual(res.status_code, 200)
        path = res.json()
        self.assertIn("nodes", path)
        self.assertIn("edges", path)

    def test_09_bayesian_culpability_model(self):
        """Test Bayesian Belief Network culpability calculation."""
        res = self.client.get("/api/cases/CASE-001/culprit-analysis")
        self.assertEqual(res.status_code, 200)
        bbn = res.json()
        self.assertIn("suspects", bbn)
        self.assertTrue(len(bbn["suspects"]) >= 3)
        top_suspect = bbn["suspects"][0]
        self.assertTrue(top_suspect["guilt_probability"] > 80.0)

    def test_10_interrogation_simulation_and_history(self):
        """Test AI suspect interrogation and SQLite transcript storage."""
        payload = {
            "suspect_id": "person_tariq",
            "question": "Why did your burner phone connect to Warehouse 17 at 2:00 AM?",
            "evidence_presented": ["Cell Tower Base Station Triangulation: 32 hits at Warehouse 17"],
            "current_stress": 40
        }
        res = self.client.post("/api/cases/CASE-001/interrogate", json=payload)
        self.assertEqual(res.status_code, 200)
        interr = res.json()
        self.assertIn("response", interr)
        self.assertTrue(interr["stress_level"] > 40)
        self.assertIn("heart_rate_bpm", interr)

        # Retrieve history
        res_hist = self.client.get("/api/cases/CASE-001/interrogate/history?suspect_id=person_tariq")
        self.assertEqual(res_hist.status_code, 200)
        hist = res_hist.json()
        self.assertTrue(len(hist) >= 1)

    def test_11_predictive_threat_forecast(self):
        """Test Markov chain next-move simulation & threat forecasting."""
        for path in ["/api/cases/CASE-001/forecast", "/api/cases/CASE-001/threat-forecast"]:
            res = self.client.get(path)
            self.assertEqual(res.status_code, 200)
            fc = res.json()
            self.assertIn("current_syndicate_phase", fc)
            self.assertIn("threat_severity", fc)

    def test_12_cross_syndicate_fusion(self):
        """Test cross-case cartel fusion and multi-case link discovery."""
        res1 = self.client.get("/api/cross-syndicate-fusion")
        self.assertEqual(res1.status_code, 200)
        res2 = self.client.get("/api/cross-case-intelligence")
        self.assertEqual(res2.status_code, 200)

    def test_13_graph_ml_models(self):
        """Test link prediction, laundering cycles, and vulnerability endpoints."""
        # 1. Link predictions
        res_lp = self.client.get("/api/cases/CASE-001/ml/link-predictions?top_k=5")
        self.assertEqual(res_lp.status_code, 200)
        self.assertTrue(len(res_lp.json()) > 0)

        # 2. Laundering cycles
        res_lc = self.client.get("/api/cases/CASE-001/ml/laundering-cycles")
        self.assertEqual(res_lc.status_code, 200)

        # 3. Network vulnerability
        res_nv = self.client.get("/api/cases/CASE-001/ml/network-vulnerability")
        self.assertEqual(res_nv.status_code, 200)
        self.assertIn("total_cut_vertices", res_nv.json())

        # 4. Performance metrics
        res_pm = self.client.get("/api/cases/CASE-001/ml/performance-metrics")
        self.assertEqual(res_pm.status_code, 200)

    def test_14_spatio_temporal_intelligence(self):
        """Test convoy detection and silent-hour burst tracking."""
        res_c = self.client.get("/api/cases/CASE-001/spatio-temporal/convoys")
        self.assertEqual(res_c.status_code, 200)

        res_b = self.client.get("/api/cases/CASE-001/spatio-temporal/silent-bursts")
        self.assertEqual(res_b.status_code, 200)

    def test_15_judicial_chargesheet_and_warrants(self):
        """Test charge sheet generation and statutory section compilation."""
        res = self.client.get("/api/cases/CASE-001/chargesheet")
        self.assertEqual(res.status_code, 200)
        cs = res.json()
        self.assertIn("brief_facts_of_case", cs)
        self.assertTrue(cs["accused_count"] >= 1)
        self.assertIn("statutory_compliance", cs)

    def test_16_red_flags_and_anomalies(self):
        """Test automated anomaly detection for burner churn and smurfing."""
        res = self.client.get("/api/cases/CASE-001/red-flags")
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

    def test_17_chronological_4d_timeline(self):
        """Test 4D timeline sequence builder."""
        res = self.client.get("/api/cases/CASE-001/timeline")
        self.assertEqual(res.status_code, 200)
        tl = res.json()
        self.assertIn("total_timeline_events", tl)
        self.assertTrue(tl["total_timeline_events"] > 0)

    def test_18_sanitization_gateway(self):
        """Test cross-agency intelligence redaction and masking."""
        payload = {"clearance_level": "CONFIDENTIAL", "recipient_agency": "INTERPOL_MUMBAI"}
        res = self.client.post("/api/cases/CASE-001/export-sanitized-intel", json=payload)
        self.assertEqual(res.status_code, 200)
        san = res.json()
        self.assertEqual(san["classification_level"], "CONFIDENTIAL")
        self.assertIn("sanitized_graph", san)

    def test_19_ego_subgraph_and_min_cut_flow(self):
        """Test ego network extraction and min-cut flow bottleneck calculation."""
        res_ego = self.client.get("/api/cases/CASE-001/graph/ego/person_devendra?radius=1")
        self.assertEqual(res_ego.status_code, 200)
        self.assertTrue(len(res_ego.json()["nodes"]) >= 1)

        res_flow = self.client.get("/api/cases/CASE-001/graph/flow-bottlenecks?source_id=person_devendra&sink_id=account_dubai")
        self.assertEqual(res_flow.status_code, 200)

    def test_20_police_solutions_engine(self):
        """Test PoliceSolutionsEngine generating actionable directives & statutory sections."""
        res = self.client.get("/api/cases/CASE-001/police-solutions")
        self.assertEqual(res.status_code, 200)
        sol = res.json()
        self.assertEqual(sol["status"], "SOLUTIONS_COMPILED")
        self.assertTrue(len(sol["hvt_priority_targets"]) >= 1)
        self.assertTrue(len(sol["actionable_directives"]) >= 1)
        self.assertTrue(len(sol["operational_playbook_72h"]) >= 1)

    def test_21_delete_case_lifecycle(self):
        """Test creating a temporary case and permanently deleting it."""
        # 1. Create temporary case
        res_create = self.client.post("/api/cases?name=Temporary+Case+For+Deletion&description=Testing+Purges")
        self.assertEqual(res_create.status_code, 200)
        temp_id = res_create.json()["id"]

        # 2. Delete case
        res_del = self.client.delete(f"/api/cases/{temp_id}")
        self.assertEqual(res_del.status_code, 200)
        self.assertEqual(res_del.json()["status"], "success")

        # 3. Verify case is gone
        res_cases = self.client.get("/api/cases")
        case_ids = [c["id"] for c in res_cases.json()]
        self.assertNotIn(temp_id, case_ids)

    def test_22_cors_preflight_and_cascade_delete(self):
        """Verify CORS preflight allows DELETE and cascade deletes nodes & documents."""
        # 1. Test CORS preflight OPTIONS request for DELETE
        headers = {
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "DELETE",
            "Access-Control-Request-Headers": "Content-Type",
        }
        res_preflight = self.client.options("/api/cases/TEMP-DELETE-01", headers=headers)
        self.assertEqual(res_preflight.status_code, 200)
        allow_methods = res_preflight.headers.get("access-control-allow-methods", "")
        self.assertIn("DELETE", allow_methods)

        # 2. Create case and upload a document
        res_c = self.client.post("/api/cases?name=Cascade+Purge+Case&description=Testing+Full+Purge")
        self.assertEqual(res_c.status_code, 200)
        cid = res_c.json()["id"]

        # 3. Ingest a document
        res_doc = self.client.post(
            f"/api/cases/{cid}/documents",
            files={"file": ("test_ledger.txt", io.BytesIO(b"Devendra transferred 50000 to Ramesh"), "text/plain")}
        )
        self.assertEqual(res_doc.status_code, 200)

        # 4. Trigger Ingestion
        res_ingest = self.client.post(f"/api/cases/{cid}/ingest")
        self.assertEqual(res_ingest.status_code, 200)
        self.assertGreater(len(res_ingest.json()["nodes"]), 0)

        # 5. Delete case via DELETE endpoint
        res_del = self.client.delete(f"/api/cases/{cid}")
        self.assertEqual(res_del.status_code, 200)
        self.assertEqual(res_del.json()["status"], "success")

        # 6. Verify case graph is now empty and case is not listed
        res_graph = self.client.get(f"/api/cases/{cid}/graph")
        self.assertEqual(res_graph.status_code, 200)
        self.assertEqual(len(res_graph.json()["nodes"]), 0)

        res_list = self.client.get("/api/cases")
        listed_ids = [c["id"] for c in res_list.json()]
        self.assertNotIn(cid, listed_ids)


if __name__ == "__main__":
    unittest.main()
