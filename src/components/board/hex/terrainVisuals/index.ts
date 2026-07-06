import type { ComponentType } from "react";
import type { TerrainId } from "@/maps/types";
import { GrassTexture } from "./GrassTexture";
import { ForestDecoration } from "./ForestDecoration";
import { MountainDecoration } from "./MountainDecoration";
import { WaterDecoration } from "./WaterDecoration";

export interface TerrainVisualProps {
  size: number;
}

/**
 * Registry mapping each terrain type to its visual decoration. Adding a
 * new terrain's art means adding one entry here (and its component
 * file) — `HexTile` only ever does a lookup, never changes.
 * Terrains with no entry render with just their base color (safe default).
 */
export const TERRAIN_VISUALS: Partial<Record<TerrainId, ComponentType<TerrainVisualProps>>> = {
  grass: GrassTexture,
  forest: ForestDecoration,
  mountain: MountainDecoration,
  water: WaterDecoration,
};

export { GrassTexture, ForestDecoration, MountainDecoration, WaterDecoration };
