// Lightweight client-side flow state. No gameplay logic — only UX selection.
export type GameMode = "classic" | "modern";
export type FactionId = "atlas" | "novatech" | "phantom" | "helix";

const KEY = "psc:flow";

export interface FlowState {
  mode?: GameMode;
  faction?: FactionId;
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

export const FACTIONS: Array<{
  id: FactionId;
  name: string;
  tagline: string;
  color: string;
  glow: string;
}> = [
  {
    id: "atlas",
    name: "Atlas",
    tagline: "Bulwark Division",
    color: "#3b82f6",
    glow: "rgba(59,130,246,0.55)",
  },
  {
    id: "novatech",
    name: "NovaTech",
    tagline: "Signal Operations",
    color: "#22d3ee",
    glow: "rgba(34,211,238,0.55)",
  },
  {
    id: "phantom",
    name: "Phantom",
    tagline: "Shadow Cell",
    color: "#a855f7",
    glow: "rgba(168,85,247,0.55)",
  },
  {
    id: "helix",
    name: "Helix",
    tagline: "Bio-Synthetic Corps",
    color: "#22c55e",
    glow: "rgba(34,197,94,0.55)",
  },
];
