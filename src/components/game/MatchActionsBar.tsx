import { useGameState } from "@/hooks/useGameState";
import { GamePanel } from "@/components/ui/GamePanel";
import { GameButton } from "@/components/ui/GameButton";

/**
 * Área de ações reais da partida. O Conflito não tem estágios
 * separados de "mover/atacar/defender/esperar" — mover para uma casa
 * já resolve o combate automaticamente (doc 04 §10). Por isso esta
 * barra só expõe ações que realmente existem no Motor: cancelar a
 * seleção atual e encerrar o turno.
 */
export function MatchActionsBar() {
  const { state, selectedPiece, selectPiece, dispatch } = useGameState();

  const statusText = state.gameOver
    ? "Partida encerrada"
    : selectedPiece
      ? "Peça selecionada — clique numa casa destacada para mover ou atacar"
      : "Selecione uma peça para agir";

  return (
    <GamePanel variant="default" eyebrow="// AÇÕES DISPONÍVEIS" className="flex h-full flex-col justify-between">
      <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{statusText}</p>

      <div className="mt-4 flex gap-3">
        <GameButton
          variant="secondary"
          size="sm"
          disabled={!selectedPiece}
          onClick={() => selectPiece(null)}
          className="flex-1"
        >
          Cancelar Seleção
        </GameButton>

        <GameButton
          variant="primary"
          size="sm"
          disabled={state.gameOver}
          onClick={() => dispatch({ type: "END_TURN" })}
          className="flex-1"
        >
          Finalizar Turno ▶
        </GameButton>
      </div>
    </GamePanel>
  );
}
