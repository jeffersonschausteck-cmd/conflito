/**
 * Catálogo de visuais (skins) — parte PURA: só listas, valores padrão e validação.
 * Não depende de React nem do navegador, então o cliente (`pieceSkins.ts`) e o servidor
 * (`GameRoom`) usam exatamente as mesmas listas: o servidor só aceita o que o cliente
 * também aceitaria.
 *
 * Só aparência. Nada aqui muda força, movimento ou qualquer regra do Motor (docs 04/06).
 */
import type { PieceType } from "@/types/piece";

/** Tipos de peça que são personagens (Armadilha e Bandeira são objetos e não entram aqui). */
export type SkinnablePiece = Extract<PieceType, "commander" | "officer" | "sniper" | "infantry" | "engineer" | "scout" | "spy">;
export const SKINNABLE_PIECES: readonly SkinnablePiece[] = ["commander", "officer", "sniper", "infantry", "engineer", "scout", "spy"];

export interface SkinModel {
  id: string; // = nome do arquivo .glb em /public/models/kaykit
  label: string;
  pack: "Adventurers" | "Skeletons" | "Manequim";
  /** Altura do modelo (unidades do arquivo), usada pra trocar de modelo sem mudar o tamanho na tela. */
  height: number;
}

export const SKIN_MODELS: readonly SkinModel[] = [
  { id: "Knight", label: "Cavaleiro", pack: "Adventurers", height: 2.54 },
  { id: "Barbarian", label: "Bárbaro", pack: "Adventurers", height: 2.4 },
  { id: "Rogue", label: "Ladino", pack: "Adventurers", height: 2.18 },
  { id: "Rogue_Hooded", label: "Ladino de capuz", pack: "Adventurers", height: 2.17 },
  { id: "Mage", label: "Mago", pack: "Adventurers", height: 2.65 },
  { id: "Ranger", label: "Ranger", pack: "Adventurers", height: 2.27 },
  { id: "Skeleton_Warrior", label: "Esqueleto guerreiro", pack: "Skeletons", height: 2.17 },
  { id: "Skeleton_Mage", label: "Esqueleto mago", pack: "Skeletons", height: 2.59 },
  { id: "Skeleton_Minion", label: "Esqueleto minion", pack: "Skeletons", height: 2.17 },
  { id: "Skeleton_Rogue", label: "Esqueleto de capuz", pack: "Skeletons", height: 3.29 },
  { id: "Mannequin_Medium", label: "Manequim", pack: "Manequim", height: 2.2 },
];

/** Cores de roupa oferecidas na Oficina. `time` = cor do time (azul ou vermelho), o padrão. */
export interface SkinColor {
  id: string;
  label: string;
  hex: string | null;
}
export const SKIN_COLORS: readonly SkinColor[] = [
  { id: "time", label: "Cor do time", hex: null },
  { id: "azul", label: "Azul", hex: "#2f6fe0" },
  { id: "vermelho", label: "Vermelho", hex: "#d8353a" },
  { id: "verde", label: "Verde", hex: "#2f9e44" },
  { id: "roxo", label: "Roxo", hex: "#7c3aed" },
  { id: "laranja", label: "Laranja", hex: "#f08c2a" },
  { id: "amarelo", label: "Amarelo", hex: "#f2c230" },
  { id: "ciano", label: "Ciano", hex: "#16b8c6" },
  { id: "rosa", label: "Rosa", hex: "#e0529c" },
  { id: "preto", label: "Preto", hex: "#2a2a30" },
  { id: "branco", label: "Branco", hex: "#e8e8ee" },
];
export const colorHex = (id: string | null | undefined): string | null => SKIN_COLORS.find((c) => c.id === id)?.hex ?? null;

/** Chapéus. "padrao" = o da peça (quepe no Duque, capacete de obra no Sapador, o do modelo nas demais). */
export interface SkinOption {
  id: string;
  label: string;
  /** Arquivo .gltf em /public/models/kaykit (itens encaixados na mão). Ausente = sem item. */
  file?: string;
}
export const SKIN_HATS: readonly SkinOption[] = [
  { id: "padrao", label: "Padrão da peça" },
  { id: "modelo", label: "Do modelo" },
  { id: "nenhum", label: "Nenhum" },
  { id: "quepe", label: "Quepe militar" },
  { id: "obra", label: "Capacete de obra" },
  { id: "mineracao", label: "Capacete de mineração", file: "mining_helmet" },
];
/** Armas na mão direita. */
export const SKIN_WEAPONS: readonly SkinOption[] = [
  { id: "nenhuma", label: "Nenhuma" },
  { id: "espada", label: "Espada", file: "sword_1handed" },
  { id: "espada2", label: "Espada grande", file: "sword_2handed" },
  { id: "machado", label: "Machado", file: "axe_1handed" },
  { id: "machado2", label: "Machado grande", file: "axe_2handed" },
  { id: "adaga", label: "Adaga", file: "dagger" },
  { id: "arco", label: "Arco", file: "bow_withString" },
  { id: "besta", label: "Besta", file: "crossbow_1handed" },
  { id: "cajado", label: "Cajado", file: "staff" },
  { id: "varinha", label: "Varinha", file: "wand" },
  { id: "livro", label: "Livro de magia", file: "spellbook_closed" },
  { id: "cutelo", label: "Cutelo de esqueleto", file: "Skeleton_Blade" },
  { id: "machado-esq", label: "Machado de esqueleto", file: "Skeleton_Axe" },
  { id: "cajado-esq", label: "Cajado de caveira", file: "Skeleton_Staff" },
];
/** Escudos na mão esquerda. */
export const SKIN_SHIELDS: readonly SkinOption[] = [
  { id: "nenhum", label: "Nenhum" },
  { id: "redondo", label: "Redondo", file: "shield_round" },
  { id: "quadrado", label: "Quadrado", file: "shield_square" },
  { id: "brasao", label: "Brasão", file: "shield_badge" },
  { id: "espinhos", label: "Espinhos", file: "shield_spikes" },
  { id: "caveira", label: "Escudo de esqueleto", file: "Skeleton_Shield_Large_A" },
];

