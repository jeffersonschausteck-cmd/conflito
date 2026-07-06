// Map domain model. Pure data — no React, no game rules. Consumed by
// the Interface only; the Game Engine never imports from this module
// (it only receives plain `rows`/`cols` numbers via GameStateConfig).

export type TerrainId =
  | "grass"
  | "forest"
  | "water"
  | "mountain"
  | "road"
  | "blue-base"
  | "red-base";

/**
 * Descriptive catalog entry for a terrain type. Only `nome`/`tipo`/
 * `corBase`/`descricao` are used in v1 — `bonus`/`penalidades`/
 * `efeitos` are optional so future gameplay effects can be added to a
 * terrain without changing any component that reads this type.
 */
export interface TerrainDefinition {
  id: TerrainId;
  nome: string;
  tipo: string;
  corBase: string;
  descricao: string;
  /** Obstáculo permanente: não pode ser ocupado nem atravessado por nenhuma peça. */
  bloqueado?: boolean;
  bonus?: string[];
  penalidades?: string[];
  efeitos?: string[];
}

/** A complete map: dimensions + terrain grid (row-major, like GameState). */
export interface MapDefinition {
  id: string;
  nome: string;
  rows: number;
  cols: number;
  tiles: TerrainId[][];
}
