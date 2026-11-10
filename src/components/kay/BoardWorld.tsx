import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Sky, Sparkles } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { ACTIVE_MAP, type MapDefinition } from "@/maps";
import type { TerrainId } from "@/maps/types";
import { hexToPixel } from "@/services/hexGeometry";
import * as THREE from "three";
import { KayModel, PulseRing } from "@/components/kay/KayCharacters";

/**
 * Mundo 3D do tabuleiro (cenário, casas, câmeras), compartilhado pela partida (`/lab3d`) e pela
 * tela de posicionamento (`/deployment`). Só visual.
 */

export const HEX_SIZE = 1;

/**
 * Terreno que continua em volta do campo (só visual, fora do mapa jogável):
 * 2 anéis de terra um degrau abaixo do tabuleiro, com árvores e montanhas,
 * e depois mar. A névoa esconde o limite e o campo parece apoiado no mundo.
 */
const RING = 3;
function KayRing({ rows, cols, boardW, boardH }: { rows: number; cols: number; boardW: number; boardH: number }) {
  type RingItem = {
    key: string;
    x: number;
    z: number;
    kind: "wall" | "land" | "sea";
    deco: string | null;
    rot: number;
    rocks: { dx: number; dz: number; file: string; rot: number; s: number }[];
  };
  const items = useMemo(() => {
    const out: RingItem[] = [];
    for (let row = -RING; row < rows + RING; row++) {
      for (let col = -RING; col < cols + RING; col++) {
        const d = Math.max(-row, row - (rows - 1), -col, col - (cols - 1));
        if (d <= 0) continue; // dentro do mapa jogável
        const rand = seededRandom(Math.abs(row) * 977 + Math.abs(col) * 131 + (row < 0 ? 7 : 0) + (col < 0 ? 3 : 0) + 11);
        const r1 = rand();
        const r2 = rand();
        const { x, y } = hexToPixel(row, col, HEX_SIZE);
        // d=1: muro de pedra que marca o limite do tabuleiro. d=2: faixa de terra. d>=3: mar.
        const kind: RingItem["kind"] = d === 1 ? "wall" : d === 2 && r1 > 0.35 ? "land" : "sea";
        let deco: string | null = null;
        if (kind === "land" && r2 < 0.55) deco = ["trees_A_large", "trees_B_large", "trees_A_medium"][Math.floor(r1 * 3)];
        const rocks: RingItem["rocks"] = [];
        out.push({ key: `${row}:${col}`, x: x - boardW / 2, z: y - boardH / 2, kind, deco, rot: Math.floor(r2 * 6) * (Math.PI / 3), rocks });
      }
    }
    return out;
  }, [rows, cols, boardW, boardH]);

  return (
    <>
      {items.map((t) => (
        <group key={t.key}>
          {t.kind === "sea" ? (
            <KayModel file="hex_water" x={t.x} z={t.z} y={-0.45} rotY={t.rot} />
          ) : t.kind === "wall" ? (
            <KayModel file="hex_grass" x={t.x} z={t.z} y={-0.12} rotY={t.rot} tint="#78c868" />
          ) : (
            <KayModel file="hex_grass" x={t.x} z={t.z} y={-0.28} rotY={t.rot} tint="#6fd070" />
          )}
          {t.deco && <KayModel file={t.deco} x={t.x} z={t.z} y={-0.28} rotY={t.rot} />}
          {t.rocks.map((r, i) => (
            <KayModel key={i} file={r.file} x={t.x + r.dx} z={t.z + r.dz} y={-0.12} rotY={r.rot} scale={r.s} />
          ))}
        </group>
      ))}
    </>
  );
}

/** Vizinhos de uma casa na malha pointy-top com linhas ímpares deslocadas (igual a hexToPixel). */
function hexNeighbors(row: number, col: number) {
  const odd = row % 2 !== 0;
  const dirs = [
    { r: row, c: col + 1, dx: 1, dz: 0 }, // E
    { r: row, c: col - 1, dx: -1, dz: 0 }, // W
    { r: row - 1, c: odd ? col + 1 : col, dx: 0.5, dz: -0.866 }, // NE
    { r: row - 1, c: odd ? col : col - 1, dx: -0.5, dz: -0.866 }, // NW
    { r: row + 1, c: odd ? col + 1 : col, dx: 0.5, dz: 0.866 }, // SE
    { r: row + 1, c: odd ? col : col - 1, dx: -0.5, dz: 0.866 }, // SW
  ];
  return dirs;
}

