import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { canvasToBlob } from '@/shared/lib/image';
import { traceShape, type Point, type ShapeKind } from '../lib/shapes';

const PAPER = '#ffffff';
/** Shorter drags than this (in canvas pixels) are taps, not shapes. */
const MIN_SHAPE = 12;

export type Tool = 'pen' | 'eraser' | ShapeKind;

export interface Brush {
  color: string;
  size: number;
  tool: Tool;
}

/** Canvas size in its own pixels; strokes are stored in this space so the element can resize freely. */
export interface CanvasSize {
  width: number;
  height: number;
}

type Stroke =
  | { type: 'clear' }
  | { type: 'free'; color: string; size: number; points: Point[] }
  | { type: 'shape'; color: string; size: number; shape: ShapeKind; from: Point; to: Point };

function paintStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  if (stroke.type === 'clear') {
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    return;
  }
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  ctx.lineWidth = stroke.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (stroke.type === 'shape') {
    traceShape(ctx, stroke.shape, stroke.from, stroke.to);
    ctx.stroke();
    return;
  }
  const { points, size } = stroke;
  if (points.length === 1) {
    ctx.arc(points[0].x, points[0].y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  // Smooth the line with quadratic curves through the midpoints.
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 1; i++) {
    const mid = { x: (points[i].x + points[i + 1].x) / 2, y: (points[i].y + points[i + 1].y) / 2 };
    ctx.quadraticCurveTo(points[i].x, points[i].y, mid.x, mid.y);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
}

function paintAll(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  strokes: Stroke[],
  background?: HTMLImageElement,
) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, size.width, size.height);
  if (background) ctx.drawImage(background, 0, 0, size.width, size.height);
  strokes.forEach((s) => paintStroke(ctx, s));
}

/** Pointer position in canvas pixels. */
function toCanvas(
  canvas: HTMLCanvasElement,
  { clientX, clientY }: { clientX: number; clientY: number },
): Point {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * canvas.width,
    y: ((clientY - rect.top) / rect.height) * canvas.height,
  };
}

export function useDrawing(brush: Brush, size: CanvasSize, background?: HTMLImageElement) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const active = useRef<Stroke | null>(null);
  const [history, setHistory] = useState({ count: 0, cleared: false });

  const updateHistory = () => {
    setHistory({
      count: strokes.current.length,
      cleared: strokes.current.at(-1)?.type === 'clear',
    });
  };

  const redraw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    const all = active.current ? [...strokes.current, active.current] : strokes.current;
    if (ctx) paintAll(ctx, size, all, background);
  }, [size, background]);

  useEffect(redraw, [redraw]);

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const at = toCanvas(e.currentTarget, e);
    const { tool, color } = brush;
    active.current =
      tool === 'pen' || tool === 'eraser'
        ? {
            type: 'free',
            color: tool === 'eraser' ? PAPER : color,
            size: tool === 'eraser' ? brush.size * 2.5 : brush.size,
            points: [at],
          }
        : { type: 'shape', color, size: brush.size, shape: tool, from: at, to: at };
    redraw();
  };

  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const stroke = active.current;
    if (!stroke || stroke.type === 'clear') return;
    if (stroke.type === 'shape') {
      stroke.to = toCanvas(e.currentTarget, e); // live preview while dragging
    } else {
      // Coalesced events give every point the hardware saw, for smoother lines.
      const events = e.nativeEvent.getCoalescedEvents?.() ?? [];
      for (const ev of events.length ? events : [e])
        stroke.points.push(toCanvas(e.currentTarget, ev));
    }
    redraw();
  };

  const onPointerUp = () => {
    const stroke = active.current;
    if (!stroke) return;
    active.current = null;
    const tooSmall =
      stroke.type === 'shape' &&
      Math.hypot(stroke.to.x - stroke.from.x, stroke.to.y - stroke.from.y) < MIN_SHAPE;
    if (!tooSmall) {
      strokes.current = [...strokes.current, stroke];
      updateHistory();
    }
    redraw();
  };

  const undo = () => {
    active.current = null;
    strokes.current = strokes.current.slice(0, -1);
    updateHistory();
    redraw();
  };

  const clear = () => {
    active.current = null;
    strokes.current = [...strokes.current, { type: 'clear' }];
    updateHistory();
    redraw();
  };

  const toBlob = () => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error('Drawing canvas is not ready');
    const out = document.createElement('canvas');
    out.width = size.width;
    out.height = size.height;
    const ctx = out.getContext('2d');
    if (!ctx) throw new Error('Could not create drawing canvas');
    ctx.drawImage(canvas, 0, 0);
    return canvasToBlob(out, 'image/png');
  };

  return {
    canvasRef,
    isEmpty: (history.count === 0 && !background) || history.cleared,
    canUndo: history.count > 0,
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
