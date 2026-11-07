import { useEffect } from "react";
import { AudioManager } from "@/services/audioManager";

/**
 * Sprint AUDIO-01 — Tema de Menu, tocado em Login/Sala Online/Sala de
 * Espera/Posicionamento. Idempotente: `AudioManager.playMenuMusic()`
 * não reinicia a faixa se ela já for a atual, então navegar entre
 * essas quatro telas nunca reinicia/engasga a música.
 */
export function useMenuMusic(): void {
  useEffect(() => {
    AudioManager.playMenuMusic();
  }, []);
}
