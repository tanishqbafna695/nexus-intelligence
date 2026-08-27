import sys
from pathlib import Path

# Add project root to Python path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(ROOT_DIR))

import json
import streamlit as st
import networkx as nx
from pyvis.network import Network
import streamlit.components.v1 as components

from ai.investigator_ai import NexusInvestigationAssistant
from analytics.graph_analytics import NexusGraphAnalytics

st.set_page_config(
    page_title="NEXUS Intelligence | Criminal Network Analysis",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Styling (UI/UX Pro Max)
st.markdown("""
    <style>
    .main { background-color: #0b0f19; color: #f3f4f6; }
    .stMetric { background-color: #1f2937; padding: 15px; border-radius: 8px; border: 1px solid #374151; }
    .evidence-card { background-color: #111827; border: 1px solid #374151; padding: 16px; border-radius: 8px; margin-bottom: 12px; }
    </style>
""", unsafe_allow_html=True)

@st.cache_resource
def load_assistant():
    return NexusInvestigationAssistant()

@st.cache_resource
def load_analytics():
    return NexusGraphAnalytics()

assistant = load_assistant()
analytics = load_analytics()

# Rebuild graph to ensure smart types are applied
analytics.graph = nx.read_gml(analytics.graph_path)

# Sidebar Navigation
st.sidebar.title("🛡️ NEXUS Intelligence")
st.sidebar.markdown("**NCRB Women Safety Division**")
st.sidebar.markdown("---")

nav_selection = st.sidebar.radio(
    "Navigation Menu",
    ["Overview & Stats", "Interactive Network Graph", "AI Investigator Assistant", "Evidence Inspector"]
)

# -------------------------------------------------------------
# TAB 1: OVERVIEW & STATS
# -------------------------------------------------------------
if nav_selection == "Overview & Stats":
    st.title("📊 Intelligence Overview")
    st.markdown("Welcome, Investigator. Aggregated status of ingested crime data and resolved entities.")
    
    try:
        report = analytics.run_full_analysis()
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric(label="Verified Entities (Nodes)", value=report["total_nodes"])
        with col2:
            st.metric(label="Relationship Edges", value=report["total_edges"])
        with col3:
            st.metric(label="Top Influencers Tracked", value=len(report["top_influencers"]))

        st.markdown("### 🏆 High-Centrality Network Influencers")
        st.table(report["top_influencers"])
    except Exception as e:
        st.error(f"Error loading analytics report: {e}")

# -------------------------------------------------------------
# TAB 2: INTERACTIVE NETWORK GRAPH
# -------------------------------------------------------------
elif nav_selection == "Interactive Network Graph":
    st.title("🕸️ Criminal Network Knowledge Graph")
    st.markdown("Clean, clustered network visualization separating Persons, Accounts, Phones, and Vehicles.")

    if st.button("Render Clustered Network Map", type="primary"):
        with st.spinner("Generating clean graph layout..."):
            g = analytics.graph
            net = Network(height="650px", width="100%", bgcolor="#0b0f19", font_color="#f3f4f6", directed=True)
            
            # Color coding nodes based on type
            type_colors = {
                "PERSON": "#3b82f6",       # Blue
                "BANK_ACCOUNT": "#10b981", # Green
                "PHONE_NUMBER": "#f59e0b", # Orange
                "VEHICLE": "#8b5cf6",      # Purple
                "UNKNOWN": "#6b7280"       # Gray
            }

            for node, data in g.nodes(data=True):
                ntype = data.get("type", "UNKNOWN")
                color = type_colors.get(ntype, "#3b82f6")
                net.add_node(
                    node, 
                    label=data.get("name", node), 
                    title=f"ID: {node} | Type: {ntype}", 
                    color=color,
                    size=25
                )
            
            for u, v, data in g.edges(data=True):
                rel = data.get("relationship", "LINKED")
                net.add_edge(
                    u, v, 
                    label=rel, 
                    title=f"Source: {data.get('source_document')}\nEvidence: {data.get('evidence')}",
                    color="#4b5563",
                    font={"size": 10, "color": "#9ca3af", "align": "middle"}
                )

            # Configure smooth repulsion physics to prevent clutter
            net.repulsion(node_distance=120, spring_length=150)
            
            path_html = Path("frontend/tmp_graph.html")
            net.save_graph(str(path_html))
            
            HtmlFile = open(path_html, 'r', encoding='utf-8')
            source_code = HtmlFile.read() 
            components.html(source_code, height=670)
    else:
        st.info("Click the button above to render the clean, uncluttered relationship graph.")

# -------------------------------------------------------------
# TAB 3: AI INVESTIGATOR ASSISTANT
# -------------------------------------------------------------
elif nav_selection == "AI Investigator Assistant":
    st.title("🤖 AI Investigation Assistant")
    st.markdown("Ask natural language questions. The system queries the graph database and presents clear, human-readable evidence trails.")

    user_query = st.text_input("Enter investigative query (e.g., 'How is P001 connected to P002?' or 'Who are the key influencers?'):")
    
    if st.button("Run AI Investigation", type="primary"):
        if user_query:
            with st.spinner("Analyzing graph database & building evidence chain..."):
                response = assistant.query(user_query)
                
                st.success("Verified Intelligence Output")
                st.markdown(f"### 💡 Answer")
                st.info(response['answer'])
                
                # Render clean human-readable evidence cards instead of raw JSON
                evidence_list = response.get("evidence_provenance", [])
                if evidence_list and isinstance(evidence_list, list):
                    st.markdown("### 📎 Verified Evidence Trail")
                    for idx, ev in enumerate(evidence_list, 1):
                        if isinstance(ev, dict):
                            st.markdown(f"""
                            <div class="evidence-card">
                                <b>Evidence #{idx}</b><br>
                                <b>Source Document:</b> <span style="color: #60a5fa;">{ev.get('source_document', 'N/A')}</span><br>
                                <b>Relationship:</b> <code>{ev.get('relationship', 'CONNECTED')}</code> ({ev.get('from')} ➔ {ev.get('to')})<br>
                                <b>Supporting Fact:</b> {ev.get('evidence', 'No specific text available.')}
                            </div>
                            """, unsafe_allow_html=True)
                        else:
                            st.markdown(f"- {ev}")
        else:
            st.warning("Please enter a valid query.")

# -------------------------------------------------------------
# TAB 4: EVIDENCE INSPECTOR
# -------------------------------------------------------------
elif nav_selection == "Evidence Inspector":
    st.title("🔍 Evidence & Source Inspector")
    st.markdown("Audit raw underlying documents, timestamps, and confidence scores backing every node and edge.")
    
    processed_dir = Path("data/processed")
    edges_file = processed_dir / "final_relationships.json"
    
    if edges_file.exists():
        with open(edges_file, "r") as f:
            edges = json.load(f)
        st.dataframe(edges, use_container_width=True)
    else:
        st.warning("No final relationships file found. Complete preprocessing phases first.")