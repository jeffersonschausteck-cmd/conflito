// Script de validação E2E (Sprint MP-05) — valida combate, captura de
// bandeira, vitória/derrota e encerramento da sala. Constrói um
// posicionamento customizado (mesmas peças/regras de
// `DeploymentManager`, só em coordenadas escolhidas) para alcançar a
// bandeira em um único movimento, sem reimplementar nenhuma regra —
// tudo passa pelo Motor real (MovementEngine/CombatEngine/TurnEngine)
// através do mesmo protocolo que o Worker já usa.
// Rode com: bun run scripts/test-combat-victory.ts

import { DeploymentManager, DEPLOYMENT_DEPTH } from "@/services/deploymentManager";
import { ACTIVE_MAP, getBlockedTiles } from "@/maps";
import { rehydrateGameState } from "@/multiplayer/NetworkClient";
import type { ServerEvent, ClientEvent } from "@/multiplayer/protocol";
import type { Piece } from "@/types/piece";

const BASE = process.env.WORKER_URL ?? "wss://conflito-multiplayer.jefinhoschaus50.workers.dev";
const buffers = new WeakMap<WebSocket, ServerEvent[]>();

function rehydrate(event: ServerEvent): ServerEvent {
  if ("state" in event && event.state) return { ...event, state: rehydrateGameState(event.state) } as ServerEvent;
  return event;
}

function connect(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const buffer: ServerEvent[] = [];
    buffers.set(ws, buffer);
    ws.addEventListener("message", (ev: any) => buffer.push(rehydrate(JSON.parse(ev.data) as ServerEvent)));
    ws.addEventListener("open", () => resolve(ws));
    ws.addEventListener("error", (e: any) => reject(e));
  });
}

function send(ws: WebSocket, event: ClientEvent) {
  ws.send(JSON.stringify(event));
}

function waitForNext(ws: WebSocket, predicate: (m: ServerEvent) => boolean, timeoutMs = 8000): Promise<ServerEvent> {
  const buffer = buffers.get(ws)!;
  const fromIndex = buffer.length;
  return new Promise((resolve, reject) => {
    const check = () => buffer.slice(fromIndex).find(predicate) ?? null;
    const t = setTimeout(() => reject(new Error("timeout: " + predicate.toString())), timeoutMs);
    const interval = setInterval(() => {
      const found = check();
      if (found) {
        clearTimeout(t);
        clearInterval(interval);
        resolve(found);
      }
    }, 50);
  });
}

function waitFor(ws: WebSocket, predicate: (m: ServerEvent) => boolean, timeoutMs = 8000): Promise<ServerEvent> {
  return new Promise((resolve, reject) => {
    const buffer = buffers.get(ws)!;
    const check = () => buffer.find(predicate) ?? null;
    const existing = check();
    if (existing) return resolve(existing);
    const t = setTimeout(() => reject(new Error("timeout: " + predicate.toString())), timeoutMs);
    const interval = setInterval(() => {
      const found = check();
      if (found) {
        clearTimeout(t);
        clearInterval(interval);
        resolve(found);
      }
    }, 50);
  });
}

function ok(label: string) {
  console.log(`  ✔ ${label}`);
}

/**
 * Reorganiza um deployment padrão para que UMA peça móvel fique numa
 * linha totalmente livre (sem terreno bloqueado), na borda da própria
 * zona, olhando direto para onde a bandeira adversária vai ficar — sem
 * inventar regra nenhuma, só escolhendo coordenadas válidas segundo
 * `DeploymentManager.validateDeployment`.
 */
function buildStrikeDeployment(
  defaultPieces: Piece[],
  owner: "blue" | "red",
  rows: number,
  cols: number,
  blockedTiles: ReadonlySet<string>,
  strikeRow: number,
  strikerType: string,
): { pieces: Piece[]; strikerId: string } {
  const zoneStart = owner === "blue" ? 0 : Math.max(0, cols - DEPLOYMENT_DEPTH);
  const zoneEnd = owner === "blue" ? DEPLOYMENT_DEPTH : cols;

  const striker = defaultPieces.find((p) => p.pieceType === strikerType);
  if (!striker) throw new Error(`Nenhuma peça do tipo ${strikerType} encontrada no deployment padrão de ${owner}.`);

  const strikeCol = owner === "blue" ? zoneStart : zoneEnd - 1;

  // Todas as células da zona, exceto a da peça-ataque, disponíveis para as outras 39 peças.
  const zoneCells: { row: number; column: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = zoneStart; c < zoneEnd; c++) {
      if (blockedTiles.has(`${r}-${c}`)) continue;
      if (r === strikeRow) continue; // linha reservada só para a peça-ataque
      zoneCells.push({ row: r, column: c });
    }
  }

  const others = defaultPieces.filter((p) => p.id !== striker.id);
  if (others.length > zoneCells.length) {
    throw new Error(`Zona de ${owner} não tem células suficientes fora da linha ${strikeRow} para as outras peças.`);
  }

  const pieces: Piece[] = [
    { ...striker, currentRow: strikeRow, currentColumn: strikeCol },
    ...others.map((p, i) => ({ ...p, currentRow: zoneCells[i].row, currentColumn: zoneCells[i].column })),
  ];

  return { pieces, strikerId: striker.id };
}

