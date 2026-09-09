"""
FastAPI Main Application Entrypoint for Antigravity Criminal Network Analysis System
"""

import os
import glob
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from app.api.router import router, CASES_DB, DOCUMENTS_DB, run_ingestion, get_or_create_repo
from app.models.schema import Case, Node, Edge
from app.services.ingestion.parser import DocumentParser

# ---------------------------------------------------------------------------
# Environment-Aware Configuration (never hard-code secrets in source code)
# ---------------------------------------------------------------------------
ENV = os.getenv("APP_ENV", "development")          # "production" | "development"
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173"
).split(",")

# ---------------------------------------------------------------------------
# Security Headers Middleware
# ---------------------------------------------------------------------------
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Cache-Control"] = "no-store"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; "
            "connect-src 'self'"
        )
        return response

# ---------------------------------------------------------------------------
# Application — disable Swagger UI & ReDoc in production
# ---------------------------------------------------------------------------
app = FastAPI(
    title="TRACE Criminal Network Intelligence & Forensic Fusion API",
    description="Backend service providing entity extraction, NetworkX graph intelligence, analytics, and AI reasoning",
    version="1.0.0",
    docs_url="/docs" if ENV != "production" else None,
    redoc_url="/redoc" if ENV != "production" else None,
    openapi_url="/openapi.json" if ENV != "production" else None,
)

# ---------------------------------------------------------------------------
# Middleware Stack (order matters — outermost first)
# ---------------------------------------------------------------------------

# 1. Trusted Host — reject requests with unexpected Host headers
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "*.example.gov.in", "*"]
    if ENV != "production"
    else ["*.example.gov.in"],  # Replace with actual government domain in prod
)

