/**
 * HUD do celular em pé (estilo Clash Royale): faixa de título e placar em cima, cartão da peça e
 * botões embaixo, com a arena ocupando o meio. Só mostra ações que existem no jogo (doc 04):
 * escolher a peça, cancelar a seleção e finalizar o turno. Mover para uma casa com inimigo já é o
 * ataque, então não existem botões separados de "Atacar" nem "Especial".
 *
 * Também roda a IA do Vermelho (a mesma `useAITurn` da barra de ações do jogo), já que a barra
 * original não é montada neste modo.
 */
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Home, Hourglass, Info, X, Flag } from "lucide-react";
import { useGameState } from "@/hooks/useGameState";
import { useAITurn } from "@/hooks/useAITurn";
import { PIECES } from "@/config/pieces";

const octagon = "polygon(22% 0, 78% 0, 100% 22%, 100% 78%, 78% 100%, 22% 100%, 0 78%, 0 22%)";

function HexButton({ children, label, onClick, disabled, tone = "blue" }: { children: React.ReactNode; label: string; onClick?: () => void; disabled?: boolean; tone?: "blue" | "gold" }) {
  const border = tone === "gold" ? "bg-amber-400" : "bg-cyan-400";
  const fill = tone === "gold" ? "from-amber-700/80 to-amber-950/90" : "from-sky-800/80 to-slate-950/90";
  return (
    <button onClick={onClick} disabled={disabled} className="pointer-events-auto flex flex-col items-center gap-0.5 disabled:opacity-40" aria-label={label}>
      <span className={`relative flex h-14 w-14 items-center justify-center ${border} p-[2px]`} style={{ clipPath: octagon }}>
        <span className={`flex h-full w-full items-center justify-center bg-gradient-to-b ${fill} text-white`} style={{ clipPath: octagon }}>
          {children}
        </span>
      </span>
      <span className="font-display text-[10px] font-bold uppercase tracking-wider text-slate-100">{label}</span>
    </button>
  );
}

function Banner({ side, title, count }: { side: "red" | "blue"; title: string; count: number }) {
  const red = side === "red";
  return (
    <div className={`flex items-center gap-2 rounded border px-2.5 py-1 backdrop-blur-sm ${red ? "border-rose-500/50 bg-rose-950/70" : "border-sky-400/50 bg-sky-950/70"}`}>
      <span className={`flex h-8 w-6 items-center justify-center ${red ? "bg-rose-600" : "bg-sky-500"} text-white`} style={{ clipPath: "polygon(0 0,100% 0,100% 78%,50% 100%,0 78%)" }}>
        <Flag className="h-3.5 w-3.5" />
      </span>
      <div className="leading-tight">
        <div className={`font-display text-[11px] font-bold ${red ? "text-rose-100" : "text-sky-100"}`}>{title}</div>
        <div className="text-[10px] text-slate-300">
          Unidades: <b className={red ? "text-amber-300" : "text-cyan-300"}>{count}</b>
        </div>
      </div>
    </div>
  );
}

