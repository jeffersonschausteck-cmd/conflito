import type { MapDefinition, TerrainId } from "./types";

// Sprint ART-02 — largura aumentada de 14 para 18 colunas, só para os
// lados: as duas colunas novas de cada lado (0-1 e 16-17) são grama
// lisa, e todo o conteúdo central (floresta/lago/montanhas/estrada)
// foi deslocado +2 colunas para continuar centralizado. As zonas de
// posicionamento (`DEPLOYMENT_DEPTH`, calculadas dinamicamente a
// partir de `cols` em `deploymentManager.ts`/`deployment.tsx`) mantêm
// a mesma profundidade de 4 colunas — não precisam de ajuste aqui.
const ROWS = 12;
const COLS = 18;

function buildTiles(): TerrainId[][] {
  const tiles: TerrainId[][] = Array.from({ length: ROWS }, () =>
    Array<TerrainId>(COLS).fill("grass"),
  );

  const set = (r: number, c: number, t: TerrainId) => {
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) tiles[r][c] = t;
  };

  // Forest clusters — kept inside the central "no man's land" (cols
  // 6-11, deslocado +2 pela Sprint ART-02), clear of both teams'
  // 4-column-deep deployment zones (cols 0-3 e 14-17, Sprint 2.5: Azul
  // à esquerda / Vermelho à direita) so a full 40-piece army always
  // fits without collisions.
  for (const r of [1, 2, 9, 10]) {
    for (const c of [6, 7, 10, 11]) {
      set(r, c, "forest");
    }
  }

  // Central lake.
  for (const r of [4, 5, 6, 7]) {
    for (const c of [8, 9]) {
      set(r, c, "water");
    }
  }

  // Mountains flanking a central road corridor.
  set(3, 7, "mountain");
  set(3, 10, "mountain");
  set(8, 7, "mountain");
  set(8, 10, "mountain");
  for (let r = 0; r < ROWS; r++) {
    if (tiles[r][8] === "grass") set(r, 8, "road");
    if (tiles[r][9] === "grass") set(r, 9, "road");
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
