// Ritmos Rápida/Relâmpago (documento 04, seção 17): rodadas, Maré, pontos, tempo e jogada automática.
import { GameEngine } from "../src/services/gameEngine";
import { RULES_BY_PACE, roundOf, tideRings, roundsUntilTide, effectiveBlocked, floodedTiles, scoreOf, winnerByPoints } from "../src/services/matchRules";

let failed = 0;
const ok = (cond: boolean, msg: string) => {
  console.log(`${cond ? "ok  " : "FALHOU"} ${msg}`);
  if (!cond) failed++;
};

const rapid = RULES_BY_PACE.rapid!;
const blitz = RULES_BY_PACE.blitz!;

// rodadas
ok(roundOf(1) === 1 && roundOf(2) === 1 && roundOf(3) === 2 && roundOf(60) === 30 && roundOf(61) === 31, "rodada = uma jogada de cada jogador");

// maré: Rápida começa na rodada 18, +1 faixa a cada 3, máximo 3
ok(tideRings(17, rapid) === 0 && tideRings(18, rapid) === 1 && tideRings(20, rapid) === 1 && tideRings(21, rapid) === 2 && tideRings(24, rapid) === 3 && tideRings(30, rapid) === 3, "Maré da Rápida sobe 18/21/24 e para em 3 faixas");
ok(tideRings(10, blitz) === 1 && tideRings(14, blitz) === 3 && tideRings(20, blitz) === 4, "Maré do Relâmpago sobe 10/12/14/16 e para em 4");
ok(roundsUntilTide(16, rapid) === 2 && roundsUntilTide(18, rapid) === 3 && roundsUntilTide(24, rapid) === null, "aviso: faltam 2 rodadas antes, depois 3, nunca mais ao fim");
ok(tideRings(30, null) === 0, "Clássica não tem Maré");

const fresh = () => GameEngine.createInitialState({ rows: 12, cols: 18, rules: rapid });

// casas inundadas e bloqueio
{
  let s = fresh();
  s = { ...s, turnNumber: 2 * 18 - 1 }; // rodada 18
  const fl = floodedTiles(s);
  ok(fl.has("0-0") && fl.has("11-17") && fl.has("5-0") && !fl.has("1-1"), "rodada 18 inunda só a faixa externa");
  ok(effectiveBlocked(s).has("0-5"), "casa inundada vira bloqueada");
  // Bandeira/Bomba na faixa: a casa continua acessível e a peça sobrevive
  const flag = s.pieces.find((p) => p.owner === "blue" && p.pieceType === "flag")!;
  const bomb = s.pieces.find((p) => p.owner === "blue" && p.pieceType === "bomb")!;
  const inf = s.pieces.find((p) => p.owner === "blue" && p.pieceType === "infantry")!;
  const pieces = s.pieces.map((p) => (p.id === flag.id ? { ...p, currentRow: 0, currentColumn: 3 } : p.id === bomb.id ? { ...p, currentRow: 0, currentColumn: 4 } : p.id === inf.id ? { ...p, currentRow: 0, currentColumn: 6 } : p));
  s = { ...s, pieces };
  ok(!effectiveBlocked(s).has("0-3") && !effectiveBlocked(s).has("0-4") && effectiveBlocked(s).has("0-6"), "casa da Bandeira e da Bomba não é bloqueada");
  // finalizeTurn aplica a Maré: a Infantaria cai; Bandeira e Bomba ficam
  const next = GameEngine.finalizeTurn({ ...s, turnNumber: 2 * 18 - 2, actionLocked: true });
  const alive = (id: string) => next.pieces.find((p) => p.id === id)!.isAlive;
  ok(next.turnNumber === 2 * 18 - 1 && !alive(inf.id) && alive(flag.id) && alive(bomb.id) && !next.gameOver, "Maré elimina peça móvel e poupa Bandeira e Bomba");
}

// pontos e desempate
{
  const s = fresh();
  const blue = scoreOf(s, "blue");
  ok(blue.captured === 0 && blue.alive === 40 && blue.flag === 10 && blue.total === 50, "placar inicial: 40 vivas + 10 da Bandeira");
  // Azul captura um Comandante vermelho (7)
  const cmd = s.pieces.find((p) => p.owner === "red" && p.pieceType === "commander")!;
  const s2 = { ...s, pieces: s.pieces.map((p) => (p.id === cmd.id ? { ...p, isAlive: false } : p)) };
  const r = winnerByPoints(s2);
  ok(r.blue.captured === 7 && r.blue.total === 57 && r.red.total === 49 && r.winner === "BLUE", "captura do Comandante vale 7 e dá a vitória por pontos");
  ok(winnerByPoints(s).winner === "RED", "empate total: vence o Vermelho");
}

// fim por limite de rodadas
{
  let s = fresh();
  s = { ...s, turnNumber: 2 * 30, actionLocked: true }; // última jogada da rodada 30
  const done = GameEngine.finalizeTurn(s);
  ok(done.gameOver && done.endReason === "points" && done.winner === "RED", "ao passar da rodada 30 a partida acaba por pontos");
  const notYet = GameEngine.finalizeTurn({ ...s, turnNumber: 2 * 30 - 1 });
  ok(!notYet.gameOver, "na rodada 30 ainda se joga");
  const classic = GameEngine.createInitialState({ rows: 12, cols: 18 });
  ok(!GameEngine.finalizeTurn({ ...classic, turnNumber: 500, actionLocked: true }).gameOver, "Clássica nunca acaba por rodadas");
}

// tempo esgotado e jogada automática
{
  const s = fresh();
  const t = GameEngine.reduce(s, { type: "TIME_OUT", player: "BLUE" });
  ok(t.gameOver && t.winner === "RED" && t.endReason === "time", "relógio zerado: o jogador perde");
  const before = s.pieces.filter((p) => p.isAlive && p.owner === "blue").map((p) => `${p.currentRow}-${p.currentColumn}`).join();
  const a = GameEngine.reduce(s, { type: "AUTO_MOVE" });
  const after = a.pieces.filter((p) => p.isAlive && p.owner === "blue").map((p) => `${p.currentRow}-${p.currentColumn}`).join();
  ok(a.currentPlayer === "RED" && a.turnNumber === 2 && before !== after && a.pieces.every((p) => p.isAlive), "jogada automática move uma peça sem atacar e passa o turno");
}

console.log(failed === 0 ? "\nTUDO OK" : `\n${failed} FALHA(S)`);
if (failed) process.exit(1);
