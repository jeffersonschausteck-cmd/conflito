/**
 * Personagens KayKit compartilhados: usados pelo tabuleiro 3D (`/lab3d`) e pela Oficina do Exército.
 * Só aparência: nada aqui toca regras do jogo.
 */
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, useGLTF } from "@react-three/drei";
import { PIECES } from "@/config/pieces";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { PieceType } from "@/types/piece";
import { useRoomSkins } from "@/multiplayer/skinSync";
import { useSkins, modelInfo, colorHex, SKIN_HATS, SKIN_WEAPONS, SKIN_SHIELDS, DEFAULT_SKINS, type SkinnablePiece } from "@/config/pieceSkins";

const HEX_SIZE = 1;

// ─── Visual KayKit (CC0, Kay Lousberg) ──────────────────────────────────
// Modelos em /public/models/kaykit. Só aparência: nenhuma regra muda.
// O hex do KayKit tem 2 de largura (pontas pra cima, igual ao nosso
// layout pointy-top); nosso hex tem √3·HEX_SIZE. Daí a escala abaixo.
export const KAY_BASE = "/models/kaykit/";
export const KAY_SCALE = (Math.sqrt(3) * HEX_SIZE) / 2;
const KAY_FILES = [
  "hex_grass", "hex_water", "hex_road_A",
  "mountain_A_grass_trees", "mountain_B_grass_trees", "mountain_C_grass_trees",
  "trees_A_large", "trees_B_large", "trees_A_medium",
  "flag_blue", "flag_red",
];
if (typeof window !== "undefined") {
  KAY_FILES.forEach((f) => useGLTF.preload(`${KAY_BASE}${f}.gltf`));
}

/** Instância clonada de um modelo KayKit na posição do tabuleiro. */
export function KayModel({ file, x, z, y = 0, rotY = 0, scale = 1, sy = 1, sz = 1, tint }: { file: string; x: number; z: number; y?: number; rotY?: number; scale?: number; sy?: number; sz?: number; tint?: string }) {
  const { scene } = useGLTF(`${KAY_BASE}${file}.gltf`);
  const obj = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (tint) {
          // Multiplica a textura por uma cor (esverdeia a grama) sem alterar o arquivo.
          const mat = (m.material as THREE.MeshStandardMaterial).clone();
          mat.color.set(tint);
          m.material = mat;
        }
      }
    });
    return c;
  }, [scene, tint]);
  return <primitive object={obj} position={[x, y, z]} rotation={[0, rotY, 0]} scale={[KAY_SCALE * scale, KAY_SCALE * scale * sy, KAY_SCALE * scale * sz]} />;
}

/** Gira o grupo continuamente em torno do eixo Y — usado só pelo Rei. */
export function SpinGroup({ speed, children }: { speed: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * speed;
  });
  return <group ref={ref}>{children}</group>;
}

/** Tamanho na tela de um tipo de peça com o modelo escolhido: compensa a altura pra não crescer nem encolher. */
export function skinScale(type: SkinnablePiece, modelId: string): number {
  const base = KAY_PIECE[type].scale;
  const chosenH = modelInfo(modelId)?.height ?? 2.4;
  const defaultH = modelInfo(DEFAULT_SKINS[type].model)?.height ?? chosenH;
  return base * (defaultH / chosenH);
}

const KAY_PIECE: Record<PieceType, { file: string; scale: number; kind: "char" | "prop" }> = {
  commander: { file: "Knight", scale: 1.12, kind: "char" },
  officer: { file: "Mage", scale: 1.04, kind: "char" },
  sniper: { file: "Ranger", scale: 1.0, kind: "char" },
  infantry: { file: "Rogue", scale: 1.0, kind: "char" },
  engineer: { file: "Rogue", scale: 1.0, kind: "char" },
  scout: { file: "Barbarian", scale: 0.9, kind: "char" },
  spy: { file: "Rogue_Hooded", scale: 1.0, kind: "char" },
  bomb: { file: "bomb", scale: 1.15, kind: "prop" },
  flag: { file: "flag", scale: 9, kind: "prop" },
};

