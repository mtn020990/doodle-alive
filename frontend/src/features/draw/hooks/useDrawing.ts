import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { canvasToBlob } from '@/shared/lib/image';

/** Strokes are stored in a fixed square space so the canvas can resize freely. */
export const CANVAS_SIZE = 1024;
const PAPER = '#ffffff';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  color: string;
  size: number;
  points: Point[];
}

export interface Brush {
  color: string;
  size: number;
  eraser: boolean;
}

function paintStroke(ctx: CanvasRenderingContext2D, { color, size, points }: Stroke) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (points.length === 1) {
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  // Smooth the line with quadratic curves through the midpoints.
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 1; i++) {
    const mid = { x: (points[i].x + points[i + 1].x) / 2, y: (points[i].y + points[i + 1].y) / 2 };
    ctx.quadraticCurveTo(points[i].x, points[i].y, mid.x, mid.y);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
}

function paintAll(ctx: CanvasRenderingContext2D, strokes: Stroke[]) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  strokes.forEach((s) => paintStroke(ctx, s));
}

/** Pointer position in the fixed canvas space. */
function toCanvas(
  rect: DOMRect,
  { clientX, clientY }: { clientX: number; clientY: number },
): Point {
  return {
    x: ((clientX - rect.left) / rect.width) * CANVAS_SIZE,
    y: ((clientY - rect.top) / rect.height) * CANVAS_SIZE,
  };
}

export function useDrawing(brush: Brush) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const active = useRef<Stroke | null>(null);
  const [count, setCount] = useState(0);

  const redraw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) paintAll(ctx, active.current ? [...strokes.current, active.current] : strokes.current);
  }, []);

  useEffect(redraw, [redraw]);

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    active.current = {
      color: brush.eraser ? PAPER : brush.color,
      size: brush.eraser ? brush.size * 2.5 : brush.size,
      points: [toCanvas(e.currentTarget.getBoundingClientRect(), e)],
    };
    redraw();
  };

  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!active.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    // Coalesced events give every point the hardware saw, for smoother lines.
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [];
    for (const ev of events.length ? events : [e]) active.current.points.push(toCanvas(rect, ev));
    redraw();
  };

  const onPointerUp = () => {
    if (!active.current) return;
    strokes.current = [...strokes.current, active.current];
    active.current = null;
    setCount(strokes.current.length);
    redraw();
  };

  const undo = () => {
    strokes.current = strokes.current.slice(0, -1);
    setCount(strokes.current.length);
    redraw();
  };

  const clear = () => {
    strokes.current = [];
    setCount(0);
    redraw();
  };

  const toBlob = () => {
    const out = document.createElement('canvas');
    out.width = out.height = CANVAS_SIZE;
    paintAll(out.getContext('2d')!, strokes.current);
    return canvasToBlob(out, 'image/png');
  };

  return {
    canvasRef,
    isEmpty: count === 0,
    undo,
    clear,
    toBlob,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  };
}
