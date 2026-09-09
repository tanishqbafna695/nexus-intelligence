import { Node, Edge, GraphData, Case } from '../types';

const PHONE_REGEX = /(?:\+91[\-\s]?)?[6-9]\d{4}[\-\s]?\d{5}|\b\d{10,12}\b/g;
const PLATE_REGEX = /\b[A-Z]{2}[-\s]?\d{2}[-\s]?[A-Z]{1,3}[-\s]?\d{4}\b/g;
const ACCOUNT_REGEX = /\b(?:ACC|SWIFT|IBAN|VAULT|TOKEN)[-_][A-Z0-9]{4,16}\b/gi;

export interface PoliceSolutionDirective {
  directive_id: string;
  category: string;
  target: string;
  order: string;
  urgency: string;
  statutory_basis: string;
}

export interface HVTTarget {
  target_id: string;
  target_name: string;
  type: string;
  culpability_score: number;
  operational_role: string;
  threat_level: string;
  priority: string;
  direct_connections_count: number;
  action_directive: string;
  applicable_statutory_sections: string[];
  network_centrality_percentile: string;
}

export interface PoliceSolutionsReport {
  case_id: string;
  status: string;
  timestamp: string;
  total_entities_analyzed: number;
  total_connections_analyzed: number;
  hvt_priority_targets: HVTTarget[];
  actionable_directives: PoliceSolutionDirective[];
  takedown_bottlenecks: Array<{
    node_id: string;
    label: string;
    type: string;
    strategic_value: string;
    disruption_impact: string;
    recommended_takedown_method: string;
  }>;
  evidence_preservation_alerts: Array<{
    alert_type: string;
    title: string;
    details: string;
    action?: string;
  }>;
  operational_playbook_72h: Array<{
    timeframe: string;
    operation: string;
    steps: string[];
  }>;
  tactical_overview: string;
}

export class ClientIntelligenceEngine {
  private static STORAGE_PREFIX = 'trace_vault_';

