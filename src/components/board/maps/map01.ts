export type TerrainType =
    | "grass"
    | "forest"
    | "water"
    | "mountain"
    | "road"
    | "blue-base"
    | "red-base";

export const map01: TerrainType[][] = [
    ["grass", "grass", "grass", "grass", "grass", "grass", "grass", "grass", "grass", "grass"],
    ["grass", "forest", "forest", "grass", "grass", "grass", "grass", "forest", "forest", "grass"],
    ["grass", "forest", "grass", "grass", "road", "road", "grass", "grass", "forest", "grass"],
    ["grass", "grass", "grass", "mountain", "road", "road", "mountain", "grass", "grass", "grass"],
    ["grass", "grass", "water", "water", "grass", "grass", "water", "water", "grass", "grass"],
    ["grass", "grass", "water", "water", "grass", "grass", "water", "water", "grass", "grass"],
    ["grass", "grass", "grass", "mountain", "road", "road", "mountain", "grass", "grass", "grass"],
    ["grass", "forest", "grass", "grass", "road", "road", "grass", "grass", "forest", "grass"],
    ["grass", "forest", "forest", "grass", "grass", "grass", "grass", "forest", "forest", "grass"],
    ["blue-base", "grass", "grass", "grass", "grass", "grass", "grass", "grass", "grass", "red-base"],
];