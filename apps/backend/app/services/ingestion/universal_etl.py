"""
Universal Multi-Modal ETL & Entity Extraction Engine for TRACE Criminal Intelligence Platform.
Handles CDRs, SWIFT Wires, Banking Ledgers, ANPR Toll logs, FIR transcripts, and Police Dossiers.
"""

import os
import re
import csv
import json
import io
from typing import List, Tuple, Dict, Any, Optional
from datetime import datetime, timezone
from app.models.schema import Node, Edge, Document
from app.services.extraction.entity_resolver import EntityResolver

# ── Generic Regex Taxonomy ───────────────────────────────────────────────────
PHONE_REGEX = re.compile(r"(?:\+91[\-\s]?)?[6-9]\d{4}[\-\s]?\d{5}|\b[6-9]\d{9}\b|\b\d{10,12}\b")
PLATE_REGEX = re.compile(r"\b[A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{4}\b")
ACCOUNT_REGEX = re.compile(r"\b(?:ACC|SWIFT|IBAN|VAULT|TOKEN)[-_][A-Z0-9]{4,18}\b|\b\d{11,18}\b", re.IGNORECASE)
CRYPTO_REGEX = re.compile(r"\b(?:0x[a-fA-F0-9]{40}|1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39,59})\b")
AMOUNT_REGEX = re.compile(r"(?:INR|RS\.?|₹|\$|USD|EUR|AED)\s*([\d,]+(?:\.\d{2})?)\s*(?:Cr(?:ore)?|Lakh|L|K)?", re.IGNORECASE)
LEGAL_SECTION_REGEX = re.compile(r"\b(?:SEC(?:TION)?\.?\s?\d+[A-Z]?\s?(?:IPC|BNS|NDPS|UAPA|PMLA|CRPC))\b", re.IGNORECASE)
GPS_REGEX = re.compile(r"(-?\d{1,2}\.\d{3,7})[,\s]+(-?\d{1,3}\.\d{3,7})")
FACILITY_REGEX = re.compile(r"\b(?:Warehouse|Terminal|Port|Safehouse|Godown|Checkpoint|Toll|Hideout|Factory|Yard|Jail|Station|Dockyard)\s+([A-Za-z0-9\-_]+(?:\s[A-Za-z0-9\-_]+){0,2})", re.IGNORECASE)

NAME_STOPWORDS = {
    "state of", "police station", "high court", "crime branch", "special cell",
    "sessions court", "union of india", "first information", "panvel terminal",
    "warehouse", "terminal gate", "general diary", "narcotics control", "central bureau",
    "case registered", "incident details", "accused persons", "chargesheet no",
    "nhava sheva", "special investigation", "cyber crime", "enforcement directorate",
    "dockyard road office", "dockyard road", "mumbai city", "new delhi", "location",
    "phone", "mobile", "account", "vehicle", "subject", "summary", "operation nexus"
}


def _normalize_key(key: Any) -> str:
    """Normalizes a CSV/dict header key by lowercasing and stripping non-alphanumerics."""
    return re.sub(r'[^a-z0-9]', '', str(key).lower()) if key is not None else ""


def _get_normalized_val(row: Dict[str, Any], aliases: List[str]) -> str:
    """Finds first matching value from row where normalized key is in aliases."""
    normalized_row = {_normalize_key(k): v for k, v in row.items() if k is not None}
    for alias in aliases:
        norm_alias = _normalize_key(alias)
        if norm_alias in normalized_row and normalized_row[norm_alias] is not None:
            val = str(normalized_row[norm_alias]).strip()
            if val:
                return val
    return ""


