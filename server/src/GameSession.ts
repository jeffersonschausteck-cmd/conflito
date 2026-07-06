// Camada 3 — ÚNICA ponte entre o Multiplayer e o Motor do Jogo.
//
// Nenhuma regra de movimentação, combate, turno ou vitória é
// reimplementada aqui — tudo passa por `GameEngine.reduce`, exatamente
// o mesmo reducer que a Interface local já usa (`useGameState`).

import { GameEngine } from "@/services/gameEngine";
import { ownerToPlayer } from "@/types/gameState";
import { ACTIVE_MAP, getBlockedTiles } from "@/maps";
import type { GameAction, GameState, Player } from "@/types/gameState";
import type { Piece, PlayerOwner } from "@/types/piece";

export interface ApplyResult {
  ok: boolean;
  state: GameState;
  reason?: string;
}

// Ações que consomem o turno de um lado específico. O Motor já valida
// se a PEÇA pertence a quem está na vez — mas não sabe (nem precisa
// saber) qual conexão de rede enviou o pedido. Essa checagem é
// responsabilidade do Multiplayer/Servidor (doc 10 — "proteção contra
// ações inválidas"), por isso vive aqui, não dentro do Motor.
const TURN_ACTIONS = new Set(["SELECT_PIECE", "MOVE_SELECTED", "END_TURN"]);

/**
 * Envolve uma partida (`GameState`) e só permite que ela avance através
 * do Motor. `owner` identifica qual lado (blue/red) o chamador
 * controla — se não for a vez desse lado, a ação é recusada aqui,
 * antes mesmo de chegar ao Motor.
 */
export class GameSession {
  private state: GameState;

  /**
   * `initialPieces`, quando fornecido (posicionamento confirmado pelos
   * dois jogadores — Sprint MP-02), substitui a geração automática
   * padrão do Motor. Nenhuma validação de regra acontece aqui — quem
   * chama (`Room.confirmDeployment`) já validou via `DeploymentManager`
   * antes de chegar neste ponto.
   */
  constructor(initialPieces?: Piece[]) {
    this.state = GameEngine.createInitialState({
      rows: ACTIVE_MAP.rows,
      cols: ACTIVE_MAP.cols,
      blockedTiles: getBlockedTiles(ACTIVE_MAP),
    });
    if (initialPieces) {
      this.state = { ...this.state, pieces: initialPieces };
    }
  }

  getState(): GameState {
    return this.state;
  }

  /**
   * Aplica uma ação em nome de `owner`. Ações que tentam mexer em
   * peças do lado adversário já são recusadas pelo próprio Motor
   * (retornam o mesmo `state`); aqui detectamos isso comparando
   * referência para devolver `ok:false` de forma explícita ao chamador.
   */
  applyAction(owner: PlayerOwner, action: GameAction): ApplyResult {
    if (this.state.gameOver) {
      return { ok: false, state: this.state, reason: "A partida já foi encerrada." };
    }

    if (TURN_ACTIONS.has(action.type) && ownerToPlayer(owner) !== this.state.currentPlayer) {
      return { ok: false, state: this.state, reason: "Não é o seu turno." };
    }

    const before = this.state;
    const next = GameEngine.reduce(before, action);

    if (next === before) {
      return { ok: false, state: before, reason: "Ação inválida ou fora de turno." };
    }

    this.state = next;
    return { ok: true, state: next };
  }

  winner(): Player | null {
    return this.state.winner;
  }
}
