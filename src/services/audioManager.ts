/**
 * AudioManager — Sprint AUDIO-01 / AUDIO-02.
 *
 * Camada única de áudio do jogo: carrega cada arquivo uma única vez,
 * reutiliza os mesmos `HTMLAudioElement`s (nunca cria um novo por
 * toque) e centraliza volume/mute. Nenhuma regra de jogo mora aqui —
 * só reage a eventos que a Interface já dispara.
 *
 * Sprint AUDIO-02 — volume é sempre `masterVolume × (music|sfx)Volume
 * × relativo-do-efeito`; os três valores (Master/Music/SFX) são lidos
 * de `settingsService` (localStorage) na primeira vez que o
 * AudioManager é usado, e persistidos de volta a cada mudança — a
 * tela de Configurações nunca guarda seu próprio estado paralelo.
 */
import { settingsService } from "@/services/settingsService";

export type SfxKey =
  | "buttonClick"
  | "unitSelection"
  | "unitMovement"
  | "combat"
  | "unitReveal"
  | "endTurn"
  | "matchStart"
  | "victory"
  | "defeat"
  | "invalidAction";

export type MusicKey = "menu" | "battle";

const SFX_FILES: Record<SfxKey, string> = {
  buttonClick: "/audio/sfx/button-click.mp3",
  unitSelection: "/audio/sfx/unit-selection.mp3",
  unitMovement: "/audio/sfx/unit-movement.mp3",
  combat: "/audio/sfx/combat.mp3",
  unitReveal: "/audio/sfx/unit-reveal.mp3",
  endTurn: "/audio/sfx/end-turn.mp3",
  matchStart: "/audio/sfx/match-start.mp3",
  victory: "/audio/sfx/victory.mp3",
  defeat: "/audio/sfx/defeat.mp3",
  invalidAction: "/audio/sfx/invalid-action.mp3",
};

const MUSIC_FILES: Record<MusicKey, string> = {
  menu: "/audio/music/menu.mp3",
  battle: "/audio/music/battle.mp3",
};

/**
 * Volume relativo de cada efeito (0–1), aplicado sobre o volume mestre
 * de SFX. Valores vindos da Sprint SFX-01 (docs/16-Audio.md).
 */
const SFX_RELATIVE_VOLUME: Record<SfxKey, number> = {
  buttonClick: 0.6,
  unitSelection: 0.7,
  unitMovement: 0.75,
  combat: 1.0,
  unitReveal: 0.9,
  endTurn: 0.7,
  matchStart: 1.0,
  victory: 1.0,
  defeat: 1.0,
  invalidAction: 0.7,
};

const CROSSFADE_MS = 1000;
const PERSIST_DEBOUNCE_MS = 150;

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

class AudioManagerImpl {
  private sfxElements = new Map<SfxKey, HTMLAudioElement>();
  private musicElements = new Map<MusicKey, HTMLAudioElement>();
  /** Sprint AUDIO-02 — multiplicador geral, aplicado sobre música E SFX. */
  private masterVolume = 0.6;
  private musicMasterVolume = 0.15;
  private sfxMasterVolume = 0.5;
  private musicMuted = false;
  private sfxMuted = false;
  private currentMusic: MusicKey | null = null;
  private fadeTimers = new Map<MusicKey, ReturnType<typeof setInterval>>();
  private loaded = false;
  private settingsLoaded = false;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Lê `settingsService` (localStorage) uma única vez e aplica os
   * volumes salvos — se o jogador nunca abriu Configurações, os
   * valores vêm de `DEFAULT_SETTINGS` (Master 60% / Music 15% / SFX
   * 50%). Chamado de forma preguiçosa (não no import do módulo) pra
   * nunca tocar `localStorage` durante SSR.
   */
  private ensureSettingsLoaded(): void {
    if (this.settingsLoaded || typeof window === "undefined") return;
    this.settingsLoaded = true;
    const settings = settingsService.load();
    this.masterVolume = clamp01(settings.audioMaster);
    this.musicMasterVolume = clamp01(settings.musicVolume);
    this.sfxMasterVolume = clamp01(settings.sfxVolume);
  }

