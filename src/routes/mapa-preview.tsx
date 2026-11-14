import { Suspense, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Canvas, useThree } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import * as THREE from "three";
import { BoardFlipContext, BoardMapContext, BoardWorld, PlayViewContext } from "@/components/kay/BoardWorld";
import { MAPS, mapForPace } from "@/maps";

/**
 * Página de PRÉVIA dos mapas (só no desenvolvimento): desenha um mapa pelo mesmo caminho da partida e guarda uma
 * foto em `window.__png`. Quem a usa é `scripts/preview-maps.ts`, que dirige um navegador invisível.
 * Parâmetros: ?map=vale-rapid&w=1280&h=720
 */
export const Route = createFileRoute("/mapa-preview")({
  head: () => ({ meta: [{ title: "Prévia de mapa" }] }),
  ssr: false,
  component: PreviewPage,
});

declare global {
  interface Window {
    __png?: { status: "carregando" | "pronto" | "erro"; base64?: string; message?: string };
  }
}

function Shot() {
  const advance = useThree((s) => s.advance);
  const gl = useThree((s) => s.gl);
  const clock = useThree((s) => s.clock);
  const { active, total } = useProgress();
  const started = useRef(false);
  useEffect(() => {
    window.__png = window.__png ?? { status: "carregando" };
    if (started.current || active || total === 0) return;
    started.current = true;
    (async () => {
      try {
        await new Promise((r) => setTimeout(r, 2500)); // deixa tudo montar
        clock.elapsedTime = 0;
        clock.oldTime = 0;
        for (let t = 0; t < 1.2; t += 1 / 30) advance(t);
        const blob: Blob = await new Promise((res, rej) => gl.domElement.toBlob((b) => (b ? res(b) : rej(new Error("sem imagem"))), "image/png"));
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let s = "";
        for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        window.__png = { status: "pronto", base64: btoa(s) };
      } catch (e) {
        window.__png = { status: "erro", message: String((e as Error)?.stack ?? e) };
      }
    })();
  }, [active, total, advance, gl, clock]);
  return null;
}

function PreviewPage() {
  const [q, setQ] = useState<URLSearchParams | null>(null);
  useEffect(() => setQ(new URLSearchParams(window.location.search)), []);
  if (!import.meta.env.DEV) return <p style={{ padding: 16 }}>Indisponível.</p>;
  if (!q) return null;
  const w = Number(q.get("w")) || 1280;
  const h = Number(q.get("h")) || 720;
  const map = MAPS[q.get("map") ?? ""] ?? mapForPace("classic");
  // Câmera da partida (estilo MOBA), afastada o bastante para o mapa inteiro caber na foto.
  const dist = 8 + map.cols * 1.25;
  return (
    <div style={{ position: "fixed", left: 0, top: 0, width: w, height: h, background: "#000" }}>
      <Canvas
        frameloop="never"
        dpr={1}
        shadows
        camera={{ position: [0, dist * 0.62, dist * 0.78], fov: 45, near: 1, far: 1500 }}
        gl={{ preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.9 }}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      >
        <BoardMapContext.Provider value={map}>
          <BoardFlipContext.Provider value={false}>
            <PlayViewContext.Provider value>
              <Suspense fallback={null}>
                <BoardWorld />
              </Suspense>
            </PlayViewContext.Provider>
          </BoardFlipContext.Provider>
        </BoardMapContext.Provider>
        <Shot />
      </Canvas>
    </div>
  );
}
