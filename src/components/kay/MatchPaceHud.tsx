import { useGameState } from "@/hooks/useGameState";
import { useMatchClocks } from "@/hooks/useMatchClock";
import { cellWorld } from "@/components/kay/BoardWorld";
import { floodedTiles, ringIndex, roundOf, roundsUntilTide, tideRings } from "@/services/matchRules";

/**
 * Elementos de tela do Ritmo da Partida (documento 04, seção 17): aviso da Maré e tempo da jogada.
 * Não aparecem na Clássica (sem regras de ritmo).
 */
export function MatchPaceHud() {
  const { state, localOwner } = useGameState();
  const clocks = useMatchClocks();
  const rules = state.config.rules;
  if (!rules || state.gameOver) return null;

  const round = roundOf(state.turnNumber);
  const until = roundsUntilTide(round, rules);
  const showTide = until !== null && until <= 2;
  const myTurn = state.currentPlayer === (localOwner === "blue" ? "BLUE" : "RED");
  const pct = clocks ? Math.max(0, Math.min(100, (clocks.turnRemainingMs / clocks.turnMs) * 100)) : 0;
  const secs = clocks ? Math.ceil(clocks.turnRemainingMs / 1000) : 0;
  const urgent = myTurn && secs <= 5;

  return (
    <>
      {showTide && until !== null && (
        <div className="pointer-events-none absolute left-1/2 top-12 z-20 -translate-x-1/2 [@media(min-height:480px)]:top-[4.5rem]">
          <div className="flex items-center gap-2.5 rounded border border-orange-400/60 border-l-4 bg-slate-950/85 px-4 py-1.5 backdrop-blur-sm">
            <span className="text-lg" aria-hidden="true">
              🌊
            </span>
            <div className="leading-tight">
              <div className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-orange-300">
                A Maré sobe em {until} {until === 1 ? "rodada" : "rodadas"}
              </div>
              <div className="hidden text-[12px] text-sky-50 [@media(min-height:480px)]:block">A faixa laranja será inundada. Peças móveis nela são eliminadas.</div>
            </div>
          </div>
        </div>
      )}

      {clocks && (
        <div className="pointer-events-none absolute bottom-3 right-3 z-20">
          <div className={`flex items-center gap-3 rounded border bg-slate-950/85 px-3 py-2 backdrop-blur-sm ${urgent ? "border-rose-400" : "border-amber-300/60"}`}>
            <div
              className="grid h-11 w-11 place-items-center rounded-full"
              style={{ background: `conic-gradient(${urgent ? "#fb7185" : "#fbbf24"} ${pct}%, rgba(255,255,255,0.14) 0)` }}
            >
              <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-950 font-display text-sm font-black tabular-nums text-white">{myTurn ? secs : "·"}</div>
            </div>
            <div className="leading-tight">
              <div className={`font-display text-[11px] font-bold uppercase tracking-[0.14em] ${myTurn ? (urgent ? "text-rose-300" : "text-amber-300") : "text-slate-300"}`}>{myTurn ? "Sua vez" : "Vez do adversário"}</div>
              <div className="hidden text-[12px] text-sky-50 [@media(min-height:480px)]:block">{myTurn ? "Se o tempo acabar, a jogada é automática." : "Aguarde a jogada."}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Casas inundadas (azul) e a faixa que será inundada em breve (laranja), dentro do Canvas 3D. */
export function TideMarks() {
  const { state } = useGameState();
  const rules = state.config.rules;
  if (!rules) return null;
  const round = roundOf(state.turnNumber);
  const rings = tideRings(round, rules);
  const until = roundsUntilTide(round, rules);
  const warnRing = until !== null && until <= 2 ? rings : -1;
  const flooded = floodedTiles(state);
  const { rows, cols } = state.config;
  const marks: { key: string; x: number; z: number; kind: "flood" | "warn" }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const k = `${r}-${c}`;
      const ring = ringIndex(r, c, rows, cols);
      const { x, z } = cellWorld(r, c);
      if (flooded.has(k)) marks.push({ key: k, x, z, kind: "flood" });
      else if (ring === warnRing) marks.push({ key: k, x, z, kind: "warn" });
    }
  }
  return (
    <>
      {marks.map((m) => (
        <mesh key={m.key} position={[m.x, m.kind === "flood" ? 0.2 : 0.14, m.z]}>
          <cylinderGeometry args={[0.97, 0.97, 0.04, 6]} />
          <meshBasicMaterial color={m.kind === "flood" ? "#1f78c8" : "#fb923c"} transparent opacity={m.kind === "flood" ? 0.92 : 0.45} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}
