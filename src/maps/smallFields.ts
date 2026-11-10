import type { MapDefinition, TerrainId } from "./types";

/**
 * Campos menores para os ritmos Rápida e Relâmpago (docs/04-Regras.md, seção 19). Mesma ideia do Campo
 * Aberto: zonas de posicionamento limpas nas pontas e, no meio, um lago com uma estrada de cada lado,
 * florestas e montanhas. Dados puros.
 */
function build(id: string, nome: string, rows: number, cols: number, depth: number): MapDefinition {
  const tiles: TerrainId[][] = Array.from({ length: rows }, () => Array<TerrainId>(cols).fill("grass"));
  const set = (r: number, c: number, t: TerrainId) => {
    if (r >= 0 && r < rows && c >= depth && c < cols - depth) tiles[r][c] = t; // nunca nas zonas de posicionamento
  };
  const midL = Math.floor(cols / 2) - 1; // as duas colunas centrais (estrada)
  const midR = midL + 1;
  const lakeTop = Math.floor(rows / 2) - 1;

  // Lago central de 2 linhas, com a estrada passando dos dois lados dele.
  for (const r of [lakeTop, lakeTop + 1]) {
    set(r, midL, "water");
    set(r, midR, "water");
  }
  // Florestas perto das pontas do campo (cantos do "meio do campo").
  for (const r of [1, rows - 2]) {
    for (const c of [depth + 1, depth + 2, cols - depth - 3, cols - depth - 2]) set(r, c, "forest");
  }
  // Montanhas ladeando o lago.
  const m = Math.max(2, lakeTop - 1);
  for (const r of [m, rows - 1 - m]) {
    set(r, midL - 1, "mountain");
    set(r, midR + 1, "mountain");
  }
  // Estrada: as duas colunas centrais onde ainda é grama.
  for (let r = 0; r < rows; r++) {
    if (tiles[r][midL] === "grass") set(r, midL, "road");
    if (tiles[r][midR] === "grass") set(r, midR, "road");
  }
  // Setores de comando nos cantos opostos (só decoração).
  tiles[rows - 1][0] = "blue-base";
  tiles[0][cols - 1] = "blue-base";
  tiles[0][0] = "red-base";
  tiles[rows - 1][cols - 1] = "red-base";
  return { id, nome, rows, cols, tiles };
}

export const campoRapido: MapDefinition = build("campo-rapido", "Campo Rápido", 10, 14, 3);
export const campoRelampago: MapDefinition = build("campo-relampago", "Campo Relâmpago", 8, 12, 3);
