import { Suspense, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Link } from "@tanstack/react-router";
import * as THREE from "three";
import { StatusBar, StatusFooter } from "@/components/StatusBar";
import { KayPiece } from "@/components/kay/KayCharacters";
import { BoardWorld, cellWorld, useDeviceMode } from "@/components/kay/BoardWorld";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import type { PieceType } from "@/types/piece";

const octagon = "polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)";

/** Quem aparece na cena do menu: o exército azul em formação (com o visual da Oficina) e vultos vermelhos ao fundo. */
const BLUE_ARMY: { type: PieceType; row: number; col: number }[] = [
  { type: "commander", row: 2, col: 6 },
  { type: "flag", row: 2, col: 8 },
  { type: "officer", row: 3, col: 4 },
  { type: "sniper", row: 3, col: 8 },
  { type: "infantry", row: 1, col: 5 },
  { type: "infantry", row: 1, col: 7 },
  { type: "scout", row: 3, col: 10 },
  { type: "engineer", row: 4, col: 6 },
];
/** Formação mais fechada para o celular em pé (a tela é estreita). */
const BLUE_ARMY_PORTRAIT: { type: PieceType; row: number; col: number }[] = [
  { type: "commander", row: 2, col: 7 },
  { type: "officer", row: 2, col: 5 },
  { type: "sniper", row: 2, col: 9 },
  { type: "infantry", row: 1, col: 6 },
  { type: "infantry", row: 1, col: 8 },
  { type: "scout", row: 3, col: 6 },
  { type: "engineer", row: 3, col: 8 },
];
const RED_SHADES = [
  { row: 1, col: 14 },
  { row: 2, col: 15 },
  { row: 3, col: 14 },
  { row: 1, col: 16 },
];

/** Câmera baixa olhando o exército, com um leve balanço. Só visual. */
function MenuCamera({ portrait }: { portrait: boolean }) {
  const { camera } = useThree();
  const t = useRef(0);
  const focus = cellWorld(2, 7);
  useFrame((_, dt) => {
    t.current += dt;
    const sway = Math.sin(t.current * 0.25) * (portrait ? 0.6 : 0.9);
    const cam = camera as THREE.PerspectiveCamera;
    if (portrait) {
      cam.position.set(focus.x + sway, 5.2, focus.z + 17);
      cam.lookAt(focus.x, 0.5, focus.z - 0.2);
    } else {
      cam.position.set(focus.x + 0.5 + sway, 3.2, focus.z + 12);
      cam.lookAt(focus.x - 4.0, 1.4, focus.z - 0.3);
    }
  });
  return null;
}

function MenuScene({ portrait }: { portrait: boolean }) {
  return (
    <>
      <MenuCamera portrait={portrait} />
      <BoardWorld far clouds={false} />
      {(portrait ? BLUE_ARMY_PORTRAIT : BLUE_ARMY).map((p, i) => {
        const { x, z } = cellWorld(p.row, p.col);
        return <KayPiece key={`b${i}`} x={x} z={z} owner="blue" pieceType={p.type} color="#22d3ee" mine />;
      })}
      {(portrait ? [] : RED_SHADES).map((p, i) => {
        const { x, z } = cellWorld(p.row, p.col);
        return <KayPiece key={`r${i}`} x={x} z={z} owner="red" pieceType="infantry" color="#fb7185" hidden />;
      })}
    </>
  );
}

function MenuButton({ to, children, hint, primary = false, className = "" }: { to: "/mode" | "/ranking" | "/profile" | "/settings" | "/about"; children: React.ReactNode; hint?: string; primary?: boolean; className?: string }) {
  const base = "pointer-events-auto flex items-center gap-3 border-2 px-5 font-display font-bold uppercase tracking-[0.12em] text-white transition-transform active:scale-[0.98]";
  const look = primary
    ? "border-amber-300 bg-gradient-to-b from-amber-500 to-amber-700 py-3.5 text-lg shadow-[0_0_26px_rgba(251,191,36,0.45)] sm:text-xl [@media(max-height:500px)]:py-2 [@media(max-height:500px)]:text-base"
    : "border-cyan-400/55 bg-gradient-to-b from-sky-900/85 to-slate-950/90 py-2.5 text-xs shadow-[0_0_18px_rgba(34,211,238,0.18)] sm:text-sm [@media(max-height:500px)]:py-1.5";
  return (
    <Link to={to} className={`${base} ${look} ${className}`} style={{ clipPath: octagon }}>
      {children}
      {hint && <span className="ml-auto text-right font-body text-[11px] font-medium normal-case tracking-normal text-amber-50/90">{hint}</span>}
    </Link>
  );
}