/**
 * Muralha de pedra contínua em volta do tabuleiro: um pedaço de muro em cada aresta externa,
 * com um portão no meio de cada lado do exército. Só visual (não bloqueia nada).
 */
/** Verdadeiro quando a câmera está do outro lado do campo (jogador Vermelho). Vem do `Board3DCanvas`. */
const BoardFlipContext = createContext(false);

/** Verdadeiro dentro do `Board3DCanvas` (partida e posicionamento); falso no menu e nos fundos de tela. */
const PlayViewContext = createContext(false);

/** Mapa desenhado dentro do `Board3DCanvas` (cada ritmo tem o seu). Fora dele, o Campo Aberto. */
const BoardMapContext = createContext<MapDefinition>(ACTIVE_MAP);
export function useBoardMap(): MapDefinition {
  return useContext(BoardMapContext);
}

function KayWall({ rows, cols, boardW, boardH, skipBottom = false, skipTop = false }: { rows: number; cols: number; boardW: number; boardH: number; skipBottom?: boolean; skipTop?: boolean }) {
  const gateRow = Math.floor(rows / 2) - 1;
  const segs = useMemo(() => {
    const out: { key: string; x: number; z: number; rot: number; gate: boolean }[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const { x, y } = hexToPixel(row, col, HEX_SIZE);
        for (const d of hexNeighbors(row, col)) {
          if (d.r >= 0 && d.r < rows && d.c >= 0 && d.c < cols) continue; // aresta interna
          if (skipBottom && d.r >= rows) continue; // sem muro na borda de baixo (lado do jogador)
          if (skipTop && d.r < 0) continue; // câmera virada: o lado do jogador é o de cima
          const mx = x - boardW / 2 + d.dx * 0.866;
          const mz = y - boardH / 2 + d.dz * 0.866;
          const tx = -d.dz;
          const tz = d.dx;
          const gate = row === gateRow && ((col === 0 && d.dx === -1) || (col === cols - 1 && d.dx === 1));
          out.push({ key: `${row}:${col}:${d.dx}:${d.dz}`, x: mx, z: mz, rot: Math.atan2(-tz, tx), gate });
        }
      }
    }
    return out;
  }, [rows, cols, boardW, boardH, skipBottom, skipTop]);
  return (
    <>
      {segs.map((w) => (
        <KayModel key={w.key} file={w.gate ? "wall_straight_gate" : "wall_straight"} x={w.x} z={w.z} y={-0.05} rotY={w.rot} scale={0.68} sy={1.5} sz={0.85} tint="#cfc9bd" />
      ))}
    </>
  );
}