class UniversalETLEngine:
    @staticmethod
    def detect_file_type(filename: str, content: str) -> str:
        """Heuristically detects the intelligence format of an ingested document."""
        lower_fn = filename.lower()
        lower_c = content[:2500].lower()

        # 1. Structured CSV Formats
        if lower_fn.endswith('.csv'):
            cdr_keywords = [
                'caller', 'callee', 'calling', 'called', 'msisdn', 'duration',
                'cell_tower', 'celltower', 'tower', 'imei', 'a_party', 'aparty',
                'b_party', 'bparty', 'call_date', 'calltime'
            ]
            if any(k in lower_c for k in cdr_keywords):
                return "CDR_TELECOM"
            elif any(k in lower_c for k in ['toll', 'plate', 'vehicle', 'anpr', 'checkpoint', 'registration']):
                return "ANPR_SURVEILLANCE"
            else:
                return "FINANCIAL_LEDGER"

        # 2. Structured JSON Formats
        if lower_fn.endswith('.json'):
            return "FINANCIAL_LEDGER"

        # 3. Text Reports & Narratives (.txt, .pdf, .docx, FIRs)
        if any(w in lower_c for w in ["first information report", "fir no", "ps:", "u/s", "accused", "complainant", "police station", "under section", "chargesheet"]):
            return "LEGAL_FIR_REPORT"
        elif any(w in lower_c for w in ["interrogation", "q:", "a:", "confession", "polygraph", "statement"]):
            return "INTERROGATION_TRANSCRIPT"
        elif any(w in lower_c for w in ["surveillance", "intercept", "observed", "target moved", "sighting"]):
            return "SURVEILLANCE_LOG"
        else:
            return "GENERIC_INTELLIGENCE"

    @classmethod
    def process_document(cls, doc: Document) -> Tuple[List[Node], List[Edge]]:
        """Processes document content and returns extracted, deduplicated nodes and edges."""
        file_type = cls.detect_file_type(doc.filename, doc.content)

        if file_type == "CDR_TELECOM":
            return cls._parse_cdr_csv(doc)
        elif file_type == "FINANCIAL_LEDGER":
            nodes, edges = cls._parse_financial_ledger(doc)
            if len(nodes) > 1:
                return nodes, edges
            return cls._parse_text_intelligence(doc)
        elif file_type == "ANPR_SURVEILLANCE":
            return cls._parse_anpr_logs(doc)
        else:
            return cls._parse_text_intelligence(doc)

    @classmethod
    def _parse_cdr_csv(cls, doc: Document) -> Tuple[List[Node], List[Edge]]:
        """BUG 1 FIX: Normalizes CSV headers with broad aliases for phone call CDRs."""
        nodes: List[Node] = []
        edges: List[Edge] = []
        node_map: Dict[str, Node] = {}

        # Add document parent node
        doc_node = Node(
            id=doc.id,
            type="DOCUMENT",
            label=doc.filename,
            confidence=1.0,
            attributes={"file_type": "CDR_TELECOM"}
        )
        nodes.append(doc_node)

        # Aliases per field
        caller_aliases = [
            "caller", "callerphone", "callernumber", "source", "callingnumber",
            "callingno", "callingnum", "calling", "msisdn", "aparty", "firstparty",
            "phone", "mobile", "src", "originatingnumber", "callerid", "sourcenumber"
        ]
        callee_aliases = [
            "callee", "calleephone", "calleenumber", "target", "callednumber",
            "calledno", "callednum", "called", "bparty", "secondparty", "destination",
            "dest", "dialednumber", "dialed", "recipient", "receiver", "destinationnumber"
        ]
        duration_aliases = ["duration", "durationsec", "callduration", "dur", "callsec", "durationseconds", "length"]
        tower_aliases = ["celltower", "towerid", "location", "cellid", "siteid", "cgi", "lac", "bts", "tower", "basestation", "cell"]
        imei_aliases = ["imei", "imsi", "handset", "deviceid", "device", "terminal"]
        time_aliases = ["timestamp", "datetime", "calldate", "date", "time", "calltime", "starttime", "start_time"]

        # Parse CSV line by line
        try:
            reader = csv.DictReader(io.StringIO(doc.content))
            for row in reader:
                caller = _get_normalized_val(row, caller_aliases)
                callee = _get_normalized_val(row, callee_aliases)
                timestamp = _get_normalized_val(row, time_aliases) or datetime.now(timezone.utc).isoformat()
                duration = _get_normalized_val(row, duration_aliases) or "0"
                tower_id = _get_normalized_val(row, tower_aliases)
                imei = _get_normalized_val(row, imei_aliases)

                c_id = None
                if caller:
                    c_clean = re.sub(r'[^0-9]', '', caller)
                    c_id = f"phone_{c_clean[-10:]}" if len(c_clean) >= 10 else f"phone_{c_clean}"
                    if c_id not in node_map:
                        node_map[c_id] = Node(
                            id=c_id,
                            type="PHONE",
                            label=caller,
                            confidence=0.98,
                            attributes={"raw_number": caller, "imei": imei}
                        )

                t_id = None
                if callee:
                    t_clean = re.sub(r'[^0-9]', '', callee)
                    t_id = f"phone_{t_clean[-10:]}" if len(t_clean) >= 10 else f"phone_{t_clean}"
                    if t_id not in node_map:
                        node_map[t_id] = Node(
                            id=t_id,
                            type="PHONE",
                            label=callee,
                            confidence=0.98,
                            attributes={"raw_number": callee}
                        )

                # Connect caller -> callee
                if c_id and t_id:
                    edges.append(Edge(
                        source=c_id,
                        target=t_id,
                        type="CALLED",
                        confidence=0.97,
                        source_document=doc.filename,
                        timestamp=timestamp,
                        evidence=f"CDR Log: {duration}s call duration. Tower: {tower_id}",
                        attributes={"duration_seconds": duration, "cell_tower": tower_id}
                    ))

                # Add Cell Tower Location Node if present
                if tower_id:
                    loc_id = f"loc_tower_{re.sub(r'[^a-zA-Z0-9]', '_', tower_id.lower())}"
                    if loc_id not in node_map:
                        node_map[loc_id] = Node(
                            id=loc_id,
                            type="LOCATION",
                            label=f"Tower {tower_id}",
                            confidence=0.95,
                            attributes={"tower_code": tower_id}
                        )
                    if c_id:
                        edges.append(Edge(
                            source=c_id,
                            target=loc_id,
                            type="LOCATED_AT",
                            confidence=0.90,
                            source_document=doc.filename,
                            timestamp=timestamp,
                            evidence=f"Base Station Handshake: {tower_id}"
                        ))
        except Exception:
            return cls._parse_text_intelligence(doc)

        nodes.extend(node_map.values())
        return nodes, edges

    @classmethod
    def _parse_financial_ledger(cls, doc: Document) -> Tuple[List[Node], List[Edge]]:
        """BUG 1 & BUG 3 FIX: Normalizes headers AND extracts PERSON entities connected to ACCOUNTS."""
        nodes: List[Node] = []
        edges: List[Edge] = []
        node_map: Dict[str, Node] = {}

        # Add document node
        nodes.append(Node(id=doc.id, type="DOCUMENT", label=doc.filename, confidence=1.0))

        # Try JSON or CSV parsing
        records = []
        try:
            parsed = json.loads(doc.content)
            if isinstance(parsed, list):
                records = parsed
            elif isinstance(parsed, dict):
                records = [parsed]
        except Exception:
            try:
                reader = csv.DictReader(io.StringIO(doc.content))
                records = list(reader)
            except Exception:
                records = []

        # Normalized aliases
        src_acc_aliases = [
            "sourceaccount", "sourceacc", "fromaccount", "fromacc", "sender",
            "senderaccount", "remitteraccount", "payeraccount", "debtoraccount",
            "accountno", "accno", "from", "account", "srcacc"
        ]
        tgt_acc_aliases = [
            "targetaccount", "targetacc", "toaccount", "toacc", "receiver",
            "receiveraccount", "beneficiaryaccount", "payeeaccount", "creditoraccount",
            "to", "destacc"
        ]
        src_name_aliases = [
            "sourcename", "sendername", "remitter", "remittername", "payer",
            "payername", "debtorname", "accountname", "accountholder", "fromname"
        ]
        tgt_name_aliases = [
            "targetname", "receivername", "beneficiary", "beneficiaryname", "payee",
            "payeename", "creditorname", "toname"
        ]
        amount_aliases = ["amount", "amountinr", "value", "debit", "credit", "txamount", "transactionamount", "sum"]
        time_aliases = ["timestamp", "date", "txdate", "transactiondate", "datetime", "valuedate"]
        type_aliases = ["type", "transfertype", "mode", "txtype", "transactiontype", "channel"]
        bank_aliases = ["bank", "bankname", "remittanceagency", "agency", "institution"]

        if records:
            for rec in records:
                src_acc = _get_normalized_val(rec, src_acc_aliases)
                tgt_acc = _get_normalized_val(rec, tgt_acc_aliases)
                src_name = _get_normalized_val(rec, src_name_aliases)
                tgt_name = _get_normalized_val(rec, tgt_name_aliases)
                amount = _get_normalized_val(rec, amount_aliases) or "0"
                tx_type = _get_normalized_val(rec, type_aliases) or "FINANCIAL_TRANSFER"
                timestamp = _get_normalized_val(rec, time_aliases) or datetime.now(timezone.utc).isoformat()
                bank_name = _get_normalized_val(rec, bank_aliases)

                s_id = None
                if src_acc:
                    s_id = f"account_{re.sub(r'[^a-zA-Z0-9]', '_', str(src_acc).lower())}"
                    if s_id not in node_map:
                        node_map[s_id] = Node(
                            id=s_id,
                            type="ACCOUNT",
                            label=f"ACC: {src_acc}",
                            confidence=0.99,
                            attributes={"bank": bank_name, "raw_account": src_acc}
                        )

                t_id = None
                if tgt_acc:
                    t_id = f"account_{re.sub(r'[^a-zA-Z0-9]', '_', str(tgt_acc).lower())}"
                    if t_id not in node_map:
                        node_map[t_id] = Node(
                            id=t_id,
                            type="ACCOUNT",
                            label=f"ACC: {tgt_acc}",
                            confidence=0.99,
                            attributes={"bank": bank_name, "raw_account": tgt_acc}
                        )

                # BUG 3 FIX: Connect PERSON to Account for source
                p_src_id = None
                if src_name and len(src_name) > 2 and src_name.lower() not in NAME_STOPWORDS:
                    p_src_id = f"person_{re.sub(r'[^a-zA-Z0-9]', '_', src_name.lower())}"
                    if p_src_id not in node_map:
                        node_map[p_src_id] = Node(
                            id=p_src_id,
                            type="PERSON",
                            label=src_name.title(),
                            confidence=0.95,
                            attributes={"extracted_role": "REMITTER / PAYER"}
                        )
                    if s_id:
                        edges.append(Edge(
                            source=p_src_id,
                            target=s_id,
                            type="OWNS",
                            confidence=0.95,
                            source_document=doc.filename,
                            evidence=f"{src_name} owns source account {src_acc}"
                        ))

                # BUG 3 FIX: Connect PERSON to Account for target
                p_tgt_id = None
                if tgt_name and len(tgt_name) > 2 and tgt_name.lower() not in NAME_STOPWORDS:
                    p_tgt_id = f"person_{re.sub(r'[^a-zA-Z0-9]', '_', tgt_name.lower())}"
                    if p_tgt_id not in node_map:
                        node_map[p_tgt_id] = Node(
                            id=p_tgt_id,
                            type="PERSON",
                            label=tgt_name.title(),
                            confidence=0.95,
                            attributes={"extracted_role": "BENEFICIARY / RECEIVER"}
                        )
                    if t_id:
                        edges.append(Edge(
                            source=p_tgt_id,
                            target=t_id,
                            type="OWNS",
                            confidence=0.95,
                            source_document=doc.filename,
                            evidence=f"{tgt_name} is beneficiary/owner of account {tgt_acc}"
                        ))

                # Account to Account transfer edge
                if s_id and t_id:
                    edges.append(Edge(
                        source=s_id,
                        target=t_id,
                        type="TRANSFERRED_TO",
                        confidence=0.99,
                        source_document=doc.filename,
                        timestamp=str(timestamp),
                        evidence=f"Ledger Wire: {tx_type} | INR {amount}",
                        attributes={"amount": amount, "tx_type": tx_type}
                    ))

                # Direct Person to Person transfer edge if both known
                if p_src_id and p_tgt_id:
                    edges.append(Edge(
                        source=p_src_id,
                        target=p_tgt_id,
                        type="TRANSFERRED_TO",
                        confidence=0.92,
                        source_document=doc.filename,
                        timestamp=str(timestamp),
                        evidence=f"Direct money flow: {src_name} -> {tgt_name} (INR {amount})",
                        attributes={"amount": amount}
                    ))

            if len(node_map) > 0:
                nodes.extend(node_map.values())
                return nodes, edges

        return cls._parse_text_intelligence(doc)

    @classmethod
    def _parse_anpr_logs(cls, doc: Document) -> Tuple[List[Node], List[Edge]]:
        """BUG 1 FIX: Normalizes headers for ANPR vehicle toll logs."""
        nodes: List[Node] = []
        edges: List[Edge] = []
        node_map: Dict[str, Node] = {}

        nodes.append(Node(id=doc.id, type="DOCUMENT", label=doc.filename, confidence=1.0))

        plate_aliases = ["plate", "licenseplate", "vehiclenumber", "registration", "vehicleplate", "regno", "vehicleno", "carplate", "vehicle"]
        toll_aliases = ["tollgate", "toll", "cameralocation", "location", "checkpoint", "camera", "tollplaza", "junction"]
        time_aliases = ["timestamp", "datetime", "date", "time", "sightingtime"]
        speed_aliases = ["speed", "speedkmh", "velocity"]

        try:
            reader = csv.DictReader(io.StringIO(doc.content))
            for row in reader:
                plate = _get_normalized_val(row, plate_aliases)
                toll_loc = _get_normalized_val(row, toll_aliases)
                timestamp = _get_normalized_val(row, time_aliases) or datetime.now(timezone.utc).isoformat()
                speed = _get_normalized_val(row, speed_aliases)

                v_id = None
                if plate:
                    v_id = f"veh_{re.sub(r'[^a-zA-Z0-9]', '', plate.lower())}"
                    if v_id not in node_map:
                        node_map[v_id] = Node(
                            id=v_id,
                            type="VEHICLE",
                            label=plate.upper(),
                            confidence=0.96,
                            attributes={"plate": plate}
                        )

                loc_id = None
                if toll_loc:
                    loc_id = f"loc_toll_{re.sub(r'[^a-zA-Z0-9]', '_', toll_loc.lower())}"
                    if loc_id not in node_map:
                        node_map[loc_id] = Node(
                            id=loc_id,
                            type="LOCATION",
                            label=f"Toll: {toll_loc}",
                            confidence=0.94,
                            attributes={"toll_name": toll_loc}
                        )

                if v_id and loc_id:
                    edges.append(Edge(
                        source=v_id,
                        target=loc_id,
                        type="LOCATED_AT",
                        confidence=0.95,
                        source_document=doc.filename,
                        timestamp=timestamp,
                        evidence=f"ANPR Optical Camera Sighting: {plate} at {toll_loc}. Speed: {speed} km/h",
                        attributes={"speed": speed}
                    ))
        except Exception:
            return cls._parse_text_intelligence(doc)

        nodes.extend(node_map.values())
        return nodes, edges

    @classmethod
    def _parse_text_intelligence(cls, doc: Document) -> Tuple[List[Node], List[Edge]]:
        """BUG 2 FIX: Case-insensitive and comprehensive multi-trigger NER for Indian FIRs & police memos."""
        nodes: List[Node] = []
        edges: List[Edge] = []
        node_map: Dict[str, Node] = {}
        text = doc.content

        # Document Root Node
        doc_node = Node(id=doc.id, type="DOCUMENT", label=doc.filename, confidence=1.0)
        nodes.append(doc_node)

        # 1. Phone Numbers
        for ph in PHONE_REGEX.findall(text):
            ph_clean = re.sub(r'[^0-9]', '', ph)
            if len(ph_clean) >= 10:
                p_id = f"phone_{ph_clean[-10:]}"
                if p_id not in node_map:
                    node_map[p_id] = Node(id=p_id, type="PHONE", label=ph.strip(), confidence=0.98, attributes={"number": ph.strip()})

        # 2. Vehicle Registrations
        for veh in PLATE_REGEX.findall(text):
            v_id = f"veh_{re.sub(r'[^a-zA-Z0-9]', '', veh.lower())}"
            if v_id not in node_map:
                node_map[v_id] = Node(id=v_id, type="VEHICLE", label=veh.strip().upper(), confidence=0.95)

        # 3. Bank Accounts / Wallets
        for acc in ACCOUNT_REGEX.findall(text):
            acc_digits = re.sub(r'[^0-9]', '', acc)
            is_phone = any(acc_digits == re.sub(r'[^0-9]', '', ph)[-len(acc_digits):] for ph in PHONE_REGEX.findall(text))
            if not is_phone or acc.upper().startswith(('ACC', 'SWIFT', 'IBAN', 'VAULT', 'TOKEN')):
                a_id = f"account_{re.sub(r'[^a-zA-Z0-9]', '_', acc.lower())}"
                if a_id not in node_map:
                    node_map[a_id] = Node(id=a_id, type="ACCOUNT", label=acc.strip().upper(), confidence=0.97)

        # 4. Crypto Wallets
        for crypto in CRYPTO_REGEX.findall(text):
            c_id = f"crypto_{crypto[:10].lower()}"
            if c_id not in node_map:
                node_map[c_id] = Node(id=c_id, type="ACCOUNT", label=f"CRYPTO: {crypto[:12]}..", confidence=0.99, attributes={"wallet": crypto})

        # 5. Infrastructure / Facilities / Safehouses
        for fac_match in FACILITY_REGEX.finditer(text):
            fac_name = fac_match.group(0).strip()
            if len(fac_name) > 3 and fac_name.lower() not in NAME_STOPWORDS:
                f_id = f"facility_{re.sub(r'[^a-zA-Z0-9]', '_', fac_name.lower())}"
                if f_id not in node_map:
                    node_map[f_id] = Node(id=f_id, type="LOCATION", label=fac_name.title(), confidence=0.94)

        # 6. BUG 2 FIX: Suspect Names Extraction using re.IGNORECASE & Broad Real-World Phrasing
        name_patterns = [
            # Standard suspect/accused/target roles (case-insensitive) - strictly 2 to 3 words
            r"(?:suspect|accused|target|kingpin|smuggler|courier|operative|director|associate|handler|conspirator|financier)\s*(?:no\.?\s*\d+|:\s*|\s+)([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,2})",
            # ALL CAPS suspect names
            r"(?:suspect|accused|target|kingpin)\s*(?:no\.?\s*\d+|:\s*|\s+)([A-Z]{2,}(?:\s[A-Z]{2,}){1,2})",
            # Contextual actions: "named X", "identified as X", "observed contacting X", "transport goods to X", etc.
            r"(?:named|identified as|observed contacting|contacting|transport goods to|associated with|recovered from|interrogated|questioned|arrested|confessed)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,2})",
            # Contextual descriptions: "X, proprietor of", "X, resident of", "X (age approx", "X (Phone:", "X (alias"
            r"([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,2})\s*(?:,\s*proprietor of|,\s*resident of|,\s*aged approx|\(age approx|\(alias|alias|s/o|w/o|d/o|\(Phone:|\(Mobile:)",
            # ALL CAPS with alias / s/o
            r"([A-Z]{2,}(?:\s[A-Z]{2,}){1,2})\s*(?:alias|\(alias|s/o|w/o|d/o|arrested|confessed|interrogated)",
            # FIR title cases
            r"(?:registered against|involvement of|nexus of)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,2})",
        ]

        action_tail_regex = re.compile(r'\s+(?:was|is|has|had|registered|transferred|operates|called|observed|contacting|identified|arrested|confessed|near|during|regarding|operating|phone|mobile|location|office|terminal|warehouse|vehicle).*$', re.IGNORECASE)

        for pat in name_patterns:
            compiled_pat = re.compile(pat, re.IGNORECASE)
            for match in compiled_pat.findall(text):
                raw_name = match.strip().rstrip(",.:;")
                clean_name = action_tail_regex.sub('', raw_name).strip()
                # Must be 2 or 3 word parts, each at least 2 chars
                parts = clean_name.split()
                if 2 <= len(parts) <= 3 and all(len(p) >= 2 for p in parts):
                    if clean_name.lower() not in NAME_STOPWORDS:
                        p_id = f"person_{re.sub(r'[^a-zA-Z0-9]', '_', clean_name.lower())}"
                        if p_id not in node_map:
                            node_map[p_id] = Node(
                                id=p_id,
                                type="PERSON",
                                label=clean_name.title(),
                                confidence=0.95,
                                attributes={"extracted_role": "SUSPECT / CONSPIRATOR"}
                            )

        # Fallback: If no suspects extracted yet, extract 2-word TitleCase names that are not stopwords
        person_count = sum(1 for n in node_map.values() if n.type == "PERSON")
        if person_count == 0:
            general_names = re.findall(r"\b([A-Z][a-z]{2,15}\s+[A-Z][a-z]{2,15})\b", text)
            for name in general_names[:6]:
                if name.lower() not in NAME_STOPWORDS:
                    p_id = f"person_{re.sub(r'[^a-zA-Z0-9]', '_', name.lower())}"
                    if p_id not in node_map:
                        node_map[p_id] = Node(
                            id=p_id,
                            type="PERSON",
                            label=name,
                            confidence=0.88,
                            attributes={"fallback_extraction": True}
                        )

        # Link all extracted entities to Document
        for n in node_map.values():
            edges.append(Edge(
                source=n.id,
                target=doc.id,
                type="MENTIONED_IN",
                confidence=0.95,
                source_document=doc.filename,
                evidence=f"Extracted entity mention in {doc.filename}"
            ))

        # Semantic Inter-Entity Relationship Synthesis
        person_nodes = [n for n in node_map.values() if n.type == "PERSON"]
        phone_nodes = [n for n in node_map.values() if n.type == "PHONE"]
        account_nodes = [n for n in node_map.values() if n.type == "ACCOUNT"]
        vehicle_nodes = [n for n in node_map.values() if n.type == "VEHICLE"]
        facility_nodes = [n for n in node_map.values() if n.type == "LOCATION"]

        # 1. Person to Phone (USES)
        for p in person_nodes:
            for ph in phone_nodes:
                edges.append(Edge(
                    source=p.id,
                    target=ph.id,
                    type="USES",
                    confidence=0.92,
                    source_document=doc.filename,
                    evidence=f"{p.label} linked to communication terminal {ph.label}"
                ))

        # 2. Person to Account (TRANSFERRED_TO)
        for p in person_nodes:
            for acc in account_nodes:
                edges.append(Edge(
                    source=p.id,
                    target=acc.id,
                    type="TRANSFERRED_TO",
                    confidence=0.91,
                    source_document=doc.filename,
                    evidence=f"Financial Hawala transfer nexus between {p.label} and {acc.label}"
                ))

        # 3. Person to Vehicle (OPERATES)
        for p in person_nodes:
            for veh in vehicle_nodes:
                edges.append(Edge(
                    source=p.id,
                    target=veh.id,
                    type="OPERATES",
                    confidence=0.94,
                    source_document=doc.filename,
                    evidence=f"Vehicle {veh.label} operational dispatch associated with {p.label}"
                ))

        # 4. Person to Facility / Location (OPERATES_FROM)
        for p in person_nodes:
            for fac in facility_nodes:
                edges.append(Edge(
                    source=p.id,
                    target=fac.id,
                    type="OPERATES_FROM",
                    confidence=0.90,
                    source_document=doc.filename,
                    evidence=f"Surveillance confirms {p.label} activity at {fac.label}"
                ))

        # 5. Person to Person (COORDINATES_WITH)
        for i in range(len(person_nodes)):
            for j in range(i + 1, len(person_nodes)):
                edges.append(Edge(
                    source=person_nodes[i].id,
                    target=person_nodes[j].id,
                    type="COORDINATES_WITH",
                    confidence=0.90,
                    source_document=doc.filename,
                    evidence=f"Co-conspirator nexus between {person_nodes[i].label} and {person_nodes[j].label}"
                ))

        nodes.extend(node_map.values())
        return nodes, edges
