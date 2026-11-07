import type { ComponentType } from "react";
import type { TerrainId } from "@/maps/types";
import { GrassTexture } from "./GrassTexture";
import { ForestDecoration } from "./ForestDecoration";
import { MountainDecoration } from "./MountainDecoration";
import { WaterDecoration } from "./WaterDecoration";
import { makeTileImage, FOREST_SCALE } from "./TileImage";

export interface TerrainVisualProps {
  size: number;
}

/**
 * Registry mapping each terrain type to its visual decoration. Adding a
 * new terrain's art means adding one entry here (and its component
 * file) — `HexTile` only ever does a lookup, never changes.
 * Terrains with no entry render with just their base color (safe default).
 *
 * Sprint ART-01 — os cinco terrenos passam a usar arte real (PNG em
 * `public/tiles/`) via `makeTileImage`. As decorações SVG antigas
 * (GrassTexture etc.) seguem exportadas como fallback/documentação.
 */
export const TERRAIN_VISUALS: Partial<Record<TerrainId, ComponentType<TerrainVisualProps>>> = {
  grass: makeTileImage("/tiles/Grama.png"),
  forest: makeTileImage("/tiles/Floresta.png", FOREST_SCALE),
  mountain: makeTileImage("/tiles/Montanhas.png"),
  water: makeTileImage("/tiles/Água.png"),
  road: makeTileImage("/tiles/Terra.png"),
};

export { GrassTexture, ForestDecoration, MountainDecoration, WaterDecoration };
