import { createInitialBoard } from "@/services/boardEngine";
import { CombatEngine } from "@/services/combatEngine";
import { InitialSetup } from "@/services/initialSetup";
import { MovementEngine } from "@/services/movementEngine";
import { PieceManager } from "@/services/pieceManager";
import type {
  GameAction,
  GameState,
  GameStateConfig,
  Player,
} from "@/types/gameState";
import type { BoardBounds, Coord } from "@/types/movement";
import type { Piece, PieceId } from "@/types/piece";

/**
 * GameEngine — pure, framework-agnostic reducer + factories that own
 * every legal transformation of the global GameState.
 *
 * UI layers must call these helpers (or dispatch GameAction values)
 * instead of mutating state directly. Keeping the engine pure makes
 * it trivial to wrap with a network transport, replay logger, or AI
 * driver later.
 *
 * v0.2 scope (per spec): selection only. Movement, combat, turn
 * switching, and rules intentionally NOT implemented here yet.
 */
export const GameEngine = {
  defaultConfig(): GameStateConfig {
    return { rows: 10, cols: 10 };
  },

  createInitialState(config: Partial<GameStateConfig> = {}): GameState {
    const merged: GameStateConfig = { ...GameEngine.defaultConfig(), ...config };
    return {
      config: merged,
      board: createInitialBoard(merged.rows, merged.cols),
      pieces: InitialSetup.generate({ rows: merged.rows, cols: merged.cols }),
      selectedPieceId: null,
      currentPlayer: "BLUE",
      lastCombat: null,
    };
  },

  /** Pure lookup helpers — never mutate. */
  findPieceById(state: GameState, id: PieceId): Piece | null {
    return PieceManager.findById(state.pieces, id) ?? null;
  },

  findPieceAt(state: GameState, row: number, col: number): Piece | null {
    return (
      state.pieces.find(
        (p) => p.isAlive && p.currentRow === row && p.currentColumn === col,
      ) ?? null
    );
  },

  selectedPiece(state: GameState): Piece | null {
    return state.selectedPieceId
      ? GameEngine.findPieceById(state, state.selectedPieceId)
      : null;
  },

  /**
   * Selection rules (v0.2):
   * - Clicking a piece sets selectedPieceId (replaces any prior).
   * - Clicking the same piece again clears the selection.
   * - Clicking an empty tile does nothing (handled upstream).
   * - Movement / turn ownership is NOT enforced yet.
   */
  selectPiece(state: GameState, pieceId: PieceId | null): GameState {
    if (pieceId === state.selectedPieceId) return state;
    if (pieceId !== null) {
      const target = GameEngine.findPieceById(state, pieceId);
      if (!target || !target.isAlive) return state;
    }
    return { ...state, selectedPieceId: pieceId };
  },

  /** BoardBounds derived from the current config — pure helper. */
  bounds(state: GameState): BoardBounds {
    return { rows: state.config.rows, cols: state.config.cols };
  },

  /**
   * Legal destination tiles for the currently selected piece under
   * MovementEngine v0.1 rules (1-tile orthogonal). Delegated so all
   * rule knowledge lives in the movement layer.
   */
  legalMovesForSelection(state: GameState): Set<string> {
    const selected = GameEngine.selectedPiece(state);
    if (!selected) return new Set();
    const raw = MovementEngine.getLegalMoves(selected, GameEngine.bounds(state));
    const out = new Set<string>();
    for (const c of raw) {
      const occupant = PieceManager.findAt(state.pieces, c.row, c.column);
      // Friendly-occupied tiles are illegal; enemy-occupied tiles are
      // legal and route through CombatEngine at execution time.
      if (occupant && occupant.owner === selected.owner) continue;
      out.add(`${c.row}-${c.column}`);
    }
    return out;
  },

  /**
   * Execute a move for the currently selected piece. Returns the
   * unchanged state when there is no selection or the target is not
   * a legal destination — the UI is intentionally forbidden from
   * making that determination itself.
   *
   * If the target tile holds a live enemy piece, resolution is
   * delegated to CombatEngine and its result is stored on
   * `state.lastCombat` for UI feedback.
   */
  moveSelectedTo(state: GameState, target: Coord): GameState {
    const selected = GameEngine.selectedPiece(state);
    if (!selected) return state;
    const bounds = GameEngine.bounds(state);
    if (!MovementEngine.isLegalMove(selected, target, bounds)) return state;

    const defender = CombatEngine.detectCollision(
      state.pieces,
      selected.id,
      target,
    );

    // Friendly occupancy is rejected up-front (mirrors legalMovesForSelection).
    const occupant = PieceManager.findAt(state.pieces, target.row, target.column);
    if (occupant && occupant.owner === selected.owner) return state;

    if (defender) {
      const { pieces, result } = CombatEngine.resolve({
        pieces: state.pieces,
        attackerId: selected.id,
        defenderId: defender.id,
        tile: target,
      });
      return {
        ...state,
        pieces,
        selectedPieceId: null,
        lastCombat: result,
      };
    }

    const { pieces } = MovementEngine.execute(
      state.pieces,
      selected.id,
      target,
      bounds,
    );
    return { ...state, pieces, selectedPieceId: null };
  },

  reduce(state: GameState, action: GameAction): GameState {
    switch (action.type) {
      case "SELECT_PIECE":
        return GameEngine.selectPiece(state, action.pieceId);
      case "MOVE_SELECTED":
        return GameEngine.moveSelectedTo(state, {
          row: action.row,
          column: action.column,
        });
      case "CLEAR_LAST_COMBAT":
        return state.lastCombat ? { ...state, lastCombat: null } : state;
      case "RESET":
        return GameEngine.createInitialState(state.config);
      default:
        return state;
    }
  },
};

export type { Player };
