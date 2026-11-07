import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { GameStateContext, type GameStateApi } from "@/hooks/useGameState";
import { GameEngine } from "@/services/gameEngine";
import { SoundHooks } from "@/services/soundHooks";
import type { GameAction, GameState } from "@/types/gameState";
import type { PieceId, PlayerOwner } from "@/types/piece";
import type { MatchType, RankingResultView } from "@/types/ranking";
import { ensureConnected, getNetworkClient } from "./networkSingleton";

export interface OnlineGameStateProviderProps {
  initialState: GameState;
  children: ReactNode;
  /** Sprint QA-13 — lado que ESTE navegador está jogando (`flow.onlineOwner`, resolvido por `GamePage`). */
  localOwner: PlayerOwner;
  /** Sprint TIMER-01 — instante (epoch ms) em que o servidor criou a `GameSession` (`GameStarted.matchStartTime`), idêntico pros dois jogadores. */
  matchStartTime: number;
  /** Sprint RANKING-03 — mesmo `matchType` de sempre (`GameStarted.matchType`); fixo pra vida toda da partida, nunca muda depois de definido. */
  matchType: MatchType;
}

/**
 * Alimenta o mesmo `GameStateContext` que `GameStateProvider` (partida
 * local), mas a partir de eventos de rede em vez do reducer local. O
 * cliente NUNCA chama `GameEngine.reduce` para decidir o resultado de
 * uma ação — só usa `GameEngine.selectedPiece`/`legalMovesForSelection`
 * (leituras puras, sem regra nova) para derivar o que a Interface
 * precisa mostrar a partir do estado que o servidor já confirmou
 * (doc 10 — "o estado da partida nunca deverá ser reconstruído pelo
 * cliente").
 */
