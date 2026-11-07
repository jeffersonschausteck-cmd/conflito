import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, Sky, Sparkles } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { ACTIVE_MAP } from "@/maps";
import { TERRAINS } from "@/maps/terrains";
import type { TerrainId } from "@/maps/types";
import { hexToPixel, hexCorners } from "@/services/hexGeometry";
import type { PieceType } from "@/types/piece";
import * as THREE from "three";
import { KAY_BASE, KAY_SCALE, KayModel, KayPiece, PulseRing, SpinGroup } from "@/components/kay/KayCharacters";

/**
 * Mundo 3D do tabuleiro (cenário, casas, câmeras), compartilhado pela partida (`/lab3d`) e pela
 * tela de posicionamento (`/deployment`). Só visual.
 */

const TERRAIN_HEIGHT: Record<TerrainId, number> = {
  grass: 0.25,
  road: 0.2,
  forest: 0.9,
  mountain: 1.8,
  water: -0.35,
  "blue-base": 0.3,
  "red-base": 0.3,
};

export const HEX_SIZE = 1;

function hexShape(size: number): THREE.Shape {
  const corners = hexCorners(size);
  const shape = new THREE.Shape();
  corners.forEach((c, i) => {
    if (i === 0) shape.moveTo(c.x, c.y);
    else shape.lineTo(c.x, c.y);
  });
  shape.closePath();
  return shape;
}

/** Estrela de 5 pontas (contorno) — usada como insígnia extrudada no peito do Comandante. */
function starShape(outerR: number, innerR: number): THREE.Shape {
  const shape = new THREE.Shape();
  const points = 5;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(px, py);
    else shape.lineTo(px, py);
  }
  shape.closePath();
  return shape;
}