export function PhoneHud({ isOnline = false }: { isOnline?: boolean }) {
  const { state, selectedPiece, selectPiece, dispatch, localOwner } = useGameState();
  const { thinking } = useAITurn({ enabled: !isOnline });
  const [infoOpen, setInfoOpen] = useState(false);

  const blue = state.pieces.filter((p) => p.owner === "blue" && p.isAlive).length;
  const red = state.pieces.filter((p) => p.owner === "red" && p.isAlive).length;
  const myTurn = state.currentPlayer === (localOwner === "blue" ? "BLUE" : "RED");

  const hidden = !!selectedPiece && selectedPiece.owner !== localOwner && !selectedPiece.isRevealed;
  const info = selectedPiece && !hidden ? PIECES[selectedPiece.pieceType] : null;
  const unitName = !selectedPiece ? "Nenhuma peça" : hidden ? "Unidade desconhecida" : (info?.nome ?? "Peça");

  const turnText = state.gameOver ? "Fim da partida" : thinking ? "Vermelho jogando…" : myTurn ? "Seu turno" : "Turno do Vermelho";

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      {/* ───────── Topo ───────── */}
      <div data-phone-hud="top" className="flex flex-col gap-2 px-2.5 pt-2">
        <div className="flex items-center justify-between gap-2">
          <Link to="/" className="pointer-events-auto flex h-10 w-10 items-center justify-center bg-cyan-400 p-[2px]" style={{ clipPath: octagon }} aria-label="Menu">
            <span className="flex h-full w-full items-center justify-center bg-slate-950/90 text-cyan-200" style={{ clipPath: octagon }}>
              <Home className="h-5 w-5" />
            </span>
          </Link>
          {/* Título em faixa: fitas vermelha e azul atrás do nome */}
          <div className="relative flex flex-1 items-center justify-center">
            <div className="absolute inset-x-1 top-1/2 h-5 -translate-y-1/2 bg-gradient-to-r from-rose-700 via-slate-900 to-sky-700 opacity-90" style={{ clipPath: "polygon(0 0,100% 0,96% 50%,100% 100%,0 100%,4% 50%)" }} />
            <span className="relative bg-gradient-to-b from-white to-slate-400 bg-clip-text font-display text-xl font-black uppercase tracking-[0.18em] text-transparent drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)]">Conflito</span>
          </div>
          <div className="pointer-events-auto flex h-10 items-center gap-2 rounded border border-amber-400/40 bg-slate-950/80 px-2.5">
            <Hourglass className="h-5 w-5 text-amber-300" />
            <div className="leading-tight">
              <div className="font-display text-[11px] font-bold text-white">{turnText}</div>
              <div className="text-[10px] text-sky-300">Turno {state.turnNumber}</div>
            </div>
          </div>
        </div>
        <div className="flex items-start justify-between gap-2">
          <Banner side="red" title="Exército Vermelho" count={red} />
          <Banner side="blue" title="Seu Exército" count={blue} />
        </div>
      </div>

      {/* ───────── Base ───────── */}
      <div className="flex flex-col gap-2 px-2.5 pb-2.5">
        {infoOpen && info && (
          <div className="pointer-events-auto rounded border border-cyan-400/40 bg-slate-950/90 p-2.5 text-[11px] leading-snug text-slate-200">
            <div className="mb-1 flex items-center justify-between">
              <b className="font-display uppercase tracking-wider text-white">{info.nome}</b>
              <button onClick={() => setInfoOpen(false)} aria-label="Fechar" className="text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p>{info.descricao}</p>
            <p className="mt-1 text-cyan-200">{info.habilidade}</p>
          </div>
        )}
        <div data-phone-hud="bottom" className="flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-slate-950/85 p-2 backdrop-blur-sm">
          <div className="min-w-0 flex-1 rounded border border-white/10 bg-slate-900/70 px-2.5 py-1.5">
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 shrink-0 rounded-full ${selectedPiece ? (selectedPiece.owner === "blue" ? "bg-cyan-400" : "bg-rose-400") : "bg-slate-600"}`} />
              <span className="truncate font-display text-sm font-bold uppercase tracking-wider text-white">{unitName}</span>
            </div>
            {info ? (
              <div className="mt-0.5 grid grid-cols-2 gap-x-2 text-[11px] text-slate-300">
                <span>
                  Força <b className="text-amber-300">{info.patente ?? "—"}</b>
                </span>
                <span>
                  Mov. <b className="text-cyan-300">{info.movimentoEmLinha ? "reta" : info.movimento}</b>
                </span>
              </div>
            ) : (
              <div className="mt-0.5 text-[11px] text-slate-400">{hidden ? "Ainda não revelada em combate." : "Toque numa peça azul."}</div>
            )}
          </div>
          <HexButton label="Info" disabled={!info} onClick={() => setInfoOpen((v) => !v)}>
            <Info className="h-5 w-5" />
          </HexButton>
          <HexButton label="Cancelar" disabled={!selectedPiece} onClick={() => selectPiece(null)}>
            <X className="h-5 w-5" />
          </HexButton>
          <HexButton label="Finalizar" tone="gold" disabled={state.gameOver || !myTurn} onClick={() => dispatch({ type: "END_TURN" })}>
            <Flag className="h-5 w-5" />
          </HexButton>
        </div>
      </div>
    </div>
  );
}
