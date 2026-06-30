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

export const DEFAULT_SETTINGS: GameSettings = {
  audioMaster: 0.8,
  musicVolume: 0.6,
  sfxVolume: 0.8,
  highContrast: false,
  reduceMotion: false,
};
