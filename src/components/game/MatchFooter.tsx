import type { ReactNode } from "react";

export interface MatchFooterProps {
  children: ReactNode;
}

/**
 * Faixa inferior da partida — organiza os painéis de peça
 * selecionada / ações / terreno lado a lado. Layout puro, sem estado
 * próprio.
 */
export function MatchFooter({ children }: MatchFooterProps) {
  return (
    <div className="grid grid-cols-1 gap-4 px-6 pb-5 sm:grid-cols-3">{children}</div>
  );
}