/**
 * Menu principal em 3D: o exército azul em formação diante do castelo, com os vultos do inimigo ao fundo.
 * As peças usam o visual salvo na Oficina. A cena é a mesma do jogo; os botões ficam por cima.
 */
export function HomePage() {
  const { canInstall, promptInstall } = useInstallPrompt();
  const { mounted, portrait } = useDeviceMode();
  const narrow = portrait;

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#2f78c4] text-foreground">
      {mounted && (
        <div className="absolute inset-0 z-[1]">
          <Canvas
            key={narrow ? "menu-pe" : "menu-pc"}
            shadows
            camera={{ position: [0, 4, 14], fov: narrow ? 42 : 34, near: 0.5, far: 1500 }}
            gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.9 }}
          >
            <Suspense fallback={null}>
              <MenuScene portrait={narrow} />
            </Suspense>
          </Canvas>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-14 right-6 z-0 font-display text-[10px] uppercase tracking-[0.3em] text-sky-50/70 [text-shadow:0_1px_2px_#000]">Carregando o exército…</div>
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_50%_55%,transparent_45%,rgba(2,6,23,0.6))]" />

      <div className="relative z-10 h-full">
        <div className="[&>div]:!text-sky-100 [&>div]:[text-shadow:0_1px_2px_#000]">
          <StatusBar />
        </div>

        {/* Título e botões */}
        <div className={narrow ? "absolute inset-0 flex flex-col justify-between px-4 pb-[6%] pt-[13%]" : "absolute left-[5.5%] top-[19%] flex w-[min(24rem,44vw)] flex-col [@media(max-height:500px)]:top-[12%]"}>
          <div className={narrow ? "pointer-events-none text-center" : "pointer-events-none"}>
            <div className="font-display text-[10px] uppercase tracking-[0.32em] text-sky-100 [text-shadow:0_1px_2px_#000] sm:text-[11px]">Preparado para o</div>
            <div className="relative inline-block px-8">
              <span className="absolute inset-x-0 top-1/2 h-[46%] -translate-y-1/2 bg-gradient-to-r from-rose-700 via-slate-900 to-sky-700 opacity-90 [clip-path:polygon(0_0,100%_0,96%_50%,100%_100%,0_100%,4%_50%)]" />
              <h1 className="relative font-display text-[clamp(2.6rem,8vw,4.9rem)] font-black uppercase leading-[1.15] tracking-[0.14em] text-white [@media(max-height:500px)]:!text-[2.3rem] [-webkit-text-stroke:1.5px_rgba(10,20,40,0.7)] [text-shadow:0_0_14px_rgba(0,0,0,0.6),0_4px_0_rgba(0,0,0,0.55)]">
                Conflito
              </h1>
            </div>
            {!narrow && <p className="mt-1.5 max-w-[26rem] [@media(max-height:500px)]:hidden text-lg leading-snug text-sky-50 [text-shadow:0_2px_3px_#000]">Estratégia por turnos em hexágonos. Esconda suas peças, descubra as do inimigo e capture a Bandeira.</p>}
          </div>

          <div className={narrow ? "flex flex-col gap-2.5" : "mt-6 flex flex-col gap-2.5 [@media(max-height:500px)]:mt-2 [@media(max-height:500px)]:gap-1.5"}>
            <MenuButton to="/mode" primary hint="Campanha · Multijogador">
              ▶ Jogar
            </MenuButton>
            <div className="grid grid-cols-2 gap-2.5 [@media(max-height:500px)]:gap-1.5">
              <MenuButton to="/ranking">🏆 Ranking</MenuButton>
              <MenuButton to="/profile">🎖 Comandante</MenuButton>
              <MenuButton to="/settings">⚙ Config.</MenuButton>
              <MenuButton to="/about">◇ Créditos</MenuButton>
            </div>
            {canInstall && (
              <button
                onClick={promptInstall}
                className="pointer-events-auto border-2 border-cyan-400/55 bg-slate-950/85 px-5 py-2 font-display text-xs font-bold uppercase tracking-[0.12em] text-cyan-100"
                style={{ clipPath: octagon }}
              >
                ⬇ Instalar app
              </button>
            )}
          </div>
        </div>

        {!narrow && (
          <div className="[&>div]:!text-sky-100 [&>div]:[text-shadow:0_1px_2px_#000]">
            <StatusFooter />
          </div>
        )}
      </div>
    </main>
  );
}
