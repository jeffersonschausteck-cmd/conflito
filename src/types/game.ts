// Game-wide type definitions. Gameplay not yet implemented.

export type GameMode = "ranked" | "casual" | "tutorial";

export interface PlayerProfile {
  id: string;
  handle: string;
  rating: number;
}

export interface GameSettings {
  audioMaster: number; // 0-1
  musicVolume: number;
  sfxVolume: number;
  highContrast: boolean;
  reduceMotion: boolean;
}

// Sprint AUDIO-02 — valores padrão do jogo (só usados quando o
// jogador ainda não tem `psc:settings` salvo em localStorage).
export const DEFAULT_SETTINGS: GameSettings = {
  audioMaster: 0.6,
  musicVolume: 0.15,
  sfxVolume: 0.5,
  highContrast: false,
  reduceMotion: false,
};