/** Um hexágono extrudado (prisma) — X/Z no plano do tabuleiro, Y é altura. */
function HexTile({
  row,
  col,
  terrain,
  boardW,
  boardH,
}: {
  row: number;
  col: number;
  terrain: TerrainId;
  boardW: number;
  boardH: number;
}) {
  const height = TERRAIN_HEIGHT[terrain] ?? 0.25;
  const color = TERRAINS[terrain]?.corBase ?? "#3f6b3f";
  const { x, y } = hexToPixel(row, col, HEX_SIZE);

  const shape = useMemo(() => hexShape(HEX_SIZE * 0.97), []);
  const extrudeSettings = useMemo(
    () => ({ depth: Math.max(0.05, height), bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 }),
    [height],
  );

  return (
    <mesh
      position={[x - boardW / 2, 0, y - boardH / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
      castShadow
      receiveShadow
    >
      <extrudeGeometry args={[shape, extrudeSettings]} />
      <meshStandardMaterial
        color={color}
        roughness={terrain === "water" ? 0.15 : terrain === "mountain" ? 1 : 0.85}
        metalness={terrain === "water" ? 0.3 : 0}
        transparent={terrain === "water"}
        opacity={terrain === "water" ? 0.85 : 1}
        flatShading={terrain === "mountain"}
      />
    </mesh>
  );
}

/**
 * Terreno que continua em volta do campo (só visual, fora do mapa jogável):
 * 2 anéis de terra um degrau abaixo do tabuleiro, com árvores e montanhas,
 * e depois mar. A névoa esconde o limite e o campo parece apoiado no mundo.
 */
const RING = 3;
const ROCKS = ["rock_single_A", "rock_single_B", "rock_single_C", "rock_single_D", "rock_single_E"];
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
function KayWall({ rows, cols, boardW, boardH, skipBottom = false }: { rows: number; cols: number; boardW: number; boardH: number; skipBottom?: boolean }) {
  const gateRow = Math.floor(rows / 2) - 1;
  const segs = useMemo(() => {
    const out: { key: string; x: number; z: number; rot: number; gate: boolean }[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const { x, y } = hexToPixel(row, col, HEX_SIZE);
        for (const d of hexNeighbors(row, col)) {
          if (d.r >= 0 && d.r < rows && d.c >= 0 && d.c < cols) continue; // aresta interna
          if (skipBottom && d.r >= rows) continue; // sem muro na borda de baixo (lado do jogador)
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
  }, [rows, cols, boardW, boardH, skipBottom]);
  return (
    <>
      {segs.map((w) => (
        <KayModel key={w.key} file={w.gate ? "wall_straight_gate" : "wall_straight"} x={w.x} z={w.z} y={-0.05} rotY={w.rot} scale={0.68} sy={1.5} sz={0.85} tint="#cfc9bd" />
      ))}
    </>
  );
}

/** Quartéis: torres nos quatro cantos da muralha e um castelo de cada exército ao fundo. */
function KayBases({ rows, cols, boardW, boardH, towersOnly = false, flags = false }: { rows: number; cols: number; boardW: number; boardH: number; towersOnly?: boolean; flags?: boolean }) {
  const at = (row: number, col: number) => {
    const { x, y } = hexToPixel(row, col, HEX_SIZE);
    return { x: x - boardW / 2, z: y - boardH / 2 };
  };
  const spots: { file: string; row: number; col: number; scale: number; rot: number; y: number }[] = [
    { file: "building_tower_A_blue", row: -1, col: -1, scale: 1.3, rot: 0, y: -0.12 },
    { file: "building_tower_A_blue", row: rows, col: -1, scale: 1.3, rot: 0, y: -0.12 },
    { file: "building_tower_A_red", row: -1, col: cols, scale: 1.3, rot: 0, y: -0.12 },
    { file: "building_tower_A_red", row: rows, col: cols, scale: 1.3, rot: 0, y: -0.12 },
    { file: "building_castle_blue", row: -2, col: 3, scale: 1.5, rot: 0, y: -0.28 },
    { file: "building_castle_red", row: -2, col: cols - 4, scale: 1.5, rot: 0, y: -0.28 },
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

/** Uma árvore low-poly: tronco (cilindro) + copa (cone), sem modelo externo. */
function Tree({ x, z, scale, hue }: { x: number; z: number; scale: number; hue: number }) {
  const trunkH = 0.28 * scale;
  const crownH = 0.55 * scale;
  return (
    <group position={[x, TERRAIN_HEIGHT.forest, z]} scale={scale}>
      <mesh position={[0, trunkH / 2, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.06, trunkH, 6]} />
        <meshStandardMaterial color="#4a3524" roughness={0.9} />
      </mesh>
      <mesh position={[0, trunkH + crownH / 2, 0]} castShadow>
        <coneGeometry args={[0.22, crownH, 7]} />
        <meshStandardMaterial color={`hsl(${100 + hue}, 35%, ${20 + hue}%)`} roughness={0.8} />
      </mesh>
    </group>
  );
}

/** Um punhado de árvores espalhadas dentro do hexágono de Floresta — a
 * seed vem da própria célula (row/col), então a "floresta" é sempre a
 * mesma entre re-renders, mas varia de um hexágono pro outro. */
function ForestClump({ row, col, boardW, boardH }: { row: number; col: number; boardW: number; boardH: number }) {
  const { x, y } = hexToPixel(row, col, HEX_SIZE);
  const cx = x - boardW / 2;
  const cz = y - boardH / 2;

  const trees = useMemo(() => {
    const rand = seededRandom(row * 1000 + col + 1);
    const count = 4 + Math.floor(rand() * 3); // 4-6 árvores por hexágono
    return Array.from({ length: count }, () => {
      const angle = rand() * Math.PI * 2;
      const radius = rand() * HEX_SIZE * 0.55;
      return {
        x: cx + Math.cos(angle) * radius,
        z: cz + Math.sin(angle) * radius,
        scale: 0.7 + rand() * 0.6,
        hue: Math.floor(rand() * 20),
      };
    });
  }, [row, col, cx, cz]);

  return (
    <>
      {trees.map((t, i) => (
        <Tree key={i} x={t.x} z={t.z} scale={t.scale} hue={t.hue} />
      ))}
    </>
  );
}

/** Uma pedra irregular: icosaedro de baixa resolução com vértices
 * perturbados aleatoriamente (`flatShading` acentua as facetas), pra
 * parecer rocha bruta em vez de uma esfera lisa — sem modelo externo. */
function Rock({ x, z, y, scale, rotation, seed }: { x: number; z: number; y: number; scale: number; rotation: number; seed: number }) {
  const geometry = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1, 0);
    const rand = seededRandom(seed);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const jitter = 0.82 + rand() * 0.36;
      pos.setXYZ(i, pos.getX(i) * jitter, pos.getY(i) * jitter, pos.getZ(i) * jitter);
    }
    geo.computeVertexNormals();
    return geo;
  }, [seed]);

  return (
    <mesh position={[x, y, z]} scale={scale} rotation={[rotation * 0.3, rotation, rotation * 0.6]} geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color="#7a746a" roughness={1} flatShading />
    </mesh>
  );
}

/** Afloramento rochoso no topo do hexágono de Montanha — algumas pedras
 * grandes + cascalho menor ao redor, seed fixa pela própria célula. */
function RockOutcrop({ row, col, boardW, boardH }: { row: number; col: number; boardW: number; boardH: number }) {
  const { x, y } = hexToPixel(row, col, HEX_SIZE);
  const cx = x - boardW / 2;
  const cz = y - boardH / 2;
  const top = TERRAIN_HEIGHT.mountain;

  const rocks = useMemo(() => {
    const rand = seededRandom(row * 2000 + col + 7);
    const bigCount = 2 + Math.floor(rand() * 2); // 2-3 pedras grandes
    const small = Array.from({ length: 5 + Math.floor(rand() * 4) }, () => { // 5-8 cascalhos
      const angle = rand() * Math.PI * 2;
      const radius = rand() * HEX_SIZE * 0.6;
      return {
        x: cx + Math.cos(angle) * radius,
        z: cz + Math.sin(angle) * radius,
        y: top + 0.05 + rand() * 0.05,
        scale: 0.08 + rand() * 0.08,
        rotation: rand() * Math.PI,
        seed: Math.floor(rand() * 1e6),
      };
    });
    const big = Array.from({ length: bigCount }, () => {
      const angle = rand() * Math.PI * 2;
      const radius = rand() * HEX_SIZE * 0.4;
      return {
        x: cx + Math.cos(angle) * radius,
        z: cz + Math.sin(angle) * radius,
        y: top + 0.1 + rand() * 0.1,
        scale: 0.25 + rand() * 0.2,
        rotation: rand() * Math.PI,
        seed: Math.floor(rand() * 1e6),
      };
    });
    return [...big, ...small];
  }, [row, col, cx, cz, top]);

  return (
    <>
      {rocks.map((r, i) => (
        <Rock key={i} x={r.x} z={r.z} y={r.y} scale={r.scale} rotation={r.rotation} seed={r.seed} />
      ))}
    </>
  );
}

/**
 * Comandante (General) — figura humanoide completa, só com primitivas
 * geométricas (nenhum modelo externo): pernas, físico largo no torso,
 * braços, cabeça com bigode, boné militar com aba e faixa dourada, e
 * uma estrela de 5 pontas extrudada no peito. Gira bem devagar no
 * próprio eixo pra se destacar como a peça de maior patente.
 */
function CommanderPiece({ x, z, color, facing }: { x: number; z: number; color: string; facing: number }) {
  const gold = "#e8c464";
  const skin = "#c9986b";
  const dark = "#241a12"; // bigode/botas/calça
  const starGeo = useMemo(() => {
    const shape = starShape(0.055, 0.023);
    return new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false });
  }, []);

  return (
    <group position={[x, 0, z]} rotation={[0, facing, 0]}>
      {/* Pedestal */}
      <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.28, 0.32, 0.12, 6]} />
        <meshStandardMaterial color="#1c2230" roughness={0.6} metalness={0.2} />
      </mesh>
      {/* Anel dourado da base */}
      <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.24, 0.02, 8, 24]} />
        <meshStandardMaterial color={gold} metalness={0.7} roughness={0.3} />
      </mesh>

      <SpinGroup speed={0.15}>
        {/* Botas + fivela dourada */}
        <mesh position={[-0.08, 0.16, 0.01]} castShadow>
          <boxGeometry args={[0.09, 0.07, 0.15]} />
          <meshStandardMaterial color={dark} roughness={0.7} />
        </mesh>
        <mesh position={[0.08, 0.16, 0.01]} castShadow>
          <boxGeometry args={[0.09, 0.07, 0.15]} />
          <meshStandardMaterial color={dark} roughness={0.7} />
        </mesh>
        <mesh position={[-0.08, 0.17, 0.086]}>
          <boxGeometry args={[0.03, 0.02, 0.006]} />
          <meshStandardMaterial color={gold} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0.08, 0.17, 0.086]}>
          <boxGeometry args={[0.03, 0.02, 0.006]} />
          <meshStandardMaterial color={gold} metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Pernas */}
        <mesh position={[-0.08, 0.3, 0]} castShadow>
          <cylinderGeometry args={[0.055, 0.06, 0.22, 8]} />
          <meshStandardMaterial color={dark} roughness={0.8} />
        </mesh>
        <mesh position={[0.08, 0.3, 0]} castShadow>
          <cylinderGeometry args={[0.055, 0.06, 0.22, 8]} />
          <meshStandardMaterial color={dark} roughness={0.8} />
        </mesh>

        {/* Cinto dourado + fivela */}
        <mesh position={[0, 0.43, 0]}>
          <torusGeometry args={[0.15, 0.02, 8, 20]} />
          <meshStandardMaterial color={gold} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.43, 0.148]}>
          <boxGeometry args={[0.05, 0.04, 0.012]} />
          <meshStandardMaterial color={gold} metalness={0.75} roughness={0.25} />
        </mesh>

        {/* Torso — físico largo (cápsula alargada nos ombros) */}
        <mesh position={[0, 0.6, 0]} scale={[1.2, 1, 0.9]} castShadow>
          <capsuleGeometry args={[0.16, 0.16, 4, 10]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.15} roughness={0.5} />
        </mesh>

        {/* Gola alta com friso dourado */}
        <mesh position={[0, 0.685, 0]}>
          <torusGeometry args={[0.1, 0.014, 8, 20]} />
          <meshStandardMaterial color={gold} metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Faixa diagonal (dracma de general) — atravessa o peito de ombro a cintura */}
        <mesh position={[-0.06, 0.6, 0.145]} rotation={[0, 0, 0.55]} castShadow>
          <boxGeometry args={[0.42, 0.045, 0.008]} />
          <meshStandardMaterial color="#7a1f2b" roughness={0.6} />
        </mesh>
        <mesh position={[0.13, 0.44, 0.145]}>
          <boxGeometry args={[0.05, 0.05, 0.012]} />
          <meshStandardMaterial color={gold} metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Estrela dourada no peito */}
        <mesh geometry={starGeo} position={[0, 0.62, 0.155]} rotation={[0, 0, 0]}>
          <meshStandardMaterial color={gold} emissive={gold} emissiveIntensity={0.5} metalness={0.6} roughness={0.25} />
        </mesh>

        {/* Fita de medalhas abaixo da estrela */}
        {[-1, 0, 1].map((i) => (
          <mesh key={i} position={[i * 0.026, 0.545, 0.157]}>
            <boxGeometry args={[0.02, 0.014, 0.006]} />
            <meshStandardMaterial color={i === 0 ? gold : "#7a1f2b"} roughness={0.5} metalness={0.3} />
          </mesh>
        ))}

        {/* Ombreiras douradas (armadura) + franja pendurada */}
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.21, 0.72, 0]}>
            <mesh castShadow>
              <icosahedronGeometry args={[0.09, 0]} />
              <meshStandardMaterial color={gold} metalness={0.6} roughness={0.3} flatShading />
            </mesh>
            {[-0.05, -0.017, 0.017, 0.05].map((fx) => (
              <mesh key={fx} position={[fx, -0.09, 0.02]}>
                <cylinderGeometry args={[0.006, 0.006, 0.09, 5]} />
                <meshStandardMaterial color={gold} metalness={0.6} roughness={0.35} />
              </mesh>
            ))}
          </group>
        ))}

        {/* Listras de patente na manga direita */}
        {[0.5, 0.56, 0.62].map((py) => (
          <mesh key={py} position={[0.23, py, 0]} rotation={[0, 0, -0.18]}>
            <torusGeometry args={[0.052, 0.008, 6, 14]} />
            <meshStandardMaterial color={gold} metalness={0.7} roughness={0.3} />
          </mesh>
        ))}

        {/* Braços */}
        <mesh position={[-0.23, 0.55, 0]} rotation={[0, 0, 0.18]} castShadow>
          <cylinderGeometry args={[0.045, 0.05, 0.3, 8]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
        <mesh position={[0.23, 0.55, 0]} rotation={[0, 0, -0.18]} castShadow>
          <cylinderGeometry args={[0.045, 0.05, 0.3, 8]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
        {/* Mãos */}
        <mesh position={[-0.28, 0.4, 0]}>
          <sphereGeometry args={[0.05, 10, 10]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>
        <mesh position={[0.28, 0.4, 0]}>
          <sphereGeometry args={[0.05, 10, 10]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>

        {/* Sabre — apoiado na mão esquerda, ponta pra baixo */}
        <group position={[-0.28, 0.4, 0]} rotation={[0, 0, -0.1]}>
          <mesh position={[0, -0.19, 0]} castShadow>
            <boxGeometry args={[0.018, 0.34, 0.006]} />
            <meshStandardMaterial color="#d8dde3" metalness={0.85} roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.01, 0]}>
            <boxGeometry args={[0.09, 0.014, 0.014]} />
            <meshStandardMaterial color={gold} metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.07, 8]} />
            <meshStandardMaterial color={dark} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.065, 0]}>
            <sphereGeometry args={[0.016, 8, 8]} />
            <meshStandardMaterial color={gold} metalness={0.7} roughness={0.3} />
          </mesh>
        </group>

        {/* Capa — atrás dos ombros, levemente aberta */}
        <mesh position={[0, 0.55, -0.13]} rotation={[0.12, 0, 0]} castShadow>
          <boxGeometry args={[0.34, 0.42, 0.012]} />
          <meshStandardMaterial color="#5c1620" roughness={0.75} side={THREE.DoubleSide} />
        </mesh>

        {/* Pescoço */}
        <mesh position={[0, 0.76, 0]}>
          <cylinderGeometry args={[0.045, 0.05, 0.05, 8]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>

        {/* Cabeça */}
        <mesh position={[0, 0.86, 0]} castShadow>
          <sphereGeometry args={[0.11, 14, 14]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>

        {/* Olhos + sobrancelhas */}
        <mesh position={[-0.04, 0.865, 0.098]}>
          <sphereGeometry args={[0.012, 8, 8]} />
          <meshStandardMaterial color="#181210" roughness={0.4} />
        </mesh>
        <mesh position={[0.04, 0.865, 0.098]}>
          <sphereGeometry args={[0.012, 8, 8]} />
          <meshStandardMaterial color="#181210" roughness={0.4} />
        </mesh>
        <mesh position={[-0.04, 0.888, 0.095]} rotation={[0, 0, 0.12]}>
          <boxGeometry args={[0.045, 0.012, 0.012]} />
          <meshStandardMaterial color={dark} roughness={0.9} />
        </mesh>
        <mesh position={[0.04, 0.888, 0.095]} rotation={[0, 0, -0.12]}>
          <boxGeometry args={[0.045, 0.012, 0.012]} />
          <meshStandardMaterial color={dark} roughness={0.9} />
        </mesh>

        {/* Bigode — duas pontas curvadas pra fora e pra cima */}
        <mesh position={[-0.05, 0.825, 0.1]} rotation={[0, 0, 0.5]} castShadow>
          <boxGeometry args={[0.09, 0.02, 0.025]} />
          <meshStandardMaterial color={dark} roughness={0.9} />
        </mesh>
        <mesh position={[0.05, 0.825, 0.1]} rotation={[0, 0, -0.5]} castShadow>
          <boxGeometry args={[0.09, 0.02, 0.025]} />
          <meshStandardMaterial color={dark} roughness={0.9} />
        </mesh>
        <mesh position={[-0.1, 0.815, 0.08]} rotation={[0, 0, 0.9]} castShadow>
          <boxGeometry args={[0.04, 0.014, 0.02]} />
          <meshStandardMaterial color={dark} roughness={0.9} />
        </mesh>
        <mesh position={[0.1, 0.815, 0.08]} rotation={[0, 0, -0.9]} castShadow>
          <boxGeometry args={[0.04, 0.014, 0.02]} />
          <meshStandardMaterial color={dark} roughness={0.9} />
        </mesh>

        {/* Boné militar — copa + aba + faixa dourada */}
        <mesh position={[0, 0.955, -0.01]} castShadow>
          <cylinderGeometry args={[0.1, 0.115, 0.09, 10]} />
          <meshStandardMaterial color={color} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.915, 0]}>
          <torusGeometry args={[0.115, 0.015, 8, 20]} />
          <meshStandardMaterial color={gold} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.89, 0.09]} rotation={[0.35, 0, 0]} castShadow>
          <boxGeometry args={[0.16, 0.015, 0.08]} />
          <meshStandardMaterial color={dark} roughness={0.6} />
        </mesh>
        {/* Estrela pequena no boné */}
        <mesh position={[0, 0.965, 0.095]} scale={0.5}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color={gold} emissive={gold} emissiveIntensity={0.8} metalness={0.6} roughness={0.25} />
        </mesh>
      </SpinGroup>
    </group>
  );
}

