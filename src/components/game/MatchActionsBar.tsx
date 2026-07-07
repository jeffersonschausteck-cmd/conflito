import { useGameState } from "@/hooks/useGameState";
import { GameButton } from "@/components/ui/GameButton";

/**
 * Área de ações reais da partida. O Conflito não tem estágios
 * separados de "mover/atacar/defender/esperar" — mover para uma casa
 * já resolve o combate automaticamente (doc 04 §10). Por isso esta
 * barra só expõe ações que realmente existem no Motor: cancelar a
 * seleção atual e encerrar o turno.
 *
 * Faixa fina posicionada logo abaixo do tabuleiro (não é mais um painel
 * de rodapé) para deixar o máximo de altura possível para o tabuleiro.
 */
export function MatchActionsBar() {
  const { state, selectedPiece, selectPiece, dispatch } = useGameState();

  const statusText = state.gameOver
    ? "Partida encerrada"
    : selectedPiece
      ? "Peça selecionada — mova ou ataque"
      : "Selecione uma peça";

  return (
    <div className="flex w-full shrink-0 items-center justify-between gap-3 rounded-lg border border-cyan-500/20 bg-slate-900/70 px-4 py-2 backdrop-blur-md">
      <p className="hidden truncate text-[10px] uppercase tracking-[0.15em] text-muted-foreground md:block">
        {statusText}
      </p>

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
