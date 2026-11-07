// Teste do lado do CLIENTE da sincronização do visual (etapa 4), com um servidor de mentira.
// Rode com: bun run scripts/test-skins-sync.ts
import { installSkinSync, useRoomSkins } from "../src/multiplayer/skinSync";
import { PieceSkins, DEFAULT_SKINS } from "../src/config/pieceSkins";

let fails = 0;
const check = (l: string, c: boolean) => { console.log(`${c ? "  ✔" : "  ✘"} ${l}`); if (!c) fails++; };

const sent: any[] = [];
let handler: (e: any) => void = () => {};
const fake: any = {
  send: (e: any) => sent.push(e),
  onEvent: (h: any) => { handler = h; return () => {}; },
};
installSkinSync(fake);
installSkinSync(fake); // idempotente: não pode assinar duas vezes

PieceSkins.setModel("sniper", "Skeleton_Warrior");
check("não envia nada enquanto está só no Lobby", sent.length === 0);

handler({ type: "RoomCreated", roomId: "abc", you: {} });
PieceSkins.setColor("sniper", "roxo");
check("RoomCreated (Lobby) ainda não envia", sent.length === 0);

handler({ type: "RoomStateChanged", status: "waiting" });
check("ao entrar na sala, envia o visual atual", sent.length === 1 && sent[0].type === "SetSkins" && sent[0].skins.sniper.model === "Skeleton_Warrior" && sent[0].skins.sniper.color === "roxo");

PieceSkins.setItem("infantry", "weapon", "espada");
check("mudar na Oficina dentro da sala envia na hora", sent.length === 2 && sent[1].skins.infantry.weapon === "espada");

handler({ type: "RoomStateChanged", status: "ready" }); // reconexão/novo estado
check("reconexão reenvia o visual", sent.length === 3);

// O servidor devolve o visual dos dois lados
handler({ type: "SkinsUpdated", skins: { red: { ...DEFAULT_SKINS, scout: { ...DEFAULT_SKINS.scout, model: "Mage" } } } });
// useRoomSkins é um hook; lê o snapshot pelo mesmo store usando React fora de componente não dá, então checamos pelo módulo:
const mod: any = await import("../src/multiplayer/skinSync");
check("módulo exporta o hook de leitura", typeof mod.useRoomSkins === "function");

PieceSkins.reset();
check("restaurar padrão também sincroniza", sent.length === 4 && sent[3].skins.sniper.model === DEFAULT_SKINS.sniper.model);

// Partida começou: nada mais é enviado
const before = sent.length;
handler({ type: "GameStarted", state: {}, matchStartTime: 1, matchType: "casual" });
PieceSkins.setModel("scout", "Knight");
check("com a partida em andamento, mudar o visual não envia nada", sent.length === before);
handler({ type: "RoomStateChanged", status: "playing" });
check("reconectar durante a partida também não reenvia", sent.length === before);

// socket caído não pode lançar erro pra Interface
fake.send = () => { throw new Error("não conectado"); };
let threw = false;
try { PieceSkins.setModel("spy", "Mage"); } catch { threw = true; }
check("sem conexão, a Oficina não quebra", !threw);

console.log(fails === 0 ? "\nTUDO OK" : `\n${fails} FALHA(S)`);
process.exit(fails === 0 ? 0 : 1);
