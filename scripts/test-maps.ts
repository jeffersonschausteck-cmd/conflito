// Mapas e cenários (docs/19-Mapas.md): 5 cenários × 3 tamanhos = 15 mapas, todos justos e jogáveis. Offline.
// Rode com: bun run scripts/test-maps.ts [--ver]   (--ver imprime cada mapa em texto)
import { BATTLE_FORMATS, armySize } from "../src/services/battleFormat";
import { MAPS, THEMES, THEME_ORDER, getBlockedTiles, mapForPace, mapsForPace, normalizeMapId, pickRandomMap, type MapDefinition } from "../src/maps";
import { SIZES } from "../src/maps/gallery";

const show = process.argv.includes("--ver");
let failed = 0;
const check = (name: string, cond: boolean, extra = "") => {
  console.log(`${cond ? "ok  " : "FAIL"} ${name}${extra ? " " + extra : ""}`);
  if (!cond) failed++;
};

const PACES = ["blitz", "rapid", "classic"] as const;
const GLYPH: Record<string, string> = { grass: ".", road: "r", water: "~", forest: "f", mountain: "M", rock: "k", village: "V", "blue-base": ",", "red-base": "," };

/** Vizinhos hexagonais (linhas ímpares deslocadas, igual ao Motor). */
function neighbors(r: number, c: number): [number, number][] {
  const odd = r % 2 === 1;
  const d = odd ? [[0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1]] : [[0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0]];
  return d.map(([dr, dc]) => [r + dr, c + dc]);
}

function analyze(m: MapDefinition) {
  const blocked = getBlockedTiles(m);
  const free: [number, number][] = [];
  for (let r = 0; r < m.rows; r++) for (let c = 0; c < m.cols; c++) if (!blocked.has(`${r}-${c}`)) free.push([r, c]);
  // Caminhada a partir de uma casa livre da zona azul.
  const seen = new Set<string>(["0-0"]);
  const q: [number, number][] = [[0, 0]];
  while (q.length) {
    const [r, c] = q.pop()!;
    for (const [nr, nc] of neighbors(r, c)) {
      if (nr < 0 || nr >= m.rows || nc < 0 || nc >= m.cols || blocked.has(`${nr}-${nc}`) || seen.has(`${nr}-${nc}`)) continue;
      seen.add(`${nr}-${nc}`);
      q.push([nr, nc]);
    }
  }
  return { blocked, free, reached: seen.size };
}

// ── Estrutura geral ──
check("5 cenários cadastrados", THEME_ORDER.length === 5 && Object.keys(THEMES).length === 5);
check("15 mapas no total", Object.keys(MAPS).length === 15);
check("ids únicos no formato <cenario>-<modo>", Object.entries(MAPS).every(([id, m]) => id === m.id && id === `${m.theme}-${m.pace}`));
check("os tamanhos do desenho dos mapas batem com o formato dos modos", PACES.every((p) => SIZES[p].rows === BATTLE_FORMATS[p].rows && SIZES[p].cols === BATTLE_FORMATS[p].cols && SIZES[p].depth === BATTLE_FORMATS[p].depth));
check("os 5 nomes de mapa são diferentes e batem com os cenários", new Set(mapsForPace("rapid").map((m) => m.nome)).size === 5 && mapsForPace("rapid").every((m) => m.nome === THEMES[m.theme].nome));

