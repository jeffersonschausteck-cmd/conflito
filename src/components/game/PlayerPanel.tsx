import { useGameState } from "@/hooks/useGameState";
import { GamePanel } from "@/components/ui/GamePanel";
import { PIECES } from "@/config/pieces";
import type { PlayerOwner } from "@/types/piece";

const PIECE_TYPES_ORDER = [
  "commander",
  "officer",
  "sniper",
  "engineer",
  "infantry",
  "scout",
  "spy",
  "bomb",
  "flag",
] as const;

export interface PlayerPanelProps {
  owner: PlayerOwner;
}

/**
 * Painel lateral "Jogador Azul" / "Jogador Vermelho" — mesmo
 * componente para os dois lados, parametrizado por `owner`. Mostra só
 * dados reais derivados de `state.pieces` (peças ativas, Comandante
 * vivo, contagem por tipo) — sem "recursos" ou qualquer stat que não
 * exista no Conflito.
 */
export function PlayerPanel({ owner }: PlayerPanelProps) {
  const { state } = useGameState();
  const teamPieces = state.pieces.filter((p) => p.owner === owner);
  const alive = teamPieces.filter((p) => p.isAlive);
  const commanderAlive = alive.some((p) => p.pieceType === "commander");

  const isBlue = owner === "blue";
  const label = isBlue ? "Jogador Azul" : "Jogador Vermelho";
  const variant = isBlue ? "blue" : "red";

  const countByType = (type: string) =>
    alive.filter((p) => p.pieceType === type).length;

  return (
    <GamePanel variant={variant} eyebrow="// COMANDO" title={label} className="flex h-full flex-col">
      <div className="space-y-2 border-b border-border/40 pb-4">
        <StatRow label="Peças Ativas" value={String(alive.length)} />
        <StatRow
          label="Comandante"
          value={commanderAlive ? "Vivo" : "Eliminado"}
          valueClassName={commanderAlive ? "text-game-green" : "text-game-red"}
        />
      </div>

      <div className="mt-4 flex-1 space-y-2 overflow-y-auto">
        <div className="mb-1 text-[9px] uppercase tracking-[0.3em] text-muted-foreground/75">
          Peças Disponíveis
        </div>
        {PIECE_TYPES_ORDER.map((type) => (
          <StatRow key={type} label={PIECES[type].nome} value={String(countByType(type))} />
        ))}
      </div>
    </GamePanel>
  );
}

function StatRow({
  label,
  value,
  valueClassName = "text-game-text",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="uppercase tracking-[0.1em] text-muted-foreground">{label}</span>
      <span className={`font-bold ${valueClassName}`}>{value}</span>
    </div>
  );
}
