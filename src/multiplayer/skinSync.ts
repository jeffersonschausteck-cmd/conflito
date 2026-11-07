// Oficina do Exército (etapa 4) — sincroniza o visual escolhido com o servidor e guarda o visual
// de cada lado recebido de volta. Só aparência: nada aqui toca regras, turnos ou peças.
//
// Fluxo: o jogador escolhe na Oficina -> `SetSkins` vai ao servidor -> o servidor valida
// (`sanitizeSkins`, mesmo catálogo do cliente) e devolve `SkinsUpdated` aos dois jogadores ->
// o 3D desenha as peças do adversário com o visual que ELE escolheu.

import { useSyncExternalStore } from "react";
import { PieceSkins, type SkinTable } from "@/config/pieceSkins";
import type { NetworkClient } from "./NetworkClient";

export type RoomSkins = Partial<Record<"blue" | "red", SkinTable>>;

let roomSkins: RoomSkins = {};
const listeners = new Set<() => void>();

function setRoomSkins(next: RoomSkins) {
  roomSkins = next;
  listeners.forEach((l) => l());
}

/** Visual de cada lado vindo do servidor (vazio fora de partida online). */
export function useRoomSkins(): RoomSkins {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => roomSkins,
    () => roomSkins,
  );
}

let installedOn: NetworkClient | null = null;

/** Liga a sincronização a um NetworkClient (uma vez por cliente). */
export function installSkinSync(client: NetworkClient): void {
  if (installedOn === client) return;
  installedOn = client;
  // `true` só depois de ouvir a sala (RoomStateChanged vem do GameRoom, nunca do Lobby).
  let inRoom = false;
  // A partida começou: o visual fica travado (só se muda na Oficina do menu, antes de jogar).
  let locked = false;

  const send = () => {
    if (!inRoom || locked) return;
    try {
      client.send({ type: "SetSkins", skins: PieceSkins.get() });
    } catch {
      /* sem conexão agora: o próximo RoomStateChanged (reconexão) reenvia */
    }
  };

  client.onEvent((event) => {
    if (event.type === "RoomStateChanged") {
      inRoom = true;
      locked = event.status === "playing" || event.status === "finished";
      send(); // entrou, reconectou ou F5: reenvia o visual atual (se a partida ainda não começou)
    } else if (event.type === "GameStarted") {
      locked = true;
    } else if (event.type === "SkinsUpdated") {
      setRoomSkins(event.skins);
    } else if (event.type === "RoomCreated" || event.type === "RoomJoined") {
      inRoom = false; // a conexão do Lobby vai ser trocada pela da sala
      locked = false;
    }
  });

  // Salvou na Oficina enquanto ainda está na sala de espera/posicionamento: manda na hora.
  PieceSkins.subscribe(send);
}