/** Quartéis: torres nos quatro cantos da muralha e um castelo de cada exército ao fundo. */
function KayBases({ rows, cols, boardW, boardH, towersOnly = false, flags = false, castlesAtEnds = false }: { rows: number; cols: number; boardW: number; boardH: number; towersOnly?: boolean; flags?: boolean; /** Na partida e no posicionamento: um castelo em cada ponta do tabuleiro, fora do campo. */ castlesAtEnds?: boolean }) {
  const at = (row: number, col: number) => {
    const { x, y } = hexToPixel(row, col, HEX_SIZE);
    return { x: x - boardW / 2, z: y - boardH / 2 };
  };
  const spots: { file: string; row: number; col: number; scale: number; rot: number; y: number }[] = [
    { file: "building_tower_A_blue", row: -1, col: -1, scale: 1.3, rot: 0, y: -0.12 },
    { file: "building_tower_A_blue", row: rows, col: -1, scale: 1.3, rot: 0, y: -0.12 },
    { file: "building_tower_A_red", row: -1, col: cols, scale: 1.3, rot: 0, y: -0.12 },
    { file: "building_tower_A_red", row: rows, col: cols, scale: 1.3, rot: 0, y: -0.12 },
    // Menu e telas de fundo: castelos ao fundo (borda de cima). Partida e posicionamento: um em cada ponta
    // do tabuleiro (fora do campo, na altura do portão), para não cobrir peças nem casas.
    ...(castlesAtEnds
      ? [
          { file: "building_castle_blue", row: Math.floor(rows / 2) - 1, col: -4, scale: 1.5, rot: Math.PI / 2, y: -0.28 },
          { file: "building_castle_red", row: Math.floor(rows / 2) - 1, col: cols + 3, scale: 1.5, rot: -Math.PI / 2, y: -0.28 },
        ]
      : [
          { file: "building_castle_blue", row: -2, col: 3, scale: 1.5, rot: 0, y: -0.28 },
          { file: "building_castle_red", row: -2, col: cols - 4, scale: 1.5, rot: 0, y: -0.28 },
        ]),
  ];
  return (
    <>
      {spots.filter((b) => !towersOnly || b.file.startsWith("building_tower")).map((b, i) => {
        const p = at(b.row, b.col);
        const isTower = b.file.startsWith("building_tower");
        return (
          <group key={i}>
            <KayModel file={b.file} x={p.x} z={p.z} y={b.y} rotY={b.rot} scale={b.scale} />
            {flags && isTower && <KayModel file={b.file.includes("_blue") ? "flag_blue" : "flag_red"} x={p.x} z={p.z} y={2.3} rotY={b.file.includes("_blue") ? Math.PI / 2 : -Math.PI / 2} scale={7} />}
          </group>
        );
      })}
    </>
  );
}

// Atmosfera: sol baixo (cerca de 22 graus), névoa na cor do horizonte.
const SUN_DIR = new THREE.Vector3(-0.62, 0.38, -0.5).normalize();
const FOG_COLOR = "#c3d6e8";

/** Nuvens altas que passam devagar. Só visual: não projetam sombra. */
function Clouds({ still = false }: { still?: boolean }) {
  const group = useRef<THREE.Group>(null);
  // A câmera olha de cima pra baixo e nunca vê o céu alto: as nuvens ficam baixas, sobre o mar
  // além da ilha, dentro do campo de visão.
  const items = useMemo(
    () => [
      { f: "cloud_big", x: -34, y: 4.2, z: -19, s: 1.8, v: 0.35 },
      { f: "cloud_small", x: -14, y: 5.4, z: -24, s: 1.6, v: 0.28 },
      { f: "cloud_big", x: 8, y: 4.6, z: -22, s: 2.0, v: 0.32 },
      { f: "cloud_small", x: 28, y: 5.0, z: -18, s: 1.5, v: 0.3 },
      { f: "cloud_big", x: -2, y: 5.8, z: -30, s: 2.2, v: 0.25 },
      { f: "cloud_small", x: -30, y: 4.0, z: 6, s: 1.5, v: 0.3 },
      { f: "cloud_big", x: 26, y: 4.4, z: 12, s: 1.7, v: 0.27 },
    ],
    [],
  );
  useFrame((_, dt) => {
    if (still) return; // celular em pé: cenário fixo, só as peças se movem
    group.current?.children.forEach((c, i) => {
      c.position.x += dt * items[i].v;
      if (c.position.x > 42) c.position.x = -42;
    });
  });
  return (
    <group ref={group}>
      {items.map((c, i) => (
        <group key={i} position={[c.x, c.y, c.z]}>
          <KayModel file={c.f} x={0} z={0} scale={c.s} tint="#ffffff" />
        </group>
      ))}
    </group>
  );
}

