import { useGameState } from "@/hooks/useGameState";
import { GamePanel } from "@/components/ui/GamePanel";

export function BattleStatus() {
    const { state } = useGameState();

    const blue = state.pieces.filter(
        (p) => p.owner === "blue" && p.isAlive
    );

    const red = state.pieces.filter(
        (p) => p.owner === "red" && p.isAlive
    );

    function quantidade(lista: typeof blue, tipo: string) {
        return lista.filter((p) => p.pieceType === tipo).length;
    }

    return (
        <GamePanel variant="default">

            <h2 className="mb-5 text-center text-lg font-bold uppercase tracking-[0.35em] text-cyan-300">
                ESTADO DA BATALHA
            </h2>

            <Equipe
                titulo="🔵 FORÇAS AZUIS"
                cor="text-cyan-300"
                lista={blue}
                quantidade={quantidade}
            />

            <div className="my-5 border-b border-cyan-500/20" />

            <Equipe
                titulo="🔴 FORÇAS VERMELHAS"
                cor="text-red-300"
                lista={red}
                quantidade={quantidade}
            />

        </GamePanel>
    );
}

function Equipe({
    titulo,
    cor,
    lista,
    quantidade,
}: any) {

    return (
        <div>

            <h3 className={`mb-3 font-bold uppercase tracking-wider ${cor}`}>
                {titulo}
            </h3>

            <Linha nome="Comandante" valor={quantidade(lista, "commander")} />
            <Linha nome="Oficial" valor={quantidade(lista, "officer")} />
            <Linha nome="Atirador" valor={quantidade(lista, "sniper")} />
            <Linha nome="Engenheiro" valor={quantidade(lista, "engineer")} />
            <Linha nome="Infantaria" valor={quantidade(lista, "infantry")} />
            <Linha nome="Batedor" valor={quantidade(lista, "scout")} />
            <Linha nome="Espião" valor={quantidade(lista, "spy")} />
            <Linha nome="Bombas" valor={quantidade(lista, "bomb")} />
            <Linha nome="Bandeira" valor={quantidade(lista, "flag")} />

        </div>
    );
}

function Linha({
    nome,
    valor,
}: {
    nome: string;
    valor: number;
}) {
    return (
        <div className="flex justify-between py-1 text-sm">

            <span className="text-slate-400">
                {nome}
            </span>

            <span
                className={
                    valor > 0
                        ? "font-bold text-emerald-400"
                        : "font-bold text-red-400"
                }
            >
                {valor > 0 ? "✔" : "✖"}
            </span>

        </div>
    );
}