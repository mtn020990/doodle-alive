export type ShapeKind = 'line' | 'circle' | 'square' | 'triangle' | 'star' | 'heart';

export interface Point {
  x: number;
  y: number;
}

/** Circles and squares stay round and even, and inside the dragged box (its shorter side sets both). */
function evenBox(from: Point, to: Point): Point {
  const side = Math.min(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
  return {
    x: from.x + Math.sign(to.x - from.x || 1) * side,
    y: from.y + Math.sign(to.y - from.y || 1) * side,
  };
}

/** Adds the outline of `shape`, dragged from `from` to `to`, to the context's current path. */
export function traceShape(
  ctx: CanvasRenderingContext2D,
  shape: ShapeKind,
  from: Point,
  to: Point,
) {
  const end = shape === 'circle' || shape === 'square' ? evenBox(from, to) : to;
  const left = Math.min(from.x, end.x);
  const top = Math.min(from.y, end.y);
  const w = Math.abs(end.x - from.x);
  const h = Math.abs(end.y - from.y);
  const cx = left + w / 2;
  const cy = top + h / 2;

  switch (shape) {
    case 'line':
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      return;
    case 'circle':
      ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
      return;
    case 'square':
      ctx.rect(left, top, w, h);
      return;
    case 'triangle':
      // Points up when dragged downwards, down when dragged upwards.
      ctx.moveTo(cx, from.y);
      ctx.lineTo(end.x, end.y);
      ctx.lineTo(from.x, end.y);
      ctx.closePath();
      return;
    case 'star':
      for (let i = 0; i < 10; i++) {
        const angle = -Math.PI / 2 + (i * Math.PI) / 5;
        const r = i % 2 === 0 ? 1 : 0.42;
        const x = cx + Math.cos(angle) * (w / 2) * r;
        const y = cy + Math.sin(angle) * (h / 2) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      return;
    case 'heart': {
      // Two lobes meeting at a point, drawn in a unit box and scaled to the drag.
      const p = (u: number, v: number) => [left + u * w, top + v * h] as const;
      ctx.moveTo(...p(0.5, 0.28));
      ctx.bezierCurveTo(...p(0.5, 0.05), ...p(0.08, 0.0), ...p(0.04, 0.32));
      ctx.bezierCurveTo(...p(0.0, 0.62), ...p(0.38, 0.8), ...p(0.5, 1));
      ctx.bezierCurveTo(...p(0.62, 0.8), ...p(1, 0.62), ...p(0.96, 0.32));
      ctx.bezierCurveTo(...p(0.92, 0.0), ...p(0.5, 0.05), ...p(0.5, 0.28));
      ctx.closePath();
      return;
    }
  }
}
