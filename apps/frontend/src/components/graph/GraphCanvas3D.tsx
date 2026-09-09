import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GraphData, Node, NodeType } from '../../types';
import { ZoomIn, ZoomOut, RotateCcw, Crosshair, Eye } from 'lucide-react';

interface GraphCanvas3DProps {
  data: GraphData;
  selectedNodeId?: string;
  highlightNodeIds?: string[];
  highlightEdgeIds?: string[];
  minConfidence?: number;
  selectedNodeTypes?: NodeType[];
  searchQuery?: string;
  onSelectNode: (node: Node | null) => void;
  onExpandNeighborhood?: (nodeId: string) => void;
  communities?: Array<{ community_id: number; members: string[] }>;
  showCommunities?: boolean;
  totalNodeCount?: number;
}

// ── Crisp Cyber-Tactical Palette ─────────────────────────────────────────────
const TYPE_CONFIG: Record<string, {
  color: number;
  hex: string;
  radius: number;
  ringColor: number;
}> = {
  PERSON: {
    color: 0xFF0055,       // Radiant Crimson Red
    hex: '#FF0055',
    radius: 5.5,
    ringColor: 0x00FF9D,
  },
  PHONE: {
    color: 0xFFB703,       // Electric Amber Gold
    hex: '#FFB703',
    radius: 4.2,
    ringColor: 0xFFD166,
  },
  LOCATION: {
    color: 0x00D2FF,       // Neon Azure Cyan
    hex: '#00D2FF',
    radius: 4.8,
    ringColor: 0x3A86FF,
  },
  VEHICLE: {
    color: 0xFF007F,       // Hot Magenta Ruby
    hex: '#FF007F',
    radius: 4.5,
    ringColor: 0xFF5400,
  },
  ORGANIZATION: {
    color: 0x9D4EDD,       // Neon Violet Purple
    hex: '#9D4EDD',
    radius: 5.2,
    ringColor: 0xC77DFF,
  },
  ACCOUNT: {
    color: 0x00F0FF,       // Bright Cyan Mint
    hex: '#00F0FF',
    radius: 4.4,
    ringColor: 0x70E000,
  },
  DOCUMENT: {
    color: 0x80ED99,       // Glowing Ice Green
    hex: '#80ED99',
    radius: 3.8,
    ringColor: 0x38A3A5,
  },
  TRANSACTION: {
    color: 0xEC4899,
    hex: '#EC4899',
    radius: 4.0,
    ringColor: 0xF472B6,
  },
  EVENT: {
    color: 0xF97316,
    hex: '#F97316',
    radius: 4.0,
    ringColor: 0xFB923C,
  },
};

const DEFAULT_CONFIG = {
  color: 0x38BDF8,
  hex: '#38BDF8',
  radius: 4.0,
  ringColor: 0x0EA5E9,
};

interface SimNode {
  id: string;
  x: number; y: number; z: number;
  raw: Node;
  group: THREE.Group;
  coreMesh: THREE.Mesh;
  wireMesh: THREE.Mesh;
  reticleMesh: THREE.Mesh;
  sprite: THREE.Sprite;
  baseRadius: number;
}

interface SimEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  line: THREE.Line;
}

