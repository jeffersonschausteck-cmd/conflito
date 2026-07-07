import { ScifiFrame } from "@/components/ui/ScifiFrame";
import { TERRAINS } from "@/maps/terrains";
import type { TerrainId } from "@/maps/types";

export interface TerrainPanelProps {
  terrain: TerrainId | null;
  row?: number | null;
  col?: number | null;
}

/**
 * Informational panel for the currently selected hex. v1 only shows
 * name/type/description; `bonus`/`penalidades`/`efeitos` render
 * automatically once a terrain definition includes them — this
 * component never needs to change to support new attributes.
 */
export function TerrainPanel({ terrain, row, col }: TerrainPanelProps) {
  const info = terrain ? TERRAINS[terrain] : null;

  return (
    <ScifiFrame variant="cyan" eyebrow="// RECONHECIMENTO" tabLabel="TERRENO" className="h-full overflow-y-auto">
      {!info ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="mb-3 text-4xl opacity-30">🗺️</div>
          <div className="text-slate-400">Nenhuma célula selecionada</div>
          <div className="mt-2 text-sm text-slate-600">Clique em um hexágono do mapa.</div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <h3 className="text-lg font-bold uppercase tracking-[0.15em] text-white">
              {info.nome}
            </h3>
            <div className="mt-1 text-xs uppercase tracking-[0.25em] text-cyan-500">
              {info.tipo}
            </div>
          </div>

          {row != null && col != null && (
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Setor {row}-{col}
            </div>
          )}

          <p className="text-sm leading-6 text-slate-300">{info.descricao}</p>

          {info.bonus && info.bonus.length > 0 && (
            <TerrainAttributeList titulo="Bônus" itens={info.bonus} />
          )}
          {info.penalidades && info.penalidades.length > 0 && (
            <TerrainAttributeList titulo="Penalidades" itens={info.penalidades} />
          )}
          {info.efeitos && info.efeitos.length > 0 && (
            <TerrainAttributeList titulo="Efeitos Especiais" itens={info.efeitos} />
          )}
        </div>
      )}
    </ScifiFrame>
  );
}

function TerrainAttributeList({ titulo, itens }: { titulo: string; itens: string[] }) {
  return (
    <div>
      <div className="mb-2 border-b border-cyan-500/15 pb-2 text-xs font-bold uppercase tracking-[0.35em] text-cyan-300">
        {titulo}
      </div>
      <ul className="space-y-1 text-sm text-slate-300">
        {itens.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}
