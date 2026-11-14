import { InitialSetup } from "@/services/initialSetup";
import { armySize, formatFor, type BattleFormat } from "@/services/battleFormat";
import { hexNeighbors } from "@/services/hexNav";
import type { Piece, PlayerOwner } from "@/types/piece";

/**
 * How many columns deep each team's deployment zone is (Sprint 2.5:
 * Azul à esquerda / Vermelho à direita). Matches the depth of the
 * `DEPLOYMENT` template in `initialSetup.ts`.
 */
export const DEPLOYMENT_DEPTH = 4;

/**
 * Sprint TIMER-01 — duração oficial da fase de Posicionamento (3
 * minutos), em milissegundos. Fonte única: usada tanto pela Interface
 * (offline, `deployment.tsx`) quanto pelo `GameRoom` (online,
 * `multiplayer-worker/src/GameRoom.ts`, via o mesmo path alias
 * `@/services/deploymentManager`) — nunca redigitada nos dois lados.
 */
export const DEPLOYMENT_DURATION_MS = 3 * 60 * 1000;

const NO_BLOCKED_TILES: ReadonlySet<string> = new Set();

/**
 * DeploymentManager handles the pre-battle deployment phase.
 * It manages piece positioning validation, AI deployment generation,
 * and board layout verification before the match begins.
 */