/** A Bandeira é sempre visível: haste longa (cerca de 2x a altura do modelo antigo, ~2,2) com o pano ondulando ao vento. */
const FLAG_POLE = 4.6; // era 6.6; reduzida em ~30%
const FLAG_CLOTH = { w: 2.5, h: 1.5 };
/** Quanto a Bandeira leva para descer ao ser capturada (precisa bater com `FLAG_LOWER_MS`). */
const FLAG_DROP_MS = 2000;
const FLAG_TEAM = { blue: "#2f6fe0", red: "#d8353a" } as const;

function WavingFlag({ owner, lowering = false }: { owner: "blue" | "red"; lowering?: boolean }) {
  const { w, h } = FLAG_CLOTH;
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(w, h, 18, 8);
    g.translate(w / 2, 0, 0); // a borda esquerda fica na haste
    return g;
  }, [w, h]);
  const rest = useMemo(() => Float32Array.from(geo.attributes.position.array as ArrayLike<number>), [geo]);
  const time = useRef(Math.random() * 6);
  const cloth = useRef<THREE.Group>(null);
  const drop = useRef(0); // 0 = no alto, 1 = embaixo
  useEffect(() => () => geo.dispose(), [geo]);
  useFrame((_, delta) => {
    time.current += delta;
    // Captura: o pano desce pela haste até quase a base e vai murchando o balanço.
    if (lowering) drop.current = Math.min(1, drop.current + delta / (FLAG_DROP_MS / 1000));
    if (cloth.current) cloth.current.position.y = -drop.current * (FLAG_POLE - FLAG_CLOTH.h - 0.5);
    const calm = 1 - drop.current * 0.7;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = rest[i * 3];
      const y = rest[i * 3 + 1];
      const k = x / w; // 0 na haste (parado), 1 na ponta (solta)
      pos.setZ(i, (Math.sin(x * 3.1 - time.current * 4.2 + y * 0.9) * 0.34 * k + Math.sin(time.current * 1.7 + x) * 0.05 * k) * calm);
      pos.setY(i, y + Math.sin(x * 2.2 - time.current * 3.1) * 0.06 * k);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  });
  const color = FLAG_TEAM[owner];
  const top = 0.07 + FLAG_POLE;
  return (
    <group>
      <mesh position={[0, 0.07 + FLAG_POLE / 2, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, FLAG_POLE, 10]} />
        <meshStandardMaterial color="#c9ccd4" roughness={0.35} metalness={0.5} />
      </mesh>
      <mesh position={[0, top + 0.1, 0]} castShadow>
        <sphereGeometry args={[0.13, 14, 10]} />
        <meshStandardMaterial color="#f2c14e" roughness={0.3} metalness={0.7} />
      </mesh>
      {/* O pano sempre aponta para o mesmo lado (a favor do vento), nas duas cores. */}
      <group ref={cloth}>
        <mesh geometry={geo} position={[0.04, top - h / 2 - 0.2, 0]} castShadow>
          <meshStandardMaterial color={color} roughness={0.7} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

/** Segundos que uma peça leva para caminhar `dist` casas (a caminhada precisa ser visível, casa a casa). */
export function walkSeconds(dist: number): number {
  return 0.55 + Math.min(dist, 6) * 0.2;
}

/** Boneco/objeto KayKit sobre uma base na cor do time, com animação de repouso. */
export function KayPiece({
  x,
  z,
  owner,
  pieceType,
  color,
  hidden = false,
  selected = false,
  mine = false,
  label = false,
  pop = null,
  dying = false,
  attacking = false,
  capturing = false,
  lowering = false,
  onClick,
}: {
  /** Peça derrotada: toca a animação de morte e fica caída até o jogo tirá-la da tela. */
  dying?: boolean;
  /** Está no meio de um combate: toca a animação de ataque (usado nas peças da luta na casa do alvo). */
  attacking?: boolean;
  /** Está pegando a Bandeira inimiga (toca a animação de pegar). */
  capturing?: boolean;
  /** Bandeira sendo capturada: desce pela haste. */
  lowering?: boolean;
  /** Id do combate que esta peça venceu: dispara o pulo de vitória uma vez. */
  pop?: number | null;
  x: number;
  z: number;
  owner: "blue" | "red";
  pieceType: PieceType;
  color: string;
  /** Fog of War: peça inimiga não revelada vira caixa fechada, igual para todos os tipos. */
  hidden?: boolean;
  selected?: boolean;
  /** Peça do jogador local: usa o visual escolhido na Oficina. A do adversário usa o padrão (online vem na etapa 4). */
  mine?: boolean;
  /** Peça do adversário já revelada: mostra o nome e a força acima dela (mesmo com um visual diferente do padrão). */
  label?: boolean;
  onClick?: () => void;
}) {
  const skins = useSkins();
  const roomSkins = useRoomSkins();
  // Peça inimiga oculta: um vulto encapuzado, igual para todos os tipos (não revela nada).
  const base = hidden ? { file: "Rogue_Hooded", scale: 1.0, kind: "char" as const } : KAY_PIECE[pieceType];
  let def = base;
  let accent: string | null = null; // cor de roupa escolhida na Oficina (null = cor do time)
  let gear = { hat: "padrao", weapon: "nenhuma", shield: "nenhum" };
  if (!hidden && base.kind === "char") {
    // Modelo escolhido na Oficina (só aparência). O tamanho é ajustado pela altura, pra trocar de
    // modelo sem a peça crescer ou encolher na tela.
    // Minhas peças: a Oficina local. Do adversário: o visual que ELE escolheu (o servidor validou),
    // ou o padrão se ainda não chegou. Peça oculta nunca passa por aqui (é sempre o vulto).
    const skin = (mine ? skins : (roomSkins[owner] ?? DEFAULT_SKINS))[pieceType as SkinnablePiece];
    def = { ...base, file: skin.model, scale: skinScale(pieceType as SkinnablePiece, skin.model) };
    accent = colorHex(skin.color);
    gear = { hat: skin.hat, weapon: skin.weapon, shield: skin.shield };
  }
  const facing = owner === "blue" ? Math.PI / 2 : -Math.PI / 2; // de frente para o inimigo
  const file = def.file === "flag" ? (owner === "blue" ? "flag_blue" : "flag_red") : def.file;
  // Movimento animado: a peça desliza até a casa nova com um saltinho, e quem vence um combate dá um "pulo" de vitória.
  const root = useRef<THREE.Group>(null);
  const ctl = useRef<{ state: KayAnimState }>({ state: "idle" });
  const facingRef = useRef(0);
  facingRef.current = owner === "blue" ? Math.PI / 2 : -Math.PI / 2;
  const anim = useRef({ x, z, sx: x, sz: z, t: 1, pop: -1 });
  const popSeen = useRef(pop);
  if (anim.current.x !== x || anim.current.z !== z) {
    const a = anim.current;
    const cur = root.current ? { x: root.current.position.x, z: root.current.position.z } : { x: a.x, z: a.z };
    a.sx = cur.x;
    a.sz = cur.z;
    a.x = x;
    a.z = z;
    a.t = 0;
  }
  if (pop !== popSeen.current) {
    popSeen.current = pop;
    if (pop != null) anim.current.pop = 0;
  }
  useFrame((_, delta) => {
    const g = root.current;
    if (!g) return;
    const a = anim.current;
    const dist = Math.hypot(a.x - a.sx, a.z - a.sz);
    let y = 0;
    if (a.t < 1) {
      a.t = Math.min(1, a.t + delta / walkSeconds(dist));
      const e = a.t; // ritmo constante, como quem caminha
      g.position.x = a.sx + (a.x - a.sx) * e;
      g.position.z = a.sz + (a.z - a.sz) * e;
      y = 0; // a própria animação de caminhada balança o corpo
    } else {
      g.position.x = a.x;
      g.position.z = a.z;
    }
    let s = 1;
    if (a.pop >= 0) {
      a.pop = Math.min(1, a.pop + delta / 1.0);
      if (a.pop >= 1) a.pop = -1;
    }
    // Animação do corpo e giro para o lado do movimento (volta a encarar o inimigo depois).
    const fighting = a.pop >= 0 || attacking;
    const moving = a.t < 1;
    ctl.current.state = dying ? "death" : moving ? "walk" : capturing ? "capture" : fighting ? "attack" : "idle";
    const turn = (moving || fighting) && dist > 0.01 ? Math.atan2(a.x - a.sx, a.z - a.sz) - facingRef.current : 0;
    let d = turn - g.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    g.rotation.y += d * Math.min(1, delta * 12);
    g.position.y = y;
    g.scale.setScalar(s);
  });
  return (
    <group
      ref={(g) => {
        root.current = g;
        if (g && g.userData.init !== true) {
          g.userData.init = true;
          g.position.set(anim.current.x, 0, anim.current.z);
        }
      }}
      onClick={(e) => {
        if (e.delta > 4) return; // foi arrasto de câmera, não clique
        e.stopPropagation();
        onClick?.();
      }}
    >
      {selected && <PulseRing color="#facc15" />}
      {/* Sem base sob a peça: o time é identificado pela cor da roupa (azul ou vermelha). */}
      {label && !hidden && PIECES[pieceType] && (
        <Html position={[0, 2.75, 0]} center distanceFactor={13} zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
          <div className="whitespace-nowrap rounded-full border border-white/25 bg-slate-950/75 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-[0.15em] text-slate-100">
            {PIECES[pieceType].nome} · {PIECES[pieceType].patente ?? "—"}
          </div>
        </Html>
      )}
      {pieceType === "flag" && !hidden ? (
        <WavingFlag owner={owner} lowering={lowering} />
      ) : def.kind === "char" ? (
        <KayCharacter ctl={ctl} file={file} rotY={facing} scale={def.scale} pieceType={hidden ? "infantry" : pieceType} shade={hidden} owner={owner} accent={accent} hat={gear.hat} weapon={gear.weapon} shield={gear.shield} />
      ) : (
        // A armadilha tem a origem no centro da esfera: sobe metade da altura pra não afundar na base.
        <KayModel file={file} x={0} z={0} y={file === "bomb" ? 0.07 + 0.4 * KAY_SCALE * def.scale : 0.07} rotY={facing} scale={def.scale} />
      )}
    </group>
  );
}

/**
 * Clona o material e aplica `glsl` só nos pixels "verdes" da textura (verde = G acima de R).
 * Pele, cabelo e olhos têm R maior que G, então ficam como estão.
 */
function recolorGreen(mat: THREE.MeshStandardMaterial, key: string, glsl: string): THREE.MeshStandardMaterial {
  const m = mat.clone();
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
 if (diffuseColor.g > diffuseColor.r + 0.01) { ${glsl} }`,
    );
  };
  m.customProgramCacheKey = () => key;
  return m;
}

const TEAM_COLOR = { blue: "#2f6fe0", red: "#d8353a" } as const;
// Condição GLSL (sobre a cor `c` do pixel da textura) que identifica a roupa principal de cada personagem.
const TEAM_RULE: Record<string, string> = {
  Rogue: "c.g > c.r + 0.01", // túnica verde
  Rogue_Hooded: "c.g > c.r + 0.01", // roupa e capuz verdes
  Mage: "c.b > c.g * 1.15 && c.b > c.r * 0.85 && c.b > 0.06", // túnica roxa
  Knight: "c.r > c.g * 2.2 && c.r > c.b * 2.2", // panos vermelhos
  Barbarian: "c.r > c.g * 1.45 && c.r > c.b * 1.45 && c.g < 0.2", // tecido avermelhado
  Ranger: "c.b > c.r * 1.25 && c.b > 0.1", // lenço azul
  Skeleton_Warrior: "c.r > c.g * 1.9 && c.r > c.b * 1.2 && c.r > 0.12", // lenço vinho
  Skeleton_Mage: "c.r > c.g * 1.9 && c.r > c.b * 1.2 && c.r > 0.12", // túnica vinho
  Skeleton_Minion: "c.r > c.g * 1.9 && c.r > c.b * 1.2 && c.r > 0.12",
  Skeleton_Rogue: "c.r > c.g * 1.9 && c.r > c.b * 1.2 && c.r > 0.12", // capuz vinho
};
/** Troca a cor dos pixels que obedecem a `cond` pela cor do time, mantendo o sombreado da textura. */
function teamRecolor(mat: THREE.MeshStandardMaterial, key: string, cond: string, hex: string): THREE.MeshStandardMaterial {
  const col = new THREE.Color(hex);
  const m = mat.clone();
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
       { vec3 c = diffuseColor.rgb;
         if (${cond}) {
           float L = dot(c, vec3(0.2126, 0.7152, 0.0722));
           diffuseColor.rgb = vec3(${col.r.toFixed(4)}, ${col.g.toFixed(4)}, ${col.b.toFixed(4)}) * min(0.3 + L * 2.4, 1.4);
         } }`,
    );
  };
  m.customProgramCacheKey = () => key;
  return m;
}

