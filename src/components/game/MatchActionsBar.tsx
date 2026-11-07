import { useGameState } from "@/hooks/useGameState";
import { useAITurn } from "@/hooks/useAITurn";
import { GameButton } from "@/components/ui/GameButton";

export interface MatchActionsBarProps {
  isOnline: boolean;
}

/**
 * Área de ações reais da partida. O Conflito não tem estágios
 * separados de "mover/atacar/defender/esperar" — mover para uma casa
 * já resolve o combate automaticamente (doc 04 §10). Por isso esta
 * barra só expõe ações que realmente existem no Motor: cancelar a
 * seleção atual e encerrar o turno.
 *
 * Faixa fina posicionada logo abaixo do tabuleiro (não é mais um painel
 * de rodapé) para deixar o máximo de altura possível para o tabuleiro.
 *
 * Sprint HEX-02 — o aviso "IA analisando" (`useAITurn`) morava acima do
 * tabuleiro, num `<div>` que aparecia/sumia (`mb-3` + badge) — cada vez
 * que a IA pensava, a coluna do tabuleiro (`flex-1 min-h-0`) ganhava ou
 * perdia altura, e o `HexBoard` recalculava seu tamanho (resize
 * visível por alguns segundos). Movido pra dentro desta barra, que já
 * tem altura fixa (`shrink-0`) e nunca muda de linha — o aviso ocupa o
 * espaço ao lado do texto de status, sem nunca quebrar linha nem
 * alterar a altura da barra.
 */
export function MatchActionsBar({ isOnline }: MatchActionsBarProps) {
  const { state, selectedPiece, selectPiece, dispatch } = useGameState();
  // Ver comentário original (Sprint QA-08) em `useAITurn`: a IA local só
  // faz sentido offline — online, `enabled: false` garante que ela
  // nunca sequestra o turno do jogador Vermelho de verdade.
  const { thinking, aiPlayer } = useAITurn({ enabled: !isOnline });

  const statusText = state.gameOver
    ? "Partida encerrada"
    : selectedPiece
      ? "Peça selecionada — mova ou ataque"
      : "Selecione uma peça";

  return (
    <div className="flex w-full shrink-0 items-center justify-between gap-3 rounded-lg border border-cyan-500/20 bg-slate-900/70 px-4 py-1 backdrop-blur-md [@media(min-height:480px)]:py-2">
      <div className="hidden min-w-0 flex-1 items-center gap-4 md:flex">
        <p className="truncate text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          {statusText}
        </p>
        {thinking && (
          <p className="flex shrink-0 items-center gap-1.5 truncate text-[10px] uppercase tracking-[0.15em] text-game-red">
            <span className="inline-block h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-current" />
            {`IA (${aiPlayer === "BLUE" ? "Azul" : "Vermelha"}) analisando o campo de batalha...`}
          </p>
        )}
      </div>

      <div className="flex flex-1 gap-2 md:flex-none">
        <GameButton
          variant="secondary"
          size="sm"
          disabled={!selectedPiece}
          onClick={() => selectPiece(null)}
          className="flex-1 md:flex-none"
        >
          Cancelar Seleção
        </GameButton>

        <GameButton
          variant="primary"
          size="sm"
          disabled={state.gameOver}
          onClick={() => dispatch({ type: "END_TURN" })}
          className="flex-1 md:flex-none"
        >
          Finalizar Turno ▶
        </GameButton>
      </div>
    </div>
  );
}
