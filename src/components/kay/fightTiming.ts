import type { CombatResult } from "@/types/combat";
import { hexToPixel } from "@/services/hexGeometry";
import { HEX_SIZE } from "@/components/kay/BoardWorld";
import { walkSeconds } from "@/components/kay/KayCharacters";

/** Tempos da cena de luta na casa do alvo (docs/08-Interface.md, "Movimento e Combate"). Só apresentação. */

/** A Bandeira foi capturada neste combate (a partida acaba aqui). */
export function isFlagCapture(c: CombatResult | null | undefined): boolean {
  return !!c && c.defenderSnapshot.pieceType === "flag" && c.outcome === "ATTACKER_WINS";
}

/** Quanto tempo a Bandeira leva para descer pela haste, depois que o capturador a alcança. */
export const FLAG_LOWER_MS = 2200;

/** Distância (em unidades do mundo) em que o atacante para antes do alvo, de frente para ele. */
export const STOP_GAP = 0.8;

/** Distância, em unidades do mundo, entre a casa de origem do atacante e a casa do alvo. */
function worldDistance(c: CombatResult): number {
  const att = c.attackerSnapshot;
  const o = hexToPixel(att.currentRow, att.currentColumn, HEX_SIZE);
  const t = hexToPixel(c.tile.row, c.tile.column, HEX_SIZE);
  return Math.hypot(t.x - o.x, t.y - o.y);
}

/** Quanto tempo o atacante leva caminhando da casa de origem até parar diante do alvo. */
export function walkMsFor(c: CombatResult): number {
  // `walkSeconds` conta em unidades do mundo, igual à peça que anda na tela. O atacante para `STOP_GAP` antes do alvo.
  return walkSeconds(Math.max(0, worldDistance(c) - STOP_GAP)) * 1000 + 150;
}

/** Quanto tempo o vencedor leva para dar o último passo, do ponto onde parou até a casa do alvo. */
export function stepInMs(): number {
  return walkSeconds(STOP_GAP) * 1000 + 100;
}

/** Quanto tempo a tela final deve esperar: a animação de captura da Bandeira. Nos demais fins, nada. */
export function victoryDelayMs(c: CombatResult | null | undefined): number {
  if (!c || !isFlagCapture(c)) return 0;
  return walkMsFor(c) + 60 + FLAG_LOWER_MS + 600;
}