export const DeploymentManager = {
  /**
   * Generates the default deployment for a side (Azul by default).
   * Sprint MP-02: also used online for whichever side the local
   * player was assigned (blue or red), so both can start from the
   * same standard formation before rearranging.
   */
  createDefaultPlayerDeployment(rows: number = 10, cols: number = 10, owner: PlayerOwner = "blue", format?: BattleFormat): Piece[] {
    const all = InitialSetup.generate({ rows, cols, format });
    return all.filter((p) => p.owner === owner);
  },

  /**
   * Posicionamento do computador (docs/09-IA.md, versão 1.2). Não é sorteio puro:
   *  - a Bandeira vai para o fundo, numa casa de pouca exposição (a casa exata é sorteada entre as melhores);
   *  - as casas ao redor dela são todas ocupadas: Armadilhas na frente (menos uma, que vira isca) e guardas móveis
   *    nas demais, para nenhuma peça (nem o Batedor, em linha reta) chegar à Bandeira de uma vez;
   *  - o resto segue a profundidade de cada tipo: Rei, Duque e Arqueiros no miolo, Batedores na linha de frente,
   *    Sapadores espalhados, Assassino perto do Rei; Armadilhas extras como isca à frente.
   * Só usa casas livres da zona do lado; nunca olha as peças do adversário.
   */
  generateAIDeployment(
    rows: number = 10,
    cols: number = 10,
    blockedTiles: ReadonlySet<string> = NO_BLOCKED_TILES,
    owner: PlayerOwner = "red",
    format: BattleFormat = formatFor("classic"),
  ): Piece[] {
    const all = InitialSetup.generate({ rows, cols, format });
    const mine = all.filter((p) => p.owner === owner);

    // A zona do Vermelho são as colunas da direita; a do Azul, as da esquerda.
    const zoneStart = owner === "red" ? Math.max(0, cols - format.depth) : 0;
    const zoneEnd = owner === "red" ? cols : Math.min(format.depth, cols);
    const backCol = owner === "red" ? cols - 1 : 0;
    const span = Math.max(1, zoneEnd - zoneStart - 1);
    type Cell = { row: number; col: number };
    const free = new Map<string, Cell>();
    for (let r = 0; r < rows; r++) {
      for (let c = zoneStart; c < zoneEnd; c++) {
        if (!blockedTiles.has(`${r}-${c}`)) free.set(`${r}-${c}`, { row: r, col: c });
      }
    }
    const rand = Math.random;
    const frac = (col: number) => Math.min(1, Math.abs(col - backCol) / span); // 0 = fundo, 1 = linha de frente
    const placed = new Map<string, Cell>(); // id da peça -> casa
    const pool = new Map<string, Piece[]>();
    for (const p of mine) pool.set(p.pieceType, [...(pool.get(p.pieceType) ?? []), p]);
    const take = (type: string): Piece | undefined => pool.get(type)?.shift();
    const put = (piece: Piece | undefined, cell: Cell) => {
      if (!piece) return;
      placed.set(piece.id, cell);
      free.delete(`${cell.row}-${cell.col}`);
    };

    // 1) Bandeira: fundo do exército, pouca exposição.
    const openNeighbors = (cell: Cell) =>
      hexNeighbors(cell.row, cell.col).filter(([r, c]) => r >= 0 && r < rows && c >= 0 && c < cols && !blockedTiles.has(`${r}-${c}`)).length;
    const flagSpots = [...free.values()].filter((cell) => frac(cell.col) <= 0.34);
    const flagPool = flagSpots.length > 0 ? flagSpots : [...free.values()];
    let flagCell = flagPool[0];
    let flagScore = Infinity;
    for (const cell of flagPool) {
      const score = openNeighbors(cell) + frac(cell.col) * 2 + rand() * 1.6;
      if (score < flagScore) {
        flagScore = score;
        flagCell = cell;
      }
    }
    put(take("flag"), flagCell);

    // 2) Ao redor da Bandeira: Armadilhas (as mais à frente primeiro) e guardas móveis.
    const around = hexNeighbors(flagCell.row, flagCell.col)
      .map(([r, c]) => free.get(`${r}-${c}`))
      .filter((cell): cell is Cell => !!cell)
      .sort((a, b) => frac(b.col) - frac(a.col) + (rand() - 0.5) * 0.2);
    const bombCount = pool.get("bomb")?.length ?? 0;
    const bombsAround = Math.min(around.length, Math.max(0, bombCount - (bombCount >= 3 ? 1 : 0)));
    around.slice(0, bombsAround).forEach((cell) => put(take("bomb"), cell));
    const guardOrder = ["infantry", "sniper", "engineer", "infantry", "officer", "scout"];
    for (const cell of around.slice(bombsAround)) {
      const type = guardOrder.find((t) => (pool.get(t)?.length ?? 0) > 0);
      put(type ? take(type) : undefined, cell);
    }

    // 3) O resto: cada tipo procura a profundidade que lhe cabe (0 = fundo, 1 = frente), com sorteio.
    const target: Record<string, number> = { commander: 0.55, officer: 0.5, sniper: 0.5, engineer: 0.45, infantry: 0.65, scout: 1, spy: 0.55, bomb: 0.8 };
    const order = ["commander", "officer", "sniper", "spy", "engineer", "bomb", "infantry", "scout"];
    for (const type of order) {
      for (const piece of pool.get(type) ?? []) {
        let best: Cell | null = null;
        let bestScore = Infinity;
        for (const cell of free.values()) {
          let score = Math.abs(frac(cell.col) - (target[type] ?? 0.6)) + rand() * 0.4;
          if (type === "spy") {
            const king = mine.find((p) => p.pieceType === "commander");
            const kc = king ? placed.get(king.id) : undefined;
            if (kc) score += Math.min(4, Math.abs(kc.row - cell.row) + Math.abs(kc.col - cell.col)) * 0.12;
          }
          if (score < bestScore) {
            bestScore = score;
            best = cell;
          }
        }
        if (best) put(piece, best);
      }
      pool.set(type, []);
    }

    return mine.map((piece) => {
      const cell = placed.get(piece.id);
      return cell ? { ...piece, currentRow: cell.row, currentColumn: cell.col } : piece;
    });
  },

  /**
   * Validates if a side's pieces are fully and legally placed.
   * That side must have exactly 40 pieces, all within its own
   * DEPLOYMENT_DEPTH columns (left for Azul, right for Vermelho —
   * Sprint 2.5 orientation), none on a blocked (terrain obstacle)
   * coordinate, with no overlaps.
   *
   * Defaults to `owner: "blue"` to preserve the original single-player
   * call sites; Sprint MP-02 passes `owner` explicitly to also
   * validate Vermelho's confirmed online deployment, reusing this same
   * function instead of duplicating the logic.
   */
  validateDeployment(
    pieces: Piece[],
    rows: number = 10,
    cols: number = 10,
    blockedTiles: ReadonlySet<string> = NO_BLOCKED_TILES,
    owner: PlayerOwner = "blue",
    format: BattleFormat = formatFor("classic"),
  ): boolean {
    const total = armySize(format);
    const sidePieces = pieces.filter((p) => p.owner === owner);
    if (sidePieces.length !== total) return false;

    const zoneStart = owner === "blue" ? 0 : Math.max(0, cols - format.depth);
    const zoneEnd = owner === "blue" ? format.depth : cols;

    // Check if every piece has a valid row and column within its own zone.
    const placed = sidePieces.filter(
      (p) =>
        p.currentRow >= 0 &&
        p.currentRow < rows &&
        p.currentColumn >= zoneStart &&
        p.currentColumn < zoneEnd &&
        !blockedTiles.has(`${p.currentRow}-${p.currentColumn}`)
    );
    if (placed.length !== total) return false;

    // Check for duplicate coordinates
    const coordinatesSet = new Set<string>();
    for (const p of placed) {
      const key = `${p.currentRow}-${p.currentColumn}`;
      if (coordinatesSet.has(key)) {
        return false; // overlapping coordinates
      }
      coordinatesSet.add(key);
    }

    return true;
  },
};
