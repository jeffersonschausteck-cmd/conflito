import { useEffect, useState } from "react";

/**
 * Sprint TIMER-01 — os dois únicos hooks de tempo do jogo. Puramente
 * de apresentação: nunca decidem nada sozinhos, só leem um
 * `deadline`/`startTime` que já veio de uma fonte de verdade (offline:
 * `Date.now()` local no momento certo; online: timestamp que o
 * servidor mandou) e re-renderizam a cada tick. O mesmo par de hooks
 * atende Offline e Online — a única diferença entre os dois modos é
 * de ONDE vem o timestamp, nunca como o relógio é desenhado.
 */

const TICK_MS = 250;

/** Contagem REGRESSIVA até `deadline` (epoch ms). `null` = sem prazo definido ainda. */
export function useCountdown(deadline: number | null): number {
  const [remaining, setRemaining] = useState(() =>
    deadline === null ? 0 : Math.max(0, deadline - Date.now()),
  );

  useEffect(() => {
    if (deadline === null) {
      setRemaining(0);
      return;
    }
    setRemaining(Math.max(0, deadline - Date.now()));
    const interval = setInterval(() => {
      setRemaining(Math.max(0, deadline - Date.now()));
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [deadline]);

  return remaining;
}

/**
 * Contagem PROGRESSIVA a partir de `startTime` (epoch ms). Se `endTime`
 * for informado, o relógio para nesse valor fixo (partida encerrada) —
 * nunca continua contando depois do fim, e o valor fica idêntico pros
 * dois jogadores porque `endTime` vem da mesma fonte que `startTime`.
 */
export function useElapsed(startTime: number | null, endTime: number | null): number {
  const [elapsed, setElapsed] = useState(() => {
    if (startTime === null) return 0;
    return (endTime ?? Date.now()) - startTime;
  });

  useEffect(() => {
    if (startTime === null) {
      setElapsed(0);
      return;
    }
    if (endTime !== null) {
      setElapsed(endTime - startTime);
      return;
    }
    setElapsed(Date.now() - startTime);
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [startTime, endTime]);

  return elapsed;
}
