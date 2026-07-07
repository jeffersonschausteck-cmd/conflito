import { useGameState } from "@/hooks/useGameState";
import { PIECES } from "@/config/pieces";
import { ScifiFrame } from "@/components/ui/ScifiFrame";
import { SpriteIcon } from "./SpriteIcon";

export function CommandCenter() {
    const { selectedPiece } = useGameState();

    if (!selectedPiece) {
        return (
            <ScifiFrame variant="blue" eyebrow="// COMANDO" tabLabel="PEÇA SELECIONADA" className="flex h-full flex-col">
                <div className="flex flex-1 items-center justify-center py-4">

                    <div className="text-center">

                        <div className="mb-3 text-5xl opacity-30">
                            🎖️
                        </div>

                        <div className="text-slate-400">
                            Nenhuma unidade selecionada
                        </div>

                        <div className="mt-2 text-sm text-slate-600">
                            Clique em uma peça do tabuleiro.
                        </div>

                    </div>

                </div>
            </ScifiFrame>
        );
    }

    const info = PIECES[selectedPiece.pieceType];

    const equipe =
        selectedPiece.owner === "blue"
            ? "AZUL"
            : "VERMELHA";

    return (
        <ScifiFrame
            variant={selectedPiece.owner === "blue" ? "blue" : "red"}
            eyebrow="// COMANDO"
            tabLabel="PEÇA SELECIONADA"
            className="h-full overflow-y-auto"
        >
            {/* IMAGEM + NOME */}

            <div className="flex items-center gap-4">

                <div className="shrink-0 rounded-full border border-cyan-500/30 bg-slate-950/70 p-2 shadow-[0_0_25px_rgba(0,255,255,0.15)]">

                    <SpriteIcon
                        type={selectedPiece.pieceType}
                        faction={selectedPiece.owner}
                        size={64}
                    />

                </div>

                <div>
                    <h3 className="font-bold uppercase tracking-[0.18em] text-white">
                        {info.nome}
                    </h3>
                    <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                        Equipe {equipe}
                    </div>
                </div>

            </div>

            {/* DADOS */}

            <div className="my-4 rounded-xl border border-cyan-500/15 bg-slate-950/40 p-3">

                <Linha titulo="Patente" valor={info.patente ? String(info.patente) : "—"} />

                <Linha titulo="Movimento" valor={`${info.movimento} casas`} />

                <Linha titulo="Estado" valor="PRONTO" />

            </div>

            {/* HABILIDADE */}

            <div>

                <div className="mb-1 text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">
                    Habilidade
                </div>

                <p className="text-xs leading-5 text-slate-300">
                    {info.habilidade}
                </p>

            </div>

        </ScifiFrame>
    );
}

function Linha({
    titulo,
    valor,
}: {
    titulo: string;
    valor: string;
}) {
    return (

        <div className="flex items-center justify-between border-b border-slate-800 py-1.5 last:border-0">

            <span className="text-xs uppercase tracking-[0.1em] text-slate-400">
                {titulo}
            </span>

            <span className="text-xs font-bold uppercase tracking-[0.08em] text-cyan-300">
                {valor}
            </span>

        </div>

    );
}