const CHAR_UNIT = 0.65; // escala base: boneco (~2 de altura) cabe na casa

/** Golpe de cada tipo de peça (animações do pacote KayKit Character Animations). */
const ATTACK_CLIP: Partial<Record<PieceType, string>> = {
  commander: "Melee_1H_Attack_Stab",
  officer: "Ranged_Magic_Spellcasting",
  sniper: "Ranged_1H_Shoot",
  infantry: "Melee_1H_Attack_Slice_Diagonal",
  engineer: "Melee_1H_Attack_Chop",
  scout: "Melee_Unarmed_Attack_Punch_A",
  spy: "Melee_1H_Attack_Stab",
};

export type KayAnimState = "idle" | "walk" | "attack" | "death" | "capture";

export function KayCharacter({ file, rotY, scale, pieceType, shade = false, owner, accent = null, hat = "padrao", weapon = "nenhuma", shield = "nenhum", ctl }: { ctl?: { current: { state: KayAnimState } }; file: string; rotY: number; scale: number; pieceType: PieceType; shade?: boolean; owner: "blue" | "red"; accent?: string | null; hat?: string; weapon?: string; shield?: string }) {
  const { scene } = useGLTF(`${KAY_BASE}${file}.glb`);
  const { animations } = useGLTF(`${KAY_BASE}Rig_Medium_General.glb`);
  const mv = useGLTF(`${KAY_BASE}Rig_Medium_MovementBasic.glb`).animations;
  const melee = useGLTF(`${KAY_BASE}Rig_Medium_CombatMelee.glb`).animations;
  const ranged = useGLTF(`${KAY_BASE}Rig_Medium_CombatRanged.glb`).animations;
  const allClips = useMemo(() => [...animations, ...mv, ...melee, ...ranged], [animations, mv, melee, ranged]);
  // Chapéu efetivo: "padrao" depende da peça (quepe no Duque, capacete de obra no Sapador).
  const hatId = shade ? "modelo" : hat === "padrao" ? (pieceType === "officer" ? "quepe" : pieceType === "engineer" ? "obra" : "modelo") : hat;
  // O mixer nasce junto com o boneco e é devolvido pelo mesmo useMemo: se o React descartar uma
  // das duas execuções (modo de desenvolvimento), boneco e animação nunca ficam desencontrados.
  const { obj, mixer, ...rig } = useMemo(() => {
    const c = cloneSkinned(scene) as THREE.Object3D;
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      // Chapéu próprio do modelo some quando outro chapéu (ou nenhum) é escolhido.
      if (hatId !== "modelo" && /hat|helmet/i.test(o.name)) {
        o.visible = false;
        return;
      }
      // Sem capa em nenhum personagem (o Assassino fica como está).
      if (pieceType !== "spy" && !shade && /cape/i.test(o.name)) {
        o.visible = false;
        return;
      }
      const base = m.material as THREE.MeshStandardMaterial;
      if (shade) {
        // Vulto: capuz, corpo e rosto pretos, sem nada que identifique a peça.
        const dark = base.clone();
        dark.color.set("#0b0b10");
        dark.roughness = 0.9;
        m.material = dark;
        return;
      }
      if (pieceType === "spy") {
        if (/head/i.test(o.name)) {
          // Cabeça: rosto como o original; só os pixels verdes da textura (o capuz) escurecem.
          m.material = recolorGreen(base, "spy-hood", "diffuseColor.rgb *= 0.1;");
        } else {
          // Roupa toda preta (corpo, braços, pernas, capa e máscara).
          const mat = base.clone();
          mat.color.set("#16161c");
          mat.roughness = 0.85;
          m.material = mat;
        }
      } else {
        // Vestimenta principal na cor do time (azul ou vermelho). Só os pixels da roupa
        // principal mudam; pele, cabelo, couro, metal e acessórios ficam como são.
        const rule = TEAM_RULE[file];
        if (rule) m.material = teamRecolor(base, `team-${file}-${accent ?? owner}`, rule, accent ?? TEAM_COLOR[owner]);
      }
    });
    // Acessórios presos aos ossos (acompanham a animação). Só visual.
    const head = c.getObjectByName("head");
    const mat = (color: string, rough = 0.6) => new THREE.MeshStandardMaterial({ color, roughness: rough });
    if (head && hatId === "quepe") {
      // Quepe militar: copa baixa azul-marinho, faixa dourada, aba curta e insígnia.
      const navy = mat("#1e2a4a", 0.6);
      const gold = new THREE.MeshStandardMaterial({ color: "#e8c464", roughness: 0.3, metalness: 0.6 });
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.5, 0.3, 24), navy);
      crown.position.set(0, 0.86, -0.02);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.56, 0.06, 24), navy);
      top.position.set(0, 1.04, -0.02);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.51, 0.51, 0.08, 24), gold);
      band.position.set(0, 0.74, -0.02);
      const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 20, 1, false, -Math.PI / 2, Math.PI), mat("#10131f", 0.4));
      visor.position.set(0, 0.7, 0.2);
      visor.scale.set(1, 1, 0.8);
      const badge = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), gold);
      badge.position.set(0, 0.88, 0.53);
      crown.castShadow = true;
      head.add(crown, top, band, visor, badge);
    }
    if (head && hatId === "obra") {
      // Capacete de obra amarelo, largo e alto o bastante pra cobrir o cabelo.
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.64, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat("#facc15", 0.4));
      dome.position.set(0, 0.6, -0.02);
      dome.scale.set(1, 1.2, 1.08);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.74, 0.05, 24), mat("#eab308", 0.4));
      brim.position.set(0, 0.6, 0.02);
      dome.castShadow = true;
      head.add(dome, brim);
    }
    const m = new THREE.AnimationMixer(c);
    const clip = animations.find((a) => a.name === "Idle_A") ?? animations.find((a) => /idle/i.test(a.name));
    const actions = new Map<string, THREE.AnimationAction | null>();
    // Clipe de cada estado. Só visual: nenhuma regra do jogo depende disso.
    const clipName: Record<string, string> = { idle: "Idle_A", walk: "Walking_A", attack: ATTACK_CLIP[pieceType] ?? "Melee_1H_Attack_Slice_Diagonal", death: "Death_A", capture: "PickUp" };
    const get = (state: string) => {
      if (!actions.has(state)) {
        const cl = state === "idle" ? clip : allClips.find((a) => a.name === clipName[state]);
        const act = cl ? m.clipAction(cl) : null;
        if (act && (state === "attack" || state === "death" || state === "capture")) {
          act.setLoop(THREE.LoopOnce, 1);
          act.clampWhenFinished = true;
        }
        actions.set(state, act);
      }
      return actions.get(state) ?? null;
    };
    const idle = get("idle");
    if (idle && clip) {
      idle.time = Math.random() * clip.duration; // evita todos em sincronia
      idle.play();
    }
    return { obj: c, mixer: m, get, cur: { name: "idle" } };
  }, [scene, animations, allClips, pieceType, shade, owner, file, accent, hatId]);
  useFrame((_, dt) => {
    const want = ctl?.current.state ?? "idle";
    if (want !== rig.cur.name) {
      const next = rig.get(want);
      if (next) {
        rig.get(rig.cur.name)?.fadeOut(0.15);
        next.reset().fadeIn(0.15).play();
        rig.cur.name = want;
      }
    }
    mixer.update(dt);
  });
  useEffect(() => () => void mixer.stopAllAction(), [mixer]);
  const itemFile = (list: readonly { id: string; file?: string }[], id: string) => list.find((o) => o.id === id)?.file;
  const weaponFile = shade ? undefined : itemFile(SKIN_WEAPONS, weapon);
  const shieldFile = shade ? undefined : itemFile(SKIN_SHIELDS, shield);
  const hatFile = shade ? undefined : itemFile(SKIN_HATS, hatId);
  return (
    <>
      <primitive object={obj} position={[0, 0.06, 0]} rotation={[0, rotY, 0]} scale={CHAR_UNIT * scale * 1.3} />
      {weaponFile && <BoneItem root={obj} bone="handslotr" file={weaponFile} fit />}
      {shieldFile && <BoneItem root={obj} bone="handslotl" file={shieldFile} fit />}
      {hatFile && <BoneItem root={obj} bone="head" file={hatFile} pos={HAT_POS} />}
    </>
  );
}