/** Mar: plano grande abaixo da ilha. Tudo que não é ilha é água, sem faixa de céu entre elas. */
function Sea() {
  return (
    <mesh position={[0, -0.66, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[600, 600]} />
      <meshStandardMaterial color="#2f88c6" roughness={0.35} metalness={0.05} />
    </mesh>
  );
}

/** Uma casa do tabuleiro em estilo KayKit: base + decoração por terreno. */
function KayTile({ row, col, terrain, boardW, boardH, onSelect }: { row: number; col: number; terrain: TerrainId; boardW: number; boardH: number; onSelect?: (row: number, col: number) => void }) {
  const { x, y } = hexToPixel(row, col, HEX_SIZE);
  const px = x - boardW / 2;
  const pz = y - boardH / 2;
  const base = terrain === "water" ? "hex_water" : terrain === "road" ? "hex_road_A" : "hex_grass";
  const seed = row * 31 + col * 17;
  const mountain = ["mountain_A_grass_trees", "mountain_B_grass_trees", "mountain_C_grass_trees"][seed % 3];
  const forest = ["trees_A_large", "trees_B_large", "trees_A_medium"][seed % 3];
  const rot = ((seed % 6) * Math.PI) / 3;
  return (
    <group
      onClick={(e) => {
        if (e.delta > 4) return; // arrasto de câmera não conta como clique
        e.stopPropagation();
        onSelect?.(row, col);
      }}
    >
      {/* A estrada só tem 2 orientações úteis aqui: segue o eixo X do tabuleiro (rotação fixa). */}
      <KayModel
        file={base}
        x={px}
        z={pz}
        rotY={terrain === "road" ? 0 : rot * (terrain === "water" ? 0 : 1)}
        tint={terrain === "water" ? undefined : terrain === "blue-base" ? "#8fd0ff" : terrain === "red-base" ? "#ffb0a0" : "#7fe07a"}
      />
      {terrain === "mountain" && <KayModel file={mountain} x={px} z={pz} rotY={rot} />}
      {terrain === "forest" && <KayModel file={forest} x={px} z={pz} rotY={rot} />}
      {terrain === "blue-base" && (seed % 3 === 0) && <KayModel file="flag_blue" x={px} z={pz} />}
      {terrain === "red-base" && (seed % 3 === 0) && <KayModel file="flag_red" x={px} z={pz} />}
    </group>
  );
}

/** PRNG determinístico (mesma seed → mesma árvore sempre) — evita que as
 * árvores "pulem" de posição a cada re-render. */
function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Marcador pulsante de casa de destino: verde para mover, vermelho quando há um inimigo (ataque). */
export function LegalMarker({ x, z, attack }: { x: number; z: number; attack: boolean }) {
  return (
    <group position={[x, 0, z]}>
      <PulseRing color={attack ? "#f87171" : "#4ade80"} inner={0.72} outer={0.9} speed={4} />
    </group>
  );
}

/** Explosão pequena de faíscas no lugar do combate (dura menos de 1 segundo). Só visual. */
export function CombatBurst({ x, z }: { x: number; z: number }) {
  const group = useRef<THREE.Group>(null);
  const flash = useRef<THREE.Mesh>(null);
  const t0 = useRef<number | null>(null);
  const parts = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2 + Math.random() * 0.4;
        const sp = 2 + Math.random() * 2.4;
        return { vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: 3 + Math.random() * 2.5, s: 0.07 + Math.random() * 0.1, c: ["#ffd34d", "#ff9a3c", "#ffffff"][i % 3] };
      }),
    [],
  );
  useFrame(({ clock }) => {
    if (t0.current === null) t0.current = clock.elapsedTime;
    const t = clock.elapsedTime - t0.current;
    const fade = Math.max(0, 1 - t / 0.9);
    group.current?.children.forEach((c, i) => {
      const p = parts[i];
      if (!p) return;
      c.position.set(p.vx * t, Math.max(0.1, 0.8 + p.vy * t - 6 * t * t), p.vz * t);
      c.scale.setScalar(Math.max(0.01, p.s * fade * 1.6));
    });
    if (flash.current) {
      flash.current.scale.setScalar(0.4 + t * 3.2);
      (flash.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 - t * 1.6);
    }
  });
  return (
    <group position={[x, 0, z]}>
      <mesh ref={flash} position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.6, 0.85, 24]} />
        <meshBasicMaterial color="#fff2b0" transparent opacity={0.9} depthWrite={false} />
      </mesh>
      <group ref={group}>
        {parts.map((p, i) => (
          <mesh key={i}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshBasicMaterial color={p.c} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function BoardWorld({ far = false, clouds = true, onSelectTile }: { far?: boolean; clouds?: boolean; onSelectTile?: (row: number, col: number) => void }) {
  const map = useContext(BoardMapContext);
  const flip = useContext(BoardFlipContext);
  const playView = useContext(PlayViewContext);
  const boardW = map.cols * (Math.sqrt(3) * HEX_SIZE) + (Math.sqrt(3) * HEX_SIZE) / 2;
  const boardH = (map.rows - 1) * (HEX_SIZE * 2 * 0.75) + HEX_SIZE * 2;
  const tiles = useMemo(() => {
    const list: { row: number; col: number; terrain: TerrainId }[] = [];
    for (let row = 0; row < map.rows; row++) {
      for (let col = 0; col < map.cols; col++) {
        list.push({ row, col, terrain: map.tiles[row]?.[col] ?? "grass" });
      }
    }
    return list;
  }, [map]);
  const clickTile = (row: number, col: number) => onSelectTile?.(row, col);
  return (
    <>
      {/* Tarde dourada: sol baixo e quente vindo do fundo-esquerda, céu e névoa no mesmo tom do horizonte */}
      <Sky distance={4500} sunPosition={SUN_DIR.clone().multiplyScalar(100)} turbidity={5} rayleigh={1.8} mieCoefficient={0.006} mieDirectionalG={0.85} />
      <fog attach="fog" args={[FOG_COLOR, far ? 75 : 34, far ? 150 : 70]} />
      <hemisphereLight args={["#cfe4ff", "#5b7a3c", 0.5]} />
      <directionalLight
        position={SUN_DIR.clone().multiplyScalar(26).toArray()}
        intensity={2.0}
        color="#ffd7a0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-camera-far={90}
        shadow-bias={-0.0004}
        shadow-radius={4}
      />
      <Environment preset="sunset" environmentIntensity={0.3} />
      {clouds && <Clouds still={far} />}
      <Sparkles count={70} scale={[34, 5, 22]} position={[0, 2.6, 0]} size={3.2} speed={0.25} opacity={0.55} color="#ffe9b8" />

      <Sea />
      <KayRing rows={map.rows} cols={map.cols} boardW={boardW} boardH={boardH} />
      <KayWall rows={map.rows} cols={map.cols} boardW={boardW} boardH={boardH} skipBottom={!flip} skipTop={flip} />
      <KayBases rows={map.rows} cols={map.cols} boardW={boardW} boardH={boardH} castlesAtEnds={playView} />
      {tiles.map((t) => (
        <KayTile key={`${t.row}-${t.col}`} row={t.row} col={t.col} terrain={t.terrain} boardW={boardW} boardH={boardH} onSelect={clickTile} />
      ))}
    </>
  );
}

/** Posição no mundo 3D do centro de uma casa do tabuleiro. */
export function cellWorld(row: number, col: number, map: MapDefinition = ACTIVE_MAP) {
  const boardW = map.cols * (Math.sqrt(3) * HEX_SIZE) + (Math.sqrt(3) * HEX_SIZE) / 2;
  const boardH = (map.rows - 1) * (HEX_SIZE * 2 * 0.75) + HEX_SIZE * 2;
  const { x, y } = hexToPixel(row, col, HEX_SIZE);
  return { x: x - boardW / 2, z: y - boardH / 2 };
}

/** Detecta celular (tela de toque), orientação e proporção da tela. Só no navegador. */
export function useDeviceMode() {
  const [mounted, setMounted] = useState(false);
  const [touch, setTouch] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const [aspect, setAspect] = useState(0.46);
  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => {
      setTouch(mq.matches);
      setPortrait(window.innerHeight > window.innerWidth);
      setAspect(window.innerWidth / window.innerHeight);
    };
    update();
    mq.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      mq.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  // O celular joga DEITADO e usa o mesmo layout do computador (câmera MOBA); o toque já arrasta e dá zoom.
  // Em pé, `RotateHint` pede para girar o aparelho.
  return { mounted, touch, portrait, aspect };
}

/**
 * Canvas 3D do tabuleiro, com a câmera estilo MOBA (ângulo fixo, desliza e dá zoom; no toque, um dedo
 * arrasta e dois dedos dão zoom). Os filhos entram dentro do Canvas.
 */
export function Board3DCanvas({ focusX = 0, flip = false, map = ACTIVE_MAP, children }: { focusX?: number; /** Mapa da partida (o do ritmo escolhido). */ map?: MapDefinition; /** Câmera do outro lado do campo, para quem joga de Vermelho ver o próprio exército à esquerda. */ flip?: boolean; children: ReactNode }) {
  const controls = useRef<OrbitControlsImpl | null>(null);
  return (
    <Canvas shadows camera={{ position: [focusX, 14.9, flip ? -18.8 : 18.8], fov: 45, near: 1, far: 1500 }} gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.9 }}>
      <BoardMapContext.Provider value={map}>
        <BoardFlipContext.Provider value={flip}>
          <PlayViewContext.Provider value>{children}</PlayViewContext.Provider>
        </BoardFlipContext.Provider>
      </BoardMapContext.Provider>
      <OrbitControls
        ref={controls}
        makeDefault
        target={[focusX, 0, 0]}
        enabled
        enableRotate={false}
        enablePan
        screenSpacePanning={false}
        mouseButtons={{ LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
        touches={{ ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN }}
        enableDamping
        dampingFactor={0.1}
        panSpeed={1.1}
        minPolarAngle={0.9}
        maxPolarAngle={0.9}
        minAzimuthAngle={flip ? Math.PI : 0}
        maxAzimuthAngle={flip ? Math.PI : 0}
        minDistance={9}
        maxDistance={24}
        onChange={() => clampCameraToBoard(controls.current, map)}
      />
    </Canvas>
  );
}

/**
 * Mantém a visão do jogador dentro do tabuleiro: a borda da tela (descontando os painéis do
 * HUD) nunca passa do fim do campo, de nenhum dos lados. Se o zoom deixar a visão maior que o
 * campo, ele fica centralizado. Só mexe na câmera (nenhuma regra do jogo).
 */
const HUD_SIDE = 0.02; // sem painéis laterais: só uma folga pequena nas bordas
const HUD_TOP = 0.16; // fração da altura coberta pela barra superior

export function clampCameraToBoard(ctrl: OrbitControlsImpl | null, map: MapDefinition = ACTIVE_MAP) {
  if (!ctrl) return;
  const cam = ctrl.object as THREE.PerspectiveCamera;
  const w = Math.sqrt(3) * HEX_SIZE;
  const hx = (map.cols * w + w / 2) / 2;
  const hz = ((map.rows - 1) * (HEX_SIZE * 2 * 0.75) + HEX_SIZE * 2) / 2;
  cam.updateMatrixWorld();
  const hit = (nx: number, ny: number) => {
    const d = new THREE.Vector3(nx, ny, 0.5).unproject(cam).sub(cam.position).normalize();
    return cam.position.clone().addScaledVector(d, -cam.position.y / d.y);
  };
  const left = hit(-1 + 2 * HUD_SIDE, 0.35).x;
  const right = hit(1 - 2 * HUD_SIDE, 0.35).x;
  const far = hit(0, 1 - 2 * HUD_TOP).z;
  const near = hit(0, -1).z;
  const axis = (lo: number, hi: number, minB: number, maxB: number) => {
    if (hi - lo >= maxB - minB) return (minB + maxB) / 2 - (lo + hi) / 2; // visão maior que o campo: centraliza
    if (lo < minB) return minB - lo;
    if (hi > maxB) return maxB - hi;
    return 0;
  };
  // Com a câmera virada (Vermelho) esquerda/direita e longe/perto trocam de sinal: usa sempre menor e maior.
  const dx = axis(Math.min(left, right), Math.max(left, right), -hx, hx);
  const dz = axis(Math.min(far, near), Math.max(far, near), -hz, hz);
  if (Math.abs(dx) > 1e-4 || Math.abs(dz) > 1e-4) {
    cam.position.x += dx;
    cam.position.z += dz;
    ctrl.target.x += dx;
    ctrl.target.z += dz;
  }
  ctrl.target.y = 0;
}
