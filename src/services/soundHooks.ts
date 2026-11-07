import { AudioManager } from "@/services/audioManager";

/**
 * Sound hook entry points — named call sites so the rest of the app
 * never talks to `AudioManager`'s SFX keys directly. Sprint AUDIO-01
 * wires these to the real audio engine.
 */
export const SoundHooks = {
  playButtonClick(): void {
    AudioManager.playSfx("buttonClick");
  },
  playUnitSelection(): void {
    AudioManager.playSfx("unitSelection");
  },
  playUnitMovement(): void {
    AudioManager.playSfx("unitMovement");
  },
  playCombat(): void {
    AudioManager.playSfx("combat");
  },
  playReveal(): void {
    AudioManager.playSfx("unitReveal");
  },
  playEndTurn(): void {
    AudioManager.playSfx("endTurn");
  },
  playMatchStart(): void {
    AudioManager.playSfx("matchStart");
  },
  playVictory(): void {
    AudioManager.playSfx("victory");
  },
  playDefeat(): void {
    AudioManager.playSfx("defeat");
  },
  playInvalidAction(): void {
    AudioManager.playSfx("invalidAction");
  },
};
