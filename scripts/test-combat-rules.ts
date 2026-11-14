// Regras de combate (docs/04-Regras.md, seções 10 e 11), com ênfase em Rei × Assassino: o Rei sempre morre,
// quem quer que ataque. Offline. Rode com: bun run scripts/test-combat-rules.ts
import { CombatEngine } from "../src/services/combatEngine";
import { PIECES } from "../src/config/pieces";
import type { Piece, PieceType } from "../src/types/piece";

let failed = 0;
const check = (name: string, cond: boolean) => {
  console.log(`${cond ? "ok  " : "FAIL"} ${name}`);
  if (!cond) failed++;
};

function piece(id: string, type: PieceType, owner: "blue" | "red", row: number, col: number): Piece {
  return {
    id,
    owner,
    pieceType: type,
    rank: PIECES[type].patente ?? 0,
    currentRow: row,
    currentColumn: col,
    isRevealed: false,
    isAlive: true,
    canMove: PIECES[type].podeMover,
  } as unknown as Piece;
}

function duel(att: PieceType, def: PieceType) {
  const a = piece("a", att, "blue", 0, 0);
  const d = piece("d", def, "red", 0, 1);
  const r = CombatEngine.resolve({ pieces: [a, d], attackerId: "a", defenderId: "d", tile: { row: 0, column: 1 } });
  const alive = (id: string) => r.pieces.some((p) => p.id === id && p.isAlive);
  return { outcome: r.result.outcome, attackerAlive: alive("a"), defenderAlive: alive("d"), at: r.pieces.find((p) => p.id === "a" && p.isAlive)?.currentColumn };
}

const spyKills = duel("spy", "commander");
check("Assassino ataca o Rei: o Rei morre", spyKills.outcome === "ATTACKER_WINS" && spyKills.attackerAlive && !spyKills.defenderAlive);
check("Assassino que vence ocupa a casa do Rei", spyKills.at === 1);

const kingKilled = duel("commander", "spy");
check("Rei ataca o Assassino: o Rei morre", kingKilled.outcome === "DEFENDER_WINS" && !kingKilled.attackerAlive && kingKilled.defenderAlive);

// O resto continua pela força normal.
check("Rei vence o Duque", duel("commander", "officer").outcome === "ATTACKER_WINS");
check("Assassino perde para o Duque quando ataca", duel("spy", "officer").outcome === "DEFENDER_WINS");
check("Duque vence o Assassino", duel("officer", "spy").outcome === "ATTACKER_WINS");
check("Assassino x Assassino: os dois morrem", duel("spy", "spy").outcome === "MUTUAL_DESTRUCTION");
check("Só o Sapador desarma a Armadilha", duel("engineer", "bomb").outcome === "ATTACKER_WINS" && duel("commander", "bomb").outcome === "DEFENDER_WINS");

console.log(failed === 0 ? "\nTUDO OK" : `\n${failed} FALHA(S)`);
process.exit(failed === 0 ? 0 : 1);