const HAT_POS: [number, number, number] = [0, 0.58, 0];

/** Rotação extra por item, no referencial do corpo (Y para cima, Z para a frente), para segurá-lo de forma natural. */
const ITEM_ROT: Record<string, [number, number, number]> = {
  bow_withString: [-Math.PI / 2, 0, 0], // o arco é comprido no eixo Z: em pé, com o eixo Z virado pra cima
};

/**
 * Item (arma, escudo, capacete) preso a um osso do personagem: acompanha a animação. Só visual.
 * Armas e escudos (`fit`) são orientados pelo corpo do personagem depois que a animação de repouso
 * assenta: o osso da mão gira com o braço, então sem esse ajuste o item ficaria deitado.
 */
function BoneItem({ root, bone, file, pos, fit = false }: { root: THREE.Object3D; bone: string; file: string; pos?: [number, number, number]; fit?: boolean }) {
  const { scene } = useGLTF(`${KAY_BASE}${file}.gltf`);
  const pending = useRef<{ wrapper: THREE.Group; anchor: THREE.Object3D; frames: number } | null>(null);
  useEffect(() => {
    const anchor = root.getObjectByName(bone);
    if (!anchor) return;
    const wrapper = new THREE.Group();
    const item = scene.clone(true);
    item.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
    if (pos) wrapper.position.set(...pos);
    wrapper.add(item);
    anchor.add(wrapper);
    pending.current = fit ? { wrapper, anchor, frames: 0 } : null;
    return () => {
      anchor.remove(wrapper);
      pending.current = null;
    };
  }, [root, bone, scene, pos, fit]);

  const qa = useMemo(() => new THREE.Quaternion(), []);
  const qr = useMemo(() => new THREE.Quaternion(), []);
  useFrame(() => {
    const p = pending.current;
    if (!p) return;
    if (++p.frames < 8) return; // espera a animação de repouso assentar
    p.anchor.getWorldQuaternion(qa);
    root.getWorldQuaternion(qr);
    const extra = ITEM_ROT[file];
    p.wrapper.quaternion.copy(qa.invert()).multiply(qr);
    if (extra) p.wrapper.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...extra)));
    pending.current = null;
  });
  return null;
}

