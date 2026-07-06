import type { MapDefinition } from "./types";
import { TERRAINS } from "./terrains";
import { campoAberto } from "./campoAberto";

/** Registry of every map available to the Interface. Add a new map by
 * exporting a `MapDefinition` from its own file and registering it here —
 * no other component needs to change. */
export const MAPS: Record<string, MapDefinition> = {
  "campo-aberto": campoAberto,
};

/** Map currently used for matches. Selecting between maps is a future
 * feature (mode/map selection screen) — v1 always uses this one. */
export const ACTIVE_MAP: MapDefinition = campoAberto;

export * from "./types";
export * from "./terrains";

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
