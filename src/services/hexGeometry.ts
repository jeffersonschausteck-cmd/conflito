// Pure hex-grid math — no React, no game rules. Converts (row, col)
// grid coordinates (the same ones the Game Engine already uses) into
// pixel positions for a pointy-top, odd-row-offset hex layout.
//
// The Engine never imports this file: it only ever sees `row`/`col`
// numbers. This module exists purely so the Interface can *draw* those
// same coordinates as hexagons instead of squares.

export interface HexPoint {
  x: number;
  y: number;
}

export interface BoardPixelSize {
  width: number;
  height: number;
}

const SQRT3 = Math.sqrt(3);

export function hexWidth(size: number): number {
  return SQRT3 * size;
}

export function hexHeight(size: number): number {
  return 2 * size;
}

/** Pixel center of grid cell (row, col) for a hex of the given size. */
export function hexToPixel(row: number, col: number, size: number): HexPoint {
  const w = hexWidth(size);
  const vertSpacing = hexHeight(size) * 0.75;
  const rowOffset = row % 2 !== 0 ? w / 2 : 0;
  return {
    x: col * w + rowOffset + w / 2,
    y: row * vertSpacing + size,
  };
}

/** The 6 corner points of a pointy-top hex centered at the origin. */
export function hexCorners(size: number): HexPoint[] {
  const corners: HexPoint[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    corners.push({ x: size * Math.cos(angle), y: size * Math.sin(angle) });
  }
  return corners;
}

/** SVG `points` attribute string for a hex of the given size. */
export function hexPolygonPoints(size: number): string {
  return hexCorners(size)
    .map((p) => `${p.x},${p.y}`)
    .join(" ");
}

/** Bounding box (in pixels) needed to draw a full `rows`x`cols` grid. */
export function boardPixelSize(rows: number, cols: number, size: number): BoardPixelSize {
  const w = hexWidth(size);
  const vertSpacing = hexHeight(size) * 0.75;
  const width = cols * w + w / 2;
  const height = rows <= 0 ? 0 : (rows - 1) * vertSpacing + hexHeight(size);
  return { width, height };
}
