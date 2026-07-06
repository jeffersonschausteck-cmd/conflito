import { StatusBadge } from "@/components/ui/StatusBadge";

export interface OnlineStatusBadgeProps {
  connected: boolean;
  opponentName?: string;
}

/**
 * Pequeno indicador de conexão reutilizado entre a Sala de Espera, o
 * Posicionamento e a Partida — mostra se o adversário segue conectado.
 * Puramente informativo (doc 10 — "a Interface deverá informar ao
 * jogador... desconexão"), não decide nada sozinho.
 */
export function OnlineStatusBadge({ connected, opponentName }: OnlineStatusBadgeProps) {
  return (
    <StatusBadge
      color={connected ? "green" : "red"}
      label={
        connected
          ? `${opponentName ?? "Adversário"} conectado`
          : `${opponentName ?? "Adversário"} desconectado`
      }
      icon={<span className="inline-block h-2 w-2 rounded-full bg-current" />}
    />
  );
}
