// Script de validação E2E (Sprint MP-05) — não faz parte do app, só
// exercita o Worker Cloudflare real com uma partida completa,
// reaproveitando DeploymentManager/ACTIVE_MAP reais (nenhuma peça nova
// implementada). Rode com: bun run scripts/test-full-match.ts

import { DeploymentManager } from "@/services/deploymentManager";
import { ACTIVE_MAP, getBlockedTiles } from "@/maps";
import { rehydrateGameState } from "@/multiplayer/NetworkClient";
import type { ServerEvent, ClientEvent } from "@/multiplayer/protocol";

const BASE = process.env.WORKER_URL ?? "wss://conflito-multiplayer.jefinhoschaus50.workers.dev";

const buffers = new WeakMap<WebSocket, ServerEvent[]>();

// Mesma reidratação que o NetworkClient real aplica em produção
// (config.blockedTiles cruza a rede como array, não como Set).
function rehydrate(event: ServerEvent): ServerEvent {
  if ("state" in event && event.state) {
    return { ...event, state: rehydrateGameState(event.state) } as ServerEvent;
  }
  return event;
}

function connect(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const buffer: ServerEvent[] = [];
    buffers.set(ws, buffer);
    ws.addEventListener("message", (ev: any) => {
      const msg = rehydrate(JSON.parse(ev.data) as ServerEvent);
      buffer.push(msg);
    });
    ws.addEventListener("open", () => resolve(ws));
    ws.addEventListener("error", (e: any) => reject(e));
  });
}

