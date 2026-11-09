import { createInitialBoard } from "@/services/boardEngine";
import { CombatEngine } from "@/services/combatEngine";
import { InitialSetup } from "@/services/initialSetup";
import { MovementEngine } from "@/services/movementEngine";
import { PieceManager } from "@/services/pieceManager";
import { TurnEngine } from "@/services/turnEngine";
import { applyTide, effectiveBlocked, roundOf, winnerByPoints } from "@/services/matchRules";
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
      endReason: null,
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

  /** Blocked-tile set derived from the current config — pure helper. */
  blockedTiles(state: GameState): ReadonlySet<string> {
    // Obstáculos do mapa + casas inundadas pela Maré (ritmos Rápida/Relâmpago).
    return effectiveBlocked(state);
  },

  /**
   * Legal destination tiles for the currently selected piece under
   * MovementEngine's official rules. Delegated so all rule knowledge
   * (including occupancy and terrain obstacles) lives in the movement layer.
   */
  legalMovesForSelection(state: GameState): Set<string> {
    if (state.gameOver || state.actionLocked) return new Set();
    const selected = GameEngine.selectedPiece(state);
    if (!selected) return new Set();
    const raw = MovementEngine.getLegalMoves(
      selected,
      state.pieces,
      GameEngine.bounds(state),
      GameEngine.blockedTiles(state),
    );
    return new Set(raw.map((c) => `${c.row}-${c.column}`));
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
    let withTurn: GameState = {
      ...state,
      currentPlayer: turn.currentPlayer,
      turnNumber: turn.turnNumber,
      actionLocked: turn.actionLocked,
    };
    // Maré (ritmos Rápida/Relâmpago): peças móveis em casas inundadas são eliminadas.
    if (state.config.rules) {
      const tide = applyTide(withTurn);
      if (tide.lost > 0) {
        withTurn = {
          ...withTurn,
          pieces: tide.pieces,
          selectedPieceId: tide.pieces.some((p) => p.id === withTurn.selectedPieceId && p.isAlive) ? withTurn.selectedPieceId : null,
        };
      }
    }
    const winner = TurnEngine.checkVictory(withTurn);

    if (winner) {
      return GameEngine.endMatch(withTurn, winner, "flag");
    }

    // Fim por limite de rodadas (ritmos Rápida/Relâmpago): vence quem tem mais pontos.
    const rules = state.config.rules;
    if (rules && roundOf(withTurn.turnNumber) > rules.roundLimit) {
      return GameEngine.endMatch(withTurn, winnerByPoints(withTurn).winner, "points");
    }

    return withTurn;
  },

  /** Encerra a partida com vencedor e motivo. */
  endMatch(state: GameState, winner: Player, reason: "flag" | "points" | "time"): GameState {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(
          "conflict:lastResult",
          JSON.stringify({ winner, turn: state.turnNumber, reason, finishedAt: Date.now() }),
        );
      } catch {
        /* armazenamento indisponível: o resultado só não fica guardado */
      }
    }
    return { ...state, gameOver: true, winner, endReason: reason, selectedPieceId: null };
  },

  /** O relógio total de `player` chegou a zero: ele perde. */
  timeOut(state: GameState, player: Player): GameState {
    if (state.gameOver) return state;
    return GameEngine.endMatch(state, GameEngine.nextPlayer(player), "time");
  },

  /**
   * Jogada automática segura (acabou o tempo da jogada): prefere mover sem atacar, avançando em
   * direção ao inimigo; se nenhuma peça puder se mover, encerra o turno.
   */
  autoMove(state: GameState): GameState {
    if (state.gameOver || state.actionLocked) return state;
    const owner = state.currentPlayer === "BLUE" ? "blue" : "red";
    const forward = owner === "blue" ? 1 : -1; // Azul avança para as colunas altas
    const blocked = GameEngine.blockedTiles(state);
    const bounds = GameEngine.bounds(state);
    let best: { piece: Piece; target: Coord; score: number } | null = null;
    for (const piece of state.pieces) {
      if (!piece.isAlive || piece.owner !== owner) continue;
      for (const target of MovementEngine.getLegalMoves(piece, state.pieces, bounds, blocked)) {
        const attack = !!PieceManager.findAt(state.pieces, target.row, target.column);
        // Sem ataque é bem melhor; entre os seguros, o que mais avança (e o mais curto, para não revelar o Explorador).
        const advance = (target.column - piece.currentColumn) * forward;
        const dist = Math.abs(target.column - piece.currentColumn) + Math.abs(target.row - piece.currentRow);
        const score = (attack ? -1000 : 0) + advance * 10 - (piece.pieceType === "scout" && dist > 1 ? 50 : 0) - dist;
        if (!best || score > best.score) best = { piece, target, score };
      }
    }
    if (!best) return GameEngine.finalizeTurn({ ...state, selectedPieceId: null });
    return GameEngine.moveSelectedTo({ ...state, selectedPieceId: best.piece.id }, best.target);
  },

  moveSelectedTo(state: GameState, target: Coord): GameState {
    if (state.gameOver || state.actionLocked) return state;
    const selected = GameEngine.selectedPiece(state);
    if (!selected) return state;
    if (ownerToPlayer(selected.owner) !== state.currentPlayer) return state;
    const bounds = GameEngine.bounds(state);
    if (
      !MovementEngine.isLegalMove(
        selected,
        state.pieces,
        target,
        bounds,
        GameEngine.blockedTiles(state),
      )
    )
      return state;

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
      const { pieces: moved } = MovementEngine.execute(
        state.pieces,
        selected.id,
        target,
        bounds,
      );
      // Explorador que anda mais de uma casa é visto por ambos os jogadores (doc 04, seção 7).
      const steps = Math.max(
        Math.abs(target.row - selected.currentRow),
        Math.abs(target.column - selected.currentColumn),
      );
      const pieces =
        selected.pieceType === "scout" && steps > 1
          ? moved.map((p) => (p.id === selected.id ? { ...p, isRevealed: true } : p))
          : moved;
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
      case "AUTO_MOVE":
        return GameEngine.autoMove(state);
      case "TIME_OUT":
        return GameEngine.timeOut(state, action.player);
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
