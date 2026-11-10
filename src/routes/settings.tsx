import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ScreenShell } from "@/components/ScreenShell";
import { GamePanel } from "@/components/ui/GamePanel";
import { AudioManager } from "@/services/audioManager";
import { settingsService } from "@/services/settingsService";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Configurações — Conflito" }] }),
  component: SettingsPage,
});

interface Row {
  label: string;
  value: number;
  toggle?: boolean;
}

// Sprint AUDIO-02 — Display continua decorativo (fora de escopo desta
// sprint); só a seção Audio ganhou estado real, abaixo.
const DISPLAY_SECTION: { title: string; rows: Row[] } = {
  title: "Tela",
  rows: [
    { label: "Alto contraste", value: 0, toggle: true },
    { label: "Reduzir movimento", value: 0, toggle: true },
  ],
};

function SettingsPage() {
  return (
    <ScreenShell
      eyebrow="// SISTEMA"
      title="Configurações"
      subtitle="Ajuste sua interface."
      backTo="/"
      backLabel="← Início"
    >
      <div className="mx-auto grid max-w-2xl gap-6 text-left">
        <AudioSection />

        <GamePanel variant="blue" eyebrow="// CONFIGURAÇÃO" title={DISPLAY_SECTION.title}>
          <div className="space-y-4">
            {DISPLAY_SECTION.rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between gap-4">
                <span className="font-display text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {r.label}
                </span>
                <div className="h-5 w-10 border border-primary/40 bg-primary/5">
                  <div className="h-full w-1/2 bg-primary/40" />
                </div>
              </div>
            ))}
          </div>
        </GamePanel>
      </div>
    </ScreenShell>
  );
}

/**
 * Sprint AUDIO-02 — os três sliders de áudio, agora reais. Visual
 * idêntico ao anterior (mesma track/fill/classes); a única mudança é
 * um `<input type="range">` transparente sobreposto pra capturar o
 * arraste, e o valor vindo de `AudioManager`/`settingsService` (que já
 * carrega o salvo em `localStorage`, ou os padrões — Master 60% /
 * Music 15% / SFX 50% — se o jogador nunca configurou nada).
 */
function AudioSection() {
  const [master, setMaster] = useState(60);
  const [music, setMusic] = useState(15);
  const [sfx, setSfx] = useState(50);

  useEffect(() => {
    const settings = settingsService.load();
    setMaster(Math.round(settings.audioMaster * 100));
    setMusic(Math.round(settings.musicVolume * 100));
    setSfx(Math.round(settings.sfxVolume * 100));
  }, []);

  return (
    <GamePanel variant="blue" eyebrow="// CONFIGURAÇÃO" title="Áudio">
      <div className="space-y-4">
        <VolumeSlider
          label="Volume geral"
          value={master}
          onChange={(v) => {
            setMaster(v);
            AudioManager.setMasterVolume(v / 100);
          }}
        />
        <VolumeSlider
          label="Música"
          value={music}
          onChange={(v) => {
            setMusic(v);
            AudioManager.setMusicMasterVolume(v / 100);
          }}
        />
        <VolumeSlider
          label="Efeitos"
          value={sfx}
          onChange={(v) => {
            setSfx(v);
            AudioManager.setSfxMasterVolume(v / 100);
          }}
        />
      </div>
    </GamePanel>
  );
}

function VolumeSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="font-display text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      <div className="relative h-1.5 w-48 bg-primary/10">
        <div
          className="absolute inset-y-0 left-0 bg-primary"
          style={{
            width: `${value}%`,
            boxShadow: "0 0 10px var(--primary)",
          }}
        />
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
    </div>
  );
}
