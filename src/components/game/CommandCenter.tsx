import { useGameState } from "@/hooks/useGameState";
import { PIECES } from "@/config/pieces";
import { SpriteIcon } from "./SpriteIcon";

export function CommandCenter() {
    const { selectedPiece } = useGameState();

    if (!selectedPiece) {
        return (
            <div className="flex h-full flex-col rounded-2xl border border-cyan-500/20 bg-slate-900/70 p-6 backdrop-blur-xl shadow-[0_0_30px_rgba(0,255,255,0.08)]">

                <h2 className="mb-8 text-center text-lg font-bold uppercase tracking-[0.35em] text-cyan-300">
                    CENTRO DE COMANDO
                </h2>

                <div className="flex flex-1 items-center justify-center">

                    <div className="text-center">

                        <div className="mb-3 text-6xl opacity-30">
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

            </div>
        );
    }

    const info = PIECES[selectedPiece.pieceType];

    const equipe =
        selectedPiece.owner === "blue"
            ? "AZUL"
            : "VERMELHA";

    return (
        <div className="flex h-full flex-col rounded-2xl border border-cyan-500/20 bg-slate-900/70 p-6 backdrop-blur-xl shadow-[0_0_35px_rgba(0,255,255,0.08)]">

            {/* TÍTULO */}

            <h2 className="text-center text-lg font-bold uppercase tracking-[0.35em] text-cyan-300">
                CENTRO DE COMANDO
            </h2>

            {/* IMAGEM */}

            <div className="my-6 flex justify-center">

                <div className="rounded-full border border-cyan-500/30 bg-slate-950/70 p-4 shadow-[0_0_25px_rgba(0,255,255,0.15)]">

                    <SpriteIcon
                        type={selectedPiece.pieceType}
                        faction={selectedPiece.owner}
                        size={150}
                    />

                </div>

            </div>

            {/* NOME */}

            <div className="text-center">

                <div className="text-cyan-500 tracking-[0.4em]">
                    ★★★★★
                </div>

                <h3 className="mt-2 text-2xl font-bold uppercase tracking-[0.18em] text-white">
                    {info.nome}
                </h3>

                <div className="mt-2 text-cyan-500 tracking-[0.4em]">
                    ★★★★★
                </div>

            </div>

            {/* DADOS */}

            <div className="my-6 rounded-xl border border-cyan-500/15 bg-slate-950/40 p-4">

                <Linha titulo="Patente" valor={info.patente ? String(info.patente) : "—"} />

                <Linha titulo="Movimento" valor={`${info.movimento} casas`} />

                <Linha titulo="Equipe" valor={equipe} />

                <Linha titulo="Estado" valor="PRONTO" />

            </div>

            {/* DESCRIÇÃO */}

            <div className="mb-5">

                <div className="mb-2 border-b border-cyan-500/15 pb-2 text-xs font-bold uppercase tracking-[0.35em] text-cyan-300">
                    DESCRIÇÃO
                </div>

                <p className="text-sm leading-6 text-slate-300">
                    {info.descricao}
                </p>

            </div>

            {/* HABILIDADE */}

            <div>

                <div className="mb-2 border-b border-cyan-500/15 pb-2 text-xs font-bold uppercase tracking-[0.35em] text-cyan-300">
                    HABILIDADE
                </div>

                <p className="text-sm leading-6 text-slate-300">
                    {info.habilidade}
                </p>

            </div>

        </div>
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

        <div className="flex items-center justify-between border-b border-slate-800 py-2 last:border-0">

            <span className="text-sm uppercase tracking-[0.15em] text-slate-400">
                {titulo}
            </span>

            <span className="font-bold uppercase tracking-[0.08em] text-cyan-300">
                {valor}
            </span>

        </div>

    );
}