/**
 * Explorador (Scout) — a peça mais rápida/leve. Corpo baixo em cunha
 * (tetraedro achatado apontando pra frente) + duas aletas laterais
 * finas, sugerindo velocidade em vez de força bruta.
 */
function ScoutPiece({ x, z, color, facing }: { x: number; z: number; color: string; facing: number }) {
  return (
    <group position={[x, 0.16, z]} rotation={[0, facing, 0]}>
      {/* Corpo — cunha baixa apontando pra frente */}
      <mesh castShadow rotation={[0, 0, Math.PI / 2]} scale={[0.34, 0.6, 0.22]}>
        <coneGeometry args={[0.5, 1, 4]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} roughness={0.3} flatShading />
      </mesh>
      {/* Aletas laterais */}
      <mesh castShadow position={[0, -0.02, 0.16]} rotation={[0, 0.5, 0]}>
        <boxGeometry args={[0.24, 0.03, 0.1]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh castShadow position={[0, -0.02, -0.16]} rotation={[0, -0.5, 0]}>
        <boxGeometry args={[0.24, 0.03, 0.1]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
    </group>
  );
}

/** Peça-placeholder: uma forma geométrica simples por facção — usada por
 * todos os tipos que ainda não têm modelo próprio (Comandante e
 * Explorador já têm o deles, ver `CommanderPiece`/`ScoutPiece`). */
function PiecePlaceholder({
  row,
  col,
  owner,
  pieceType,
  boardW,
  boardH,
}: {
  row: number;
  col: number;
  owner: "blue" | "red";
  pieceType: PieceType;
  boardW: number;
  boardH: number;
}) {
  const { x, y } = hexToPixel(row, col, HEX_SIZE);
  const px = x - boardW / 2;
  const pz = y - boardH / 2;
  const color = owner === "blue" ? "#22d3ee" : "#fb7185";
  const facing = owner === "blue" ? 0 : Math.PI;

  // Visual KayKit. Os modelos antigos (CommanderPiece/ScoutPiece) ficam no
  // arquivo como referência, mas não são mais usados.
  void facing;
  return <KayPiece x={px} z={pz} owner={owner} pieceType={pieceType} color={color} />;
}

// Qual boneco KayKit representa cada tipo (só aparência, sem efeito nas regras).
/** Cores do tabuleiro plano (celular): leitura rápida do terreno, sem relevo nem cenário. */
const FLAT_COLORS: Record<string, { base: string; alt?: string; mark?: string }> = {
  grass: { base: "#5aa64a", alt: "#54a044" },
  road: { base: "#c9a96a" },
  forest: { base: "#3e8a3a", mark: "#27652a" },
  mountain: { base: "#8b8f98", mark: "#6c707a" },
  water: { base: "#3b8fd0", mark: "#2f7fc0" },
  "blue-base": { base: "#4f86dc" },
  "red-base": { base: "#d96d60" },
};

/** Uma casa plana do tabuleiro do celular: hexágono chapado, com marca interna em floresta, montanha e água. */
function FlatTile({ row, col, terrain, boardW, boardH, onSelect }: { row: number; col: number; terrain: TerrainId; boardW: number; boardH: number; onSelect?: (row: number, col: number) => void }) {
  const { x, y } = hexToPixel(row, col, HEX_SIZE);
  const geo = useMemo(() => new THREE.ShapeGeometry(hexShape(HEX_SIZE * 0.96)), []);
  const inner = useMemo(() => new THREE.ShapeGeometry(hexShape(HEX_SIZE * 0.6)), []);
  const c = FLAT_COLORS[terrain] ?? FLAT_COLORS.grass;
  const color = c.alt && (row + col) % 2 ? c.alt : c.base;
  return (
    <group
      position={[x - boardW / 2, 0, y - boardH / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={(e) => {
        if (e.delta > 4) return;
        e.stopPropagation();
        onSelect?.(row, col);
      }}
    >
      <mesh geometry={geo} receiveShadow>
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
      {c.mark && (
        <mesh geometry={inner} position={[0, 0, 0.01]}>
          <meshStandardMaterial color={c.mark} roughness={1} />
        </mesh>
      )}
    </group>
  );
}

/** Volume sobre as casas planas do celular: árvores na floresta e montanha nas casas de montanha. */
function FlatDeco({ row, col, terrain, boardW, boardH }: { row: number; col: number; terrain: TerrainId; boardW: number; boardH: number }) {
  const { x, y } = hexToPixel(row, col, HEX_SIZE);
  const px = x - boardW / 2;
  const pz = y - boardH / 2;
  const seed = row * 31 + col * 17;
  const rot = ((seed % 6) * Math.PI) / 3;
  if (terrain === "mountain") {
    const f = ["mountain_A_grass_trees", "mountain_B_grass_trees", "mountain_C_grass_trees"][seed % 3];
    return <KayModel file={f} x={px} z={pz} rotY={rot} />;
  }
  if (terrain === "forest") {
    const f = ["trees_A_large", "trees_B_large", "trees_A_medium"][seed % 3];
    return <KayModel file={f} x={px} z={pz} rotY={rot} />;
  }
  return null;
}

/** Detalhes espalhados nos cantos das casas de grama do meio do campo (arbustos, capim e pedras). Só visual. */
const DECOR = [
  { f: "Bush_2_B_Color1", s: 0.55, lift: 0 },
  { f: "Bush_3_A_Color1", s: 0.6, lift: 0 },
  { f: "Bush_1_A_Color1", s: 2.0, lift: 0 },
  { f: "Grass_2_B_Color1", s: 0.7, lift: 0 },
  { f: "Grass_1_A_Color1", s: 1.4, lift: 0 },
  { f: "Rock_1_A_Color1", s: 0.85, lift: 0 },
  { f: "Rock_2_B_Color1", s: 0.7, lift: 0 },
];
function PhoneDecor({ tiles, boardW, boardH }: { tiles: { row: number; col: number; terrain: TerrainId }[]; boardW: number; boardH: number }) {
  const items = useMemo(() => {
    const out: { key: string; x: number; z: number; f: string; s: number; rot: number }[] = [];
    for (const t of tiles) {
      // Só grama do meio do campo (fora das zonas dos exércitos) e só em alguns cantos da casa.
      if (t.terrain !== "grass" || t.col < 4 || t.col > 13) continue;
      const rand = seededRandom(t.row * 977 + t.col * 131 + 5);
      if (rand() > 0.55) continue;
      const { x, y } = hexToPixel(t.row, t.col, HEX_SIZE);
      const corner = Math.floor(rand() * 6);
      const ang = Math.PI / 6 + (corner * Math.PI) / 3; // vértices do hexágono
      const d = DECOR[Math.floor(rand() * DECOR.length)];
      out.push({ key: `${t.row}:${t.col}`, x: x - boardW / 2 + Math.cos(ang) * 0.9, z: y - boardH / 2 + Math.sin(ang) * 0.9, f: d.f, s: d.s * (0.8 + rand() * 0.4), rot: rand() * Math.PI * 2 });
    }
    return out;
  }, [tiles, boardW, boardH]);
  return (
    <>
      {items.map((d) => (
        <KayModel key={d.key} file={d.f} x={d.x} z={d.z} rotY={d.rot} scale={d.s} />
      ))}
    </>
  );
}

/** Fundo do celular: névoa escura e montanhas ao longe, abaixo da arena (a arena parece flutuar sobre elas). */
function PhoneBackdrop({ boardW, boardH }: { boardW: number; boardH: number }) {
  const items = useMemo(() => {
    const list: { f: string; x: number; z: number; y: number; s: number; rot: number }[] = [];
    const rand = seededRandom(4242);
    const files = ["mountain_A", "mountain_B", "mountain_C", "hills_A"];
    for (let i = 0; i < 26; i++) {
      // anel em volta do tabuleiro, mais largo que ele
      const ang = (i / 26) * Math.PI * 2 + rand() * 0.2;
      const rx = boardW / 2 + 9 + rand() * 10;
      const rz = boardH / 2 + 7 + rand() * 9;
      list.push({ f: files[Math.floor(rand() * files.length)], x: Math.cos(ang) * rx, z: Math.sin(ang) * rz, y: -9 - rand() * 3, s: 6 + rand() * 6, rot: rand() * Math.PI * 2 });
    }
    return list;
  }, [boardW, boardH]);
  return (
    <>
      <mesh position={[0, -16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color="#10162b" roughness={1} />
      </mesh>
      {items.map((m, i) => (
        <KayModel key={i} file={m.f} x={m.x} z={m.z} y={m.y} rotY={m.rot} scale={m.s} tint="#56608a" />
      ))}
    </>
  );
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

/** Base escura sob o tabuleiro plano: as frestas entre as casas viram a grade. */
function FlatBoardBase({ boardW, boardH }: { boardW: number; boardH: number }) {
  return (
    <mesh position={[0, -0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[boardW + 1.4, boardH + 1.4]} />
      <meshStandardMaterial color="#12203a" roughness={1} />
    </mesh>
  );
}

export function BoardWorld({ flat = false, far = false, clouds = true, onSelectTile }: { flat?: boolean; far?: boolean; clouds?: boolean; onSelectTile?: (row: number, col: number) => void }) {
  const map = ACTIVE_MAP;
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
      {flat && (
        <>
          <color attach="background" args={["#141b33"]} />
          <fog attach="fog" args={["#1b2547", 260, 620]} />
          <hemisphereLight args={["#e8eeff", "#8a9bc0", 1.1]} />
          <directionalLight
            position={[5, 22, 9]}
            intensity={1.7}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-20}
            shadow-camera-right={20}
            shadow-camera-top={20}
            shadow-camera-bottom={-20}
            shadow-camera-far={60}
            shadow-bias={-0.0005}
          />
          <PhoneBackdrop boardW={boardW} boardH={boardH} />
          <Clouds still />
          {/* Moldura com volume em volta do tabuleiro: muralha de pedra e torres com bandeira nos cantos */}
          <KayWall rows={map.rows} cols={map.cols} boardW={boardW} boardH={boardH} />
          <KayBases rows={map.rows} cols={map.cols} boardW={boardW} boardH={boardH} towersOnly flags />
          <PhoneDecor tiles={tiles} boardW={boardW} boardH={boardH} />
        </>
      )}
      {!flat && (
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
        </>
      )}

      {!flat && (
        <>
      <Sea />
      <KayRing rows={map.rows} cols={map.cols} boardW={boardW} boardH={boardH} />
      <KayWall rows={map.rows} cols={map.cols} boardW={boardW} boardH={boardH} skipBottom />
      <KayBases rows={map.rows} cols={map.cols} boardW={boardW} boardH={boardH} />

        </>
      )}
      {tiles.map((t) => (
        <KayTile key={`${t.row}-${t.col}`} row={t.row} col={t.col} terrain={t.terrain} boardW={boardW} boardH={boardH} onSelect={clickTile} />
      ))}
    </>
  );
}

/** Posição no mundo 3D do centro de uma casa do tabuleiro. */
export function cellWorld(row: number, col: number) {
  const boardW = ACTIVE_MAP.cols * (Math.sqrt(3) * HEX_SIZE) + (Math.sqrt(3) * HEX_SIZE) / 2;
  const boardH = (ACTIVE_MAP.rows - 1) * (HEX_SIZE * 2 * 0.75) + HEX_SIZE * 2;
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
  // O celular joga DEITADO e usa o mesmo layout do computador (câmera MOBA, painéis laterais); o toque já arrasta e dá zoom.
  // Os modos "celular em pé" (tabuleiro plano, PhoneHud) ficam desligados: `phone` é sempre falso.
  return { mounted, phone: false, touch, portrait, aspect };
}

/**
 * Canvas 3D do tabuleiro, com a câmera de cada aparelho: no computador, estilo MOBA (ângulo fixo,
 * desliza e dá zoom); no celular, enquadrada na tela (com zoom por pinça). Os filhos entram dentro do Canvas.
 */
export function Board3DCanvas({ phone, portrait, aspect, focusX = 0, children }: { phone: boolean; portrait: boolean; aspect: number; focusX?: number; children: ReactNode }) {
  const controls = useRef<OrbitControlsImpl | null>(null);
  const fitRef = useRef<PhoneFit | null>(null);
  return (
    <Canvas
      key={phone ? (portrait ? "celular-pe" : "celular-deitado") : "computador"}
      shadows
      camera={{
        position: phone
          ? (() => {
              const v = phoneView(portrait, aspect);
              const horiz = v.dist * Math.sin(PHONE_POLAR);
              return [v.target[0] + horiz * Math.sin(v.azimuth), v.dist * Math.cos(PHONE_POLAR), v.target[2] + horiz * Math.cos(v.azimuth)] as [number, number, number];
            })()
          : [focusX, 14.9, 18.8],
        fov: phone ? phoneView(portrait, aspect).fov : 45,
        near: 1,
        far: 1500,
      }}
      gl={{ toneMapping: phone ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping, toneMappingExposure: 0.9 }}
    >
      {phone && <FitPhoneCamera portrait={portrait} fitRef={fitRef} />}
      {children}
      <OrbitControls
        ref={controls}
        makeDefault
        target={phone ? phoneView(portrait, aspect).target : [focusX, 0, 0]}
        enabled
        enableRotate={false}
        enablePan
        screenSpacePanning={false}
        mouseButtons={{ LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
        touches={{ ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN }}
        enableDamping
        dampingFactor={0.1}
        panSpeed={1.1}
        minPolarAngle={phone ? PHONE_POLAR : 0.9}
        maxPolarAngle={phone ? PHONE_POLAR : 0.9}
        minAzimuthAngle={phone ? phoneView(portrait, aspect).azimuth : 0}
        maxAzimuthAngle={phone ? phoneView(portrait, aspect).azimuth : 0}
        minDistance={phone ? 5 : 9}
        maxDistance={phone ? 1000 : 24}
        onChange={() => {
          if (phone) clampPhoneCamera(controls.current, fitRef.current);
          else clampCameraToBoard(controls.current);
        }}
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
export const PHONE_POLAR = 0.42; // inclinação (rad) da câmera fixa do celular: quase de cima, como numa arena de Clash Royale
/**
 * Câmera FIXA do celular (estilo Clash Royale): tabuleiro plano visto quase de cima, ocupando a tela.
 * Em pé o tabuleiro fica na vertical (Azul embaixo, Vermelho em cima); deitado, na horizontal.
 * A distância sai da proporção da tela: o tabuleiro (com uma folga) cabe na largura e na altura.
 */
export function phoneView(portrait: boolean, aspect: number): { dist: number; fov: number; azimuth: number; target: [number, number, number] } {
  const fov = 20; // lente fechada: quase sem perspectiva, o tabuleiro fica retangular e ocupa mais da tela
  const t = Math.tan(THREE.MathUtils.degToRad(fov / 2));
  const w = Math.sqrt(3) * HEX_SIZE;
  const halfX = (ACTIVE_MAP.cols * w + w / 2) / 2 + 0.8; // meia largura do tabuleiro
  const halfZ = ((ACTIVE_MAP.rows - 1) * (HEX_SIZE * 2 * 0.75) + HEX_SIZE * 2) / 2 + 0.8; // meia altura
  // Em pé a câmera gira 90°: o lado maior do tabuleiro segue a altura da tela.
  const needW = portrait ? halfZ : halfX;
  const needH = portrait ? halfX : halfZ;
  const dist = Math.max(needW / (t * aspect), needH / t) * 1.28; // folga: o HUD ocupa o topo e a base
  // Em pé, a mira desce um pouco para o tabuleiro subir e a última fileira não ficar atrás do painel de baixo.
  return { dist, fov, azimuth: portrait ? -Math.PI / 2 : 0, target: portrait ? [-2.6, 0, 0] : [0, 0, 0] };
}

export function clampCameraToBoard(ctrl: OrbitControlsImpl | null) {
  if (!ctrl) return;
  const cam = ctrl.object as THREE.PerspectiveCamera;
  const map = ACTIVE_MAP;
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
  const dx = axis(left, right, -hx, hx);
  const dz = axis(far, near, -hz, hz);
  if (Math.abs(dx) > 1e-4 || Math.abs(dz) > 1e-4) {
    cam.position.x += dx;
    cam.position.z += dz;
    ctrl.target.x += dx;
    ctrl.target.z += dz;
  }
  ctrl.target.y = 0;
}

/**
 * Encaixa o tabuleiro no espaço livre da tela do celular: mede onde termina o HUD de cima e onde
 * começa o de baixo e acha a câmera mais próxima em que o tabuleiro inteiro cabe ali, centralizado,
 * sem ficar atrás de nenhum painel. A câmera continua FIXA (só é calculada de novo ao girar ou
 * redimensionar a tela). Só mexe na câmera.
 */
export type PhoneFit = { dist: number; tx: number; tz: number };

export function FitPhoneCamera({ portrait, fitRef }: { portrait: boolean; fitRef: { current: PhoneFit | null } }) {
  const { camera, size, controls } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const fit = () => {
      const W = size.width;
      const H = size.height;
      const topEl = document.querySelector('[data-phone-hud="top"]');
      const botEl = document.querySelector('[data-phone-hud="bottom"]');
      const pad = 4;
      // Em pé mede o HUD de verdade; deitado usa uma folga fixa para a barra e os botões.
      const topPx = (portrait && topEl ? topEl.getBoundingClientRect().bottom : 56) + pad;
      const botPx = (portrait && botEl ? H - botEl.getBoundingClientRect().top : 64) + pad;
      const sidePx = portrait ? pad : 130;
      const nx = (px: number) => (px / W) * 2 - 1;
      const ny = (px: number) => 1 - (px / H) * 2;
      const rect = { l: nx(sidePx), r: nx(W - sidePx), t: ny(topPx), b: ny(H - botPx) };
      const w = Math.sqrt(3) * HEX_SIZE;
      const hx = (ACTIVE_MAP.cols * w + w / 2) / 2 + 0.35;
      const hz = ((ACTIVE_MAP.rows - 1) * (HEX_SIZE * 2 * 0.75) + HEX_SIZE * 2) / 2 + 0.35;
      const pts = [-1, 1].flatMap((sx) => [-1, 1].flatMap((sz) => [0, 1].map((y) => new THREE.Vector3(sx * hx, y, sz * hz))));
      const az = portrait ? -Math.PI / 2 : 0;
      const place = (d: number, tx: number, tz: number) => {
        const horiz = d * Math.sin(PHONE_POLAR);
        cam.position.set(tx + horiz * Math.sin(az), d * Math.cos(PHONE_POLAR), tz + horiz * Math.cos(az));
        cam.lookAt(tx, 0, tz);
        cam.updateMatrixWorld();
        cam.updateProjectionMatrix();
        let minX = 9, maxX = -9, minY = 9, maxY = -9;
        for (const p of pts) {
          const v = p.clone().project(cam);
          minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
        }
        return { minX, maxX, minY, maxY };
      };
      // Para cada distância, centraliza o tabuleiro na vertical (a tela "sobe/desce" movendo a mira).
      const centered = (d: number) => {
        let t = 0; // deslocamento da mira no eixo que corresponde à vertical da tela
        const at = (v: number) => (portrait ? place(d, v, 0) : place(d, 0, v));
        const err = (v: number) => { const b = at(v); return (b.minY + b.maxY) / 2 - (rect.t + rect.b) / 2; };
        for (let i = 0; i < 8; i++) {
          const e0 = err(t);
          const e1 = err(t + 0.5);
          const slope = (e1 - e0) / 0.5;
          if (Math.abs(slope) < 1e-6) break;
          t -= e0 / slope;
        }
        return { t, box: at(t) };
      };
      let lo = 12, hi = 900;
      for (let i = 0; i < 28; i++) {
        const mid = (lo + hi) / 2;
        const b = centered(mid).box;
        const ratio = Math.max((b.maxX - b.minX) / (rect.r - rect.l), (b.maxY - b.minY) / (rect.t - rect.b));
        if (ratio > 1) lo = mid; else hi = mid;
      }
      const { t } = centered(hi);
      const tx = portrait ? t : 0;
      const tz = portrait ? 0 : t;
      place(hi, tx, tz);
      const c = controls as unknown as { target?: THREE.Vector3; update?: () => void; minDistance?: number; maxDistance?: number } | null;
      if (c?.target) {
        // O jogador pode aproximar com o dedo, mas nunca afastar além do enquadramento que cabe na tela.
        c.maxDistance = hi;
        c.minDistance = hi * 0.35;
        fitRef.current = { dist: hi, tx, tz };
        c.target.set(tx, 0, tz);
        c.update?.();
      }
    };
    fit();
    const t1 = window.setTimeout(fit, 250); // depois que as fontes e o HUD assentam
    const t2 = window.setTimeout(fit, 900);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [camera, controls, portrait, size.width, size.height, fitRef]);
  return null;
}


/** Celular: depois de aproximar, mantém a mira dentro do tabuleiro (e volta ao centro quando afasta tudo). */
export function clampPhoneCamera(ctrl: OrbitControlsImpl | null, fit: PhoneFit | null) {
  if (!ctrl || !fit) return;
  const cam = ctrl.object as THREE.PerspectiveCamera;
  const w = Math.sqrt(3) * HEX_SIZE;
  const hx = (ACTIVE_MAP.cols * w + w / 2) / 2;
  const hz = ((ACTIVE_MAP.rows - 1) * (HEX_SIZE * 2 * 0.75) + HEX_SIZE * 2) / 2;
  const dist = cam.position.distanceTo(ctrl.target);
  const z = Math.max(0, Math.min(1, 1 - dist / fit.dist)); // 0 = enquadramento inteiro, 1 = bem perto
  const nx = Math.max(-hx * z, Math.min(hx * z, ctrl.target.x - fit.tx)) + fit.tx;
  const nz = Math.max(-hz * z, Math.min(hz * z, ctrl.target.z - fit.tz)) + fit.tz;
  const dx = nx - ctrl.target.x;
  const dz = nz - ctrl.target.z;
  if (Math.abs(dx) > 1e-4 || Math.abs(dz) > 1e-4) {
    cam.position.x += dx;
    cam.position.z += dz;
    ctrl.target.x = nx;
    ctrl.target.z = nz;
  }
  ctrl.target.y = 0;
}

