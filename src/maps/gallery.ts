import type { MapDefinition, TerrainId, ThemeId } from "./types";
import { campoAberto } from "./campoAberto";
import { campoRapido, campoRelampago } from "./smallFields";

/**
 * Os 15 mapas do jogo: 5 cenários em 3 tamanhos (docs/19-Mapas.md). Dados puros.
 *
 * Cada mapa novo é desenhado como UM QUARTO do campo (o canto de cima à esquerda, só a parte do meio, sem a zona
 * de posicionamento) e o código espelha para os outros três cantos. Assim o terreno é sempre o mesmo para a
 * esquerda e para a direita (justo para os dois lados). A última coluna do desenho encosta na linha do centro.
 *
 * Legenda: `.` planície, `r` estrada (ponte ou passagem), `w` água, `f` floresta, `m` montanha, `k` rochedo,
 * `v` povoado.
 */
export type GalleryPace = "blitz" | "rapid" | "classic";

/** Tamanho de cada modo (igual a `BATTLE_FORMATS` em services/battleFormat.ts; um teste confere). */
export const SIZES: Record<GalleryPace, { rows: number; cols: number; depth: number }> = {
  blitz: { rows: 8, cols: 12, depth: 3 },
  rapid: { rows: 10, cols: 14, depth: 3 },
  classic: { rows: 12, cols: 18, depth: 4 },
};

const LEGEND: Record<string, TerrainId> = { ".": "grass", r: "road", w: "water", f: "forest", m: "mountain", k: "rock", v: "village" };

const NOMES: Record<ThemeId, string> = {
  planicie: "Planície Real",
  vale: "Vale do Rio",
  bosque: "Bosque Real",
  montanha: "Passo da Montanha",
  fosso: "Fosso do Castelo",
};

/** Monta um mapa a partir do quarto desenhado, espelhando para os outros três cantos. */
export function fromQuadrant(theme: ThemeId, pace: GalleryPace, quad: string[]): MapDefinition {
  const { rows, cols, depth } = SIZES[pace];
  const qh = rows / 2;
  const qw = cols / 2 - depth;
  if (quad.length !== qh || quad.some((l) => l.length !== qw)) {
    throw new Error(`Mapa ${theme}-${pace}: o quarto precisa ter ${qh} linhas de ${qw} colunas.`);
  }
  const tiles: TerrainId[][] = Array.from({ length: rows }, () => Array<TerrainId>(cols).fill("grass"));
  for (let qr = 0; qr < qh; qr++) {
    for (let qc = 0; qc < qw; qc++) {
      const t = LEGEND[quad[qr][qc]];
      if (!t) throw new Error(`Mapa ${theme}-${pace}: símbolo "${quad[qr][qc]}" desconhecido.`);
      const c = depth + qc;
      for (const r of [qr, rows - 1 - qr]) {
        tiles[r][c] = t;
        tiles[r][cols - 1 - c] = t;
      }
    }
  }
  // Setores de comando nos cantos opostos (só enfeite, igual aos mapas clássicos).
  tiles[rows - 1][0] = "blue-base";
  tiles[0][cols - 1] = "blue-base";
  tiles[0][0] = "red-base";
  tiles[rows - 1][cols - 1] = "red-base";
  return { id: `${theme}-${pace}`, nome: NOMES[theme], theme, pace, rows, cols, tiles };
}

const QUADRANTS: Record<Exclude<ThemeId, "planicie">, Record<GalleryPace, string[]>> = {
  // Rio no meio do campo (as duas colunas do centro), com duas pontes de 2 casas e povoados nas margens.
  vale: {
    blitz: ["kfw", "v.r", "..r", ".fw"],
    rapid: ["kffw", "v..r", "..vr", ".f.w", "k..w"],
    classic: ["kf.fw", "v...r", ".v..r", "..f.w", "kff.w", "....w"],
  },
  // Floresta densa em manchas, com corredores e rochedos.
  bosque: {
    blitz: ["ff.", "...", ".f.", "f.k"],
    rapid: ["fff.", ".f.k", "..f.", "f.k.", "f..."],
    classic: ["fff..", ".f.k.", "..f.f", "f.k..", "ff.f.", "....f"],
  },
  // Cordilheira no centro com duas passagens de 2 casas; rochedos nos lados.
  montanha: {
    blitz: [".mm", "k.r", "..r", ".km"],
    rapid: [".kmm", "..mm", "k.rr", "..rr", ".kmm"],
    classic: [".kkmm", "..kmm", "k..rr", "...rr", ".k.mm", "..kmm"],
  },
  // Torre (povoado) no centro cercada por um fosso, com travessias de estrada.
  fosso: {
    blitz: [".f.", "...", ".wr", ".wv"],
    rapid: [".f..", "...k", "..f.", ".kwr", "..wv"],
    classic: [".f...", "....k", "..f..", ".k...", "..wwr", "..wwv"],
  },
};

const PACES: GalleryPace[] = ["blitz", "rapid", "classic"];

/** Os 15 mapas, por id (`<cenario>-<modo>`). */
export const GALLERY: Record<string, MapDefinition> = (() => {
  const out: Record<string, MapDefinition> = {};
  const add = (m: MapDefinition) => (out[m.id] = m);
  add(campoRelampago);
  add(campoRapido);
  add(campoAberto);
  for (const theme of Object.keys(QUADRANTS) as Exclude<ThemeId, "planicie">[]) {
    for (const pace of PACES) add(fromQuadrant(theme, pace, QUADRANTS[theme][pace]));
  }
  return out;
})();
