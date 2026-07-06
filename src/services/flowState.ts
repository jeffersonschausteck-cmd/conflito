// Lightweight client-side flow state. No gameplay logic — only UX selection.
export type GameMode = "classic" | "modern";

const KEY = "psc:flow";

export interface FlowState {
  mode?: GameMode;
  /** Sprint MP-02: presente quando o jogador está no fluxo Online. */
  online?: boolean;
  onlineRoomId?: string;
  onlineOwner?: "blue" | "red";
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
