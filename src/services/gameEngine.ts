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
    return MovementEngine.legalMoveSet(
      GameEngine.selectedPiece(state),
      GameEngine.bounds(state),
    );
  },

  /**
   * Execute a move for the currently selected piece. Returns the
   * unchanged state when there is no selection or the target is not
   * a legal destination — the UI is intentionally forbidden from
   * making that determination itself.
   */
  moveSelectedTo(state: GameState, target: Coord): GameState {
    const selected = GameEngine.selectedPiece(state);
    if (!selected) return state;
    const bounds = GameEngine.bounds(state);
    if (!MovementEngine.isLegalMove(selected, target, bounds)) return state;
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
      case "RESET":
        return GameEngine.createInitialState(state.config);
      default:
        return state;
    }
  },
};

export type { Player };