["Knight", "Mage", "Ranger", "Barbarian", "Rogue", "Rogue_Hooded"].forEach((f) => {
  if (typeof window !== "undefined") useGLTF.preload(`${KAY_BASE}${f}.glb`);
});
if (typeof window !== "undefined") {
  useGLTF.preload(`${KAY_BASE}Rig_Medium_General.glb`);
  useGLTF.preload(`${KAY_BASE}Rig_Medium_MovementBasic.glb`);
  useGLTF.preload(`${KAY_BASE}Rig_Medium_CombatMelee.glb`);
  useGLTF.preload(`${KAY_BASE}Rig_Medium_CombatRanged.glb`);
  useGLTF.preload(`${KAY_BASE}bomb.gltf`);
}


/** Anel hexagonal que pulsa, com um brilho suave por baixo: seleção de peça e casas de destino. */
export function PulseRing({ color, inner = 0.88, outer = 1.0, speed = 5 }: { color: string; inner?: number; outer?: number; speed?: number }) {
  const ring = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const s = Math.sin(clock.elapsedTime * speed);
    ring.current?.scale.setScalar(1 + 0.06 * s);
    const m = glow.current?.material as THREE.MeshBasicMaterial | undefined;
    if (m) m.opacity = 0.28 + 0.14 * s;
  });
  return (
    <group position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 6]}>
      <mesh ref={ring}>
        <ringGeometry args={[inner, outer, 6]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh ref={glow} position={[0, 0, -0.01]}>
        <circleGeometry args={[outer + 0.05, 6]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} depthWrite={false} />
      </mesh>
    </group>
  );
}
