// =============================================================================
// Boost.js | SVG Drawing
// (c) Mathigon
// =============================================================================



import { isOneOf, clamp } from '@mathigon/core';
import { Point, Line, intersections } from '@mathigon/fermat';


// -----------------------------------------------------------------------------
// Utility Functions

/** Draws an arc from a to c, with center b. */
function drawArc(a, b, c) {
  const orient = b.x * (c.y - a.y) + a.x * (b.y - c.y) + c.x * (a.y - b.y);
  const sweep = (orient > 0) ? 1 : 0;
  const size = Point.distance(b, a);
  return [a.x, a.y + 'A' + size, size, 0, sweep, 1, c.x, c.y].join(',');
}

export function angleSize(angle, options={}) {
  if (angle.isRight && !options.round) return 20;
  return 24 + 20 * (1 - clamp(angle.rad, 0, Math.PI) / Math.PI);
}

function drawAngle(angle, options={}) {
  let a = angle.a;
  const b = angle.b;
  let c = angle.c;

  const size = options.size || angleSize(angle, options);

  const ba = Point.difference(a, b).normal;
  const bc = Point.difference(c, b).normal;

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

function drawPath(...points) {
  return 'M' + points.map(p => p.x + ',' + p.y).join('L');
}


// -----------------------------------------------------------------------------
// Arrows and Line Marks

function drawLineMark(x, type) {
  const p = x.perpendicularVector.scale(6);
  const n = x.normalVector.scale(3);
  const m = x.midpoint;

  switch (type) {
    case 'bar':
      return drawPath(m.add(p), m.add(p.inverse));
    case 'bar2':
      return drawPath(m.add(n).add(p), m.add(n).add(p.inverse)) +
          drawPath(m.add(n.inverse).add(p), m.add(n.inverse).add(p.inverse));
    case 'arrow':
      return drawPath(m.add(n.inverse).add(p), m.add(n), m.add(n.inverse).add(p.inverse));
    case 'arrow2':
      return drawPath(m.add(n.scale(-2)).add(p), m, m.add(n.scale(-2)).add(p.inverse)) +
          drawPath(m.add(p), m.add(n.scale(2)), m.add(p.inverse));
  }
}

function arrowPath(start, normal) {
  if (!start || !normal) return '';
  const perp = normal.perpendicular;
  const a = start.add(normal.scale(9)).add(perp.scale(9));
  const b = start.add(normal.scale(9)).add(perp.scale(-9));
  return drawPath(a, start, b);
}

function drawLineArrows(x, type) {
  let path = '';
  if (isOneOf(type, 'start', 'both')) {
    path += arrowPath(x.p1, x.normalVector);
  }
  if (isOneOf(type, 'end', 'both')) {
    path += arrowPath(x.p2, x.normalVector.inverse);
  }
  return path;
}

function drawArcArrows(x, type) {
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

export function drawSVG(obj, options={}) {
  // TODO Use instanceof rather than constructor.name. That is more robust,
  // but doesn't currently work since we have duplicate declaration of
  // geometry classes in different JS bundles.
  const type = obj.constructor.name;

  if (type ===  'Angle') {
    return drawAngle(obj, options);
  }

  if (type ===  'Segment') {
    if (obj.p1.equals(obj.p2)) return '';
    let line = drawPath(obj.p1, obj.p2);
    if (options.mark) line += drawLineMark(obj, options.mark);
    if (options.arrows) line += drawLineArrows(obj, options.arrows);
    return line;
  }

  if (type ===  'Ray') {
    if (!options.box) return '';
    const end = intersections(obj, options.box)[0];
    return end ? drawPath(obj.p1, end) : '';
  }

  if (type ===  'Line') {
    if (!options.box) return '';
    const points = intersections(obj, options.box);
    if (points.length < 2) return '';
    let line = drawPath(points[0], points[1]);
    if (options.mark) line += drawLineMark(obj, options.mark);
    return line;
  }

  if (type ===  'Circle') {
    return `M ${obj.c.x - obj.r} ${obj.c.y} a ${obj.r},${obj.r} 0 1 0 ` +
        `${2 * obj.r} 0 a ${obj.r} ${obj.r} 0 1 0 ${-2 * obj.r} 0`;
  }

  if (type ===  'Arc') {
    let path = 'M' + drawArc(obj.start, obj.c, obj.end);
    if (options.arrows) path += drawArcArrows(obj, options.arrows);
    return path;
  }

  if (type ===  'Sector') {
    return `M ${obj.c.x} ${obj.c.y} L ${drawArc(obj.start, obj.c, obj.end)} Z`;
  }

  if (type ===  'Polyline') {
    return drawPath(...obj.points);
  }

  if (type ===  'Polygon' || type ===  'Triangle') {
    return drawPath(...obj.points) + 'Z';
  }

  if (type ===  'Rectangle') {
    return drawPath(...obj.polygon.points) + 'Z';
  }
}
