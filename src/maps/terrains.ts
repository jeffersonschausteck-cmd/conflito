import type { TerrainDefinition, TerrainId } from "./types";

/**
 * Terrain catalog — the single source of truth for how each terrain
 * type is named, colored and described. Adding a new terrain type
 * means adding one entry here; no component needs to change.
 */
export const TERRAINS: Record<TerrainId, TerrainDefinition> = {
  grass: {
    id: "grass",
    nome: "Planície",
    tipo: "Terreno aberto",
    corBase: "#3f6b3f",
    descricao: "Terreno aberto, sem obstáculos relevantes.",
  },
  forest: {
    id: "forest",
    nome: "Floresta",
    tipo: "Vegetação densa",
    corBase: "#2f5233",
    descricao: "Vegetação densa que dificulta a visibilidade no setor.",
    bloqueado: true,
  },
  water: {
    id: "water",
    nome: "Água",
    tipo: "Intransponível",
    corBase: "#2a5f7a",
    descricao: "Corpo d'água que atravessa o campo de batalha.",
    bloqueado: true,
  },
  mountain: {
    id: "mountain",
    nome: "Montanha",
    tipo: "Elevação",
    corBase: "#6b6459",
    descricao: "Elevação rochosa que domina a paisagem ao redor.",
    bloqueado: true,
  },
  road: {
    id: "road",
    nome: "Estrada",
    tipo: "Via de deslocamento",
    corBase: "#8a7f68",
    descricao: "Via utilizada para deslocamento entre setores do campo.",
  },
  "blue-base": {
    id: "blue-base",
    nome: "Base Azul",
    tipo: "Setor de comando",
    corBase: "#1e5fae",
    descricao: "Setor de comando da Facção Azul.",
  },
  "red-base": {
    id: "red-base",
    nome: "Base Vermelha",
    tipo: "Setor de comando",
    corBase: "#a4222c",
    descricao: "Setor de comando da Facção Vermelha.",
  },
};
