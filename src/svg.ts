// =============================================================================
// Boost.js | SVG Drawing
// (c) Mathigon
// =============================================================================


import {isOneOf, last, Obj} from '@mathigon/core';
import {Point, clamp, Angle, intersections, Line, Ray, Segment, Circle, Arc, Sector, Polygon, Polyline, Rectangle} from '@mathigon/fermat';


export type GeoShape = Angle|Line|Ray|Segment|Circle|Arc|Sector|Polygon|Polyline
                       |Rectangle;

export type LineMark = 'bar'|'bar2'|'arrow'|'arrow2';
export type LineArrow = 'start'|'end'|'both';

export interface SVGDrawingOptions {
  round?: boolean;
  size?: number;
  fill?: string;
  mark?: LineMark;
  arrows?: LineArrow;
  box?: Rectangle;
}


// -----------------------------------------------------------------------------
// Utility Functions

/** Draws an arc from a to c, with center b. */
function drawArc(a: Point, b: Point, c: Point) {
  const orient = b.x * (c.y - a.y) + a.x * (b.y - c.y) + c.x * (a.y - b.y);
  const sweep = (orient > 0) ? 1 : 0;
  const size = Point.distance(b, a);
  return [a.x, a.y + 'A' + size, size, 0, sweep, 1, c.x, c.y].join(',');
}

export function angleSize(angle: Angle, options: SVGDrawingOptions = {}) {
  if (angle.isRight && !options.round) return 20;
  return 24 + 20 * (1 - clamp(angle.rad, 0, Math.PI) / Math.PI);
}

function drawAngle(angle: Angle, options: SVGDrawingOptions = {}) {
  let a = angle.a;
  const b = angle.b;
  let c = angle.c;

  const size = options.size || angleSize(angle, options);

  const ba = Point.difference(a, b).unitVector;
  const bc = Point.difference(c, b).unitVector;

  a = Point.sum(b, ba.scale(size));
  c = Point.sum(b, bc.scale(size));

  let p = options.fill ? `M${b.x},${b.y}L` : 'M';

  if (angle.isRight && !options.round) {
    const d = Point.sum(a, bc.scale(size));
    p += `${a.x},${a.y}L${d.x},${d.y}L${c.x},${c.y}`;
  } else {
    p += drawArc(a, b, c);
  }

  if (options.fill) p += 'Z';
  return p;
}

function drawPath(...points: Point[]) {
  return 'M' + points.map(p => p.x + ',' + p.y).join('L');
}


// -----------------------------------------------------------------------------
// Arrows and Line Marks

function drawLineMark(x: Line, type: LineMark) {
  const p = x.perpendicularVector.scale(6);
  const n = x.unitVector.scale(3);
  const m = x.midpoint;

  switch (type) {
    case 'bar':
      return drawPath(m.add(p), m.add(p.inverse));
    case 'bar2':
      return drawPath(m.add(n).add(p), m.add(n).add(p.inverse)) +
             drawPath(m.add(n.inverse).add(p), m.add(n.inverse).add(p.inverse));
    case 'arrow':
      return drawPath(m.add(n.inverse).add(p), m.add(n),
          m.add(n.inverse).add(p.inverse));
    case 'arrow2':
      return drawPath(m.add(n.scale(-2)).add(p), m,
          m.add(n.scale(-2)).add(p.inverse)) +
             drawPath(m.add(p), m.add(n.scale(2)), m.add(p.inverse));
    default:
      return '';
  }
}

function arrowPath(start: Point, normal: Point) {
  if (!start || !normal) return '';
  const perp = normal.perpendicular;
  const a = start.add(normal.scale(9)).add(perp.scale(9));
  const b = start.add(normal.scale(9)).add(perp.scale(-9));
  return drawPath(a, start, b);
}

function drawLineArrows(x: Line, type: LineArrow) {
  let path = '';
  if (isOneOf(type, 'start', 'both')) {
    path += arrowPath(x.p1, x.unitVector);
  }
  if (isOneOf(type, 'end', 'both')) {
    path += arrowPath(x.p2, x.unitVector.inverse);
  }
  return path;
}

