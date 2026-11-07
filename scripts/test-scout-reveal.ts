// Explorador: 1 casa continua oculto; mais de 1 casa fica revelado (doc 04, seção 7).
import { GameEngine } from "../src/services/gameEngine";

function run(steps: number) {
  const s0 = GameEngine.createInitialState({ rows: 10, cols: 10 });
  const scout = s0.pieces.find((p) => p.owner === "blue" && p.pieceType === "scout")!;
  const other = s0.pieces.find((p) => p.owner === "red")!;
  const pieces = [
    { ...scout, currentRow: 5, currentColumn: 3, isRevealed: false, isAlive: true },
    { ...other, currentRow: 0, currentColumn: 0, isAlive: true },
  ];
  let s = { ...s0, pieces, currentPlayer: "BLUE" as const, selectedPieceId: scout.id };
  s = GameEngine.moveSelectedTo(s, { row: 5, column: 3 + steps });
  const after = s.pieces.find((p) => p.id === scout.id)!;
  return { col: after.currentColumn, revealed: after.isRevealed };
}
const one = run(1);
const three = run(3);
console.log("1 casa:", one, "| 3 casas:", three);
if (one.col !== 4 || one.revealed) throw new Error("1 casa deveria continuar oculto");
if (three.col !== 6 || !three.revealed) throw new Error("3 casas deveria revelar");
console.log("OK");
