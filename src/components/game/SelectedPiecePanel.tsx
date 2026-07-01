import { SpriteIcon } from "./SpriteIcon";

export function SelectedPiecePanel() {
    return (
        <div className="w-[320px] rounded-xl border border-cyan-500/30 bg-slate-900/95 shadow-2xl">

            {/* Cabeçalho */}
            <div className="border-b border-cyan-500/30 px-5 py-4">
                <h2 className="text-center text-cyan-300 font-bold tracking-[0.3em]">
                    CENTRO DE COMANDO
                </h2>
            </div>

            {/* Conteúdo */}
            <div className="p-6">

                {/* Foto da unidade */}
                <div className="flex justify-center mb-5">
                    <SpriteIcon
                        type="officer"
                        faction="blue"
                        size={120}
                    />
                </div>

                {/* Nome */}
                <h3 className="text-center text-white text-xl font-bold tracking-widest">
                    OFICIAL
                </h3>

                {/* Informações */}
                <div className="mt-6 space-y-3">

                    <InfoRow
                        label="Patente"
                        value="8"
                    />

                    <InfoRow
                        label="Equipe"
                        value="Azul"
                    />

                    <InfoRow
                        label="Movimento"
                        value="2 Casas"
                    />

                    <InfoRow
                        label="Estado"
                        value="Pronto"
                        color="text-green-400"
                    />

                </div>

            </div>

        </div>
    );
}

interface InfoRowProps {
    label: string;
    value: string;
    color?: string;
}

function InfoRow({
    label,
    value,
    color = "text-cyan-300",
}: InfoRowProps) {
    return (
        <div className="flex justify-between border-b border-slate-700 pb-2">

            <span className="text-slate-400">
                {label}
            </span>

            <span className={color}>
                {value}
            </span>

        </div>
    );
}