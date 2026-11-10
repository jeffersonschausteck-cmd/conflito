import type { Pace } from "@/types/gameState";
import { PACE_NAMES } from "@/services/battleFormat";

/** Ordem das abas: do menor para o maior modo (docs/04-Regras.md, seção 19). */
const ORDER: Pace[] = ["blitz", "rapid", "classic"];

/**
 * Abas dos três modos, usadas no Ranking e no Perfil: cada modo tem a sua própria ranqueada
 * (docs/16 - Sistema de Contas, "Ranqueada por modo").
 */
export function ModeTabs({ value, onChange }: { value: Pace; onChange: (pace: Pace) => void }) {
  return (
    <div role="tablist" aria-label="Modo de jogo" className="grid grid-cols-3 gap-2">
      {ORDER.map((id) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          onClick={() => onChange(id)}
          className={`rounded border px-2 py-2 font-display text-[11px] font-bold uppercase tracking-[0.1em] transition-colors sm:text-xs ${
            value === id ? "border-cyan-400/70 bg-cyan-500/15 text-cyan-100" : "border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
          }`}
        >
          {PACE_NAMES[id]}
        </button>
      ))}
    </div>
  );
}
