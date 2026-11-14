import type { ThemeId } from "./types";

/**
 * Os 5 cenários do jogo (docs/19-Mapas.md): nome e visual de cada um. Dados puros, usados pela Interface (3D e
 * prévias) — o Motor nunca lê isto. Todos seguem o tema de monarquia.
 */
export interface MapTheme {
  id: ThemeId;
  nome: string;
  descricao: string;
  /** Cor de destaque nos cartões e nas prévias. */
  destaque: string;
  /** Cor aplicada às casas de grama do tabuleiro e do terreno em volta. */
  grama: string;
  gramaBorda: string;
  mar: string;
  /** Luz e céu. `sol` é a direção do sol (x, y, z); quanto menor o y, mais baixo e alaranjado. */
  sol: [number, number, number];
  corSol: string;
  intensidadeSol: number;
  turbidez: number;
  rayleigh: number;
  hemiCeu: string;
  hemiChao: string;
  nevoa: string;
  nevoaPerto: number;
  nevoaLonge: number;
  /** Modelos 3D de cada tipo de terreno (arquivos de public/models/kaykit). */
  florestas: string[];
  montanhas: string[];
  rochedos: string[];
  povoados: string[];
  /** Enfeites do terreno que cerca o tabuleiro (fora do jogo) e a chance de cada casa ter um. */
  enfeites: string[];
  chanceEnfeite: number;
}

export const THEMES: Record<ThemeId, MapTheme> = {
  planicie: {
    id: "planicie",
    nome: "Planície Real",
    descricao: "Lago no centro, estrada, florestas e montanhas sob a luz dourada da tarde.",
    destaque: "#f59e0b",
    grama: "#7fe07a",
    gramaBorda: "#6fd070",
    mar: "#2f88c6",
    sol: [-0.62, 0.38, -0.5],
    corSol: "#ffd7a0",
    intensidadeSol: 2.0,
    turbidez: 5,
    rayleigh: 1.8,
    hemiCeu: "#cfe4ff",
    hemiChao: "#5b7a3c",
    nevoa: "#c3d6e8",
    nevoaPerto: 34,
    nevoaLonge: 70,
    florestas: ["trees_A_large", "trees_B_large", "trees_A_medium"],
    montanhas: ["mountain_A_grass_trees", "mountain_B_grass_trees", "mountain_C_grass_trees"],
    rochedos: ["rock_single_A", "rock_single_B", "rock_single_C"],
    povoados: ["building_windmill_yellow", "building_home_A_yellow"],
    enfeites: ["trees_A_large", "trees_B_large", "trees_A_medium"],
    chanceEnfeite: 0.55,
  },
  vale: {
    id: "vale",
    nome: "Vale do Rio",
    descricao: "Um rio corta o campo, com pontes e povoados nas margens, numa manhã clara de primavera.",
    destaque: "#38bdf8",
    grama: "#a6f08a",
    gramaBorda: "#93e07c",
    mar: "#3fa0d8",
    sol: [-0.35, 0.62, -0.55],
    corSol: "#fff1cc",
    intensidadeSol: 2.2,
    turbidez: 3,
    rayleigh: 2.6,
    hemiCeu: "#d9f0ff",
    hemiChao: "#6e9a4a",
    nevoa: "#d7ecfa",
    nevoaPerto: 42,
    nevoaLonge: 85,
    florestas: ["trees_A_small", "trees_B_small", "trees_A_medium"],
    montanhas: ["hills_A_trees", "hills_B_trees", "hills_C_trees"],
    rochedos: ["rock_single_A", "rock_single_D"],
    povoados: ["building_windmill_green", "building_home_A_green", "building_watermill_green", "building_well_yellow"],
    enfeites: ["building_windmill_green", "building_home_A_green", "trees_A_small", "trees_B_small", "tree_single_A"],
    chanceEnfeite: 0.5,
  },
  bosque: {
    id: "bosque",
    nome: "Bosque Real",
    descricao: "Floresta fechada, com corredores estreitos e rochedos, num fim de tarde alaranjado.",
    destaque: "#22c55e",
    grama: "#5fc467",
    gramaBorda: "#4fb359",
    mar: "#2a7aa8",
    sol: [-0.7, 0.2, -0.35],
    corSol: "#ffb066",
    intensidadeSol: 1.9,
    turbidez: 8,
    rayleigh: 1.2,
    hemiCeu: "#ffd9b0",
    hemiChao: "#2f5a35",
    nevoa: "#e8c9a0",
    nevoaPerto: 28,
    nevoaLonge: 60,
    florestas: ["trees_A_large", "trees_B_large", "trees_B_medium", "trees_A_medium"],
    montanhas: ["mountain_A_grass_trees", "mountain_B_grass_trees"],
    rochedos: ["rock_single_B", "rock_single_C", "rock_single_E"],
    povoados: ["building_tower_base_green", "building_home_A_green"],
    enfeites: ["trees_A_large", "trees_B_large", "trees_B_medium", "rock_single_B", "tent"],
    chanceEnfeite: 0.8,
  },
  montanha: {
    id: "montanha",
    nome: "Passo da Montanha",
    descricao: "Uma cordilheira com passagens estreitas, colinas e pedras sob um céu frio e prateado.",
    destaque: "#94a3b8",
    grama: "#8ec486",
    gramaBorda: "#7fb378",
    mar: "#3a7fa6",
    sol: [-0.45, 0.28, -0.6],
    corSol: "#dfe8ff",
    intensidadeSol: 1.5,
    turbidez: 10,
    rayleigh: 0.8,
    hemiCeu: "#d6e2f2",
    hemiChao: "#6f7f6a",
    nevoa: "#c9d3de",
    nevoaPerto: 26,
    nevoaLonge: 58,
    florestas: ["trees_A_medium", "trees_B_medium"],
    montanhas: ["mountain_A_grass_trees", "mountain_B_grass_trees", "mountain_C_grass_trees"],
    rochedos: ["rock_single_A", "rock_single_C", "rock_single_D", "rock_single_E"],
    povoados: ["building_tower_base_yellow", "building_barracks_yellow"],
    enfeites: ["mountain_A_grass_trees", "mountain_C_grass_trees", "hills_A_trees", "rock_single_D", "rock_single_E"],
    chanceEnfeite: 0.7,
  },
  fosso: {
    id: "fosso",
    nome: "Fosso do Castelo",
    descricao: "Uma torre no centro cercada por um fosso, com travessias, num pôr do sol avermelhado.",
    destaque: "#ef4444",
    grama: "#9ad66f",
    gramaBorda: "#86c45f",
    mar: "#2f78b0",
    sol: [-0.72, 0.14, -0.3],
    corSol: "#ff8f66",
    intensidadeSol: 1.8,
    turbidez: 9,
    rayleigh: 2.2,
    hemiCeu: "#ffc4a8",
    hemiChao: "#6a6a3c",
    nevoa: "#f0b8a0",
    nevoaPerto: 30,
    nevoaLonge: 64,
    florestas: ["trees_A_large", "trees_A_medium"],
    montanhas: ["mountain_A_grass_trees", "mountain_B_grass_trees"],
    rochedos: ["rock_single_A", "rock_single_B"],
    povoados: ["building_tower_base_blue", "building_tower_catapult_red", "building_market_yellow"],
    enfeites: ["building_tower_base_yellow", "tent", "trees_A_medium", "building_home_A_yellow"],
    chanceEnfeite: 0.45,
  },
};

export const THEME_ORDER: ThemeId[] = ["planicie", "vale", "bosque", "montanha", "fosso"];