async function main() {
  const rand = Math.random().toString(36).slice(2, 8);
  const nickA = "combatA_" + rand;
  const nickB = "combatB_" + rand;
  const pass = "senha1234";

  console.log("== Cadastro + Login + Sala ==");
  const wsA = await connect(BASE + "/connect");
  await waitFor(wsA, (m) => m.type === "PlayerConnected");
  send(wsA, { type: "Register", nickname: nickA, email: "ca@test.com", password: pass });
  const authA = await waitFor(wsA, (m) => m.type === "AuthSuccess" || m.type === "AuthError");
  if (authA.type !== "AuthSuccess") throw new Error("Cadastro A falhou: " + (authA as any).reason);

  const wsB = await connect(BASE + "/connect");
  await waitFor(wsB, (m) => m.type === "PlayerConnected");
  send(wsB, { type: "Register", nickname: nickB, email: "cb@test.com", password: pass });
  const authB = await waitFor(wsB, (m) => m.type === "AuthSuccess" || m.type === "AuthError");
  if (authB.type !== "AuthSuccess") throw new Error("Cadastro B falhou: " + (authB as any).reason);
  ok("Cadastro + Login de A e B");

  send(wsA, { type: "CreateRoom" });
  const created = await waitFor(wsA, (m) => m.type === "RoomCreated" || m.type === "ActionRejected");
  if (created.type !== "RoomCreated") throw new Error("CreateRoom falhou: " + (created as any).reason);
  const roomId = created.roomId;
  const playerIdA = created.you.playerId;
  const wsARoom = await connect(BASE + `/room/${roomId}/ws?playerId=${playerIdA}`);
  await waitFor(wsARoom, (m) => m.type === "RoomStateChanged");

  send(wsB, { type: "JoinRoom", roomId });
  const joined = await waitFor(wsB, (m) => m.type === "RoomJoined" || m.type === "ActionRejected");
  if (joined.type !== "RoomJoined") throw new Error("JoinRoom falhou: " + (joined as any).reason);
  const playerIdB = joined.you.playerId;
  const wsBRoom = await connect(BASE + `/room/${roomId}/ws?playerId=${playerIdB}`);
  await waitFor(wsBRoom, (m) => m.type === "RoomStateChanged");
  await waitFor(wsARoom, (m) => m.type === "RoomStateChanged" && m.status === "ready");
  ok(`Sala ${roomId} pronta com A (azul) e B (vermelho)`);

  send(wsARoom, { type: "PlayerReady" });
  send(wsBRoom, { type: "PlayerReady" });
  await waitFor(wsARoom, (m) => m.type === "RoomStateChanged" && m.status === "deployment");
  await waitFor(wsBRoom, (m) => m.type === "RoomStateChanged" && m.status === "deployment");
  ok("Ambos prontos — fase de posicionamento");

  // ── Posicionamento customizado: batedor azul mirando a bandeira vermelha ──
  console.log("== Posicionamento (customizado para capturar a bandeira em 1 lance) ==");
  const rows = ACTIVE_MAP.rows;
  const cols = ACTIVE_MAP.cols;
  const blockedTiles = getBlockedTiles(ACTIVE_MAP);

  // Escolhe uma linha 100% livre de terreno bloqueado em toda a largura do mapa.
  let strikeRow = -1;
  for (let r = 0; r < rows; r++) {
    let clear = true;
    for (let c = 0; c < cols; c++) {
      if (blockedTiles.has(`${r}-${c}`)) {
        clear = false;
        break;
      }
    }
    if (clear) {
      strikeRow = r;
      break;
    }
  }
  if (strikeRow === -1) throw new Error("Nenhuma linha totalmente livre de terreno no mapa — não dá para montar o teste.");

  const blueDefault = DeploymentManager.createDefaultPlayerDeployment(rows, cols, "blue");
  const redDefault = DeploymentManager.createDefaultPlayerDeployment(rows, cols, "red");

  const blueStrike = buildStrikeDeployment(blueDefault, "blue", rows, cols, blockedTiles, strikeRow, "scout");
  const redStrike = buildStrikeDeployment(redDefault, "red", rows, cols, blockedTiles, strikeRow, "flag");

  if (!DeploymentManager.validateDeployment(blueStrike.pieces, rows, cols, blockedTiles, "blue")) {
    throw new Error("Deployment azul customizado não passou na própria validação.");
  }
  if (!DeploymentManager.validateDeployment(redStrike.pieces, rows, cols, blockedTiles, "red")) {
    throw new Error("Deployment vermelho customizado não passou na própria validação.");
  }
  ok(`Linha ${strikeRow} livre — batedor azul em (${strikeRow},0), bandeira vermelha em (${strikeRow},${cols - 1})`);

  send(wsARoom, { type: "ConfirmDeployment", pieces: blueStrike.pieces });
  send(wsBRoom, { type: "ConfirmDeployment", pieces: redStrike.pieces });

  const started = await waitFor(wsARoom, (m) => m.type === "GameStarted");
  await waitFor(wsBRoom, (m) => m.type === "GameStarted");
  ok("Partida iniciada (GameStarted) para os dois lados");

  // ── 10/11. Seleção + Movimento (o próprio ataque) ──────────────
  send(wsARoom, { type: "SelectPiece", pieceId: blueStrike.strikerId });
  await waitFor(wsARoom, (m) => m.type === "ActionApplied" && (m as any).state.selectedPieceId === blueStrike.strikerId);
  ok("Batedor selecionado");

  // ── 12/13. Combate + captura da Bandeira ───────────────────────
  console.log("== 12-13. Combate + captura da Bandeira ==");
  send(wsARoom, { type: "MovePiece", row: strikeRow, column: cols - 1 });

  const finishedA = await waitFor(wsARoom, (m) => m.type === "GameFinished", 8000);
  const finishedB = await waitFor(wsBRoom, (m) => m.type === "GameFinished", 8000);
  ok("GameFinished recebido pelos dois lados");

  const winner = (finishedA as any).winner;
  if (winner !== "BLUE") throw new Error(`Esperava vitória do Azul (bandeira vermelha capturada), veio: ${winner}`);
  const finalState = (finishedA as any).state;
  const redFlagAlive = finalState.pieces.some((p: any) => p.owner === "red" && p.pieceType === "flag" && p.isAlive);
  if (redFlagAlive) throw new Error("Bandeira vermelha deveria estar eliminada após a captura.");
  ok("Bandeira vermelha capturada — combate resolvido pelo Motor real (CombatEngine)");

  // ── 14/15. Vitória (A/Azul) e Derrota (B/Vermelho) ─────────────
  console.log("== 14-15. Vitória / Derrota ==");
  if (finalState.gameOver !== true) throw new Error("state.gameOver deveria ser true.");
  if ((finishedB as any).winner !== "BLUE") throw new Error("B não recebeu o mesmo vencedor que A — dessincronização.");
  ok("A (Azul) recebe evento compatível com tela de Vitória (GameOverOverlay: winner===BLUE)");
  ok("B (Vermelho) recebe o mesmo evento, compatível com tela de Derrota (winner!==RED)");

  // ── 16. Encerramento da sala ────────────────────────────────────
  console.log("== 16. Encerramento da sala ==");
  send(wsARoom, { type: "SelectPiece", pieceId: blueStrike.strikerId });
  const rejectedAfterEnd = await waitForNext(wsARoom, (m) => m.type === "ActionRejected" || m.type === "ActionApplied", 5000).catch(() => null);
  // A sala já terminou (status "finished" em GameRoom.applyAction quando gameOver) —
  // qualquer ação de jogo posterior deve ser rejeitada pelo Motor (gameOver check).
  if (!rejectedAfterEnd || rejectedAfterEnd.type !== "ActionRejected") {
    throw new Error("Sala deveria rejeitar novas ações após o fim de jogo (status 'finished').");
  }
  ok("Sala rejeita novas ações após o fim de jogo — encerramento confirmado");

  console.log("\nALL COMBAT/VICTORY CHECKS PASSED");
  wsA.close();
  wsB.close();
  wsARoom.close();
  wsBRoom.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("FALHA:", err);
  process.exit(1);
});
