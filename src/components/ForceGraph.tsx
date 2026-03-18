"use client";

import { useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { books, bookMap } from "@/data/books";
import { edges } from "@/data/edges";
import { GENRE_COLORS } from "@/lib/colors";
import { BibleBook, Canon, Genre } from "@/lib/types";

interface Props {
  canon: Canon;
  selectedBookId: string | null;
  todayBookIds: string[];
  edgeThreshold: number;
  onSelectBook: (id: string | null) => void;
  onHover: (book: BibleBook | null, x: number, y: number) => void;
  onReady?: () => void;
}

// ─── RING CONFIG ──────────────────────────────────────────
// Genres ordered from inner ring to outer ring
const GENRE_RINGS: { genres: Genre[]; radius: number; tiltY: number }[] = [
  { genres: ["Torah"], radius: 80, tiltY: 0 },
  { genres: ["History"], radius: 150, tiltY: 8 },
  { genres: ["Wisdom"], radius: 210, tiltY: -12 },
  { genres: ["Major Prophets"], radius: 260, tiltY: 15 },
  { genres: ["Minor Prophets"], radius: 310, tiltY: -10 },
  { genres: ["Gospels", "NT History"], radius: 370, tiltY: 20 },
  { genres: ["Pauline Epistles"], radius: 430, tiltY: -18 },
  { genres: ["General Epistles"], radius: 480, tiltY: 12 },
  { genres: ["Apocalyptic"], radius: 520, tiltY: -25 },
];

// ─── HELPERS ──────────────────────────────────────────────

function createGlowTexture(color: string, size = 128): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const cx = size / 2;
  const gradient = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  // Parse hex color to RGB for gradient stops
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  gradient.addColorStop(0, `rgba(${r},${g},${b},1.0)`);
  gradient.addColorStop(0.15, `rgba(${r},${g},${b},0.6)`);
  gradient.addColorStop(0.4, `rgba(${r},${g},${b},0.15)`);
  gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createNebulaTexture(
  color: [number, number, number],
  size = 512
): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const cx = size / 2;
  const gradient = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  gradient.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},0.06)`);
  gradient.addColorStop(0.5, `rgba(${color[0]},${color[1]},${color[2]},0.02)`);
  gradient.addColorStop(1, `rgba(${color[0]},${color[1]},${color[2]},0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

interface NodeData {
  book: BibleBook;
  sphere: THREE.Mesh;
  glow: THREE.Sprite;
  label: CSS2DObject;
  labelEl: HTMLSpanElement;
  position: THREE.Vector3;
  nodeRadius: number;
  connectionCount: number;
}

interface EdgeData {
  line: THREE.Line;
  sourceId: string;
  targetId: string;
  weight: number;
}

// ─── COMPONENT ────────────────────────────────────────────

export default function ForceGraph({
  canon,
  selectedBookId,
  todayBookIds,
  edgeThreshold,
  onSelectBook,
  onHover,
  onReady,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    labelRenderer: CSS2DRenderer;
    controls: OrbitControls;
    animationId: number;
    nodes: Map<string, NodeData>;
    edgeLines: EdgeData[];
    nodeGroup: THREE.Group;
    edgeGroup: THREE.Group;
    starField: THREE.Points;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    hoveredId: string | null;
    glowTextures: Map<string, THREE.Texture>;
    nebulaSprites: THREE.Sprite[];
  } | null>(null);

  // Stable refs for callbacks used in event listeners
  const onSelectBookRef = useRef(onSelectBook);
  const onHoverRef = useRef(onHover);
  const onReadyRef = useRef(onReady);
  const selectedBookIdRef = useRef(selectedBookId);
  const edgeThresholdRef = useRef(edgeThreshold);
  const todayBookIdsRef = useRef(todayBookIds);
  onSelectBookRef.current = onSelectBook;
  onHoverRef.current = onHover;
  onReadyRef.current = onReady;
  selectedBookIdRef.current = selectedBookId;
  edgeThresholdRef.current = edgeThreshold;
  todayBookIdsRef.current = todayBookIds;

  // ─── BUILD SCENE ──────────────────────────────────────
  const buildScene = useCallback(
    (container: HTMLDivElement) => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Renderer
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      container.appendChild(renderer.domElement);
      renderer.domElement.style.position = "fixed";
      renderer.domElement.style.top = "0";
      renderer.domElement.style.left = "0";
      renderer.domElement.style.touchAction = "none";

      // Label renderer (CSS2D)
      const labelRenderer = new CSS2DRenderer();
      labelRenderer.setSize(width, height);
      labelRenderer.domElement.style.position = "fixed";
      labelRenderer.domElement.style.top = "0";
      labelRenderer.domElement.style.left = "0";
      labelRenderer.domElement.style.pointerEvents = "none";
      container.appendChild(labelRenderer.domElement);

      // Camera
      const camera = new THREE.PerspectiveCamera(60, width / height, 1, 5000);
      camera.position.set(0, 250, 600);
      camera.lookAt(0, 0, 0);

      // Scene
      const scene = new THREE.Scene();

      // Controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 80;
      controls.maxDistance = 1500;
      controls.enablePan = true;
      controls.autoRotate = false;
      controls.target.set(0, 0, 0);

      // ─── STAR FIELD ─────────────────────────────────
      const starCount = 2500;
      const starPositions = new Float32Array(starCount * 3);
      const starColors = new Float32Array(starCount * 3);
      const starSizes = new Float32Array(starCount);

      for (let i = 0; i < starCount; i++) {
        // Distribute on a large sphere
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 1800 + Math.random() * 400;
        starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        starPositions[i * 3 + 2] = r * Math.cos(phi);

        const brightness = 0.3 + Math.random() * 0.7;
        // Slight warm/cool tint
        const tint = Math.random();
        if (tint < 0.1) {
          // Warm stars
          starColors[i * 3] = brightness;
          starColors[i * 3 + 1] = brightness * 0.85;
          starColors[i * 3 + 2] = brightness * 0.7;
        } else if (tint < 0.2) {
          // Cool stars
          starColors[i * 3] = brightness * 0.7;
          starColors[i * 3 + 1] = brightness * 0.8;
          starColors[i * 3 + 2] = brightness;
        } else {
          starColors[i * 3] = brightness;
          starColors[i * 3 + 1] = brightness;
          starColors[i * 3 + 2] = brightness;
        }

        starSizes[i] = 0.5 + Math.random() * 2.0;
      }

      const starGeometry = new THREE.BufferGeometry();
      starGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(starPositions, 3)
      );
      starGeometry.setAttribute(
        "color",
        new THREE.BufferAttribute(starColors, 3)
      );
      starGeometry.setAttribute(
        "size",
        new THREE.BufferAttribute(starSizes, 1)
      );

      const starMaterial = new THREE.PointsMaterial({
        size: 1.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: false,
      });

      const starField = new THREE.Points(starGeometry, starMaterial);
      scene.add(starField);

      // ─── NEBULA SPRITES ─────────────────────────────
      const nebulaSprites: THREE.Sprite[] = [];
      const nebulaConfigs: {
        color: [number, number, number];
        pos: [number, number, number];
        scale: number;
      }[] = [
        { color: [30, 20, 80], pos: [-800, 200, -600], scale: 1200 },
        { color: [20, 40, 80], pos: [600, -300, -800], scale: 1000 },
        { color: [50, 15, 60], pos: [200, 400, -700], scale: 900 },
      ];
      for (const cfg of nebulaConfigs) {
        const tex = createNebulaTexture(cfg.color);
        const mat = new THREE.SpriteMaterial({
          map: tex,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const sprite = new THREE.Sprite(mat);
        sprite.position.set(...cfg.pos);
        sprite.scale.set(cfg.scale, cfg.scale, 1);
        scene.add(sprite);
        nebulaSprites.push(sprite);
      }

      // ─── GROUPS ─────────────────────────────────────
      const edgeGroup = new THREE.Group();
      scene.add(edgeGroup);
      const nodeGroup = new THREE.Group();
      scene.add(nodeGroup);

      // Glow textures cache (one per genre color)
      const glowTextures = new Map<string, THREE.Texture>();
      for (const [, color] of Object.entries(GENRE_COLORS)) {
        if (!glowTextures.has(color)) {
          glowTextures.set(color, createGlowTexture(color));
        }
      }

      // Raycaster — use a larger threshold on touch devices for easier tap targeting
      const raycaster = new THREE.Raycaster();
      const isTouchPrimary =
        typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
      raycaster.params.Points = { threshold: isTouchPrimary ? 22 : 10 };
      const mouse = new THREE.Vector2();

      const state = {
        scene,
        camera,
        renderer,
        labelRenderer,
        controls,
        animationId: 0,
        nodes: new Map<string, NodeData>(),
        edgeLines: [] as EdgeData[],
        nodeGroup,
        edgeGroup,
        starField,
        raycaster,
        mouse,
        hoveredId: null as string | null,
        glowTextures,
        nebulaSprites,
      };

      sceneRef.current = state;
      return state;
    },
    []
  );

  // ─── POPULATE NODES & EDGES ───────────────────────────
  const populateScene = useCallback(
    (
      state: NonNullable<typeof sceneRef.current>,
      canonVal: Canon,
      edgeThresholdVal: number,
      selectedId: string | null,
      todayIds: string[]
    ) => {
      // Clear old nodes/edges
      while (state.nodeGroup.children.length > 0) {
        const child = state.nodeGroup.children[0];
        state.nodeGroup.remove(child);
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      }
      while (state.edgeGroup.children.length > 0) {
        const child = state.edgeGroup.children[0];
        state.edgeGroup.remove(child);
        if (child instanceof THREE.Line) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      }
      // Remove old CSS2D labels from scene
      state.nodes.forEach((nd) => {
        if (nd.label.parent) nd.label.parent.remove(nd.label);
      });
      state.nodes.clear();
      state.edgeLines = [];

      // Filter data
      const activeBooks = books.filter((b) => b.canons.includes(canonVal));
      const activeIds = new Set(activeBooks.map((b) => b.id));
      const activeEdges = edges.filter(
        (e) => activeIds.has(e.source) && activeIds.has(e.target)
      );

      // Connection counts
      const connectionCount = new Map<string, number>();
      activeEdges.forEach((e) => {
        connectionCount.set(
          e.source,
          (connectionCount.get(e.source) || 0) + 1
        );
        connectionCount.set(
          e.target,
          (connectionCount.get(e.target) || 0) + 1
        );
      });

      // ─── CALCULATE POSITIONS ────────────────────────
      // Group books by their ring
      const booksByRing = new Map<number, BibleBook[]>();
      activeBooks.forEach((b) => {
        for (let ri = 0; ri < GENRE_RINGS.length; ri++) {
          if (GENRE_RINGS[ri].genres.includes(b.genre)) {
            const list = booksByRing.get(ri) || [];
            list.push(b);
            booksByRing.set(ri, list);
            break;
          }
        }
      });

      // Position map
      const positionMap = new Map<string, THREE.Vector3>();
      booksByRing.forEach((ringBooks, ringIdx) => {
        const ring = GENRE_RINGS[ringIdx];
        const count = ringBooks.length;
        // For single-book rings (like Apocalyptic), place at a nice angle
        const angleOffset = ringIdx * 0.4; // stagger start angles per ring
        ringBooks.forEach((b, i) => {
          const angle = angleOffset + (2 * Math.PI * i) / count;
          const x = ring.radius * Math.cos(angle);
          const z = ring.radius * Math.sin(angle);
          // Y tilt based on ring config + slight per-book variation
          const y =
            ring.tiltY * Math.sin(angle) + (Math.sin(i * 1.5) * 5);
          positionMap.set(b.id, new THREE.Vector3(x, y, z));
        });
      });

      // ─── CREATE NODES ───────────────────────────────
      activeBooks.forEach((b) => {
        const pos = positionMap.get(b.id);
        if (!pos) return;

        const cc = connectionCount.get(b.id) || 0;
        const nodeRadius = Math.max(
          3,
          Math.min(15, 3 + Math.sqrt(cc) * 0.8)
        );
        const color = new THREE.Color(GENRE_COLORS[b.genre]);

        // Core sphere
        const geo = new THREE.SphereGeometry(nodeRadius, 16, 16);
        const mat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.85,
        });
        const sphere = new THREE.Mesh(geo, mat);
        sphere.position.copy(pos);
        sphere.userData = { bookId: b.id };
        state.nodeGroup.add(sphere);

        // Glow sprite
        const glowColor = GENRE_COLORS[b.genre];
        const glowTex = state.glowTextures.get(glowColor)!;
        const glowMat = new THREE.SpriteMaterial({
          map: glowTex,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          opacity: 0.4,
        });
        const glow = new THREE.Sprite(glowMat);
        glow.position.copy(pos);
        const glowScale = nodeRadius * 5;
        glow.scale.set(glowScale, glowScale, 1);
        glow.userData = { isGlow: true };
        state.nodeGroup.add(glow);

        // Label (CSS2D)
        const labelEl = document.createElement("span");
        labelEl.textContent = b.id;
        labelEl.style.fontFamily = "var(--font-mono), 'JetBrains Mono', monospace";
        labelEl.style.fontSize = "9px";
        labelEl.style.color = GENRE_COLORS[b.genre];
        labelEl.style.opacity = "0.3";
        labelEl.style.transition = "opacity 200ms ease-out";
        labelEl.style.pointerEvents = "none";
        labelEl.style.userSelect = "none";
        labelEl.style.whiteSpace = "nowrap";

        const label = new CSS2DObject(labelEl);
        label.position.copy(pos);
        label.position.y += nodeRadius + 8;
        state.scene.add(label);

        state.nodes.set(b.id, {
          book: b,
          sphere,
          glow,
          label,
          labelEl,
          position: pos,
          nodeRadius,
          connectionCount: cc,
        });
      });

      // ─── CREATE EDGES ───────────────────────────────
      activeEdges.forEach((e) => {
        const srcPos = positionMap.get(e.source);
        const tgtPos = positionMap.get(e.target);
        if (!srcPos || !tgtPos) return;

        // Curved arc: control point lifted on Y
        const mid = new THREE.Vector3()
          .addVectors(srcPos, tgtPos)
          .multiplyScalar(0.5);
        const dist = srcPos.distanceTo(tgtPos);
        mid.y += dist * 0.12;

        const curve = new THREE.QuadraticBezierCurve3(srcPos, mid, tgtPos);
        const points = curve.getPoints(24);
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);

        const srcBook = bookMap.get(e.source);
        const lineColor = srcBook
          ? new THREE.Color(GENRE_COLORS[srcBook.genre])
          : new THREE.Color(0xffffff);

        const lineMat = new THREE.LineBasicMaterial({
          color: lineColor,
          transparent: true,
          opacity: 0.12,
          depthWrite: false,
        });

        const line = new THREE.Line(lineGeo, lineMat);
        line.userData = {
          sourceId: e.source,
          targetId: e.target,
          weight: e.weight,
        };

        // Visibility based on threshold
        line.visible = e.weight >= edgeThresholdVal;

        state.edgeGroup.add(line);
        state.edgeLines.push({
          line,
          sourceId: e.source,
          targetId: e.target,
          weight: e.weight,
        });
      });

      // Apply selection highlighting
      applySelection(state, selectedId);
      applyTodayPulse(state, todayIds);
    },
    []
  );

  // ─── SELECTION HIGHLIGHTING ───────────────────────────
  function applySelection(
    state: NonNullable<typeof sceneRef.current>,
    selectedId: string | null
  ) {
    if (!selectedId) {
      // Reset all to default
      state.nodes.forEach((nd) => {
        (nd.sphere.material as THREE.MeshBasicMaterial).opacity = 0.85;
        (nd.glow.material as THREE.SpriteMaterial).opacity = 0.4;
        nd.labelEl.style.opacity = "0.3";
      });
      state.edgeLines.forEach((ed) => {
        const mat = ed.line.material as THREE.LineBasicMaterial;
        mat.opacity = 0.12;
      });
      return;
    }

    // Find connected books
    const connectedIds = new Set<string>();
    state.edgeLines.forEach((ed) => {
      if (ed.sourceId === selectedId || ed.targetId === selectedId) {
        connectedIds.add(ed.sourceId);
        connectedIds.add(ed.targetId);
      }
    });
    connectedIds.add(selectedId);

    // Dim everything, brighten connected
    state.nodes.forEach((nd, id) => {
      const isConnected = connectedIds.has(id);
      const isSelected = id === selectedId;

      (nd.sphere.material as THREE.MeshBasicMaterial).opacity = isSelected
        ? 1.0
        : isConnected
          ? 0.7
          : 0.1;
      (nd.glow.material as THREE.SpriteMaterial).opacity = isSelected
        ? 0.8
        : isConnected
          ? 0.35
          : 0.05;
      nd.labelEl.style.opacity = isSelected
        ? "1.0"
        : isConnected
          ? "0.7"
          : "0.08";
    });

    state.edgeLines.forEach((ed) => {
      const mat = ed.line.material as THREE.LineBasicMaterial;
      const isConnected =
        ed.sourceId === selectedId || ed.targetId === selectedId;
      mat.opacity = isConnected ? 0.3 + (ed.weight / 10) * 0.4 : 0.02;
    });
  }

  // ─── TODAY PULSE ──────────────────────────────────────
  function applyTodayPulse(
    state: NonNullable<typeof sceneRef.current>,
    todayIds: string[]
  ) {
    const todaySet = new Set(todayIds);
    state.nodes.forEach((nd, id) => {
      nd.sphere.userData.isToday = todaySet.has(id);
    });
  }

  // ─── MAIN EFFECT: INIT ───────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const state = buildScene(container);

    populateScene(
      state,
      canon,
      edgeThreshold,
      selectedBookId,
      todayBookIds
    );

    // ─── EVENT HANDLERS ───────────────────────────────
    const onPointerMove = (event: PointerEvent) => {
      // Touch devices have no hover — suppress tooltip to avoid ghost hovers
      if (event.pointerType === "touch") return;
      if (!sceneRef.current) return;
      const s = sceneRef.current;
      s.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      s.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      s.raycaster.setFromCamera(s.mouse, s.camera);

      // Only raycast against spheres (skip glow sprites)
      const spheres: THREE.Mesh[] = [];
      s.nodes.forEach((nd) => spheres.push(nd.sphere));
      const intersects = s.raycaster.intersectObjects(spheres);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const bookId = hit.userData.bookId as string;

        if (s.hoveredId !== bookId) {
          // Un-hover previous
          if (s.hoveredId) {
            const prev = s.nodes.get(s.hoveredId);
            if (prev && s.hoveredId !== selectedBookIdRef.current) {
              prev.labelEl.style.opacity =
                selectedBookIdRef.current ? "0.08" : "0.3";
            }
          }

          s.hoveredId = bookId;
          const nd = s.nodes.get(bookId);
          if (nd) {
            nd.labelEl.style.opacity = "1.0";
            onHoverRef.current(nd.book, event.clientX, event.clientY);
          }
        } else {
          const nd = s.nodes.get(bookId);
          if (nd) onHoverRef.current(nd.book, event.clientX, event.clientY);
        }
        container.style.cursor = "pointer";
      } else {
        if (s.hoveredId) {
          const prev = s.nodes.get(s.hoveredId);
          if (prev) {
            // Restore based on selection state
            const sel = selectedBookIdRef.current;
            if (sel) {
              const connectedIds = new Set<string>();
              s.edgeLines.forEach((ed) => {
                if (ed.sourceId === sel || ed.targetId === sel) {
                  connectedIds.add(ed.sourceId);
                  connectedIds.add(ed.targetId);
                }
              });
              connectedIds.add(sel);
              prev.labelEl.style.opacity = connectedIds.has(s.hoveredId)
                ? s.hoveredId === sel
                  ? "1.0"
                  : "0.7"
                : "0.08";
            } else {
              prev.labelEl.style.opacity = "0.3";
            }
          }
          s.hoveredId = null;
          onHoverRef.current(null, 0, 0);
        }
        container.style.cursor = "default";
      }
    };

    const onClick = (event: MouseEvent) => {
      if (!sceneRef.current) return;
      const s = sceneRef.current;
      s.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      s.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      s.raycaster.setFromCamera(s.mouse, s.camera);
      const spheres: THREE.Mesh[] = [];
      s.nodes.forEach((nd) => spheres.push(nd.sphere));
      const intersects = s.raycaster.intersectObjects(spheres);

      if (intersects.length > 0) {
        const bookId = intersects[0].object.userData.bookId as string;
        onSelectBookRef.current(bookId);
      } else {
        onSelectBookRef.current(null);
      }
    };

    const onResize = () => {
      if (!sceneRef.current) return;
      const s = sceneRef.current;
      const w = window.innerWidth;
      const h = window.innerHeight;
      s.camera.aspect = w / h;
      s.camera.updateProjectionMatrix();
      s.renderer.setSize(w, h);
      s.labelRenderer.setSize(w, h);
    };

    // ─── ANIMATION LOOP ───────────────────────────────
    const clock = new THREE.Clock();
    const { renderer: glRenderer, labelRenderer: glLabelRenderer, scene: glScene, camera: glCamera, controls: glControls } = state;

    glRenderer.domElement.addEventListener("pointermove", onPointerMove);
    glRenderer.domElement.addEventListener("click", onClick);
    window.addEventListener("resize", onResize);

    let firstFrame = true;
    const animate = () => {
      state.animationId = requestAnimationFrame(animate);
      glControls.update();

      // Pulse today's reading books
      const elapsed = clock.getElapsedTime();
      state.nodes.forEach((nd) => {
        if (nd.sphere.userData.isToday) {
          const pulse = 1.0 + Math.sin(elapsed * 2.0) * 0.3;
          const baseScale = nd.nodeRadius * 5;
          nd.glow.scale.set(
            baseScale * pulse,
            baseScale * pulse,
            1
          );
        }
      });

      glRenderer.render(glScene, glCamera);
      glLabelRenderer.render(glScene, glCamera);

      // Notify parent that the first frame has rendered
      if (firstFrame) {
        firstFrame = false;
        onReadyRef.current?.();
      }
    };
    animate();

    return () => {
      cancelAnimationFrame(state.animationId);
      glRenderer.domElement.removeEventListener("pointermove", onPointerMove);
      glRenderer.domElement.removeEventListener("click", onClick);
      window.removeEventListener("resize", onResize);

      glControls.dispose();
      glRenderer.dispose();

      // Clean up textures
      state.glowTextures.forEach((tex) => tex.dispose());
      state.nebulaSprites.forEach((s) => {
        (s.material as THREE.SpriteMaterial).map?.dispose();
        s.material.dispose();
      });

      // Clean up geometry/materials
      glScene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });

      // Remove label renderer DOM
      if (glLabelRenderer.domElement.parentNode) {
        glLabelRenderer.domElement.parentNode.removeChild(
          glLabelRenderer.domElement
        );
      }
      // Remove WebGL canvas
      if (glRenderer.domElement.parentNode) {
        glRenderer.domElement.parentNode.removeChild(glRenderer.domElement);
      }

      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── REACT TO CANON CHANGES (REBUILD) ────────────────
  useEffect(() => {
    if (!sceneRef.current) return;
    populateScene(
      sceneRef.current,
      canon,
      edgeThreshold,
      selectedBookId,
      todayBookIds
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canon]);

  // ─── REACT TO EDGE THRESHOLD ─────────────────────────
  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.edgeLines.forEach((ed) => {
      ed.line.visible = ed.weight >= edgeThreshold;
    });
  }, [edgeThreshold]);

  // ─── REACT TO SELECTION ──────────────────────────────
  useEffect(() => {
    if (!sceneRef.current) return;
    applySelection(sceneRef.current, selectedBookId);
  }, [selectedBookId]);

  // ─── REACT TO TODAY IDS ──────────────────────────────
  useEffect(() => {
    if (!sceneRef.current) return;
    applyTodayPulse(sceneRef.current, todayBookIds);
  }, [todayBookIds]);

  return (
    <div
      ref={containerRef}
      style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%" }}
    />
  );
}
