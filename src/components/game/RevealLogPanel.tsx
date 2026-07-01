import { useRevealLog } from "@/hooks/useRevealLog";
import { PIECES } from "@/config/pieces";
import { SpriteIcon } from "./SpriteIcon";

export function RevealLogPanel() {
    const { log } = useRevealLog();

    return (
        <div className="flex h-full flex-col rounded-2xl border border-cyan-500/20 bg-slate-900/70 p-5 backdrop-blur-xl shadow-[0_0_30px_rgba(0,255,255,0.08)]">

            {/* TÍTULO */}

            <div className="mb-5 border-b border-cyan-500/15 pb-3">

                <h2 className="text-center text-lg font-bold uppercase tracking-[0.35em] text-cyan-300">
                    REGISTRO DE INTELIGÊNCIA
                </h2>

                <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.25em] text-slate-500">

                    <span>Unidades Detectadas</span>

                    <span className="rounded border border-cyan-500/20 px-2 py-1 text-cyan-300">
                        {log.length}
                    </span>

                </div>

            </div>

            {/* LISTA */}

            <div className="flex-1 overflow-y-auto pr-1">

                {log.length === 0 ? (

                    <div className="flex h-full flex-col items-center justify-center text-center">

                        <div className="mb-3 text-5xl opacity-30">
                            📡
                        </div>

                        <div className="text-slate-400">
                            Nenhuma unidade inimiga detectada.
                        </div>

                        <div className="mt-2 text-sm text-slate-600">
                            Aguarde o primeiro confronto.
                        </div>

                    </div>

                ) : (

                    <div className="space-y-3">

                        {log.map((entry) => {

                            const info = PIECES[entry.pieceType];

                            const azul = entry.owner === "blue";

                            return (

                                <div
                                    key={entry.id}
                                    className="rounded-xl border border-cyan-500/10 bg-slate-950/40 p-3 transition-all duration-200 hover:border-cyan-400/30 hover:bg-slate-900/80"
                                >

                                    <div className="flex items-center gap-4">

                                        <div className="rounded-lg border border-cyan-500/20 bg-slate-900 p-2">

                                            <SpriteIcon
                                                type={entry.pieceType}
                                                faction={entry.owner}
                                                size={48}
                                            />

                                        </div>

                                        <div className="flex-1">

                                            <div className="font-bold uppercase tracking-[0.15em] text-white">
                                                {info.nome}
                                            </div>

                                            <div className="mt-1 text-xs uppercase tracking-[0.15em] text-slate-400">

                                                Patente {info.patente ?? "—"}

                                            </div>

                                        </div>

                                        <div className="flex flex-col items-center gap-2">

                                            <span
                                                className={`h-3 w-3 rounded-full ${azul
                                                        ? "bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]"
                                                        : "bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.9)]"
                                                    }`}
                                            />

                                            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                                                {azul ? "AZUL" : "VERM."}
                                            </span>

                                        </div>

                                    </div>

                                </div>

                            );

                        })}

                    </div>

                )}

            </div>

        </div>
    );
}