export function OnlineGameStateProvider({ initialState, children, localOwner, matchStartTime, matchType }: OnlineGameStateProviderProps) {
  const [state, setState] = useState<GameState>(initialState);
  // Sprint SEC-01 — seleção de peça é puramente local (nunca vai pro
  // servidor, nunca é rebroadcastada). Antes ela viajava como uma ação
  // de rede (`SelectPiece`) e o servidor devolvia o `GameState` já com
  // `selectedPieceId` preenchido pros DOIS jogadores — o que deixava o
  // alcance de movimento do Explorador (a única peça de longo alcance)
  // visível também na tela do adversário, denunciando o tipo da peça
  // mesmo escondida pelo Fog of War. Guardando a seleção só neste
  // client e "emprestando" o campo `selectedPieceId` apenas na hora de
  // chamar as funções puras do Motor (nunca mutando o `state` real),
  // o adversário nunca sabe que uma peça foi selecionada.
  const [localSelectedPieceId, setLocalSelectedPieceId] = useState<PieceId | null>(null);
  // Sprint TIMER-01 — só `GameFinished` carrega `matchEndTime` (o
  // servidor só o define quando `gameOver` vira verdadeiro pela
  // primeira vez); fica `null` até lá.
  const [matchEndTime, setMatchEndTime] = useState<number | null>(null);
  // Sprint REC-01 — "victory" (combate normal) ou "forfeit" (W.O. por
  // desconexão) — vem junto do `GameFinished`, nunca inferido no cliente.
  const [matchEndReason, setMatchEndReason] = useState<"victory" | "forfeit" | null>(null);
  // Sprint REC-01 — prazo pro ADVERSÁRIO reconectar (`null` = ambos
  // conectados). Vem do servidor via `PlayerDisconnected`/
  // `PlayerReconnected` — nunca calculado localmente, mesmo padrão de
  // `deploymentDeadline`/`matchStartTime`.
  const [opponentDisconnectDeadline, setOpponentDisconnectDeadline] = useState<number | null>(null);
  // Sprint RANKING-01 — vem junto do `GameFinished`; `null` até a
  // partida terminar (ou numa partida casual, onde o servidor manda
  // `ranking: null` de propósito).
  const [rankingResult, setRankingResult] = useState<RankingResultView | null>(null);

  useEffect(() => {
    // Sprint QA-09 — diferente de todas as outras telas do fluxo online
    // (online-lobby, waiting-room, deployment), esta era a única que
    // usava `getNetworkClient()` puro em vez de `ensureConnected()` —
    // ou seja, nunca garantia que o socket estivesse de fato aberto ao
    // montar `/game`. Se a conexão não estivesse viva nesse instante,
    // `ActionApplied` nunca chegava, silenciosamente: cada jogador
    // ficava "congelado" no estado do `GameStarted`, parecendo estar em
    // partidas independentes.
    const client = ensureConnected();
    return client.onEvent((event) => {
      // `GameStarted` chega de novo aqui numa reconexão pós-queda de
      // socket (ver `NetworkClient`/`GameRoom.handleConnect`) — é o jeito
      // do servidor ressincronizar quem ficou parado no estado antigo.
      if (event.type === "ActionApplied" || event.type === "GameFinished" || event.type === "GameStarted") {
        setState(event.state);
        // Sprint SEC-01 — qualquer ação confirmada (própria ou do
        // adversário) pode ter movido/capturado a peça selecionada
        // localmente; limpar evita highlight de movimento apontando
        // pra uma peça que já não está mais onde estava.
        setLocalSelectedPieceId(null);
      }
      // Sprint TIMER-01 — `matchEndTime` vem do servidor junto do
      // resultado final, mesma fonte pros dois jogadores.
      if (event.type === "GameFinished") {
        setMatchEndTime(event.matchEndTime);
        setMatchEndReason(event.reason ?? "victory");
        // Sprint RANKING-01 — `ranking` já vem calculado e tailorizado
        // pra ESTE jogador especificamente (`GameRoom.sendGameFinished`
        // manda um envelope por conexão) — nunca recalculado aqui.
        setRankingResult(event.ranking);
      }
      // Sprint AUDIO-01 — rejeição vinda do servidor (ex.: agir fora do
      // turno) é uma ação inválida como qualquer outra, mesmo sem
      // corresponder a um clique fora de alcance localmente.
      if (event.type === "ActionRejected") {
        SoundHooks.playInvalidAction();
      }
      // Sprint REC-01 — `GameRoom.broadcast` só alcança conexões ainda
      // abertas, e a do jogador que caiu já foi removida antes desse
      // envio (`handleClose`) — então este evento só chega mesmo pro
      // ADVERSÁRIO de quem desconectou, nunca pro próprio.
      if (event.type === "PlayerDisconnected") {
        setOpponentDisconnectDeadline(event.reconnectDeadline);
      }
      if (event.type === "PlayerReconnected") {
        setOpponentDisconnectDeadline(null);
      }
    });
  }, []);

  // Sprint SEC-01 — puramente local: nenhum envio de rede, nenhum
  // vazamento pro adversário (ver comentário no state acima). Reusa
  // `GameEngine.selectPiece` só como validação pura (peça viva, dono =
  // jogador da vez) — o resultado nunca é aplicado ao `state` de rede,
  // só o `selectedPieceId` validado vira o estado local.
  const selectPiece = useCallback(
    (pieceId: PieceId | null) => {
      setLocalSelectedPieceId(GameEngine.selectPiece(state, pieceId).selectedPieceId);
    },
    [state],
  );

  // Sprint QA-R02-01 — o servidor precisa saber QUAL peça mover
  // (`GameRoom` valida a seleção com `GameEngine.selectPiece` antes de
  // aplicar o movimento, ver `GameRoom.ts`); sem `pieceId` aqui, todo
  // `MovePiece` virava `ActionRejected` pros dois jogadores desde a
  // Sprint SEC-01. Não-op se não houver seleção local válida — o botão/
  // clique que chama isto já depende de uma peça selecionada.
  const moveSelectedTo = useCallback(
    (row: number, col: number) => {
      if (localSelectedPieceId) {
        try {
          getNetworkClient().send({ type: "MovePiece", pieceId: localSelectedPieceId, row, column: col });
        } catch {
          // Socket caiu e está reconectando (`NetworkClient.handleSocketDown`);
          // a próxima ação do jogador tende a funcionar assim que reconectar.
        }
      }
      setLocalSelectedPieceId(null);
    },
    [localSelectedPieceId],
  );

  // Fim de partida/reset local não fazem sentido online — a sala inteira
  // é quem decide (ainda não implementado nesta sprint); mantidos como
  // no-ops para a Interface continuar funcionando sem checar o modo.
  const clearLastCombat = useCallback(() => {}, []);
  const reset = useCallback(() => {}, []);

  const dispatch = useCallback((action: GameAction) => {
    if (action.type === "END_TURN") {
      getNetworkClient().send({ type: "EndTurn" });
    }
    // Outras ações (RESET/CLEAR_LAST_COMBAT) não têm efeito de rede —
    // o servidor é a única autoridade sobre elas nesta sprint.
  }, []);

  // Sprint SEC-01 — as duas funções do Motor continuam puras e
  // inalteradas; só "emprestamos" `selectedPieceId` de um estado local,
  // nunca do `state` de rede, então o Motor nunca sabe (nem precisa
  // saber) que a seleção virou 100% client-side.
  const selectedPiece = useMemo(
    () => (localSelectedPieceId ? GameEngine.findPieceById(state, localSelectedPieceId) : null),
    [state, localSelectedPieceId],
  );
  const legalMoves = useMemo(
    () => GameEngine.legalMovesForSelection({ ...state, selectedPieceId: localSelectedPieceId }),
    [state, localSelectedPieceId],
  );

  const value = useMemo<GameStateApi>(
    () => ({
      state,
      selectedPiece,
      legalMoves,
      lastCombat: state.lastCombat,
      selectPiece,
      moveSelectedTo,
      clearLastCombat,
      reset,
      dispatch,
      localOwner,
      matchStartTime,
      matchEndTime,
      opponentDisconnectDeadline,
      matchEndReason,
      rankingResult,
      matchType,
    }),
    [
      state,
      selectedPiece,
      legalMoves,
      selectPiece,
      moveSelectedTo,
      clearLastCombat,
      reset,
      dispatch,
      localOwner,
      matchStartTime,
      matchEndTime,
      opponentDisconnectDeadline,
      matchEndReason,
      rankingResult,
      matchType,
    ],
  );

  return <GameStateContext.Provider value={value}>{children}</GameStateContext.Provider>;
}
