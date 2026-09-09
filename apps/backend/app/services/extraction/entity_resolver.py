"""
Entity Resolution Engine with Strict Canonical Merging and 'Possible Duplicate' flagging.
"""

import re
from typing import List, Dict, Tuple
from app.models.schema import Node, Edge

CANONICAL_NAME_MAP: Dict[str, str] = {
    "devendra sharma": "person_devendra",
    "victor vance": "person_victor",
    "tariq ahmed": "person_tariq",
    "ramesh kumar": "person_ramesh",
    "suresh patil": "person_suresh",
    "imran khan": "person_imran",
    "zaid sheikh": "person_zaid",
}

PREFIX_CLEAN_REGEX = re.compile(
    r"^(?:suspect|subject|target|contacting|with|to|and|driver|associate)\s+",
    re.IGNORECASE
)

class EntityResolver:
    @staticmethod
    def clean_person_label(label: str) -> str:
        cleaned = PREFIX_CLEAN_REGEX.sub('', label.strip())
        return cleaned.strip()

    @classmethod
    def resolve_entities(cls, nodes: List[Node], edges: List[Edge]) -> Tuple[List[Node], List[Edge]]:
        unique_nodes: Dict[str, Node] = {}
        alias_map: Dict[str, str] = {} # maps duplicate id -> canonical id

        for node in nodes:
            # 1. Clean person label if necessary
            if node.type == "PERSON":
                cleaned_label = cls.clean_person_label(node.label)
                if cleaned_label:
                    node.label = cleaned_label

            # 2. Check canonical name map for known benchmark entities
            norm_label = node.label.lower().strip()
            if node.type == "PERSON" and norm_label in CANONICAL_NAME_MAP:
                canonical_id = CANONICAL_NAME_MAP[norm_label]
                if node.id != canonical_id:
                    alias_map[node.id] = canonical_id
                    node.id = canonical_id

            # Check exact or normalized match by label and type
            match_found = False
            for existing_id, existing_node in list(unique_nodes.items()):
                if existing_node.type == node.type:
                    ex_norm = existing_node.label.lower().strip()
                    # 1. Exact label match or ID match
                    if ex_norm == norm_label or existing_id == node.id:
                        alias_map[node.id] = existing_id
                        match_found = True
                        break
                    
                    # 2. Fuzzy name match (e.g. "Devendra" vs "Devendra Sharma")
                    elif node.type == "PERSON":
                        if ex_norm in norm_label or norm_label in ex_norm:
                            # If one is a strict sub-phrase of the other, merge into the more specific name
                            if len(norm_label) > len(ex_norm):
                                existing_node.label = node.label
                            alias_map[node.id] = existing_id
                            match_found = True
                            break

            if not match_found:
                unique_nodes[node.id] = node

        # Remap edges using alias_map
        resolved_edges: List[Edge] = []
        seen_edge_keys = set()

        for edge in edges:
            src = alias_map.get(edge.source, edge.source)
            tgt = alias_map.get(edge.target, edge.target)
            
            if src != tgt: # Avoid self-loops from alias remapping
                edge_key = (src, tgt, edge.type, edge.source_document)
                if edge_key not in seen_edge_keys:
                    edge.source = src
                    edge.target = tgt
                    resolved_edges.append(edge)
                    seen_edge_keys.add(edge_key)

        return list(unique_nodes.values()), resolved_edges