  /** Grava Master/Music/SFX de volta em `settingsService`, preservando os demais campos salvos. Debounced — sliders disparam muitas mudanças por segundo. */
  private persistVolumes(): void {
    if (typeof window === "undefined") return;
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      const current = settingsService.load();
      settingsService.save({
        ...current,
        audioMaster: this.masterVolume,
        musicVolume: this.musicMasterVolume,
        sfxVolume: this.sfxMasterVolume,
      });
    }, PERSIST_DEBOUNCE_MS);
  }

  /** Cria (uma única vez) todos os `HTMLAudioElement`s. Idempotente. */
  private ensureLoaded(): void {
    this.ensureSettingsLoaded();
    if (this.loaded || typeof window === "undefined") return;
    this.loaded = true;

    for (const key of Object.keys(SFX_FILES) as SfxKey[]) {
      const el = new Audio(SFX_FILES[key]);
      el.preload = "auto";
      el.volume = this.effectiveSfxVolume(key);
      this.sfxElements.set(key, el);
    }

    for (const key of Object.keys(MUSIC_FILES) as MusicKey[]) {
      const el = new Audio(MUSIC_FILES[key]);
      el.preload = "auto";
      el.loop = true;
      el.volume = 0;
      this.musicElements.set(key, el);
    }
  }

  private effectiveSfxVolume(key: SfxKey): number {
    if (this.sfxMuted) return 0;
    return clamp01(this.masterVolume * this.sfxMasterVolume * SFX_RELATIVE_VOLUME[key]);
  }

  // ── SFX ──────────────────────────────────────────────────────────

  /**
   * Toca um efeito, reiniciando-o do zero se já estiver tocando —
   * nunca sobrepõe duas instâncias do MESMO som (evita cacofonia em
   * cliques/seleções rápidas).
   */
  playSfx(key: SfxKey): void {
    this.ensureLoaded();
    const el = this.sfxElements.get(key);
    if (!el) return;
    el.volume = this.effectiveSfxVolume(key);
    el.currentTime = 0;
    void el.play().catch(() => {
      // Autoplay bloqueado antes da primeira interação do usuário — sem erro visível, sem som.
    });
  }

  setSfxMasterVolume(volume: number): void {
    this.ensureSettingsLoaded();
    this.sfxMasterVolume = clamp01(volume);
    for (const key of this.sfxElements.keys()) {
      this.sfxElements.get(key)!.volume = this.effectiveSfxVolume(key);
    }
    this.persistVolumes();
  }

  setSfxMuted(muted: boolean): void {
    this.sfxMuted = muted;
    for (const key of this.sfxElements.keys()) {
      this.sfxElements.get(key)!.volume = this.effectiveSfxVolume(key);
    }
  }

  // ── Música ───────────────────────────────────────────────────────

  private targetMusicVolume(): number {
    return this.musicMuted ? 0 : clamp01(this.masterVolume * this.musicMasterVolume);
  }

  private fade(key: MusicKey, to: number, durationMs: number, onDone?: () => void): void {
    const el = this.musicElements.get(key);
    if (!el) return;
    const existingTimer = this.fadeTimers.get(key);
    if (existingTimer) clearInterval(existingTimer);

    const stepMs = 50;
    const steps = Math.max(1, Math.round(durationMs / stepMs));
    const from = el.volume;
    let step = 0;

    const timer = setInterval(() => {
      step += 1;
      el.volume = clamp01(from + ((to - from) * step) / steps);
      if (step >= steps) {
        clearInterval(timer);
        this.fadeTimers.delete(key);
        el.volume = to;
        onDone?.();
      }
    }, stepMs);
    this.fadeTimers.set(key, timer);
  }

  /** Troca para a música informada com crossfade de 1s. Sem efeito se já for a atual. */
  private crossfadeTo(key: MusicKey): void {
    this.ensureLoaded();
    if (this.currentMusic === key) return;
    const previous = this.currentMusic;
    this.currentMusic = key;

    const el = this.musicElements.get(key);
    if (el && el.paused) {
      el.currentTime = 0;
      void el.play().catch(() => {});
    }
    this.fade(key, this.targetMusicVolume(), CROSSFADE_MS);

    if (previous) {
      const prevEl = this.musicElements.get(previous);
      this.fade(previous, 0, CROSSFADE_MS, () => {
        prevEl?.pause();
      });
    }
  }

  /** Tema de Menu — Login, Sala Online, Sala de Espera, Posicionamento. */
  playMenuMusic(): void {
    this.crossfadeTo("menu");
  }

  /** Tema de Partida — dispara imediatamente após `GameStarted`/início de partida. */
  playBattleMusic(): void {
    this.crossfadeTo("battle");
  }

  /** Para a música da batalha (fade curto) — chamado quando a partida termina. */
  stopBattleMusic(): void {
    if (this.currentMusic !== "battle") return;
    const el = this.musicElements.get("battle");
    this.currentMusic = null;
    this.fade("battle", 0, CROSSFADE_MS, () => {
      el?.pause();
    });
  }

  setMusicMasterVolume(volume: number): void {
    this.ensureSettingsLoaded();
    this.musicMasterVolume = clamp01(volume);
    if (this.currentMusic) {
      const el = this.musicElements.get(this.currentMusic);
      if (el) el.volume = this.targetMusicVolume();
    }
    this.persistVolumes();
  }

  setMusicMuted(muted: boolean): void {
    this.musicMuted = muted;
    if (this.currentMusic) {
      const el = this.musicElements.get(this.currentMusic);
      if (el) el.volume = this.targetMusicVolume();
    }
  }

  // ── Master ───────────────────────────────────────────────────────

  /** Sprint AUDIO-02 — multiplicador geral sobre música E SFX simultaneamente. */
  setMasterVolume(volume: number): void {
    this.ensureSettingsLoaded();
    this.masterVolume = clamp01(volume);
    for (const key of this.sfxElements.keys()) {
      this.sfxElements.get(key)!.volume = this.effectiveSfxVolume(key);
    }
    if (this.currentMusic) {
      const el = this.musicElements.get(this.currentMusic);
      if (el) el.volume = this.targetMusicVolume();
    }
    this.persistVolumes();
  }

  /** Valores atuais (0–1) — usados pela tela de Configurações pra inicializar os sliders. */
  getVolumes(): { master: number; music: number; sfx: number } {
    this.ensureSettingsLoaded();
    return { master: this.masterVolume, music: this.musicMasterVolume, sfx: this.sfxMasterVolume };
  }
}

export const AudioManager = new AudioManagerImpl();