# 2. CORS — allow all methods and dev origins in non-production
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if ENV == "production" else ["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "PUT", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# 3. Security Response Headers
app.add_middleware(SecurityHeadersMiddleware)

app.include_router(router)

@app.on_event("startup")
def preload_synthetic_case():
    """Preloads 5 distinct complex investigation cases into memory for multi-domain tactical intelligence."""
    # ── CASE-001: Operation Nexus (Smuggling & Port Hawala Syndicate) ──
    case1_id = "CASE-001"
    case1 = Case(
        id=case1_id,
        name="Operation Nexus",
        description="Primary investigation targeting smuggling syndicate and distribution network"
    )
    CASES_DB[case1_id] = case1

    synthetic_dir = os.path.join(os.path.dirname(__file__), "..", "..", "data", "synthetic_case_nexus")
    if os.path.exists(synthetic_dir):
        doc_files = glob.glob(os.path.join(synthetic_dir, "*.*"))
        for fpath in doc_files:
            fname = os.path.basename(fpath)
            with open(fpath, "r", encoding="utf-8") as f:
                content = f.read()
            doc = DocumentParser.parse_file(fname, content)
            DOCUMENTS_DB[doc.id] = doc
            if doc.id not in case1.document_ids:
                case1.document_ids.append(doc.id)

        run_ingestion(case1_id)
        print(f"Preloaded CASE-001 '{case1.name}' ({case1.node_count} nodes, {case1.edge_count} edges).")

    # ── CASE-002: Operation Blackout (State Banking Trojan & Dark Web Mule Network) ──
    case2_id = "CASE-002"
    case2 = Case(
        id=case2_id,
        name="Operation Blackout",
        description="Cyber banking intrusion, ransomware extortion & offshore crypto laundering syndicate"
    )
    CASES_DB[case2_id] = case2
    repo2 = get_or_create_repo(case2_id)

    nodes_c2 = [
        Node(id="person_karan", type="PERSON", label="Karan Mehra", confidence=0.98, attributes={"role": "Lead Threat Actor / Exploit Developer"}),
        Node(id="person_ananya", type="PERSON", label="Ananya Roy", confidence=0.95, attributes={"role": "Money Mule Coordinator"}),
        Node(id="person_vikram", type="PERSON", label="Vikram Malhotra", confidence=0.97, attributes={"role": "Offshore Financier"}),
        Node(id="person_rahul", type="PERSON", label="Rahul Verma", confidence=0.91, attributes={"role": "Botnet Infrastructure Admin"}),
        Node(id="loc_vault9", type="LOCATION", label="Server Vault 09, Bengaluru", confidence=0.99, attributes={"coords": "12.9716, 77.5946"}),
        Node(id="loc_cayman", type="LOCATION", label="Cayman Trust Corp, George Town", confidence=0.96, attributes={"coords": "19.2866, -81.3674"}),
        Node(id="account_111222", type="ACCOUNT", label="SWIFT-ACC-111222", confidence=0.99, attributes={"bank": "Apex International Bank"}),
        Node(id="account_333444", type="ACCOUNT", label="ESCROW-ACC-333444", confidence=0.99, attributes={"bank": "Cayman Offshore Vault"}),
        Node(id="account_crypto_01", type="ACCOUNT", label="BTC-Wallet: 1A1zP1eP5Q", confidence=0.98, attributes={"type": "Tumbling Wallet"}),
        Node(id="phone_9811100000", type="PHONE", label="+91-98111-00000", confidence=0.98, attributes={"carrier": "Encrypted VoIP"}),
        Node(id="phone_9822200000", type="PHONE", label="+91-98222-00000", confidence=0.94, attributes={"carrier": "Burner SIM"}),
        Node(id="org_darkshield", type="ORGANIZATION", label="DarkShield Cyber Forensics (Front)", confidence=0.95, attributes={"type": "Shell Company"}),
    ]
    for n in nodes_c2: repo2.add_node(n)

    edges_c2 = [
        Edge(source="person_karan", target="person_ananya", type="COMMUNICATED_WITH", confidence=0.95, source_document="fir_blackout_01.txt", timestamp="2026-03-10T14:20:00", evidence="Encrypted Matrix chat recovery"),
        Edge(source="person_ananya", target="account_111222", type="TRANSFERRED_TO", confidence=0.98, source_document="tx_blackout_02.json", timestamp="2026-03-11T09:15:00", evidence="SWIFT wire transfer INR 65,00,000"),
        Edge(source="account_111222", target="account_333444", type="TRANSFERRED_TO", confidence=0.99, source_document="tx_blackout_02.json", timestamp="2026-03-11T10:00:00", evidence="Offshore bank layering transfer"),
        Edge(source="account_333444", target="account_crypto_01", type="TRANSFERRED_TO", confidence=0.97, source_document="tx_blackout_02.json", timestamp="2026-03-11T12:30:00", evidence="Crypto OTC desk exchange conversion"),
        Edge(source="person_vikram", target="account_333444", type="OWNED", confidence=0.97, source_document="fir_blackout_01.txt", timestamp="2026-03-01T00:00:00", evidence="Beneficial owner of Cayman offshore entity"),
        Edge(source="person_karan", target="loc_vault9", type="LOCATED_AT", confidence=0.94, source_document="surv_blackout_03.txt", timestamp="2026-03-12T18:00:00", evidence="Biometric access log match Server Vault 09"),
        Edge(source="person_vikram", target="loc_cayman", type="LOCATED_AT", confidence=0.95, source_document="surv_blackout_03.txt", timestamp="2026-03-05T08:00:00", evidence="Corporate registration director filing"),
        Edge(source="person_rahul", target="phone_9811100000", type="OWNED", confidence=0.92, source_document="cdr_blackout_04.csv", timestamp="2026-03-10T12:00:00", evidence="SIM card registration record"),
        Edge(source="person_karan", target="org_darkshield", type="OPERATED", confidence=0.96, source_document="fir_blackout_01.txt", timestamp="2026-02-01T00:00:00", evidence="CEO and registered proprietor"),
        Edge(source="person_vikram", target="org_darkshield", type="FUNDED", confidence=0.98, source_document="tx_blackout_02.json", timestamp="2026-02-15T00:00:00", evidence="Seed capital investment INR 2,50,00,000"),
    ]
    for e in edges_c2: repo2.add_edge(e)
    g2 = repo2.get_all()
    case2.node_count = len(g2.nodes)
    case2.edge_count = len(g2.edges)
    print(f"Preloaded CASE-002 '{case2.name}' ({case2.node_count} nodes, {case2.edge_count} edges).")

    # ── CASE-003: Operation Vulture (Arms Trafficking & Maritime Port Infiltration) ──
    case3_id = "CASE-003"
    case3 = Case(
        id=case3_id,
        name="Operation Vulture",
        description="Arms trafficking, military surplus smuggling & port container clearance ring"
    )
    CASES_DB[case3_id] = case3
    repo3 = get_or_create_repo(case3_id)

    nodes_c3 = [
        Node(id="person_kabir", type="PERSON", label="Captain Kabir Rao", confidence=0.99, attributes={"role": "Cartel Commander"}),
        Node(id="person_sameer", type="PERSON", label="Major Sameer Roy", confidence=0.96, attributes={"role": "Defense Logistics Broker"}),
        Node(id="person_feroz", type="PERSON", label="Feroz Khan", confidence=0.94, attributes={"role": "Mundra Port Freight Handler"}),
        Node(id="person_dinesh", type="PERSON", label="Dinesh Gupta", confidence=0.90, attributes={"role": "Customs Superintendent"}),
        Node(id="loc_mundra", type="LOCATION", label="Mundra Port Terminal 3, Gujarat", confidence=0.99, attributes={"coords": "22.8397, 69.7042"}),
        Node(id="loc_kandla", type="LOCATION", label="Kandla Anchorage Anchorage Zone", confidence=0.95, attributes={"coords": "23.0135, 70.2189"}),
        Node(id="veh_vulture", type="VEHICLE", label="KA-01-MJ-9999 (Armored SUV)", confidence=0.95, attributes={"model": "Toyota Fortuner"}),
        Node(id="veh_truck_vulture", type="VEHICLE", label="GJ-12-AZ-4455 (Cargo Carrier)", confidence=0.93, attributes={"cargo": "Sealed Container #ARM-90"}),
        Node(id="phone_vulture", type="PHONE", label="+91-97000-12345", confidence=0.97, attributes={"model": "Satellite Thuraya"}),
        Node(id="org_vulture_maritime", type="ORGANIZATION", label="Apex Oceanic Logistics Pvt Ltd", confidence=0.96, attributes={"type": "Maritime Shipper"}),
        Node(id="account_bribe_vulture", type="ACCOUNT", label="ESCROW-MUNDRA-7788", confidence=0.95, attributes={"bank": "Foreign Exchange Vault"}),
    ]
    for n in nodes_c3: repo3.add_node(n)

    edges_c3 = [
        Edge(source="person_kabir", target="person_sameer", type="MET_WITH", confidence=0.96, source_document="fir_vulture_01.txt", timestamp="2026-02-15T21:00:00", evidence="Surveillance photo log at Mundra Port gate"),
        Edge(source="person_sameer", target="loc_mundra", type="LOCATED_AT", confidence=0.99, source_document="surv_vulture_02.txt", timestamp="2026-02-15T20:30:00", evidence="Port gate entry RFID swipe"),
        Edge(source="person_feroz", target="person_dinesh", type="PAID", confidence=0.93, source_document="tx_vulture_03.json", timestamp="2026-02-16T11:00:00", evidence="Cash bribe transfer INR 12,00,000 for container clearance"),
        Edge(source="person_kabir", target="veh_vulture", type="REGISTERED_TO", confidence=0.95, source_document="fir_vulture_01.txt", timestamp="2026-02-10T00:00:00", evidence="Vehicle registration papers"),
        Edge(source="person_feroz", target="veh_truck_vulture", type="DISPATCHED", confidence=0.94, source_document="surv_vulture_02.txt", timestamp="2026-02-16T04:00:00", evidence="Port terminal exit gate timestamp"),
        Edge(source="person_feroz", target="phone_vulture", type="OWNED", confidence=0.97, source_document="cdr_vulture_04.csv", timestamp="2026-02-15T22:00:00", evidence="Satellite phone call burst log"),
        Edge(source="person_kabir", target="org_vulture_maritime", type="CONTROLS", confidence=0.98, source_document="fir_vulture_01.txt", timestamp="2026-01-01T00:00:00", evidence="Majority proxy shareholder"),
        Edge(source="org_vulture_maritime", target="account_bribe_vulture", type="TRANSFERRED_TO", confidence=0.96, source_document="tx_vulture_03.json", timestamp="2026-02-16T10:00:00", evidence="Customs clearance processing fee wire"),
        Edge(source="account_bribe_vulture", target="person_dinesh", type="BENEFITS", confidence=0.95, source_document="tx_vulture_03.json", timestamp="2026-02-16T11:30:00", evidence="Offshore debit card disbursement"),
    ]
    for e in edges_c3: repo3.add_edge(e)
    g3 = repo3.get_all()
    case3.node_count = len(g3.nodes)
    case3.edge_count = len(g3.edges)
    print(f"Preloaded CASE-003 '{case3.name}' ({case3.node_count} nodes, {case3.edge_count} edges).")

    # ── CASE-004: Operation DarkNet Ghost (Encrypted Drug Cartel & Dead Drops) ──
    case4_id = "CASE-004"
    case4 = Case(
        id=case4_id,
        name="Operation DarkNet Ghost",
        description="Dark Web synthetic narcotics distribution, encrypted dead-drops & Monero laundering"
    )
    CASES_DB[case4_id] = case4
    repo4 = get_or_create_repo(case4_id)

    nodes_c4 = [
        Node(id="person_zack", type="PERSON", label="Zack 'Ghost' Alva", confidence=0.99, attributes={"role": "Dark Web Vendor Kingpin"}),
        Node(id="person_meera", type="PERSON", label="Meera Sen", confidence=0.96, attributes={"role": "Crypto Tumbler Architect"}),
        Node(id="person_arjun", type="PERSON", label="Arjun Nair", confidence=0.92, attributes={"role": "Goa Dead-Drop Courier"}),
        Node(id="person_rohit", type="PERSON", label="Rohit Singhania", confidence=0.94, attributes={"role": "Delhi Wholesaler Receiver"}),
        Node(id="loc_anjuna", type="LOCATION", label="Anjuna Coastal Safehouse, Goa", confidence=0.98, attributes={"coords": "15.5808, 73.7427"}),
        Node(id="loc_delhi_hub", type="LOCATION", label="Okhla Industrial Logistics Depot, Delhi", confidence=0.97, attributes={"coords": "28.5355, 77.2732"}),
        Node(id="veh_courier_c4", type="VEHICLE", label="GA-03-XX-1122 (Delivery Van)", confidence=0.95, attributes={"model": "Mahindra Bolero"}),
        Node(id="account_xmr_01", type="ACCOUNT", label="XMR-Stealth: 888tZ2p...9q", confidence=0.99, attributes={"currency": "Monero Stealth"}),
        Node(id="phone_signal_c4", type="PHONE", label="+91-91111-44332", confidence=0.96, attributes={"app": "Session / Signal Private"}),
        Node(id="org_ghost_labs", type="ORGANIZATION", label="Ghost Synthetics R&D", confidence=0.97, attributes={"type": "Underground Lab"}),
    ]
    for n in nodes_c4: repo4.add_node(n)

    edges_c4 = [
        Edge(source="person_zack", target="person_meera", type="COMMUNICATED_WITH", confidence=0.98, source_document="fir_ghost_01.txt", timestamp="2026-04-01T23:00:00", evidence="PGP encrypted email intercept"),
        Edge(source="person_zack", target="person_arjun", type="DISPATCHED", confidence=0.95, source_document="surv_ghost_02.txt", timestamp="2026-04-02T02:00:00", evidence="Dead-drop GPS coordinate drop file"),
        Edge(source="person_arjun", target="loc_anjuna", type="LOCATED_AT", confidence=0.97, source_document="surv_ghost_02.txt", timestamp="2026-04-02T03:30:00", evidence="Surveillance camera night-vision match"),
        Edge(source="person_arjun", target="veh_courier_c4", type="OPERATED", confidence=0.94, source_document="surv_ghost_02.txt", timestamp="2026-04-02T04:00:00", evidence="Vehicle loaded with vacuum-sealed packages"),
        Edge(source="person_arjun", target="person_rohit", type="DELIVERED_TO", confidence=0.96, source_document="fir_ghost_01.txt", timestamp="2026-04-03T18:00:00", evidence="Consignment handoff intercept Okhla Depot"),
        Edge(source="person_rohit", target="loc_delhi_hub", type="LOCATED_AT", confidence=0.98, source_document="fir_ghost_01.txt", timestamp="2026-04-03T17:30:00", evidence="Depot manager access record"),
        Edge(source="person_meera", target="account_xmr_01", type="LAUNDERED", confidence=0.99, source_document="tx_ghost_03.json", timestamp="2026-04-03T20:00:00", evidence="Multi-hop Monero coinjoin mixing transaction"),
        Edge(source="person_zack", target="org_ghost_labs", type="FOUNDED", confidence=0.98, source_document="fir_ghost_01.txt", timestamp="2026-01-10T00:00:00", evidence="Darknet dread forum administrative credentials"),
    ]
    for e in edges_c4: repo4.add_edge(e)
    g4 = repo4.get_all()
    case4.node_count = len(g4.nodes)
    case4.edge_count = len(g4.edges)
    print(f"Preloaded CASE-004 '{case4.name}' ({case4.node_count} nodes, {case4.edge_count} edges).")

    # ── CASE-005: Operation Golden Falcon (International Hawala & Dubai-Mumbai Gold) ──
    case5_id = "CASE-005"
    case5 = Case(
        id=case5_id,
        name="Operation Golden Falcon",
        description="Transnational gold bullion smuggling, airport air-courier pipeline & Hawala network"
    )
    CASES_DB[case5_id] = case5
    repo5 = get_or_create_repo(case5_id)

    nodes_c5 = [
        Node(id="person_sheikh_mansoor", type="PERSON", label="Mansoor 'Falcon' Merchant", confidence=0.99, attributes={"role": "Dubai Bullion Kingpin"}),
        Node(id="person_rashid", type="PERSON", label="Rashid Qureshi", confidence=0.97, attributes={"role": "Hawala Mastermind Mumbai"}),
        Node(id="person_fatima", type="PERSON", label="Fatima Al-Sayed", confidence=0.95, attributes={"role": "Airport Mule Handler"}),
        Node(id="person_sanjay", type="PERSON", label="Sanjay Zaveri", confidence=0.96, attributes={"role": "Zaveri Bazaar Gold Smelter"}),
        Node(id="loc_deira", type="LOCATION", label="Deira Gold Souk, Dubai UAE", confidence=0.99, attributes={"coords": "25.2711, 55.3075"}),
        Node(id="loc_mumbai_airport", type="LOCATION", label="Chhatrapati Shivaji Intl Airport T2, Mumbai", confidence=0.99, attributes={"coords": "19.0896, 72.8656"}),
        Node(id="loc_zaveri", type="LOCATION", label="Zaveri Bazaar Refining Alley, Mumbai", confidence=0.98, attributes={"coords": "18.9507, 72.8315"}),
        Node(id="account_hawala_dubai", type="ACCOUNT", label="HAWALA-TOKEN: FALCON-9988", confidence=0.99, attributes={"settlement": "Cash & Gold Bullion"}),
        Node(id="account_zaveri_vault", type="ACCOUNT", label="ZAVERI-VAULT-2201", confidence=0.97, attributes={"bank": "Cooperative Bullion Vault"}),
        Node(id="org_falcon_bullion", type="ORGANIZATION", label="Al-Falcon Bullion Trading FZE", confidence=0.99, attributes={"jurisdiction": "Dubai Free Zone"}),
        Node(id="veh_falcon_courier", type="VEHICLE", label="MH-01-GL-7788 (Armored Sedan)", confidence=0.95, attributes={"model": "BMW 7 Series"}),
    ]
    for n in nodes_c5: repo5.add_node(n)

    edges_c5 = [
        Edge(source="person_sheikh_mansoor", target="org_falcon_bullion", type="OWNS", confidence=0.99, source_document="fir_falcon_01.txt", timestamp="2026-05-01T00:00:00", evidence="Dubai Chamber of Commerce shareholding registry"),
        Edge(source="person_sheikh_mansoor", target="person_fatima", type="DISPATCHED", confidence=0.97, source_document="surv_falcon_02.txt", timestamp="2026-05-10T14:00:00", evidence="Flight Emirates EK-504 manifest ticket booking"),
        Edge(source="person_fatima", target="loc_mumbai_airport", type="INTERCEPTED_AT", confidence=0.99, source_document="fir_falcon_01.txt", timestamp="2026-05-10T20:30:00", evidence="Customs green channel search: 8.5 kg 24K gold paste seized"),
        Edge(source="person_fatima", target="person_rashid", type="CONTACTED", confidence=0.96, source_document="cdr_falcon_04.csv", timestamp="2026-05-10T20:45:00", evidence="Instant WhatsApp call burst on airport arrival"),
        Edge(source="person_rashid", target="account_hawala_dubai", type="OPERATES", confidence=0.98, source_document="tx_falcon_03.json", timestamp="2026-05-10T21:00:00", evidence="Hawala ledger code FALCON-9988 matching UAE remittance"),
        Edge(source="person_rashid", target="person_sanjay", type="PAID", confidence=0.97, source_document="tx_falcon_03.json", timestamp="2026-05-11T09:00:00", evidence="Cash delivery INR 4,80,00,000 for bullion refining"),
        Edge(source="person_sanjay", target="loc_zaveri", type="OPERATES_FROM", confidence=0.99, source_document="surv_falcon_02.txt", timestamp="2026-05-11T10:00:00", evidence="Refinery workshop surveillance video"),
        Edge(source="person_sanjay", target="veh_falcon_courier", type="USES", confidence=0.95, source_document="surv_falcon_02.txt", timestamp="2026-05-11T12:00:00", evidence="Vehicle transporting melted gold bars"),
    ]
    for e in edges_c5: repo5.add_edge(e)
    g5 = repo5.get_all()
    case5.node_count = len(g5.nodes)
    case5.edge_count = len(g5.edges)
    print(f"Preloaded CASE-005 '{case5.name}' ({case5.node_count} nodes, {case5.edge_count} edges).")

    # Persist all cases in SQLite database
    from app.repositories.sqlite_repo import SQLiteRepository
    sqlite_db = SQLiteRepository.get_instance()
    for cid, c in CASES_DB.items():
        sqlite_db.save_case(c)

@app.get("/")
@app.get("/health")
@app.get("/api/health")
@app.get("/api/v1/health")
def root():
    return {
        "system": "TRACE Criminal Network Intelligence & Forensic Fusion Engine",
        "status": "online",
        "docs": "/docs",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