export interface PieceSkin {
  model: string;
  /** id de SKIN_COLORS; "time" usa a cor do time. */
  color: string;
  hat: string;
  weapon: string;
  shield: string;
}
export type SkinTable = Record<SkinnablePiece, PieceSkin>;

/** Visual de fábrica: é exatamente o que o jogo mostrava antes desta tabela existir. */
export const DEFAULT_SKINS: SkinTable = {
  commander: { model: "Knight", color: "time", hat: "padrao", weapon: "nenhuma", shield: "nenhum" },
  officer: { model: "Mage", color: "time", hat: "padrao", weapon: "nenhuma", shield: "nenhum" },
  sniper: { model: "Ranger", color: "time", hat: "padrao", weapon: "nenhuma", shield: "nenhum" },
  infantry: { model: "Rogue", color: "time", hat: "padrao", weapon: "nenhuma", shield: "nenhum" },
  engineer: { model: "Rogue", color: "time", hat: "padrao", weapon: "nenhuma", shield: "nenhum" },
  scout: { model: "Barbarian", color: "time", hat: "padrao", weapon: "nenhuma", shield: "nenhum" },
  spy: { model: "Rogue_Hooded", color: "time", hat: "padrao", weapon: "nenhuma", shield: "nenhum" },
};

export const modelInfo = (id: string): SkinModel | undefined => SKIN_MODELS.find((m) => m.id === id);

/** Lê e valida: qualquer coisa fora da lista de modelos permitidos volta ao padrão. */
export function sanitizeSkins(raw: unknown): SkinTable {
  const out = {} as SkinTable;
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  for (const t of SKINNABLE_PIECES) {
    const entry = src[t];
    const e = entry && typeof entry === "object" ? (entry as { model?: unknown; color?: unknown }) : {};
    const model = typeof e.model === "string" && modelInfo(e.model) ? e.model : DEFAULT_SKINS[t].model;
    const color = typeof e.color === "string" && SKIN_COLORS.some((c) => c.id === e.color) ? e.color : "time";
    const pick = (list: readonly SkinOption[], v: unknown, fallback: string) => (typeof v === "string" && list.some((o) => o.id === v) ? v : fallback);
    const x = e as { hat?: unknown; weapon?: unknown; shield?: unknown };
    out[t] = {
      model,
      color,
      hat: pick(SKIN_HATS, x.hat, "padrao"),
      weapon: pick(SKIN_WEAPONS, x.weapon, "nenhuma"),
      shield: pick(SKIN_SHIELDS, x.shield, "nenhum"),
    };
  }
  return out;
}


/** Conjuntos prontos: aplicam um visual a todas as peças de uma vez. Passam pela mesma validação. */
export interface SkinPreset {
  id: string;
  label: string;
  skins: SkinTable;
}
const make = (p: Partial<Record<SkinnablePiece, Partial<PieceSkin>>>): SkinTable => sanitizeSkins(Object.fromEntries(SKINNABLE_PIECES.map((t) => [t, { ...DEFAULT_SKINS[t], ...(p[t] ?? {}) }])));
export const SKIN_PRESETS: readonly SkinPreset[] = [
  { id: "padrao", label: "Padrão", skins: make({}) },
  {
    id: "armados",
    label: "Aventureiros armados",
    skins: make({
      commander: { weapon: "espada2" },
      officer: { weapon: "varinha" },
      sniper: { weapon: "arco" },
      infantry: { weapon: "espada", shield: "redondo" },
      engineer: { weapon: "machado" },
      scout: { weapon: "adaga" },
    }),
  },
  {
    id: "esqueletos",
    label: "Exército de esqueletos",
    skins: make({
      commander: { model: "Skeleton_Warrior", weapon: "machado-esq", shield: "caveira" },
      officer: { model: "Skeleton_Mage", weapon: "cajado-esq" },
      sniper: { model: "Skeleton_Rogue", weapon: "arco" },
      infantry: { model: "Skeleton_Minion", weapon: "cutelo", shield: "caveira" },
      engineer: { model: "Skeleton_Minion", weapon: "machado-esq" },
      scout: { model: "Skeleton_Rogue", weapon: "adaga" },
    }),
  },
  {
    id: "manequins",
    label: "Manequins",
    skins: make({
      commander: { model: "Mannequin_Medium", hat: "quepe" },
      officer: { model: "Mannequin_Medium", hat: "quepe" },
      sniper: { model: "Mannequin_Medium" },
      infantry: { model: "Mannequin_Medium" },
      engineer: { model: "Mannequin_Medium", hat: "obra" },
      scout: { model: "Mannequin_Medium" },
    }),
  },
];

/** Visual aleatório (o Assassino continua como é: todo preto). `rand` é injetável para teste. */
export function randomSkins(rand: () => number = Math.random): SkinTable {
  const pick = <T,>(list: readonly T[]): T => list[Math.floor(rand() * list.length) % list.length];
  const out: Record<string, PieceSkin> = {};
  for (const t of SKINNABLE_PIECES) {
    out[t] = {
      model: pick(SKIN_MODELS).id,
      color: pick(SKIN_COLORS).id,
      hat: pick(SKIN_HATS).id,
      weapon: pick(SKIN_WEAPONS).id,
      shield: pick(SKIN_SHIELDS).id,
    };
  }
  return sanitizeSkins(out);
}
