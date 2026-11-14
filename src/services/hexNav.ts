// Navegação hexagonal pura (layout "odd-r", o mesmo do Motor): vizinhos, distância e mapa de distâncias
// pelo terreno. Sem regra de jogo e sem React; usada pela IA (jogadas e posicionamento).

/** Os 6 vizinhos de (row, col), dentro ou fora do tabuleiro (quem chama confere os limites). */
export function hexNeighbors(row: number, col: number): [number, number][] {
  return (row & 1) === 0
    ? [[row, col - 1], [row, col + 1], [row - 1, col - 1], [row - 1, col], [row + 1, col - 1], [row + 1, col]]
    : [[row, col - 1], [row, col + 1], [row - 1, col], [row - 1, col + 1], [row + 1, col], [row + 1, col + 1]];
}

/** Distância hexagonal entre duas casas, em linha reta (ignora terreno). */
export function hexDistance(r1: number, c1: number, r2: number, c2: number): number {
  const x1 = c1 - (r1 - (r1 & 1)) / 2;
  const x2 = c2 - (r2 - (r2 & 1)) / 2;
  const dx = x1 - x2;
  const dz = r1 - r2;
  const dy = -dx - dz;
  return Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));
}

export const UNREACHABLE = 999;

/**
 * Passos mínimos de cada casa até a meta mais próxima (uma ou várias) contornando o terreno bloqueado
 * (peças não contam). Índice = row * cols + col; casas isoladas valem UNREACHABLE.
 */
export function distanceFieldMulti(goals: ReadonlyArray<readonly [number, number]>, rows: number, cols: number, blocked: ReadonlySet<string>): Int16Array {
  const field = new Int16Array(rows * cols).fill(UNREACHABLE);
  const queue: number[] = [];
  for (const [gr, gc] of goals) {
    if (gr < 0 || gr >= rows || gc < 0 || gc >= cols) continue;
    const idx = gr * cols + gc;
    if (field[idx] === 0) continue;
    field[idx] = 0;
    queue.push(idx);
  }
  for (let head = 0; head < queue.length; head++) {
    const idx = queue[head];
    const r = Math.floor(idx / cols);
    const c = idx % cols;
    for (const [nr, nc] of hexNeighbors(r, c)) {
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (blocked.has(`${nr}-${nc}`)) continue;
      const n = nr * cols + nc;
      if (field[n] !== UNREACHABLE) continue;
      field[n] = field[idx] + 1;
      queue.push(n);
    }
  }
  return field;
}

/** Passos mínimos de cada casa até uma meta, contornando o terreno bloqueado. */
export function distanceField(goalRow: number, goalCol: number, rows: number, cols: number, blocked: ReadonlySet<string>): Int16Array {
  return distanceFieldMulti([[goalRow, goalCol]], rows, cols, blocked);
}
