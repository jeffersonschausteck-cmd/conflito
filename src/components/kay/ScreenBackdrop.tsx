import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRouterState } from "@tanstack/react-router";
import * as THREE from "three";
import { KayPiece } from "@/components/kay/KayCharacters";
import { BoardWorld, cellWorld, useDeviceMode } from "@/components/kay/BoardWorld";
import type { PieceType } from "@/types/piece";

/**
 * Fundo 3D das telas fora da partida (modo de jogo, carregamento, ranking, perfil, etc.).
 * Fica montado enquanto o jogador navega entre elas: a câmera só desliza para um novo ângulo,
 * então a cena não recarrega a cada tela. Só visual.
 */
export const BACKDROP_ROUTES = ["/mode", "/pace", "/loading", "/ranking", "/profile", "/settings", "/about", "/login", "/online-lobby", "/waiting-room", "/result"];

type V3 = [number, number, number];
const A = cellWorld(2, 7); // exército azul em formação
const M = cellWorld(5, 11); // meio do campo (duelo)

/** Um ângulo de câmera por tela: posição e ponto de mira, em relação a um ponto do campo. */
const VIEWS: Record<string, { at: { x: number; z: number }; pos: V3; look: V3 }> = {
  "/mode": { at: A, pos: [0.5, 3.2, 12], look: [-4, 1.4, -0.3] },
  "/pace": { at: A, pos: [0.5, 3.2, 12], look: [-4, 1.4, -0.3] },
  "/loading": { at: A, pos: [-9, 2.8, 9], look: [3, 1.4, -0.5] },
  "/ranking": { at: M, pos: [0, 10, 11], look: [0, 0, 0] },
  "/profile": { at: A, pos: [2.5, 2.4, 7.5], look: [-0.5, 1.6, 0] },
  "/settings": { at: M, pos: [0, 17, 13], look: [0, 0, 0] },
  "/about": { at: A, pos: [-5, 3.4, 17], look: [2, 2.6, -6] },
  "/login": { at: M, pos: [0, 3.3, 12], look: [0, 1.4, 0] },
  "/online-lobby": { at: M, pos: [0, 3.3, 12], look: [0, 1.4, 0] },
  "/waiting-room": { at: M, pos: [0, 3.3, 12], look: [0, 1.4, 0] },
  "/result": { at: A, pos: [2.5, 2.4, 7.5], look: [-0.5, 1.6, 0] },
};

const BLUE: { type: PieceType; row: number; col: number }[] = [
  { type: "commander", row: 2, col: 6 },
  { type: "officer", row: 3, col: 4 },
  { type: "sniper", row: 3, col: 8 },
  { type: "infantry", row: 1, col: 5 },
  { type: "infantry", row: 1, col: 7 },
  { type: "scout", row: 3, col: 10 },
  { type: "engineer", row: 4, col: 6 },
  // frente do duelo, no meio do campo
  { type: "infantry", row: 4, col: 9 },
  { type: "infantry", row: 6, col: 9 },
  { type: "sniper", row: 5, col: 8 },
];
const RED_SHADES = [
  [4, 13],
  [5, 13],
  [6, 13],
  [5, 14],
  [2, 15],
  [3, 14],
];

function CameraRig({ path, portrait }: { path: string; portrait: boolean }) {
  const view = VIEWS[path] ?? VIEWS["/mode"];
  const pos = useRef<THREE.Vector3 | null>(null);
  const look = useRef<THREE.Vector3 | null>(null);
  const t = useRef(0);
  useFrame(({ camera }, dt) => {
    t.current += dt;
    const k = portrait ? 1.65 : 1;
    const l = new THREE.Vector3(view.at.x + view.look[0], view.look[1] - (portrait ? 1.8 : 0), view.at.z + view.look[2]);
    const p = new THREE.Vector3(view.at.x + view.pos[0], view.pos[1], view.at.z + view.pos[2]);
    // em pé a câmera recua para caber mais cena na tela estreita
    p.sub(l).multiply(new THREE.Vector3(k, 1 + (k - 1) * 0.5, k)).add(l);
    p.x += Math.sin(t.current * 0.25) * 0.6;
    if (!pos.current || !look.current) {
      pos.current = p.clone();
      look.current = l.clone();
    }
    const a = 1 - Math.exp(-dt * 2.2); // desliza suave até o novo ângulo
    pos.current.lerp(p, a);
    look.current.lerp(l, a);
    camera.position.copy(pos.current);
    camera.lookAt(look.current);
  });
  return null;
}

function Scene({ path, portrait }: { path: string; portrait: boolean }) {
  return (
    <>
      <CameraRig path={path} portrait={portrait} />
      <BoardWorld far clouds={false} />
      {BLUE.map((p, i) => {
        const { x, z } = cellWorld(p.row, p.col);
        return <KayPiece key={`b${i}`} x={x} z={z} owner="blue" pieceType={p.type} color="#22d3ee" mine />;
      })}
      {RED_SHADES.map(([r, c], i) => {
        const { x, z } = cellWorld(r, c);
        return <KayPiece key={`r${i}`} x={x} z={z} owner="red" pieceType="infantry" color="#fb7185" hidden />;
      })}
    </>
  );
}

export function ScreenBackdrop() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { mounted, portrait } = useDeviceMode();
  return (
    <div className="fixed inset-0 z-0 bg-gradient-to-b from-[#2f6fb5] to-[#f6c98a]" aria-hidden="true">
      {mounted && (
        <Canvas shadows camera={{ position: [0, 4, 14], fov: portrait ? 44 : 34, near: 0.5, far: 1500 }} gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.9 }}>
          <Suspense fallback={null}>
            <Scene path={path} portrait={portrait} />
          </Suspense>
        </Canvas>
      )}
      {/* Véu escuro para o texto e os painéis ficarem legíveis por cima da cena */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(2,6,23,0.35),rgba(2,6,23,0.78))]" />
    </div>
  );
}
