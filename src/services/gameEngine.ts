import { createInitialBoard } from "@/services/boardEngine";
import { CombatEngine } from "@/services/combatEngine";
import { InitialSetup } from "@/services/initialSetup";
import { MovementEngine } from "@/services/movementEngine";
import { PieceManager } from "@/services/pieceManager";
import { TurnEngine } from "@/services/turnEngine";
import {
  ownerToPlayer,
  type GameAction,
  type GameState,
  type GameStateConfig,
  type Player,
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
    const turn = TurnEngine.initial("BLUE");
    return {
      config: merged,
      board: createInitialBoard(merged.rows, merged.cols),
      pieces: (() => {
        if (typeof window !== "undefined") {
          try {
            const saved = window.sessionStorage.getItem("psc:initial-pieces");
            if (saved) return JSON.parse(saved);
          } catch (e) {
            console.error("Failed to load initial pieces from sessionStorage", e);
          }
        }
        return InitialSetup.generate({ rows: merged.rows, cols: merged.cols });
      })(),
      selectedPieceId: null,
      currentPlayer: turn.currentPlayer,
      turnNumber: turn.turnNumber,
      actionLocked: turn.actionLocked,
      gameOver: turn.gameOver,
      winner: turn.winner,
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
    if (state.gameOver || state.actionLocked) return state;
    if (pieceId === state.selectedPieceId) return state;
    if (pieceId !== null) {
      const target = GameEngine.findPieceById(state, pieceId);
      if (!target || !target.isAlive) return state;
      // Turn ownership: only the active player may select their pieces.
      if (ownerToPlayer(target.owner) !== state.currentPlayer) return state;
    }
    return { ...state, selectedPieceId: pieceId };
  },

  /** Toggle currentPlayer. Pure helper. */
  nextPlayer(player: Player): Player {
    return player === "BLUE" ? "RED" : "BLUE";
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
    if (state.gameOver || state.actionLocked) return new Set();
    const selected = GameEngine.selectedPiece(state);
    if (!selected) return new Set();
    const raw = MovementEngine.getLegalMoves(selected, GameEngine.bounds(state));
    const out = new Set<string>();
    for (const c of raw) {
      const occupant = PieceManager.findAt(state.pieces, c.row, c.column);
      if (occupant && occupant.owner === selected.owner) continue;
      out.add(`${c.row}-${c.column}`);
    }
    return out;
  },

  /**
   * Apply the TurnEngine hand-off after a successful action, and check
   * for a victory condition. All turn mutation flows through here so
   * TurnEngine remains the single source of truth for turn flow.
   */
  finalizeTurn(state: GameState): GameState {
    const turn = TurnEngine.completeTurn({
      currentPlayer: state.currentPlayer,
      turnNumber: state.turnNumber,
      actionLocked: state.actionLocked,
      gameOver: state.gameOver,
      winner: state.winner,
    });
    const withTurn: GameState = {
      ...state,
      currentPlayer: turn.currentPlayer,
      turnNumber: turn.turnNumber,
      actionLocked: turn.actionLocked,
    };
    const winner = TurnEngine.checkVictory(withTurn);
    if (winner) {
      return { ...withTurn, gameOver: true, winner, selectedPieceId: null };
    }
    return withTurn;
  },

  moveSelectedTo(state: GameState, target: Coord): GameState {
    if (state.gameOver || state.actionLocked) return state;
    const selected = GameEngine.selectedPiece(state);
    if (!selected) return state;
    if (ownerToPlayer(selected.owner) !== state.currentPlayer) return state;
    const bounds = GameEngine.bounds(state);
    if (!MovementEngine.isLegalMove(selected, target, bounds)) return state;

    const defender = CombatEngine.detectCollision(
      state.pieces,
      selected.id,
      target,
    );

    const occupant = PieceManager.findAt(state.pieces, target.row, target.column);
    if (occupant && occupant.owner === selected.owner) return state;

    let next: GameState;
    if (defender) {
      const { pieces, result } = CombatEngine.resolve({
        pieces: state.pieces,
        attackerId: selected.id,
        defenderId: defender.id,
        tile: target,
      });
      next = { ...state, pieces, selectedPieceId: null, lastCombat: result };
    } else {
      const { pieces } = MovementEngine.execute(
        state.pieces,
        selected.id,
        target,
        bounds,
      );
      next = { ...state, pieces, selectedPieceId: null };
    }

    return GameEngine.finalizeTurn(next);
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
      case "END_TURN":
        if (state.gameOver) return state;
        return GameEngine.finalizeTurn({ ...state, selectedPieceId: null });
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