function send(ws: WebSocket, event: ClientEvent) {
  ws.send(JSON.stringify(event));
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

async function main() {
  const rand = Math.random().toString(36).slice(2, 8);
  const nickA = "playerA_" + rand;
  const nickB = "playerB_" + rand;
  const pass = "senha1234";

  // ── 1/2. Cadastro + Login dos dois jogadores ──────────────────
  console.log("== 1-2. Cadastro + Login ==");
  const regA = await connect(BASE + "/connect");
  await waitFor(regA, (m) => m.type === "PlayerConnected");
  send(regA, { type: "Register", nickname: nickA, email: "a@test.com", password: pass });
  const regAResult = await waitFor(regA, (m) => m.type === "AuthSuccess" || m.type === "AuthError");
  if (regAResult.type !== "AuthSuccess") throw new Error("Cadastro A falhou: " + (regAResult as any).reason);
  ok("Cadastro do jogador A");
  regA.close();

  const regB = await connect(BASE + "/connect");
  await waitFor(regB, (m) => m.type === "PlayerConnected");
  send(regB, { type: "Register", nickname: nickB, email: "b@test.com", password: pass });
  const regBResult = await waitFor(regB, (m) => m.type === "AuthSuccess" || m.type === "AuthError");
  if (regBResult.type !== "AuthSuccess") throw new Error("Cadastro B falhou: " + (regBResult as any).reason);
  ok("Cadastro do jogador B");
  regB.close();

  const wsA = await connect(BASE + "/connect");
  await waitFor(wsA, (m) => m.type === "PlayerConnected");
  send(wsA, { type: "Login", nickname: nickA, password: pass });
  const loginA = await waitFor(wsA, (m) => m.type === "AuthSuccess" || m.type === "AuthError");
  if (loginA.type !== "AuthSuccess") throw new Error("Login A falhou: " + (loginA as any).reason);
  ok("Login do jogador A");

  const wsB = await connect(BASE + "/connect");
  await waitFor(wsB, (m) => m.type === "PlayerConnected");
  send(wsB, { type: "Login", nickname: nickB, password: pass });
  const loginB = await waitFor(wsB, (m) => m.type === "AuthSuccess" || m.type === "AuthError");
  if (loginB.type !== "AuthSuccess") throw new Error("Login B falhou: " + (loginB as any).reason);
  ok("Login do jogador B");

  // ── 3/4. Criar sala + Entrar na sala ──────────────────────────
  console.log("== 3-4. Criar sala + Entrar na sala ==");
  send(wsA, { type: "CreateRoom" });
  const created = await waitFor(wsA, (m) => m.type === "RoomCreated" || m.type === "ActionRejected");
  if (created.type !== "RoomCreated") throw new Error("CreateRoom falhou: " + (created as any).reason);
  const roomId = created.roomId;
  ok(`Sala criada: ${roomId}`);
  const playerIdA = created.you.playerId;

  const wsARoom = await connect(BASE + `/room/${roomId}/ws?playerId=${playerIdA}`);
  await waitFor(wsARoom, (m) => m.type === "RoomStateChanged");

  send(wsB, { type: "JoinRoom", roomId });
  const joined = await waitFor(wsB, (m) => m.type === "RoomJoined" || m.type === "ActionRejected");
  if (joined.type !== "RoomJoined") throw new Error("JoinRoom falhou: " + (joined as any).reason);
  const playerIdB = joined.you.playerId;
  ok("Jogador B entrou na sala");

  const wsBRoom = await connect(BASE + `/room/${roomId}/ws?playerId=${playerIdB}`);
  await waitFor(wsBRoom, (m) => m.type === "RoomStateChanged");

  await waitFor(wsARoom, (m) => m.type === "RoomStateChanged" && m.status === "ready");
  ok("Sala em estado 'ready' (2 jogadores)");

  // ── 5. Ambos clicam em Pronto ──────────────────────────────────
  console.log("== 5. Pronto ==");
  send(wsARoom, { type: "PlayerReady" });
  send(wsBRoom, { type: "PlayerReady" });
  await waitFor(wsARoom, (m) => m.type === "RoomStateChanged" && m.status === "deployment");
  await waitFor(wsBRoom, (m) => m.type === "RoomStateChanged" && m.status === "deployment");
  ok("Ambos prontos — fase de posicionamento");

  // ── 6/7. Posicionar peças + confirmar (reaproveita DeploymentManager real) ──
  console.log("== 6-7. Posicionamento ==");
  const blockedTiles = getBlockedTiles(ACTIVE_MAP);
  const bluePieces = DeploymentManager.createDefaultPlayerDeployment(ACTIVE_MAP.rows, ACTIVE_MAP.cols, "blue");
  const redPieces = DeploymentManager.createDefaultPlayerDeployment(ACTIVE_MAP.rows, ACTIVE_MAP.cols, "red");
  if (!DeploymentManager.validateDeployment(bluePieces, ACTIVE_MAP.rows, ACTIVE_MAP.cols, blockedTiles, "blue")) {
    throw new Error("Deployment azul padrão não passou na própria validação — abortando.");
  }
  if (!DeploymentManager.validateDeployment(redPieces, ACTIVE_MAP.rows, ACTIVE_MAP.cols, blockedTiles, "red")) {
    throw new Error("Deployment vermelho padrão não passou na própria validação — abortando.");
  }

  send(wsARoom, { type: "ConfirmDeployment", pieces: bluePieces });
  send(wsBRoom, { type: "ConfirmDeployment", pieces: redPieces });

  // ── 8. Partida inicia automaticamente ─────────────────────────
  console.log("== 8. Início automático da partida ==");
  const startedA = await waitFor(wsARoom, (m) => m.type === "GameStarted");
  const startedB = await waitFor(wsBRoom, (m) => m.type === "GameStarted");
  ok("GameStarted recebido por A e por B");

  // ── 9. Sincronização completa dos estados ─────────────────────
  console.log("== 9. Sincronização de estado ==");
  const stateA = (startedA as any).state;
  const stateB = (startedB as any).state;
  // `Set` não sobrevive a JSON.stringify (vira "{}"), então comparamos
  // separadamente: o resto do estado via JSON, e blockedTiles via
  // conteúdo real do Set (já reidratado por `rehydrate` acima).
  const { config: configA, ...restA } = stateA;
  const { config: configB, ...restB } = stateB;
  if (JSON.stringify(restA) !== JSON.stringify(restB)) {
    throw new Error("Estados iniciais de A e B divergem (fora de config) — falha de sincronização.");
  }
  const blockedA = [...(configA.blockedTiles as Set<string>)].sort();
  const blockedB = [...(configB.blockedTiles as Set<string>)].sort();
  if (JSON.stringify(blockedA) !== JSON.stringify(blockedB)) {
    throw new Error("blockedTiles de A e B divergem — falha de sincronização.");
  }
  if (blockedA.length === 0) {
    throw new Error("blockedTiles chegou vazio — bug de serialização não corrigido (deveria ter terrenos bloqueados do ACTIVE_MAP).");
  }
  if (stateA.pieces.length !== 80) throw new Error(`Esperado 80 peças (40+40), recebi ${stateA.pieces.length}`);
  ok(`Estado sincronizado entre A e B (${stateA.pieces.length} peças, ${blockedA.length} tiles bloqueados, turno ${stateA.turnNumber}, vez de ${stateA.currentPlayer})`);

  // ── 10/11. Seleção + Movimento ─────────────────────────────────
  console.log("== 10-11. Seleção + Movimento ==");
  // currentPlayer começa BLUE (A). Movemos um batedor (scout) — tem
  // trajeto livre em linha reta (Sprint 2 — movimento especial), então
  // qualquer mapa/formação padrão sempre lhe dá pelo menos um destino
  // legal sem precisar calcular adjacências manualmente aqui.
  const scout = stateA.pieces.find((p: any) => p.owner === "blue" && p.pieceType === "scout" && p.isAlive);
  if (!scout) throw new Error("Nenhum batedor azul encontrado no estado inicial.");

  send(wsARoom, { type: "SelectPiece", pieceId: scout.id });
  const afterSelect = await waitFor(wsARoom, (m) => m.type === "ActionApplied" || m.type === "ActionRejected");
  if (afterSelect.type !== "ActionApplied") throw new Error("SelectPiece rejeitado: " + (afterSelect as any).reason);
  ok("Peça selecionada (SELECT_PIECE aplicado pelo Motor)");
  const selectedState = (afterSelect as any).state;
  if (selectedState.selectedPieceId !== scout.id) throw new Error("selectedPieceId não bate após SelectPiece.");

  // Descobre um destino legal REAL usando o próprio Motor (MovementEngine
  // já embutido em GameEngine via legalMovesForSelection) — não
  // reimplementamos regra nenhuma aqui, só consultamos o resultado.
  const { GameEngine } = await import("@/services/gameEngine");
  const legalMoves = GameEngine.legalMovesForSelection(selectedState);
  if (legalMoves.size === 0) throw new Error("Batedor azul não tem nenhum movimento legal — mapa/formação inesperada.");
  const [firstMove] = legalMoves;
  const [destRow, destCol] = firstMove.split("-").map(Number);

  send(wsARoom, { type: "MovePiece", row: destRow, column: destCol });
  // Precisa do ActionApplied ESPECÍFICO do movimento (não do SelectPiece
  // anterior, que também chega como ActionApplied) — filtra pela posição
  // real da peça no estado, não só pelo tipo do evento.
  const moveResult = await waitFor(
    wsBRoom,
    (m) =>
      m.type === "ActionApplied" &&
      (m as any).state.pieces.some((p: any) => p.id === scout.id && p.currentRow === destRow && p.currentColumn === destCol),
  );
  ok(`Movimento aplicado e sincronizado para B (peça agora em ${destRow}-${destCol})`);
  const movedPiece = (moveResult as any).state.pieces.find((p: any) => p.id === scout.id);
  if (movedPiece.currentRow !== destRow || movedPiece.currentColumn !== destCol) {
    throw new Error("Posição da peça após o movimento não bate no estado sincronizado em B.");
  }
  ok("Estado da peça movida confere igual nos dois lados (A e B)");

  console.log("\n== 1-11 concluídos — continuar com combate/vitória em teste dedicado ==");
  console.log("Sala:", roomId, "| playerIdA:", playerIdA, "| playerIdB:", playerIdB);

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
