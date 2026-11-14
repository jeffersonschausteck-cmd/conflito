import { useMemo } from "react";
import { TERRAINS, THEMES, type MapDefinition } from "@/maps";
import { SIZES } from "@/maps/gallery";

/**
 * Prévia pequena de um mapa (docs/19-Mapas.md): as casas do tabuleiro desenhadas com a cor de cada terreno, e as
 * duas zonas de posicionamento levemente coloridas (azul à esquerda, vermelho à direita). Usada na roleta e na
 * escolha do mapa da sala. Só visual.
 */
export function MapPreview({ map, className }: { map: MapDefinition; className?: string }) {
  const theme = THEMES[map.theme];
  const depth = SIZES[map.pace].depth;
  const { hexes, width, height } = useMemo(() => {
    const w = Math.sqrt(3);
    const corners = Array.from({ length: 6 }, (_, k) => {
      const a = ((60 * k - 30) * Math.PI) / 180;
      return [Math.cos(a) * 1.0, Math.sin(a) * 1.0] as const;
    });
    const out: { key: string; points: string; fill: string; zone: "blue" | "red" | null }[] = [];
    for (let r = 0; r < map.rows; r++) {
      for (let c = 0; c < map.cols; c++) {
        const t = map.tiles[r][c];
        const x = w * (c + (r % 2 ? 0.5 : 0));
        const y = 1.5 * r;
        const fill = t === "grass" || t === "blue-base" || t === "red-base" ? theme.gramaBorda : TERRAINS[t].corBase;
        out.push({
          key: `${r}-${c}`,
          points: corners.map(([dx, dy]) => `${(x + dx).toFixed(2)},${(y + dy).toFixed(2)}`).join(" "),
          fill,
          zone: c < depth ? "blue" : c >= map.cols - depth ? "red" : null,
        });
      }
    }
    return { hexes: out, width: w * (map.cols + 0.5), height: 1.5 * (map.rows - 1) + 2 };
  }, [map, theme, depth]);
  return (
    <svg viewBox={`${-Math.sqrt(3) / 2} -1 ${width} ${height}`} className={className} role="img" aria-label={`Prévia do mapa ${map.nome}`}>
      {hexes.map((h) => (
        <polygon key={h.key} points={h.points} fill={h.fill} stroke="rgba(0,0,0,0.28)" strokeWidth={0.07} />
      ))}
      {/* Zonas de posicionamento */}
      {hexes
        .filter((h) => h.zone)
        .map((h) => (
          <polygon key={`z-${h.key}`} points={h.points} fill={h.zone === "blue" ? "#38bdf8" : "#fb7185"} opacity={0.32} />
        ))}
    </svg>
  );
}
