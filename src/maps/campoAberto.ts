import type { MapDefinition, TerrainId } from "./types";

// Significantly larger than the previous 10x10 board (168 vs 100 tiles).
const ROWS = 12;
const COLS = 14;

function buildTiles(): TerrainId[][] {
  const tiles: TerrainId[][] = Array.from({ length: ROWS }, () =>
    Array<TerrainId>(COLS).fill("grass"),
  );

  const set = (r: number, c: number, t: TerrainId) => {
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) tiles[r][c] = t;
  };

  // Forest clusters — kept inside the central "no man's land" (cols
  // 4-9), clear of both teams' 4-column-deep deployment zones
  // (cols 0-3 and cols 10-13, Sprint 2.5: Azul à esquerda / Vermelho
  // à direita) so a full 40-piece army always fits without collisions.
  for (const r of [1, 2, 9, 10]) {
    for (const c of [4, 5, 8, 9]) {
      set(r, c, "forest");
    }
  }

  // Central lake.
  for (const r of [4, 5, 6, 7]) {
    for (const c of [6, 7]) {
      set(r, c, "water");
    }
  }

  // Mountains flanking a central road corridor.
  set(3, 5, "mountain");
  set(3, 8, "mountain");
  set(8, 5, "mountain");
  set(8, 8, "mountain");
  for (let r = 0; r < ROWS; r++) {
    if (tiles[r][6] === "grass") set(r, 6, "road");
    if (tiles[r][7] === "grass") set(r, 7, "road");
  }

  // Command sectors in opposite corners.
  set(ROWS - 1, 0, "blue-base");
  set(0, COLS - 1, "blue-base");
  set(0, 0, "red-base");
  set(ROWS - 1, COLS - 1, "red-base");

  return tiles;
}

export const campoAberto: MapDefinition = {
  id: "campo-aberto",
  nome: "Campo Aberto",
  rows: ROWS,
  cols: COLS,
  tiles: buildTiles(),
};
