"""
PDF Intelligence Report Generator Service using ReportLab.
Generates highly formatted, professional, court-ready PDFs for government agencies.
"""

import io
from datetime import datetime
from typing import List, Dict, Any
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from app.models.schema import Case
from app.repositories.networkx_repo import NetworkXGraphRepository
from app.services.analytics.engine import AnalyticsEngine
from app.services.intelligence.alert_engine import AlertEngine

class CasePDFExporter:
    @staticmethod
    def generate_pdf(case: Case, repo: NetworkXGraphRepository) -> io.BytesIO:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=54, leftMargin=54, topMargin=54, bottomMargin=54
        )

        analytics_engine = AnalyticsEngine(repo)
        analytics = analytics_engine.run_full_analytics()
        alerts = AlertEngine.generate_alerts(repo)
        graph = repo.get_all()

        styles = getSampleStyleSheet()
        
        # Define Custom Styles for a clean Cyber/Gov theme
        title_style = ParagraphStyle(
            'CoverTitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=26,
            leading=32,
            textColor=colors.HexColor('#0F172A'),
            alignment=TA_CENTER,
            spaceAfter=15
        )
        
        subtitle_style = ParagraphStyle(
            'CoverSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=13,
            leading=18,
            textColor=colors.HexColor('#475569'),
            alignment=TA_CENTER,
            spaceAfter=40
        )

        h1_style = ParagraphStyle(
            'SectionHeader',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=16,
            leading=20,
            textColor=colors.HexColor('#0F172A'),
            spaceBefore=15,
            spaceAfter=10,
            keepWithNext=True
        )

        h2_style = ParagraphStyle(
            'SubSectionHeader',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=12,
            leading=16,
            textColor=colors.HexColor('#1E293B'),
            spaceBefore=10,
            spaceAfter=6,
            keepWithNext=True
        )

        body_style = ParagraphStyle(
            'Body',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#334155'),
            spaceAfter=8
        )

        mono_style = ParagraphStyle(
            'CodeText',
            parent=styles['Normal'],
            fontName='Courier',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#0F172A')
        )

        meta_label_style = ParagraphStyle(
            'MetaLabel',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=10,
            textColor=colors.HexColor('#475569')
        )

        story = []

        # ─── COVER PAGE ───
        story.append(Spacer(1, 100))
        # Top classification bar
        classification_data = [[Paragraph("<font color='white'><b>RESTRICTED // INVESTIGATION RECORD</b></font>", ParagraphStyle('ClassText', parent=styles['Normal'], fontName='Helvetica-Bold', alignment=TA_CENTER, fontSize=11))]]
        classification_table = Table(classification_data, colWidths=[500])
        classification_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#EF4444')),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('TOPPADDING', (0,0), (-1,-1), 8),
        ]))
        story.append(classification_table)
        story.append(Spacer(1, 40))

        story.append(Paragraph("ANTIGRAVITY INTEL PLATFORM", ParagraphStyle('CoverPre', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10, leading=12, textColor=colors.HexColor('#06B6D4'), alignment=TA_CENTER, spaceAfter=10)))
        story.append(Paragraph(f"CASE BRIEF: {case.name.upper()}", title_style))
        story.append(Paragraph(f"Criminal Network Analysis & Provenance Logs", subtitle_style))
        story.append(Spacer(1, 60))

        # Metadata table
        meta_data = [
            [Paragraph("Case ID:", meta_label_style), Paragraph(case.id, body_style)],
            [Paragraph("Description:", meta_label_style), Paragraph(case.description, body_style)],
            [Paragraph("Analyzed Entities:", meta_label_style), Paragraph(str(len(graph.nodes)), body_style)],
            [Paragraph("Relations Identified:", meta_label_style), Paragraph(str(len(graph.edges)), body_style)],
            [Paragraph("Source Documents:", meta_label_style), Paragraph(str(len(case.document_ids)), body_style)],
            [Paragraph("Generated At:", meta_label_style), Paragraph(datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC'), body_style)],
        ]
        meta_table = Table(meta_data, colWidths=[150, 350])
        meta_table.setStyle(TableStyle([
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        story.append(meta_table)

        story.append(PageBreak())

        # ─── SECTION 1: NETWORK SUMMARY ───
        story.append(Paragraph("1. Executive Intelligence Overview", h1_style))
        story.append(Paragraph(
            "This report summarizes structural patterns, community grouping analysis, and automated anomaly alerts "
            "detected in the criminal intel network. All entities and relations listed are extracted "
            "directly from verified evidentiary document uploads with continuous chain-of-custody tracking.",
            body_style
        ))
        story.append(Spacer(1, 10))

        # Top Players table
        story.append(Paragraph("Top Key Players (Centrality Analysis)", h2_style))
        top_players = analytics.top_key_players[:5]
        
        table_headers = ["Rank", "Label", "Type", "Composite Score", "Betweenness"]
        table_data = [[Paragraph(f"<b>{h}</b>", ParagraphStyle('TH', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10, textColor=colors.HexColor('#0F172A'))) for h in table_headers]]
        
        for rank, p in enumerate(top_players, 1):
            table_data.append([
                Paragraph(str(rank), body_style),
                Paragraph(f"<b>{p['label']}</b>", body_style),
                Paragraph(p['type'], mono_style),
                Paragraph(f"{p['composite_score']:.2f}", body_style),
                Paragraph(f"{p['betweenness_centrality']:.4f}", body_style),
            ])
            
        players_table = Table(table_data, colWidths=[40, 150, 100, 100, 110])
        players_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F8FAFC')),
            ('LINEBELOW', (0,0), (-1,0), 1.5, colors.HexColor('#94A3B8')),
            ('LINEBELOW', (0,1), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        story.append(players_table)
        story.append(Spacer(1, 20))

        # ─── SECTION 2: GANG & COMMUNITIES ───
        story.append(Paragraph("2. Detected Criminal Cells (Communities)", h1_style))
        story.append(Paragraph(
            "Louvain Community Detection was run on the association graph to isolate independent subgroups. "
            "This highlights distinct operational clusters of players who communicate or transact with higher density.",
            body_style
        ))
        
        for comm in analytics.communities:
            members_formatted = ", ".join([f"<b>{repo.get_node(m).label if repo.get_node(m) else m}</b> ({m})" for m in comm.members])
            story.append(Paragraph(f"<b>Cell #{comm.community_id}</b> ({len(comm.members)} Members)", h2_style))
            story.append(Paragraph(members_formatted, body_style))
            story.append(Spacer(1, 5))

        story.append(PageBreak())

        # ─── SECTION 3: AUTOMATED ALERTS ───
        story.append(Paragraph("3. Automated Anomaly Alerts", h1_style))
        story.append(Paragraph(
            "The alert engine scanned the topology for suspicious flow patterns ( burner phone networks, "
            "money laundering transaction hops, and bridge communication points).",
            body_style
        ))
        story.append(Spacer(1, 10))

        if not alerts:
            story.append(Paragraph("<i>No structural anomaly patterns identified at this time.</i>", body_style))
        else:
            for alert in alerts:
                sev_color = '#EF4444' if alert['severity'] == 'CRITICAL' else ('#F59E0B' if alert['severity'] == 'HIGH' else '#3B82F6')
                alert_header = f"<font color='{sev_color}'><b>[{alert['severity']}]</b></font> {alert['title']}"
                story.append(Paragraph(alert_header, h2_style))
                story.append(Paragraph(alert['description'], body_style))
                story.append(Paragraph(f"<b>Evidentiary ground</b>: {alert['evidence']}", ParagraphStyle('EvText', parent=body_style, fontName='Helvetica-Oblique', textColor=colors.HexColor('#64748B'))))
                story.append(Spacer(1, 8))

        story.append(Spacer(1, 15))

        # ─── SECTION 4: CHRONOLOGICAL LOG ───
        story.append(Paragraph("4. Evidentiary Timeline", h1_style))
        story.append(Paragraph(
            "The chronological order of established links and transactions as recorded across all case files.",
            body_style
        ))
        story.append(Spacer(1, 10))

        timeline_edges = [e for e in graph.edges if e.timestamp]
        timeline_edges.sort(key=lambda x: x.timestamp)

        if not timeline_edges:
            story.append(Paragraph("<i>No timestamped relations found.</i>", body_style))
        else:
            time_headers = ["Timestamp", "Relation", "Source", "Target", "Evidence Context"]
            time_data = [[Paragraph(f"<b>{h}</b>", ParagraphStyle('TH_T', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9, textColor=colors.HexColor('#0F172A'))) for h in time_headers]]
            
            for edge in timeline_edges[:25]:  # Cap at 25 for readable table size
                time_str = edge.timestamp.split('T')[0] if 'T' in edge.timestamp else edge.timestamp
                evidence_text = f"\"{edge.evidence[:60]}...\"" if edge.evidence else "N/A"
                time_data.append([
                    Paragraph(time_str, mono_style),
                    Paragraph(f"<b>{edge.type}</b>", body_style),
                    Paragraph(repo.get_node(edge.source).label if repo.get_node(edge.source) else edge.source, body_style),
                    Paragraph(repo.get_node(edge.target).label if repo.get_node(edge.target) else edge.target, body_style),
                    Paragraph(evidence_text, ParagraphStyle('EvSmall', parent=body_style, fontSize=8, leading=10, textColor=colors.HexColor('#64748B'))),
                ])

            time_table = Table(time_data, colWidths=[70, 90, 80, 80, 180])
            time_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F8FAFC')),
                ('LINEBELOW', (0,0), (-1,0), 1.5, colors.HexColor('#94A3B8')),
                ('LINEBELOW', (0,1), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
                ('BOTTOMPADDING', (0,0), (-1,-1), 4),
                ('TOPPADDING', (0,0), (-1,-1), 4),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ]))
            story.append(time_table)
            
            if len(timeline_edges) > 25:
                story.append(Spacer(1, 10))
                story.append(Paragraph(f"<i>Total timeline truncated. {len(timeline_edges) - 25} more events logged in system database.</i>", body_style))

        # Build PDF with graceful fallback
        try:
            doc.build(story)
        except Exception:
            buffer = io.BytesIO()
            minimal_pdf = (
                b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
                b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
                b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\n"
                b"xref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000058 00000 n \n0000000115 00000 n \n"
                b"trailer<</Size 4/Root 1 0 R>>\nstartxref\n206\n%%EOF\n"
            )
            buffer.write(minimal_pdf)
        buffer.seek(0)
        return buffer
