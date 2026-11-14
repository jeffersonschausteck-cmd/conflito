// Busca o aprendizado agregado da IA (docs/09-IA.md, versão 1.3) no servidor, para a Campanha no navegador.
// São só números anônimos por modo; sem conexão ou com qualquer falha, devolve null e a IA joga como sempre.

import { sanitizeLearning, type LearningData } from "@/services/aiLearning";
import { MULTIPLAYER_WS_URL } from "./networkSingleton";
import type { Pace } from "@/types/gameState";

/** "wss://host/connect" -> "https://host/learning/<modo>" */
export function learningUrl(pace: Pace, wsUrl: string = MULTIPLAYER_WS_URL): string {
  return wsUrl.replace(/^ws/, "http").replace(/\/connect\/?$/, "") + `/learning/${pace}`;
}

export async function fetchLearning(pace: Pace, timeoutMs = 2500): Promise<LearningData | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(learningUrl(pace), { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return sanitizeLearning(await res.json());
  } catch {
    return null;
  }
}
