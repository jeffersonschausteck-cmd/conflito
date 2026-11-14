import type { MapDefinition } from "./types";
import { TERRAINS } from "./terrains";
import { campoAberto } from "./campoAberto";
import { GALLERY } from "./gallery";
import { THEME_ORDER } from "./themes";
import type { Pace } from "@/types/gameState";

/** Registro de todos os mapas (docs/19-Mapas.md): 5 cenários em 3 tamanhos, por id `<cenario>-<modo>`.
 * Para criar um mapa novo, desenhe-o em `gallery.ts`; nenhum outro componente precisa mudar. */
export const MAPS: Record<string, MapDefinition> = GALLERY;

/** Mapa usado quando nada foi escolhido (fundos de tela e testes): a Planície Real da Partida Intensa. */
export const ACTIVE_MAP: MapDefinition = campoAberto;

/** Os 5 mapas de um modo, na ordem dos cenários. */
export function mapsForPace(pace: Pace | undefined | null): MapDefinition[] {
  const p = pace ?? "classic";
  return THEME_ORDER.map((t) => MAPS[`${t}-${p}`]).filter((m): m is MapDefinition => !!m);
}

/** O mapa de um modo: o `mapId` pedido se ele existe para o modo, senão a Planície Real. */
export function mapForPace(pace: Pace | undefined | null, mapId?: string | null): MapDefinition {
  const list = mapsForPace(pace);
  return list.find((m) => m.id === mapId) ?? list[0];
}

/** Aceita só ids de mapa que existem para o modo (usado pelo servidor com dado do cliente). */
export function normalizeMapId(pace: Pace | undefined | null, mapId: unknown): string {
  return mapForPace(pace, typeof mapId === "string" ? mapId : null).id;
}

/** Sorteia um dos 5 mapas do modo. `rand` é injetável para teste. */
export function pickRandomMap(pace: Pace | undefined | null, rand: () => number = Math.random): MapDefinition {
  const list = mapsForPace(pace);
  return list[Math.min(list.length - 1, Math.floor(rand() * list.length))];
}

export * from "./types";
export * from "./terrains";
export * from "./themes";

/**
 * Coordinates whose terrain is a permanent obstacle (Sprint 2.5:
 * floresta/água/montanha). Pure data — the Game Engine never imports
 * this function; the Interface computes the set once and hands it to
 * `GameStateConfig.blockedTiles`, the same bridge already used for
 * `rows`/`cols`.
 */
export function getBlockedTiles(map: MapDefinition): Set<string> {
  const blocked = new Set<string>();
  for (let row = 0; row < map.rows; row++) {
    for (let col = 0; col < map.cols; col++) {
      const terrain = map.tiles[row]?.[col];
      if (terrain && TERRAINS[terrain]?.bloqueado) {
        blocked.add(`${row}-${col}`);
      }
    }
  }
  return blocked;
}
