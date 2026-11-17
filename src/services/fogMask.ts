// Informação oculta no servidor (docs/04-Regras.md, seção 7, e docs/10-Multiplayer.md): cada jogador só recebe o que
// pode ver. O servidor guarda o estado completo; o que vai pela rede passa por `maskStateFor`.
import { FogOfWarEngine } from "@/services/fogOfWarEngine";
import { PIECES } from "@/config/pieces";
import type { GameState } from "@/types/gameState";
import type { Piece, PlayerOwner } from "@/types/piece";

/** Peça que o adversário vê quando não pode saber o que ela é: uma figura qualquer, sempre igual (o cliente a desenha como vulto). */
const PLACEHOLDER_TYPE = "infantry" as const;

/**
 * Cópia do estado como o jogador `viewer` pode vê-lo: as peças do adversário ainda ocultas (e que não são a Bandeira,
 * sempre visível) chegam sem tipo, sem patente e com `canMove` verdadeiro, para não entregarem Armadilhas nem nada.
 * Com a partida terminada tudo é mostrado (a tela de resultado revela o tabuleiro inteiro).
 * `viewer` nulo (conexão que não é de jogador): esconde as ocultas dos dois lados.
 */
export function maskStateFor(state: GameState, viewer: PlayerOwner | null): GameState {
  if (state.gameOver) return state;
  const placeholderRank = PIECES[PLACEHOLDER_TYPE].patente ?? 4;
  const hiddenFrom = (p: Piece): boolean => {
    if (!p.isAlive) return false;
    if (viewer === null) return p.pieceType !== "flag" && !p.isRevealed;
    return FogOfWarEngine.isHiddenFrom(p, viewer);
  };
  return {
    ...state,
    pieces: state.pieces.map((p) => (hiddenFrom(p) ? { ...p, pieceType: PLACEHOLDER_TYPE, rank: placeholderRank, canMove: true } : p)),
  };
}

/**
 * Troca os ids das peças por ids sem sentido (`blue-3fa9c1d2`): os ids de origem (`red-bomb-3`) entregariam o tipo.
 * Feito uma vez, no posicionamento; o id fica o mesmo a partida inteira.
 */
export function opaquePieceIds(pieces: Piece[], rand: () => string = randomToken): Piece[] {
  const used = new Set<string>();
  return pieces.map((p) => {
    let id: string;
    do id = `${p.owner}-${rand()}`;
    while (used.has(id));
    used.add(id);
    return { ...p, id };
  });
}

function randomToken(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}
