import type { ComponentType } from "react";
import type { TerrainVisualProps } from "./index";

/**
 * Sprint ART-01 — tile de terreno com arte real (PNG em `public/tiles/`).
 *
 * A maioria das imagens tem um hexágono "flat-top" isométrico
 * centralizado num canvas 600x400, com o conteúdo sólido ocupando
 * x 106–494 e y 20–382 (medido pixel a pixel). O hexágono do jogo é
 * "pointy-top", então a imagem é desenhada numa escala maior que o
 * necessário para que o recorte (clip) do HexTile caia sempre DENTRO
 * da arte — nunca no fundo branco do canvas. Esses são os fatores
 * padrão (escala ≈ 3.65x/2.43x o tamanho do hexágono).
 *
 * Cada terreno pode sobrescrever esses fatores — necessário quando a
 * imagem de origem tem proporção/enquadramento diferente (ex.: a
 * floresta usa uma foto quadrada com o conteúdo ocupando quase todo o
 * canvas, então precisa de uma escala menor — ver `FOREST_SCALE`).
 */
const IMG_W = 3.65;
const IMG_H = 2.43;

export const FOREST_SCALE = { w: 2.42, h: 2.23 };

export function makeTileImage(
  href: string,
  scale: { w: number; h: number } = { w: IMG_W, h: IMG_H },
): ComponentType<TerrainVisualProps> {
  return function TileImage({ size }: TerrainVisualProps) {
    const w = scale.w * size;
    const h = scale.h * size;
    return (
      <image
        href={href}
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        preserveAspectRatio="none"
      />
    );
  };
}