for (const pace of PACES) {
  const f = BATTLE_FORMATS[pace];
  const list = mapsForPace(pace);
  console.log(`\n== ${pace} (${f.rows} × ${f.cols}, zona ${f.depth})`);
  check(`${pace}: 5 mapas, um de cada cenário`, list.length === 5 && list.every((m, i) => m.theme === THEME_ORDER[i]));
  for (const m of list) {
    const tag = `${m.id}`;
    const a = analyze(m);
    check(`${tag}: tamanho ${f.rows} × ${f.cols}`, m.rows === f.rows && m.cols === f.cols && m.tiles.length === f.rows && m.tiles.every((row) => row.length === f.cols));
    let zonesFree = true;
    for (let r = 0; r < m.rows; r++) for (let c = 0; c < m.cols; c++) if ((c < f.depth || c >= m.cols - f.depth) && a.blocked.has(`${r}-${c}`)) zonesFree = false;
    check(`${tag}: zonas de posicionamento livres`, zonesFree);
    const zoneCells = (side: "blue" | "red") => {
      let n = 0;
      for (let r = 0; r < m.rows; r++) for (let c = side === "blue" ? 0 : m.cols - f.depth; c < (side === "blue" ? f.depth : m.cols); c++) if (!a.blocked.has(`${r}-${c}`)) n++;
      return n;
    };
    check(`${tag}: cada zona comporta o exército (${armySize(f)} peças)`, zoneCells("blue") >= armySize(f) && zoneCells("red") >= armySize(f));
    let mirrored = true;
    for (let r = 0; r < m.rows; r++) for (let c = 0; c < m.cols; c++) if (a.blocked.has(`${r}-${c}`) !== a.blocked.has(`${r}-${m.cols - 1 - c}`)) mirrored = false;
    check(`${tag}: terreno espelhado entre os dois lados`, mirrored);
    check(`${tag}: todas as casas livres se conectam`, a.reached === a.free.length, `(${a.reached}/${a.free.length})`);
    const pct = Math.round((a.free.length / (m.rows * m.cols)) * 100);
    check(`${tag}: pelo menos 70% livre`, pct >= 70, `(${pct}% livre)`);
    if (m.theme !== "planicie") {
      const kinds = new Set(m.tiles.flat().filter((t) => t === "water" || t === "forest" || t === "mountain" || t === "rock" || t === "village"));
      check(`${tag}: tem obstáculos do próprio cenário`, kinds.size >= 2);
    }
    if (show) {
      console.log(`   ${m.nome}`);
      for (const row of m.tiles) console.log("   " + row.map((t) => GLYPH[t] ?? "?").join(" "));
    }
  }
}

// ── Escolha do mapa ──
console.log("\n== Escolha e sorteio");
check("mapForPace sem id devolve a Planície Real do modo", PACES.every((p) => mapForPace(p).theme === "planicie" && mapForPace(p).pace === p));
check("mapForPace com id válido devolve esse mapa", mapForPace("rapid", "bosque-rapid").id === "bosque-rapid");
check("id de outro modo ou inválido vira o primeiro mapa do modo", mapForPace("blitz", "bosque-rapid").id === "planicie-blitz" && mapForPace("classic", "x").id === "planicie-classic" && mapForPace("classic", null).id === "planicie-classic");
check("normalizeMapId só aceita ids do modo e ignora lixo", normalizeMapId("rapid", "fosso-rapid") === "fosso-rapid" && normalizeMapId("rapid", "fosso-classic") === "planicie-rapid" && normalizeMapId("rapid", 42) === "planicie-rapid" && normalizeMapId("rapid", { a: 1 }) === "planicie-rapid");
check("sorteio com rand injetado pega cada um dos 5", [0, 0.21, 0.41, 0.61, 0.81, 0.999].map((r) => pickRandomMap("classic", () => r).theme).join() === "planicie,vale,bosque,montanha,fosso,fosso");
const counts = new Map<string, number>();
for (let i = 0; i < 5000; i++) counts.set(pickRandomMap("blitz").id, (counts.get(pickRandomMap("blitz").id) ?? 0) + 1);
const usados = new Set<string>();
for (let i = 0; i < 400; i++) usados.add(pickRandomMap("rapid").id);
check("o sorteio de verdade alcança os 5 mapas", usados.size === 5);
check("o sorteio só devolve mapas do modo pedido", PACES.every((p) => Array.from({ length: 50 }, () => pickRandomMap(p)).every((m) => m.pace === p)));

// ── Cenários visuais ──
console.log("\n== Cenários visuais");
for (const id of THEME_ORDER) {
  const t = THEMES[id];
  check(`${id}: visual completo`, !!t.nome && /^#[0-9a-f]{6}$/i.test(t.grama) && /^#[0-9a-f]{6}$/i.test(t.mar) && /^#[0-9a-f]{6}$/i.test(t.nevoa) && t.sol.length === 3 && t.sol[1] > 0 && t.florestas.length > 0 && t.montanhas.length > 0 && t.rochedos.length > 0 && t.povoados.length > 0 && t.enfeites.length > 0 && t.chanceEnfeite > 0 && t.chanceEnfeite <= 1);
}
check("os 5 cenários têm céu/luz diferentes entre si", new Set(THEME_ORDER.map((id) => THEMES[id].corSol + THEMES[id].nevoa)).size === 5);

console.log(failed === 0 ? "\nTUDO OK" : `\n${failed} FALHA(S)`);
process.exit(failed === 0 ? 0 : 1);
