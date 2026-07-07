import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { theme } from "@/design/theme";

export type ScifiFrameVariant = "blue" | "red" | "cyan" | "default";

/** Cantos cortados (chamfer) reaproveitados por qualquer painel que precise da mesma moldura, mas sem a estrutura de conteúdo/aba do ScifiFrame (ex.: HexBoard). */
export const SCIFI_CLIP_PATH =
  "polygon(16px 0, calc(100% - 16px) 0, 100% 16px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 16px 100%, 0 calc(100% - 16px), 0 16px)";

export interface ScifiFrameProps {
  /** Small uppercase label in the top-left corner (e.g. "// COMANDO"). */
  eyebrow?: string;
  /** Text shown in the hexagonal tab at the bottom of the frame. */
  tabLabel?: string;
  variant?: ScifiFrameVariant;
  className?: string;
  children: ReactNode;
}

const TAB_GRADIENT: Record<ScifiFrameVariant, string> = {
  blue: `linear-gradient(90deg, #1e3a8a, ${theme.colors.primaryBlue})`,
  red: `linear-gradient(90deg, #7f1d1d, ${theme.colors.primaryRed})`,
  cyan: "linear-gradient(90deg, #0e7490, #22d3ee)",
  default: "linear-gradient(90deg, #334155, #64748b)",
};

const BORDER_COLOR: Record<ScifiFrameVariant, string> = {
  blue: `${theme.colors.primaryBlue}66`,
  red: `${theme.colors.primaryRed}66`,
  cyan: "rgba(34,211,238,0.5)",
  default: "rgba(148,163,184,0.35)",
};

/**
 * Moldura de cantos cortados com aba de título hexagonal — identidade
 * visual "AAA" aprovada para os HUDs da partida (painéis de jogador,
 * peça selecionada, terreno) e para o próprio tabuleiro. Puramente
 * visual: não conhece regras de jogo nem estado.
 */
export function ScifiFrame({
  eyebrow,
  tabLabel,
  variant = "default",
  className,
  children,
}: ScifiFrameProps) {
  return (
    <div
      className={cn("relative bg-slate-900/80", className)}
      style={{
        clipPath:
          "polygon(16px 0, calc(100% - 16px) 0, 100% 16px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 16px 100%, 0 calc(100% - 16px), 0 16px)",
        border: `1px solid ${BORDER_COLOR[variant]}`,
        boxShadow: `0 0 18px ${BORDER_COLOR[variant]} inset`,
        backgroundImage: "linear-gradient(160deg, #152238, #1b1440)",
      }}
    >
      <div className={cn("px-4 pt-3", tabLabel ? "pb-9" : "pb-4")}>
        {eyebrow && (
          <div className="mb-2 font-display text-[9px] uppercase tracking-[0.3em] text-cyan-300/80">
            {eyebrow}
          </div>
        )}
        {children}
      </div>

      {tabLabel && (
        <div
          className="absolute bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap px-4 py-1.5 font-display text-[9px] font-bold uppercase tracking-[0.15em] text-white"
          style={{
            clipPath: "polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0 50%)",
            backgroundImage: TAB_GRADIENT[variant],
          }}
        >
          {tabLabel}
        </div>
      )}
    </div>
  );
}