  public static getExpungedCaseIds(): Set<string> {
    try {
      const raw = localStorage.getItem(this.STORAGE_PREFIX + 'expunged_cases');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return new Set<string>(parsed);
      }
    } catch (e) {
      console.warn('Storage read error for expunged cases', e);
    }
    return new Set<string>();
  }

  public static markCaseExpunged(caseId: string): void {
    try {
      const expunged = this.getExpungedCaseIds();
      expunged.add(caseId);
      localStorage.setItem(this.STORAGE_PREFIX + 'expunged_cases', JSON.stringify(Array.from(expunged)));
    } catch (e) {
      console.warn('Storage error marking expunged case', e);
    }
  }

  public static unmarkCaseExpunged(caseId: string): void {
    try {
      const expunged = this.getExpungedCaseIds();
      if (expunged.has(caseId)) {
        expunged.delete(caseId);
        localStorage.setItem(this.STORAGE_PREFIX + 'expunged_cases', JSON.stringify(Array.from(expunged)));
      }
    } catch (e) {
      console.warn('Storage error unmarking expunged case', e);
    }
  }

  public static getSavedCases(): Case[] {
    try {
      const expunged = this.getExpungedCaseIds();
      const raw = localStorage.getItem(this.STORAGE_PREFIX + 'cases');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter(c => !expunged.has(c.id));
        }
      }
    } catch (e) {
      console.warn('Storage read error', e);
    }
    return [];
  }

  public static saveCase(newCase: Case): void {
    try {
      this.unmarkCaseExpunged(newCase.id);
      const existing = this.getSavedCases();
      const filtered = existing.filter(c => c.id !== newCase.id);
      localStorage.setItem(this.STORAGE_PREFIX + 'cases', JSON.stringify([newCase, ...filtered]));
    } catch (e) {
      console.warn('Storage write error', e);
    }
  }

  public static deleteCase(caseId: string): void {
    try {
      this.markCaseExpunged(caseId);
      const existing = this.getSavedCases();
      const updated = existing.filter(c => c.id !== caseId);
      localStorage.setItem(this.STORAGE_PREFIX + 'cases', JSON.stringify(updated));
      localStorage.removeItem(this.STORAGE_PREFIX + 'graph_' + caseId);
      localStorage.removeItem(this.STORAGE_PREFIX + 'solutions_' + caseId);
      localStorage.removeItem(this.STORAGE_PREFIX + 'analytics_' + caseId);
      localStorage.removeItem(this.STORAGE_PREFIX + 'entities_' + caseId);
    } catch (e) {
      console.warn('Storage delete error', e);
    }
  }

  public static getCaseGraph(caseId: string): GraphData | null {
    if (this.getExpungedCaseIds().has(caseId)) return null;
    try {
      const raw = localStorage.getItem(this.STORAGE_PREFIX + 'graph_' + caseId);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Graph read error', e);
    }
    return null;
  }

  public static saveCaseGraph(caseId: string, graph: GraphData): void {
    try {
      localStorage.setItem(this.STORAGE_PREFIX + 'graph_' + caseId, JSON.stringify(graph));
      const cases = this.getSavedCases();
      const targetCase = cases.find(c => c.id === caseId);
      if (targetCase) {
        targetCase.node_count = graph.nodes.length;
        targetCase.edge_count = graph.edges.length;
        this.saveCase(targetCase);
      }
    } catch (e) {
      console.warn('Graph write error', e);
    }
  }

  public static getPoliceSolutions(caseId: string): PoliceSolutionsReport | null {
    try {
      const raw = localStorage.getItem(this.STORAGE_PREFIX + 'solutions_' + caseId);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Solutions read error', e);
    }
    return null;
  }

  public static savePoliceSolutions(caseId: string, report: PoliceSolutionsReport): void {
    try {
      localStorage.setItem(this.STORAGE_PREFIX + 'solutions_' + caseId, JSON.stringify(report));
    } catch (e) {
      console.warn('Solutions write error', e);
    }
  }

  public static extractFromText(text: string, docName: string = 'incident_dossier.txt'): GraphData {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const nodeMap = new Map<string, Node>();

    const docId = 'doc_' + Date.now().toString().slice(-4);
    nodes.push({
      id: docId,
      type: 'DOCUMENT',
      label: docName,
      confidence: 1.0,
      attributes: { filename: docName, uploaded_at: new Date().toISOString() }
    });

    const phoneMatches = text.match(PHONE_REGEX) || [];
    for (const ph of phoneMatches) {
      const clean = ph.replace(/[^0-9]/g, '');
      if (clean.length >= 10) {
        const pId = 'phone_' + clean.slice(-10);
        if (!nodeMap.has(pId)) {
          nodeMap.set(pId, {
            id: pId,
            type: 'PHONE',
            label: ph.trim(),
            confidence: 0.98,
            attributes: { number: ph.trim() }
          });
        }
      }
    }

    const plateMatches = text.match(PLATE_REGEX) || [];
    for (const plate of plateMatches) {
      const vId = 'veh_' + plate.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      if (!nodeMap.has(vId)) {
        nodeMap.set(vId, {
          id: vId,
          type: 'VEHICLE',
          label: plate.trim().toUpperCase(),
          confidence: 0.96,
          attributes: { plate: plate.trim() }
        });
      }
    }

    const accMatches = text.match(ACCOUNT_REGEX) || [];
    for (const acc of accMatches) {
      const aId = 'account_' + acc.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      if (!nodeMap.has(aId)) {
        nodeMap.set(aId, {
          id: aId,
          type: 'ACCOUNT',
          label: acc.trim().toUpperCase(),
          confidence: 0.97,
          attributes: { account: acc.trim() }
        });
      }
    }

    const namePatterns = [
      /(?:Accused|Suspect|Kingpin|Smuggler|Courier|Operative|Director|Target)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,2})/g,
      /([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,2})\s+(?:alias|s\/o|arrested|confessed|interrogated|remanded|transferred|called)/g
    ];

    for (const pat of namePatterns) {
      let match: RegExpExecArray | null;
      while ((match = pat.exec(text)) !== null) {
        const rawName = match[1]?.trim();
        if (rawName && rawName.length > 3) {
          const lower = rawName.toLowerCase();
          if (!['state of', 'police station', 'high court', 'crime branch', 'warehouse', 'terminal'].some(w => lower.includes(w))) {
            const pId = 'person_' + rawName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
            if (!nodeMap.has(pId)) {
              nodeMap.set(pId, {
                id: pId,
                type: 'PERSON',
                label: rawName,
                confidence: 0.95,
                attributes: { extracted_name: rawName }
              });
            }
          }
        }
      }
    }

    if (Array.from(nodeMap.values()).filter(n => n.type === 'PERSON').length === 0) {
      const generalCaps = /([A-Z][a-z]{2,15}\s+[A-Z][a-z]{2,15})/g;
      let capMatch: RegExpExecArray | null;
      let capCount = 0;
      while ((capMatch = generalCaps.exec(text)) !== null && capCount < 4) {
        const name = capMatch[1];
        const lower = name.toLowerCase();
        if (!['first information', 'crime branch', 'special cell', 'police station', 'high court', 'new delhi', 'mumbai city'].includes(lower)) {
          const pId = 'person_' + name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
          if (!nodeMap.has(pId)) {
            nodeMap.set(pId, {
              id: pId,
              type: 'PERSON',
              label: name,
              confidence: 0.88,
              attributes: { fallback_ner: true }
            });
            capCount++;
          }
        }
      }
    }

    const allExtracted = Array.from(nodeMap.values());
    nodes.push(...allExtracted);

    for (const n of allExtracted) {
      edges.push({
        id: 'edge_' + n.id + '_' + docId,
        source: n.id,
        target: docId,
        type: 'MENTIONED_IN',
        confidence: 0.95,
        source_document: docName,
        evidence: 'Extracted from ' + docName
      });
    }

    const persons = allExtracted.filter(n => n.type === 'PERSON');
    const phones = allExtracted.filter(n => n.type === 'PHONE');
    const accounts = allExtracted.filter(n => n.type === 'ACCOUNT');
    const vehicles = allExtracted.filter(n => n.type === 'VEHICLE');

    for (const p of persons) {
      for (const ph of phones) {
        edges.push({
          id: 'edge_' + p.id + '_' + ph.id,
          source: p.id,
          target: ph.id,
          type: 'USES',
          confidence: 0.92,
          source_document: docName,
          evidence: p.label + ' linked to terminal ' + ph.label
        });
      }
    }

    for (const p of persons) {
      for (const acc of accounts) {
        edges.push({
          id: 'edge_' + p.id + '_' + acc.id,
          source: p.id,
          target: acc.id,
          type: 'TRANSFERRED_TO',
          confidence: 0.90,
          source_document: docName,
          evidence: 'Financial transfer link between ' + p.label + ' and ' + acc.label
        });
      }
    }

    for (const p of persons) {
      for (const veh of vehicles) {
        edges.push({
          id: 'edge_' + p.id + '_' + veh.id,
          source: p.id,
          target: veh.id,
          type: 'OPERATES',
          confidence: 0.93,
          source_document: docName,
          evidence: 'Vehicle dispatch linked to ' + p.label
        });
      }
    }

    for (let i = 0; i < persons.length; i++) {
      for (let j = i + 1; j < persons.length; j++) {
        edges.push({
          id: 'edge_' + persons[i].id + '_' + persons[j].id,
          source: persons[i].id,
          target: persons[j].id,
          type: 'COORDINATES_WITH',
          confidence: 0.89,
          source_document: docName,
          evidence: 'Co-conspirator nexus between ' + persons[i].label + ' and ' + persons[j].label
        });
      }
    }

    return { nodes, edges };
  }

  public static analyzeGraphAndGenerateSolutions(caseId: string, graph: GraphData): PoliceSolutionsReport {
    const nodes = graph.nodes || [];
    const edges = graph.edges || [];

    if (nodes.length === 0) {
      return {
        case_id: caseId,
        status: 'AWAITING_INGESTION',
        timestamp: new Date().toISOString(),
        total_entities_analyzed: 0,
        total_connections_analyzed: 0,
        hvt_priority_targets: [],
        actionable_directives: [],
        takedown_bottlenecks: [],
        evidence_preservation_alerts: [],
        operational_playbook_72h: [],
        tactical_overview: 'No entities extracted. Ingest data to generate solutions.'
      };
    }

    const degreeMap = new Map<string, number>();
    for (const n of nodes) degreeMap.set(n.id, 0);
    for (const e of edges) {
      degreeMap.set(e.source, (degreeMap.get(e.source) || 0) + 1);
      degreeMap.set(e.target, (degreeMap.get(e.target) || 0) + 1);
    }

    const personNodes = nodes.filter(n => n.type === 'PERSON');
    const targetCandidates = personNodes.length > 0 ? personNodes : nodes.slice(0, 5);

    const hvtTargets: HVTTarget[] = targetCandidates.map((node) => {
      const degree = degreeMap.get(node.id) || 1;
      const connectedEdges = edges.filter(e => e.source === node.id || e.target === node.id);
      const finEdges = connectedEdges.filter(e => ['TRANSFERRED_TO', 'PAID', 'ACCOUNT'].includes(e.type));
      const commsEdges = connectedEdges.filter(e => ['USES', 'CALLED', 'COORDINATES_WITH'].includes(e.type));

      const culpabilityScore = Math.min(Math.max(65 + degree * 7 + finEdges.length * 5, 60), 98);

      let role = 'ASSOCIATE / MULE';
      let threat = 'MODERATE THREAT';
      let priority = 'PRIORITY 3 - SURVEILLANCE';
      let directive = 'Issue summons for formal Section 67 NDPS / Section 50 PMLA interrogation of ' + node.label + '.';

      if (degree >= 3 || (finEdges.length >= 1 && commsEdges.length >= 1)) {
        role = 'SYNDICATE KINGPIN / COMMANDER';
        threat = 'TRANSNATIONAL CRITICAL';
        priority = 'PRIORITY 1 - IMMEDIATE TAKEDOWN';
        directive = 'Execute Non-Bailable Arrest Warrant (NBW) under BNS Sec 111 (Organized Crime) & IPC Sec 120B against ' + node.label + '.';
      } else if (finEdges.length > 0) {
        role = 'FINANCIAL CONDUIT / HAWALA BROKER';
        threat = 'HIGH FINANCIAL THREAT';
        priority = 'PRIORITY 2 - ASSET FREEZE';
        directive = 'Issue emergency provisional account attachment order under PMLA Sec 17 against ' + node.label + "'s financial assets.";
      } else if (commsEdges.length > 1) {
        role = 'OPERATIONAL DISPATCHER / PROXY';
        threat = 'ELEVATED LOGISTICAL RISK';
        priority = 'PRIORITY 2 - INTERCEPT TRAP';
        directive = 'Deploy IMSI Catcher and obtain CDR tower logs under Section 91 CrPC for ' + node.label + '.';
      }

      const sections = ['IPC Sec 120B (Criminal Conspiracy)', 'BNS Sec 111 (Organized Crime)'];
      if (finEdges.length > 0 || node.id.includes('account') || node.label.toLowerCase().includes('hawala')) {
        sections.push('PMLA Sec 3 & 4 (Money-Laundering)', 'IPC Sec 420 (Cheating)');
      }
      if (connectedEdges.some(e => e.evidence && (e.evidence.toLowerCase().includes('narcotic') || e.evidence.toLowerCase().includes('contraband') || e.evidence.toLowerCase().includes('illegal')))) {
        sections.push('NDPS Act Sec 8(c)/21/29 (Illicit Trafficking)');
      }
      if (connectedEdges.some(e => e.evidence && (e.evidence.toLowerCase().includes('weapon') || e.evidence.toLowerCase().includes('arm')))) {
        sections.push('Arms Act Sec 25/27 (Illegal Possession)');
      }

      return {
        target_id: node.id,
        target_name: node.label,
        type: node.type,
        culpability_score: culpabilityScore,
        operational_role: role,
        threat_level: threat,
        priority: priority,
        direct_connections_count: degree,
        action_directive: directive,
        applicable_statutory_sections: sections,
        network_centrality_percentile: Math.min(degree * 18, 99) + '%'
      };
    });

    hvtTargets.sort((a, b) => b.culpability_score - a.culpability_score);

    const bottlenecks = hvtTargets.slice(0, 2).map(target => ({
      node_id: target.target_id,
      label: target.target_name,
      type: target.type,
      strategic_value: 'PRIMARY SYNDICATE BOTTLENECK',
      disruption_impact: 'Neutralizing this articulation node severs intra-cell coordination and fragments communication lines.',
      recommended_takedown_method: 'Simultaneous digital isolation and physical search & seizure warrant execution.'
    }));

    const directives: PoliceSolutionDirective[] = [
      {
        directive_id: 'DIR-01',
        category: 'ARREST & RAID AUTHORIZATION',
        target: hvtTargets[0] ? hvtTargets[0].target_name : 'Primary Suspect',
        order: hvtTargets[0] ? hvtTargets[0].action_directive : 'Execute Search Warrant under CrPC Sec 93.',
        urgency: 'IMMEDIATE (Within 24 Hours)',
        statutory_basis: 'CrPC Section 41A / Section 73 (Arrest Warrant)'
      },
      {
        directive_id: 'DIR-02',
        category: 'FINANCIAL FREEZE & SEIZURE',
        target: 'Identified Hawala & Transferred Accounts',
        order: 'Serve Section 102 CrPC / PMLA Sec 17 freezing orders to banks to block liquidity flight.',
        urgency: 'CRITICAL (Prevent Fund Siphoning)',
        statutory_basis: 'Prevention of Money Laundering Act Sec 17 & CrPC Sec 102'
      },
      {
        directive_id: 'DIR-03',
        category: 'DIGITAL FORENSIC PRESERVATION',
        target: 'Cellular Base Station Dumps & Handset IMEIs',
        order: 'Requisition 90-day CDR, IMEI histories, and IPDR logs under Section 91 CrPC.',
        urgency: 'TIME-SENSITIVE (Before 21-Day Telco Buffer Rollover)',
        statutory_basis: 'Indian Evidence Act Sec 65B Electronic Certificate Mandate'
      }
    ];

    return {
      case_id: caseId,
      status: 'SOLUTIONS_COMPILED',
      timestamp: new Date().toISOString(),
      total_entities_analyzed: nodes.length,
      total_connections_analyzed: edges.length,
      hvt_priority_targets: hvtTargets,
      actionable_directives: directives,
      takedown_bottlenecks: bottlenecks,
      evidence_preservation_alerts: [
        {
          alert_type: 'TELCO_BUFFER_EXPIRY',
          title: 'Telco Base Station Dump Expiration Alert',
          details: 'Base station logs older than 21 days risk purge. File Section 91 CrPC requisition immediately.',
          action: 'Issue statutory notice to telecom nodal officer.'
        },
        {
          alert_type: 'ASSET_SIPHONING_RISK',
          title: 'Cross-Border Asset Siphoning Risk',
          details: 'Balances routed via Hawala conduits typically disperse to offshore crypto within 48 hours.',
          action: 'Issue Lookout Circular (LOC) at international exit ports.'
        }
      ],
      operational_playbook_72h: [
        {
          timeframe: 'Hour 0 - 12',
          operation: 'Digital Intercept Lock & Border Watch',
          steps: [
            'Transmit IMEI watchlist to National Intelligence Grid (NATGRID).',
            'Freeze primary bank accounts at RBI nodal clearance desk.',
            'Place Bureau of Immigration (BOI) Lookout Circulars for Tier-1 suspects.'
          ]
        },
        {
          timeframe: 'Hour 12 - 36',
          operation: 'Coordinated Multi-Point Search & Seizure',
          steps: [
            'Obtain Search Warrants under CrPC Sec 93 from Special Sessions Court.',
            'Conduct simultaneous dawn raids on safehouse and warehouse nodes.',
            'Seize mobile devices in Faraday RF-shielded forensic bags.'
          ]
        },
        {
          timeframe: 'Hour 36 - 72',
          operation: 'Custodial Interrogation & Section 65B Filing',
          steps: [
            'Present accused before Magistrate within statutory 24 hours.',
            'Extract Cellebrite physical memory dumps of encrypted messaging artifacts.',
            'Compile Section 173 CrPC Preliminary Charge Sheet.'
          ]
        }
      ],
      tactical_overview: 'Analyzed ' + nodes.length + ' entities and ' + edges.length + ' connections. Identified ' + hvtTargets.length + ' targets. Immediate neutralization of ' + bottlenecks.length + ' bottleneck node(s) will sever syndicate operations.'
    };
  }

  public static getCaseAudioTranscripts(caseId: string, graphData?: GraphData): any {
    const defaultTranscripts: Record<string, any> = {
      'CASE-001': {
        case_id: 'CASE-001',
        statutory_notice: 'Section 65B Indian Evidence Act / Section 63 BSA Certification: Electronic wiretap and audio recordings preserved with cryptographic SHA-256 hash provenance.',
        recordings: [
          {
            recording_id: 'REC-WIRETAP-NX-01',
            title: 'Nhava Sheva Port Terminal 01 - Tactical Wiretap Intercept',
            audio_file: 'wiretap_intercept_terminal_01.wav',
            duration_seconds: 28.5,
            sha256_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            recorded_at: '2026-05-10T02:15:00Z',
            segments: [
              {
                segment_id: 'SEG-001',
                start_time: 2.0,
                end_time: 7.0,
                speaker: 'Devendra Sharma',
                text: 'Victor, the Nhava Sheva container shipment is arriving at 03:00 AM. Is Tariq ready at Warehouse 17?',
                entities: ['Nhava Sheva', 'Tariq Ahmed', 'Warehouse 17'],
                confidence: 0.96,
                is_edited: false
              },
              {
                segment_id: 'SEG-002',
                start_time: 7.5,
                end_time: 14.0,
                speaker: 'Victor Vance',
                text: 'Tariq has 4 transport vehicles standby. Ramesh Kumar is driving the lead transport MH-04-AB-1234.',
                entities: ['Tariq Ahmed', 'Ramesh Kumar', 'MH-04-AB-1234'],
                confidence: 0.94,
                is_edited: false
              },
              {
                segment_id: 'SEG-003',
                start_time: 14.5,
                end_time: 21.0,
                speaker: 'Devendra Sharma',
                text: 'Ensure the bank transfer of 65 Lakhs clears to account ACC-HAWALA-8899 before the terminal gates open.',
                entities: ['ACC-HAWALA-8899', 'Apex Global Logistics'],
                confidence: 0.97,
                is_edited: false
              },
              {
                segment_id: 'SEG-004',
                start_time: 21.5,
                end_time: 28.0,
                speaker: 'Victor Vance',
                text: 'Understood. The port customs agent is cleared. Nobody touches container consignment MUK-8891.',
                entities: ['MUK-8891', 'Nhava Sheva Port'],
                confidence: 0.95,
                is_edited: false
              }
            ]
          }
        ]
      },
      'CASE-002': {
        case_id: 'CASE-002',
        statutory_notice: 'Section 65B Indian Evidence Act / Section 63 BSA Certification: Lawful cyber surveillance and intercepted VoIP session preserved with SHA-256 certificate.',
        recordings: [
          {
            recording_id: 'REC-WIRETAP-BO-02',
            title: 'Bengaluru C2 Infrastructure - VoIP Tactical Intercept',
            audio_file: 'voip_c2_server_vault09.wav',
            duration_seconds: 32.0,
            sha256_hash: 'a4f891b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abc',
            recorded_at: '2026-02-14T03:45:00Z',
            segments: [
              {
                segment_id: 'SEG-101',
                start_time: 2.0,
                end_time: 8.5,
                speaker: 'Karan Mehra',
                text: 'Ananya, the banking trojan payload executed on State Commercial Bank gateway. Session tokens captured.',
                entities: ['Karan Mehra', 'Server Vault 09', 'Bengaluru'],
                confidence: 0.97,
                is_edited: false
              },
              {
                segment_id: 'SEG-102',
                start_time: 9.0,
                end_time: 16.0,
                speaker: 'Ananya Roy',
                text: 'Mule accounts in Bengaluru are primed. We must funnel 42 Lakhs into XMR-WALLET-8844 before central anti-fraud triggers lockouts.',
                entities: ['Ananya Roy', 'XMR-WALLET-8844'],
                confidence: 0.95,
                is_edited: false
              },
              {
                segment_id: 'SEG-103',
                start_time: 16.5,
                end_time: 24.0,
                speaker: 'Karan Mehra',
                text: 'Server Vault 09 has root access established. Vikram Malhotra is routing through decentralized onion mix nodes.',
                entities: ['Server Vault 09', 'Vikram Malhotra'],
                confidence: 0.96,
                is_edited: false
              },
              {
                segment_id: 'SEG-104',
                start_time: 24.5,
                end_time: 31.5,
                speaker: 'Ananya Roy',
                text: 'Confirmed. The privacy coin swap is verified. Wipe all SSH access logs from the secondary VPS immediately.',
                entities: ['Server Vault 09', 'Karan Mehra'],
                confidence: 0.98,
                is_edited: false
              }
            ]
          }
        ]
      },
      'CASE-003': {
        case_id: 'CASE-003',
        statutory_notice: 'Section 65B Indian Evidence Act / Section 63 BSA Certification: VHF Coastal Radio Scramble intercept preserved with SHA-256 cryptographic chain of custody.',
        recordings: [
          {
            recording_id: 'REC-WIRETAP-VL-03',
            title: 'Kandla Maritime Berth - VHF Channel 16 Radio Intercept',
            audio_file: 'vhf_maritime_berth04_intercept.wav',
            duration_seconds: 30.0,
            sha256_hash: 'c890123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd',
            recorded_at: '2026-03-01T23:10:00Z',
            segments: [
              {
                segment_id: 'SEG-201',
                start_time: 2.0,
                end_time: 8.0,
                speaker: 'Capt. Vladislav',
                text: 'Salim, MV Sea Rover has killed its AIS transponder 14 miles west of Kandla Deep Sea Berth 04.',
                entities: ['Capt. Vladislav', 'Kandla Deep Sea Berth 04'],
                confidence: 0.98,
                is_edited: false
              },
              {
                segment_id: 'SEG-202',
                start_time: 8.5,
                end_time: 15.5,
                speaker: 'Salim Ghouse',
                text: 'Pilot launch boat is on course. Port customs night supervisor is cleared with the agreed deposit.',
                entities: ['Salim Ghouse', 'Kandla Port'],
                confidence: 0.96,
                is_edited: false
              },
              {
                segment_id: 'SEG-203',
                start_time: 16.0,
                end_time: 22.5,
                speaker: 'Capt. Vladislav',
                text: 'Coast Guard radar patrol detected 8 miles north. Shift the surplus crate discharge to the auxiliary dock.',
                entities: ['Capt. Vladislav'],
                confidence: 0.94,
                is_edited: false
              },
              {
                segment_id: 'SEG-204',
                start_time: 23.0,
                end_time: 29.5,
                speaker: 'Salim Ghouse',
                text: 'Cranes and trucks ready at Berth 04. No manifest inspection will take place tonight.',
                entities: ['Salim Ghouse', 'Kandla Deep Sea Berth 04'],
                confidence: 0.97,
                is_edited: false
              }
            ]
          }
        ]
      },
      'CASE-004': {
        case_id: 'CASE-004',
        statutory_notice: 'Section 65B Indian Evidence Act / Section 63 BSA Certification: Encrypted messenger voice decrypt preserved under forensic cyber warrant.',
        recordings: [
          {
            recording_id: 'REC-WIRETAP-DG-04',
            title: 'Goa Coastal Cell - Secure Messenger Voice Clip Decrypt',
            audio_file: 'signal_voice_coastal_goa.wav',
            duration_seconds: 27.0,
            sha256_hash: 'd90123456789abcdef0123456789abcdef0123456789abcdef0123456789abcde',
            recorded_at: '2026-03-18T21:40:00Z',
            segments: [
              {
                segment_id: 'SEG-301',
                start_time: 2.0,
                end_time: 7.5,
                speaker: "Operator 'Phantom_404'",
                text: 'Neha, package 14 synthetic grade crystal sealed in waterproof container. GPS coordinates transmitted via PGP.',
                entities: ["Operator 'Phantom_404'", 'Neha Singhania'],
                confidence: 0.97,
                is_edited: false
              },
              {
                segment_id: 'SEG-302',
                start_time: 8.0,
                end_time: 14.5,
                speaker: 'Neha Singhania',
                text: 'Approaching Anjuna Beach Safehouse perimeter. North cove rocks are completely dark, no police patrol in sight.',
                entities: ['Anjuna Beach Safehouse, Goa', 'Neha Singhania'],
                confidence: 0.95,
                is_edited: false
              },
              {
                segment_id: 'SEG-303',
                start_time: 15.0,
                end_time: 21.0,
                speaker: "Operator 'Phantom_404'",
                text: 'Leave your primary smartphone behind. Use the temporary burner only. Transfer of 18 Lakhs is confirmed.',
                entities: ["Operator 'Phantom_404'"],
                confidence: 0.96,
                is_edited: false
              },
              {
                segment_id: 'SEG-304',
                start_time: 21.5,
                end_time: 26.5,
                speaker: 'Neha Singhania',
                text: 'Dead-drop completed under north rock shelf. 4.2 kg secured. Heading inland towards Panaji.',
                entities: ['Anjuna Beach Safehouse, Goa', 'Neha Singhania'],
                confidence: 0.98,
                is_edited: false
              }
            ]
          }
        ]
      },
      'CASE-005': {
        case_id: 'CASE-005',
        statutory_notice: 'Section 65B Indian Evidence Act / Section 63 BSA Certification: Air Courier Surveillance & customs terminal wiretap preserved under special economic offences warrant.',
        recordings: [
          {
            recording_id: 'REC-WIRETAP-GF-05',
            title: 'CSMIA Terminal 2 - Tactical Audio Intercept',
            audio_file: 'customs_air_transit_intercept.wav',
            duration_seconds: 29.0,
            sha256_hash: 'e0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
            recorded_at: '2026-04-05T18:20:00Z',
            segments: [
              {
                segment_id: 'SEG-401',
                start_time: 2.0,
                end_time: 8.0,
                speaker: 'Sheikh Mansoor Al-Falasi',
                text: 'Fatima, Emirates flight EK-504 has landed at Chhatrapati Shivaji International T2. 8.5 kg gold paste in baggage frame.',
                entities: ['Sheikh Mansoor Al-Falasi', 'Fatima Noor', 'Chhatrapati Shivaji Maharaj Airport T2'],
                confidence: 0.99,
                is_edited: false
              },
              {
                segment_id: 'SEG-402',
                start_time: 8.5,
                end_time: 15.0,
                speaker: 'Fatima Noor',
                text: 'Exiting aircraft now Sheikh. Green channel ground liaison has confirmed zero physical screening at Gate 6.',
                entities: ['Fatima Noor', 'Chhatrapati Shivaji Maharaj Airport T2'],
                confidence: 0.97,
                is_edited: false
              },
              {
                segment_id: 'SEG-403',
                start_time: 15.5,
                end_time: 22.0,
                speaker: 'Sheikh Mansoor Al-Falasi',
                text: 'Proceed immediately by private taxi to Zaveri Bazaar Gold Refinery. Sanjay Zaveri is awaiting the bullion melts.',
                entities: ['Sheikh Mansoor Al-Falasi', 'Zaveri Bazaar Gold Refinery'],
                confidence: 0.98,
                is_edited: false
              },
              {
                segment_id: 'SEG-404',
                start_time: 22.5,
                end_time: 28.5,
                speaker: 'Fatima Noor',
                text: 'Luggage collected without customs inspection. En route to Zaveri Bazaar now.',
                entities: ['Fatima Noor', 'Zaveri Bazaar Gold Refinery'],
                confidence: 0.99,
                is_edited: false
              }
            ]
          }
        ]
      }
    };

    if (defaultTranscripts[caseId]) {
      return defaultTranscripts[caseId];
    }

    // Dynamic generation from graphData
    const graph = graphData || this.getCaseGraph(caseId) || { nodes: [], edges: [] };
    const persons = graph.nodes.filter(n => n.type === 'PERSON');
    const accounts = graph.nodes.filter(n => n.type === 'ACCOUNT');
    const locations = graph.nodes.filter(n => n.type === 'LOCATION');
    const vehicles = graph.nodes.filter(n => n.type === 'VEHICLE');

    const p1 = persons[0]?.label || 'Primary Operative';
    const p2 = persons[1]?.label || (persons.length > 0 ? 'Secondary Associate' : 'Field Courier');
    const acc = accounts[0]?.label || 'Settlement Account';
    const loc = locations[0]?.label || 'Consignment Facility';
    const veh = vehicles[0]?.label || 'Transport Unit';

    return {
      case_id: caseId,
      statutory_notice: `Section 65B Indian Evidence Act / Section 63 BSA Certification: Electronic wiretap and audio recordings preserved with cryptographic SHA-256 hash provenance for Case ${caseId}.`,
      recordings: [
        {
          recording_id: `REC-WIRETAP-${caseId.toUpperCase().slice(0, 10)}-01`,
          title: `Tactical Wiretap Audio Intercept - ${caseId}`,
          audio_file: `wiretap_${caseId.toLowerCase()}_intercept.wav`,
          duration_seconds: 28.0,
          sha256_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b' + Math.abs(caseId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)).toString().padStart(6, '0'),
          recorded_at: new Date().toISOString(),
          segments: [
            {
              segment_id: 'SEG-001',
              start_time: 2.0,
              end_time: 7.5,
              speaker: p1,
              text: `Has the consignment logistics been confirmed at ${loc}? We cannot afford surveillance interference.`,
              entities: [p1, loc],
              confidence: 0.95,
              is_edited: false
            },
            {
              segment_id: 'SEG-002',
              start_time: 8.0,
              end_time: 14.5,
              speaker: p2,
              text: `Yes, transport ${veh} is en route. Contact has cleared local checkpoints.`,
              entities: [p2, veh],
              confidence: 0.93,
              is_edited: false
            },
            {
              segment_id: 'SEG-003',
              start_time: 15.0,
              end_time: 21.0,
              speaker: p1,
              text: `Verify the financial routing through ${acc} prior to cargo clearance.`,
              entities: [acc],
              confidence: 0.96,
              is_edited: false
            },
            {
              segment_id: 'SEG-004',
              start_time: 21.5,
              end_time: 27.5,
              speaker: p2,
              text: 'All accounts reconciled. Perimeter is secure.',
              entities: [loc],
              confidence: 0.94,
              is_edited: false
            }
          ]
        }
      ]
    };
  }

  public static generateSuggestedQuestions(caseId: string, graphData?: GraphData): Array<{ category: string; question: string }> {
    const graph = graphData || this.getCaseGraph(caseId) || { nodes: [], edges: [] };
    const nodes = graph.nodes;
    if (nodes.length === 0) {
      return [
        { category: 'INGESTION', question: 'What intelligence files are required to construct this case graph?' },
        { category: 'STATUS', question: 'What is the current status of case ingestion?' }
      ];
    }

    const persons = nodes.filter(n => n.type === 'PERSON');
    const accounts = nodes.filter(n => n.type === 'ACCOUNT');
    const locations = nodes.filter(n => n.type === 'LOCATION');
    const phones = nodes.filter(n => n.type === 'PHONE');

    const queries: Array<{ category: string; question: string }> = [];

    if (persons.length >= 2) {
      queries.push({
        category: 'CONNECTION',
        question: `How is ${persons[0].label} connected to ${persons[1].label}?`
      });
    } else if (persons.length === 1) {
      queries.push({
        category: 'PROFILE',
        question: `What is the network profile and alibi for ${persons[0].label}?`
      });
    }

    queries.push({
      category: 'KEY_PLAYERS',
      question: 'Who are the most connected key players in this network?'
    });

    if (accounts.length > 0) {
      queries.push({
        category: 'FINANCIAL',
        question: `What financial transactions route through ${accounts[0].label}?`
      });
    } else if (locations.length > 0) {
      queries.push({
        category: 'LOCATION',
        question: `What operational activity is centered around ${locations[0].label}?`
      });
    }

    queries.push({
      category: 'BRIDGE',
      question: 'Which person or entity connects the major network clusters?'
    });

    if (phones.length > 0) {
      queries.push({
        category: 'ANOMALIES',
        question: 'What burner phones or communication anomalies exist in this network?'
      });
    } else {
      queries.push({
        category: 'ALERTS',
        question: 'What critical threat alerts and operational vulnerabilities have been detected?'
      });
    }

    return queries;
  }
}
