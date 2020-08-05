// =============================================================================
// Boost.js | Canvas Drawing
// (c) Mathigon
// =============================================================================


import {Segment, Circle, Polygon, Polyline} from '@mathigon/fermat';
import {GeoShape} from './svg';


export interface CanvasDrawingOptions {
  fill?: string;
  opacity?: number;
  stroke?: string;
  strokeWidth?: number;
  lineCap?: CanvasLineCap;
  lineJoin?: CanvasLineJoin;
}


export function drawCanvas(ctx: CanvasRenderingContext2D, obj: GeoShape,
    options: CanvasDrawingOptions = {}) {
  if (options.fill) ctx.fillStyle = options.fill;
  if (options.opacity) ctx.globalAlpha = options.opacity;

  if (options.stroke) {
    ctx.strokeStyle = options.stroke;
    ctx.lineWidth = options.strokeWidth || 1;
    if (options.lineCap) ctx.lineCap = options.lineCap;
    if (options.lineJoin) ctx.lineJoin = options.lineJoin;
  }

  ctx.beginPath();

  if (obj.type === 'segment') {
    obj = obj as Segment;
    ctx.moveTo(obj.p1.x, obj.p1.y);
    ctx.lineTo(obj.p2.x, obj.p2.y);

  } else if (obj.type === 'circle') {
    obj = obj as Circle;
    ctx.arc(obj.c.x, obj.c.y, obj.r, 0, 2 * Math.PI);

  } else if (obj.type === 'polygon' || obj.type === 'triangle') {
    obj = obj as Polygon;
    ctx.moveTo(obj.points[0].x, obj.points[0].y);
    for (const p of obj.points.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.closePath();

  } else if (obj.type === 'polyline') {
    obj = obj as Polyline;
    ctx.moveTo(obj.points[0].x, obj.points[0].y);
    for (const p of obj.points.slice(1)) ctx.lineTo(p.x, p.y);
  }

  // TODO Support for Line, Ray, Arc, Sector, Angle and Rectangle objects

  if (options.fill) ctx.fill();
  if (options.stroke) ctx.stroke();
}
