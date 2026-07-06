// Camada 3 — cria/busca/remove salas. Estado em memória (persistência
// em banco está fora do escopo desta sprint).

import { Room } from "./Room";
import type { RoomId } from "@/multiplayer/protocol";

export class RoomManager {
  private rooms = new Map<RoomId, Room>();

  createRoom(): Room {
    const id = crypto.randomUUID().slice(0, 8);
    const room = new Room(id);
    this.rooms.set(id, room);
    return room;
  }

  getRoom(id: RoomId): Room | undefined {
    return this.rooms.get(id);
  }

  removeRoom(id: RoomId): void {
    this.rooms.delete(id);
  }

  /** Remove salas vazias — chamado depois de uma desconexão. */
  pruneEmpty(): void {
    for (const [id, room] of this.rooms) {
      if (room.getPlayers().length === 0) this.rooms.delete(id);
    }
  }

  count(): number {
    return this.rooms.size;
  }
}
