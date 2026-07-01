/**
 * Sound hook placeholders. Real audio is out of scope for v0.1 — these
 * are named entry points so future audio wiring can plug in without
 * touching the engine or UI call sites.
 */
export const SoundHooks = {
  playReveal(): void {
    // TODO: wire to audio engine (short cyber "ping").
  },
  playCombat(): void {
    // TODO: wire to audio engine (impact hit).
  },
};
