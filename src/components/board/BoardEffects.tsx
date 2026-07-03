export interface BoardEffectsProps {
    rows?: number;
    cols?: number;
}

export function BoardEffects({
    rows = 10,
    cols = 10,
}: BoardEffectsProps) {
    return (
        <div
            className="h-full w-full pointer-events-none"
            style={{
                display: "grid",
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gridTemplateRows: `repeat(${rows}, 1fr)`,
            }}
        >
            {/* Camada reservada para:
          - Seleção
          - Movimento
          - Ataques
          - Alcance
          - Explosões
          - Animações
      */}
        </div>
    );
}