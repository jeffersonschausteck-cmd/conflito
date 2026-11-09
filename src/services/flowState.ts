// Lightweight client-side flow state. No gameplay logic — only UX selection.
import type { MatchType } from "@/types/ranking";
import type { Pace } from "@/types/gameState";

export type GameMode = "classic" | "modern";

const KEY = "psc:flow";

export interface FlowState {
  mode?: GameMode;
  /** Sprint MP-02: presente quando o jogador está no fluxo Online. */
  online?: boolean;
  /** Ritmo escolhido (Clássica, Rápida ou Relâmpago); só partidas offline. */
  pace?: Pace;
  onlineRoomId?: string;
  onlineOwner?: "blue" | "red";
  /**
   * Sprint TIMER-01 — prazo (epoch ms) do cronômetro de Posicionamento,
   * mandado pelo servidor no `RoomStateChanged` que leva a sala a
   * "deployment". `waiting-room.tsx` grava aqui antes de navegar para
   * `/deployment`, porque esse `RoomStateChanged` é um evento único —
   * o listener de `deployment.tsx` só é registrado depois da navegação
   * e nunca o veria via `onEvent` sozinho.
   */
  onlineDeploymentDeadline?: number | null;
  /**
   * Sprint RANKING-03 — mesmo `matchType` de sempre (`GameRoom`,
   * decidido uma única vez na criação da sala), gravado aqui pelo
   * mesmo motivo de `onlineDeploymentDeadline`: o `RoomStateChanged`
   * que o carrega chega antes de `deployment.tsx`/`game.tsx` montarem
   * e registrarem seu próprio listener.
   */
  onlineMatchType?: MatchType;
}

export const flowState = {
  read(): FlowState {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(window.sessionStorage.getItem(KEY) ?? "{}");
    } catch {
      return {};
    }
  },
  write(patch: Partial<FlowState>) {
    if (typeof window === "undefined") return;
    const next = { ...flowState.read(), ...patch };
    window.sessionStorage.setItem(KEY, JSON.stringify(next));
  },
  clear() {
    if (typeof window === "undefined") return;
    window.sessionStorage.removeItem(KEY);
  },
};
