// =============================================================================
// Boost.js | SVG Drawing
// (c) Mathigon
// =============================================================================


import {chunk, last} from '@mathigon/core';
import {Point} from '@mathigon/euclid';


export type PathCommand = {points: Point[], type?: string, options?: number[]};

const pathLength: Record<string, number> = {A: 7, C: 6, H: 1, L: 2, M: 2, Q: 4, S: 4, T: 2, V: 1, Z: 0};
const pathSegment = /[astvzqmhlc]([^astvzqmhlc]*)/ig;
const pathPoint = /-?[0-9]*\.?[0-9]+(?:e[-+]?\d+)?/ig;


export function pathCommands(path: string): PathCommand[] {
  const commands: PathCommand[] = [];
  let lastPoint: Point|undefined = undefined;

  for (const match of (path.match(pathSegment) || [])) {
    const uType = match[0].toUpperCase();

    if (uType === 'Z') {
      commands.push({type: 'Z', points: []});
      continue;
    }

    const args = (match.slice(1).match(pathPoint) || []).map((p: string) => +p);
    const isAbsolute = uType === match[0];

    for (const [i, p] of chunk<number>(args, pathLength[uType]).entries()) {
      let points: Point[] = [];
      let type = (uType === 'M' && i > 0) ? 'L' : uType;
      let options: number[]|undefined = undefined;

      if (uType === 'H') {
        type = 'L';
        points = [new Point(p[0], isAbsolute ? (lastPoint?.y || 0) : 0)];
      } else if (uType === 'V') {
        type = 'L';
        points = [new Point(isAbsolute ? (lastPoint?.x || 0) : 0, p[0])];
      } else if (uType === 'A') {
        type = 'A';
        points = [new Point(p[5], p[6])];
        options = p.slice(0, 5);
      } else if ('MLCSQT'.includes(uType)) {
        points = chunk(p, 2).map(q => new Point(q[0], q[1]));
      }

      if (!isAbsolute && lastPoint) points = points.map(p => p.translate(lastPoint!));
      lastPoint = last(points);
      commands.push({type, points, options});
    }
  }

  return commands;
}

/**
 * Return all points on an SVG path. Essentially, this turns a curved path into
 * a polygon with just the joins/corners selected.
 */
export function parsePath(d: string): Point[] {
  if (!d) return [];
  const commands = pathCommands(d);
  return commands.map(c => last(c.points)).filter(p => !!p);
}