function drawArcArrows(x: Arc, type: LineArrow) {
  let path = '';

  if (isOneOf(type, 'start', 'both')) {
    const normal = new Line(x.c, x.start).perpendicularVector.inverse;
    path += arrowPath(x.start, normal);
  }

  if (isOneOf(type, 'end', 'both')) {
    const normal = new Line(x.c, x.end).perpendicularVector;
    path += arrowPath(x.end, normal);
  }

  return path;
}


// -----------------------------------------------------------------------------
// Draw Function

export function drawSVG(obj: GeoShape, options: SVGDrawingOptions = {}) {
  if (obj.type === 'angle') {
    obj = obj as Angle;
    return drawAngle(obj, options);
  }

  if (obj.type === 'segment') {
    obj = obj as Segment;
    if (obj.p1.equals(obj.p2)) return '';
    let line = drawPath(obj.p1, obj.p2);
    if (options.mark) line += drawLineMark(obj, options.mark);
    if (options.arrows) line += drawLineArrows(obj, options.arrows);
    return line;
  }

  if (obj.type === 'ray') {
    obj = obj as Ray;
    if (!options.box) return '';
    const end = intersections(obj, options.box)[0];
    return end ? drawPath(obj.p1, end) : '';
  }

  if (obj.type === 'line') {
    obj = obj as Line;
    if (!options.box) return '';
    const points = intersections(obj, options.box);
    if (points.length < 2) return '';
    let line = drawPath(points[0], points[1]);
    if (options.mark) line += drawLineMark(obj, options.mark);
    return line;
  }

  if (obj.type === 'circle') {
    obj = obj as Circle;
    return `M ${obj.c.x - obj.r} ${obj.c.y} a ${obj.r},${obj.r} 0 1 0 ` +
           `${2 * obj.r} 0 a ${obj.r} ${obj.r} 0 1 0 ${-2 * obj.r} 0`;
  }

  if (obj.type === 'arc') {
    obj = obj as Arc;
    let path = 'M' + drawArc(obj.start, obj.c, obj.end);
    if (options.arrows) path += drawArcArrows(obj, options.arrows);
    return path;
  }

  if (obj.type === 'sector') {
    obj = obj as Sector;
    return `M ${obj.c.x} ${obj.c.y} L ${drawArc(obj.start, obj.c, obj.end)} Z`;
  }

  if (obj.type === 'polyline') {
    obj = obj as Polyline;
    return drawPath(...obj.points);
  }

  if (obj.type === 'polygon' || obj.type === 'triangle') {
    obj = obj as Polygon;
    return drawPath(...obj.points) + 'Z';
  }

  if (obj.type === 'rectangle') {
    obj = obj as Rectangle;
    return drawPath(...obj.polygon.points) + 'Z';
  }

  return '';
}


// -----------------------------------------------------------------------------
// Parsing

const ITEM_SIZE: Obj<number> = {C: 6, S: 4, Q: 4, A: 7};
const SEGMENTS = /[MmLlCcSsQqTtAa][0-9,.\-\s]+/g;
const NUMBERS = /-?([0-9]*\.)?[0-9]+/g;

export function parsePath(d: string) {
  if (!d) return [];

  const segments = d.match(SEGMENTS) || [];
  const points: Point[] = [];

  for (const s of segments) {
    // Space before - sign is not required!
    const items = (s.slice(1).match(NUMBERS) || []).map(x => +x);
    const type = s[0].toUpperCase();
    const isRelative = (type !== s[0]);
    const itemLength = ITEM_SIZE[type] || 2;

    for (let i = 0; i < items.length; i += itemLength) {
      const x = items[i + itemLength - 2];
      const y = items[i + itemLength - 1];
      points.push(isRelative ? last(points).shift(x, y) : new Point(x, y));
    }
  }

  return points;
}
