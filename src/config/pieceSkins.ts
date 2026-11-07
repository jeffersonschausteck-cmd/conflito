/**
 * Visual (skin) de cada tipo de peça — Oficina do Exército, etapa 1.
 *
 * Regra de ouro: isto é SÓ aparência. Nenhum valor daqui pode mudar força, movimento,
 * combate ou qualquer regra do Motor (docs 04/06). O jogo lê esta tabela para decidir
 * qual modelo 3D desenhar; o resto do código nunca depende dela.
 *
 * A escolha do jogador fica no navegador (localStorage). Valores inválidos ou ausentes
 * caem sempre no visual padrão, então um dado corrompido nunca quebra a partida.
 */
import { useSyncExternalStore } from "react";

import {
  DEFAULT_SKINS,
  SKINNABLE_PIECES,
  SKIN_COLORS,
  SKIN_HATS,
  SKIN_MODELS,
  SKIN_SHIELDS,
  SKIN_WEAPONS,
  colorHex,
  modelInfo,
  sanitizeSkins,
  SKIN_PRESETS,
  randomSkins,
  type SkinPreset,
  type PieceSkin,
  type SkinColor,
  type SkinModel,
  type SkinOption,
  type SkinTable,
  type SkinnablePiece,
} from "./skinCatalog";

// Reexporta: o resto do app continua importando tudo de "@/config/pieceSkins".
export { SKIN_PRESETS, randomSkins, DEFAULT_SKINS, SKINNABLE_PIECES, SKIN_COLORS, SKIN_HATS, SKIN_MODELS, SKIN_SHIELDS, SKIN_WEAPONS, colorHex, modelInfo, sanitizeSkins };
export type { SkinPreset, PieceSkin, SkinColor, SkinModel, SkinOption, SkinTable, SkinnablePiece };

const STORAGE_KEY = "conflito:skins:v1";

function readStorage(): SkinTable {
  try {
    const txt = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    return sanitizeSkins(txt ? JSON.parse(txt) : null);
  } catch {
    return sanitizeSkins(null); // sem localStorage (janela privada) ou JSON quebrado
  }
}

// Estado em memória + assinantes (useSyncExternalStore precisa de um snapshot estável).
let current: SkinTable | null = null;
const listeners = new Set<() => void>();

function table(): SkinTable {
  if (!current) current = readStorage();
  return current;
}

function commit(next: SkinTable) {
  current = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* sem armazenamento: vale só nesta sessão */
  }
  listeners.forEach((l) => l());
}

export const PieceSkins = {
  /** Visual atual de todas as peças. */
  get: (): SkinTable => table(),
  /** Avisa quando o visual muda (usado pela sincronização online). Retorna a função de cancelar. */
  subscribe(cb: () => void): () => void {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  /** Salva o visual inteiro (já validado). É o que as partidas passam a usar. */
  save(next: SkinTable) {
    commit(sanitizeSkins(next));
  },
  /** Troca o modelo de um tipo de peça. Modelo desconhecido é ignorado. */
  setModel(type: SkinnablePiece, model: string): boolean {
    if (!modelInfo(model)) return false;
    commit({ ...table(), [type]: { ...table()[type], model } });
    return true;
  },
  /** Troca a cor da roupa de um tipo de peça. Cor desconhecida é ignorada. */
  setColor(type: SkinnablePiece, color: string): boolean {
    if (!SKIN_COLORS.some((c) => c.id === color)) return false;
    commit({ ...table(), [type]: { ...table()[type], color } });
    return true;
  },
  /** Escolhe chapéu, arma ou escudo de um tipo de peça. Opção desconhecida é ignorada. */
  setItem(type: SkinnablePiece, slot: "hat" | "weapon" | "shield", id: string): boolean {
    const list = slot === "hat" ? SKIN_HATS : slot === "weapon" ? SKIN_WEAPONS : SKIN_SHIELDS;
    if (!list.some((o) => o.id === id)) return false;
    commit({ ...table(), [type]: { ...table()[type], [slot]: id } });
    return true;
  },
  /** Volta tudo ao visual de fábrica. */
  reset() {
    commit(sanitizeSkins(null));
  },
};

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

/** Hook: o componente refaz o desenho quando o jogador muda o visual. */
export function useSkins(): SkinTable {
  return useSyncExternalStore(subscribe, table, () => DEFAULT_SKINS);
}
