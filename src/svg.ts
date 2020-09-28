// =============================================================================
// Boost.js | SVG Drawing
// (c) Mathigon
// =============================================================================


import {last} from '@mathigon/core';
import {Point} from '@mathigon/euclid';


const ITEM_SIZE: Record<string, number> = {C: 6, S: 4, Q: 4, A: 7};
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