export const GraphCanvas3D: React.FC<GraphCanvas3DProps> = ({
  data,
  selectedNodeId,
  highlightNodeIds = [],
  highlightEdgeIds = [],
  minConfidence = 0.5,
  selectedNodeTypes = [],
  searchQuery = '',
  onSelectNode,
  onExpandNeighborhood,
  communities = [],
  showCommunities = false,
  totalNodeCount,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameRef = useRef<number>(0);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const simNodesRef = useRef<Map<string, SimNode>>(new Map());
  const simEdgesRef = useRef<SimEdge[]>([]);
  const graphGroupRef = useRef<THREE.Group | null>(null);

  // Camera Animation Tween state
  const targetCamPosRef = useRef<THREE.Vector3 | null>(null);
  const targetLookAtRef = useRef<THREE.Vector3 | null>(null);
  const isTweeningRef = useRef<boolean>(false);

  const [fps, setFps] = useState(60);
  const [currentFov, setCurrentFov] = useState(48);

  // ── Helper: Crisp High-Tech Billboard Label ─────────────────────────────────
  const createLabelSprite = (text: string, colorHex: string, isPerson: boolean): THREE.Sprite => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 120;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 512, 120);

      // Sleek Chamfered Tactical Badge
      ctx.fillStyle = 'rgba(6, 9, 15, 0.95)';
      ctx.strokeStyle = colorHex;
      ctx.lineWidth = isPerson ? 3 : 1.5;

      ctx.beginPath();
      ctx.roundRect(16, 20, 480, 80, 12);
      ctx.fill();
      ctx.stroke();

      // Top corner indicator dot
      ctx.fillStyle = colorHex;
      ctx.beginPath();
      ctx.arc(36, 60, 6, 0, Math.PI * 2);
      ctx.fill();

      // Clean Monospace Text
      ctx.font = isPerson ? 'bold 30px monospace' : '26px monospace';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const maxLen = isPerson ? 19 : 21;
      const displayLabel = text.length > maxLen ? text.substring(0, maxLen - 2) + '..' : text;
      ctx.fillText(displayLabel, 54, 60);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(30, 7.5, 1);
    return sprite;
  };

  // ── Stable Spatial Layout Generator ────────────────────────────────────────
  const computeStableLayout = (nodes: Node[]): Map<string, { x: number; y: number; z: number }> => {
    const positions = new Map<string, { x: number; y: number; z: number }>();
    if (nodes.length === 0) return positions;

    const typeGroups: Record<string, Node[]> = {};
    nodes.forEach(n => {
      if (!typeGroups[n.type]) typeGroups[n.type] = [];
      typeGroups[n.type].push(n);
    });

    const types = Object.keys(typeGroups);
    const numTypes = types.length;

    types.forEach((type, tIdx) => {
      const groupNodes = typeGroups[type];
      const theta = (tIdx / numTypes) * Math.PI * 2;
      const groupCenterX = Math.cos(theta) * 95;
      const groupCenterZ = Math.sin(theta) * 95;
      const groupCenterY = ((tIdx % 2 === 0 ? 1 : -1) * 20);

      groupNodes.forEach((node, nIdx) => {
        const subTheta = (nIdx / Math.max(groupNodes.length, 1)) * Math.PI * 2;
        const subRadius = 20 + (nIdx * 10);
        positions.set(node.id, {
          x: groupCenterX + Math.cos(subTheta) * subRadius,
          y: groupCenterY + (Math.sin(nIdx * 1.8) * 14),
          z: groupCenterZ + Math.sin(subTheta) * subRadius,
        });
      });
    });

    return positions;
  };

  // ── Initialize Scene & WebGL Context ONCE on Mount ─────────────────────────
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const W = container.clientWidth || 800;
    const H = container.clientHeight || 600;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06070A);
    sceneRef.current = scene;

    const graphGroup = new THREE.Group();
    scene.add(graphGroup);
    graphGroupRef.current = graphGroup;

    const camera = new THREE.PerspectiveCamera(currentFov, W / H, 0.1, 4000);
    camera.position.set(0, 70, 260);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x06070A, 1.0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.7;
    controls.zoomSpeed = 0.9;
    controls.panSpeed = 0.8;
    controls.minDistance = 20;
    controls.maxDistance = 900;
    controlsRef.current = controls;

    // Tactical Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(ambient);

    const dirLight1 = new THREE.DirectionalLight(0x00D2FF, 1.0);
    dirLight1.position.set(120, 180, 140);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xFF0055, 0.7);
    dirLight2.position.set(-120, -100, -100);
    scene.add(dirLight2);

    // Tooltip Element
    const tooltip = document.createElement('div');
    tooltip.className = 'absolute pointer-events-none z-50 px-3 py-2 rounded-lg font-mono border backdrop-blur-md shadow-2xl transition-opacity';
    tooltip.style.display = 'none';
    tooltip.style.backgroundColor = 'rgba(6, 8, 14, 0.96)';
    tooltip.style.borderColor = 'rgba(0, 210, 255, 0.4)';
    container.style.position = 'relative';
    container.appendChild(tooltip);
    tooltipRef.current = tooltip;

    // Raycasting for Node Click & Hover
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes = [...simNodesRef.current.values()].map(n => n.coreMesh);
      const hits = raycaster.intersectObjects(meshes, false);

      if (hits.length > 0) {
        const hitMesh = hits[0].object as THREE.Mesh;
        for (const sn of simNodesRef.current.values()) {
          if (sn.coreMesh === hitMesh) {
            onSelectNode(sn.raw);
            return;
          }
        }
      } else {
        onSelectNode(null);
      }
    };
    renderer.domElement.addEventListener('click', onClick);

    const onMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes = [...simNodesRef.current.values()].map(n => n.coreMesh);
      const hits = raycaster.intersectObjects(meshes, false);

      if (hits.length > 0) {
        const hitMesh = hits[0].object as THREE.Mesh;
        for (const sn of simNodesRef.current.values()) {
          if (sn.coreMesh === hitMesh) {
            tooltip.innerHTML = `
              <div style="color:#00D2FF;font-size:9px;text-transform:uppercase;margin-bottom:2px;letter-spacing:1px">${sn.raw.type}</div>
              <div style="font-size:12px;font-weight:bold;margin-bottom:2px;color:#FFF">${sn.raw.label}</div>
              <div style="color:#00FF9D;font-size:9px">Assoc Score: ${(sn.raw.confidence * 100).toFixed(0)}%</div>
            `;
            tooltip.style.display = 'block';
            tooltip.style.left = `${e.clientX - rect.left + 16}px`;
            tooltip.style.top = `${e.clientY - rect.top - 10}px`;
            renderer.domElement.style.cursor = 'pointer';
            return;
          }
        }
      } else {
        tooltip.style.display = 'none';
        renderer.domElement.style.cursor = 'grab';
      }
    };
    renderer.domElement.addEventListener('mousemove', onMove);

    const onResize = () => {
      if (!container || !renderer || !camera) return;
      const w2 = container.clientWidth;
      const h2 = container.clientHeight;
      camera.aspect = w2 / h2;
      camera.updateProjectionMatrix();
      renderer.setSize(w2, h2);
    };
    window.addEventListener('resize', onResize);

    // ── Animation Loop ──
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsTimer = 0;

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      frameCount++;
      fpsTimer += dt;
      if (fpsTimer > 0.5) {
        setFps(Math.round(frameCount / fpsTimer));
        frameCount = 0; fpsTimer = 0;
      }

      // Smooth Camera Fly-To Tweening
      if (isTweeningRef.current && targetCamPosRef.current && targetLookAtRef.current) {
        camera.position.lerp(targetCamPosRef.current, 0.08);
        controls.target.lerp(targetLookAtRef.current, 0.08);

        if (camera.position.distanceTo(targetCamPosRef.current) < 0.5) {
          isTweeningRef.current = false;
        }
      }

      // Subtle Tactical Reticle Spin
      simNodesRef.current.forEach(n => {
        n.reticleMesh.rotation.z += 0.012;
        n.wireMesh.rotation.y += 0.008;
      });

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.domElement.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      if (tooltip.parentNode === container) container.removeChild(tooltip);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Populate / Update Graph Objects Dynamically (Camera is Preserved) ────────
  useEffect(() => {
    const graphGroup = graphGroupRef.current;
    if (!graphGroup) return;

    // Clear existing objects in graphGroup
    while (graphGroup.children.length > 0) {
      graphGroup.remove(graphGroup.children[0]);
    }
    simNodesRef.current.clear();
    simEdgesRef.current = [];

    // Filter nodes
    const filteredNodes = data.nodes.filter(n => {
      if (n.confidence < minConfidence) return false;
      if (selectedNodeTypes.length > 0 && !selectedNodeTypes.includes(n.type as NodeType)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q);
      }
      return true;
    });

    const activeNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = data.edges.filter(e => activeNodeIds.has(e.source) && activeNodeIds.has(e.target));

    const positions = computeStableLayout(filteredNodes);
    const newSimNodes = new Map<string, SimNode>();

    // ── Build Sleek Tactical Prisms & Nodes ──
    filteredNodes.forEach(node => {
      const cfg = TYPE_CONFIG[node.type] || DEFAULT_CONFIG;
      const isPerson = node.type === 'PERSON';
      const pos = positions.get(node.id) || { x: 0, y: 0, z: 0 };

      const group = new THREE.Group();
      group.position.set(pos.x, pos.y, pos.z);

      // 1. Faceted Gem Core
      const coreGeo = new THREE.IcosahedronGeometry(cfg.radius, 1);
      const coreMat = new THREE.MeshStandardMaterial({
        color: cfg.color,
        emissive: cfg.color,
        emissiveIntensity: 0.75,
        roughness: 0.15,
        metalness: 0.85,
        flatShading: true,
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      group.add(coreMesh);

      // 2. Outer Wireframe Protective Cage
      const wireGeo = new THREE.OctahedronGeometry(cfg.radius * 1.35, 0);
      const wireMat = new THREE.MeshBasicMaterial({
        color: cfg.ringColor,
        wireframe: true,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
      });
      const wireMesh = new THREE.Mesh(wireGeo, wireMat);
      group.add(wireMesh);

      // 3. Hexagonal Targeting Reticle Ring
      const reticleGeo = new THREE.RingGeometry(cfg.radius * 1.4, cfg.radius * 1.55, 6);
      const reticleMat = new THREE.MeshBasicMaterial({
        color: cfg.ringColor,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      const reticleMesh = new THREE.Mesh(reticleGeo, reticleMat);
      reticleMesh.rotation.x = Math.PI / 3;
      group.add(reticleMesh);

      // 4. Billboard Tag Label
      const sprite = createLabelSprite(node.label, cfg.hex, isPerson);
      sprite.position.set(0, -(cfg.radius + 6), 0);
      group.add(sprite);

      graphGroup.add(group);

      newSimNodes.set(node.id, {
        id: node.id,
        x: pos.x, y: pos.y, z: pos.z,
        raw: node,
        group,
        coreMesh,
        wireMesh,
        reticleMesh,
        sprite,
        baseRadius: cfg.radius,
      });
    });

    simNodesRef.current = newSimNodes;

    // ── Build Crisp Edge Lines ──
    const newSimEdges: SimEdge[] = [];
    filteredEdges.forEach(e => {
      const src = newSimNodes.get(e.source);
      const tgt = newSimNodes.get(e.target);
      if (!src || !tgt) return;

      const isHigh = highlightEdgeIds.includes(e.id || '');
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(src.x, src.y, src.z),
        new THREE.Vector3(tgt.x, tgt.y, tgt.z),
      ]);

      const mat = new THREE.LineBasicMaterial({
        color: isHigh ? 0x00FF9D : 0x00D2FF,
        transparent: true,
        opacity: isHigh ? 0.95 : 0.35,
        blending: THREE.AdditiveBlending,
      });

      const line = new THREE.Line(geo, mat);
      graphGroup.add(line);

      newSimEdges.push({
        id: e.id || `${e.source}_${e.target}`,
        source: e.source,
        target: e.target,
        type: e.type,
        line,
      });
    });

    simEdgesRef.current = newSimEdges;
  }, [data, minConfidence, selectedNodeTypes, searchQuery, highlightEdgeIds]);

  // ── Smooth Camera Fly-To on Node Selection ───────────────────────────────────
  useEffect(() => {
    if (!selectedNodeId) return;
    const targetNode = simNodesRef.current.get(selectedNodeId);
    if (!targetNode || !cameraRef.current) return;

    // Set destination for camera & orbit center
    targetLookAtRef.current = new THREE.Vector3(targetNode.x, targetNode.y, targetNode.z);
    targetCamPosRef.current = new THREE.Vector3(targetNode.x, targetNode.y + 14, targetNode.z + 55);
    isTweeningRef.current = true;

    // Highlight selected node's reticle
    simNodesRef.current.forEach(sn => {
      const isSelected = sn.id === selectedNodeId;
      const isHighlighted = highlightNodeIds.includes(sn.id);

      if (isSelected) {
        sn.reticleMesh.scale.setScalar(1.6);
        (sn.reticleMesh.material as THREE.MeshBasicMaterial).color.setHex(0x00FF9D);
        (sn.reticleMesh.material as THREE.MeshBasicMaterial).opacity = 0.95;
      } else if (isHighlighted) {
        sn.reticleMesh.scale.setScalar(1.3);
        (sn.reticleMesh.material as THREE.MeshBasicMaterial).color.setHex(0x00D2FF);
        (sn.reticleMesh.material as THREE.MeshBasicMaterial).opacity = 0.75;
      } else {
        sn.reticleMesh.scale.setScalar(1.0);
        (sn.reticleMesh.material as THREE.MeshBasicMaterial).opacity = 0.55;
      }
    });
  }, [selectedNodeId, highlightNodeIds]);

  // ── HUD Camera Handlers ──────────────────────────────────────────────────────
  const handleResetCamera = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    targetLookAtRef.current = new THREE.Vector3(0, 0, 0);
    targetCamPosRef.current = new THREE.Vector3(0, 70, 260);
    isTweeningRef.current = true;
  };

  const handleZoom = (delta: number) => {
    if (!cameraRef.current) return;
    const cam = cameraRef.current;
    cam.position.multiplyScalar(delta);
  };

  const handleFovChange = (newFov: number) => {
    if (!cameraRef.current) return;
    setCurrentFov(newFov);
    cameraRef.current.fov = newFov;
    cameraRef.current.updateProjectionMatrix();
  };

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden bg-[#06070A]" style={{ background: '#06070A' }}>
      <div ref={mountRef} className="w-full h-full" style={{ background: '#06070A' }} />

      {/* Top Left HUD Telemetry Badge */}
      <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none font-mono z-10">
        <div className="bg-black/85 backdrop-blur-md border border-cyan-500/30 rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
          <span className="text-cyan-300 font-bold">3D SPATIAL KNOWLEDGE GRAPH</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-300 font-mono">
            {data.nodes.length}{typeof totalNodeCount === 'number' && totalNodeCount !== data.nodes.length ? ` / ${totalNodeCount}` : ''} nodes
          </span>
          <span className="text-emerald-400 font-bold">{fps} fps</span>
        </div>
      </div>

      {/* Tactical Camera Controls - Bottom Right (above legend, safely separated from filter panel) */}
      <div className="absolute bottom-16 right-3 flex flex-col gap-1.5 z-20">
        <div className="bg-black/85 backdrop-blur-md border border-white/10 rounded-xl p-1.5 flex flex-col gap-1 shadow-2xl font-mono text-xs">
          <button
            onClick={() => handleZoom(0.85)}
            title="Zoom In"
            className="p-1.5 rounded hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 transition"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoom(1.15)}
            title="Zoom Out"
            className="p-1.5 rounded hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 transition"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetCamera}
            title="Reset Camera Target"
            className="p-1.5 rounded hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="border-t border-white/10 my-1" />
          <div className="px-1 py-0.5 text-[9px] text-cyan-400 font-bold text-center">
            FOV: {currentFov}°
          </div>
          <input
            type="range"
            min="30"
            max="85"
            value={currentFov}
            onChange={(e) => handleFovChange(Number(e.target.value))}
            className="w-16 accent-cyan-400 cursor-pointer"
            title="Adjust Field of View"
          />
        </div>
      </div>

      {/* Bottom Canvas Controls & Legend */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none gap-2">
        <div className="flex flex-wrap gap-1.5 pointer-events-auto">
          {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
            <div
              key={type}
              className="bg-black/85 backdrop-blur-md border border-white/10 rounded px-2 py-0.5 flex items-center gap-1.5 text-[9px] font-mono text-slate-200"
            >
              <span className="w-2 h-2 rounded-sm inline-block flex-shrink-0" style={{ background: cfg.hex, boxShadow: `0 0 8px ${cfg.hex}` }} />
              {type}
            </div>
          ))}
        </div>

        <div className="text-[9px] font-mono text-slate-400 bg-black/85 backdrop-blur-md border border-white/10 rounded px-2.5 py-1 pointer-events-auto shrink-0">
          <span>Click Node to Focus | Drag to Orbit | Scroll to Zoom</span>
        </div>
      </div>
    </div>
  );
};
