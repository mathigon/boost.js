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


// -----------------------------------------------------------------------------
// Nicer SVG exporting

const COMMON_STYLES = ['font-family', 'font-size', 'font-style', 'font-weight',
  'letter-spacing', 'text-decoration', 'color', 'display', 'visibility',
  'alignment-baseline', 'baseline-shift', 'opacity', 'text-anchor', 'clip',
  'clip-path', 'clip-rule', 'mask', 'filter', 'transform', 'transform-origin',
  'white-space', 'line-height'];

const SVG_STYLES = ['fill', 'fill-rule', 'marker', 'marker-start', 'marker-mid',
  'marker-end', 'stroke', 'stroke-dasharray', 'stroke-dashoffset',
  'stroke-linecap', 'stroke-linejoin', 'stroke-width', 'text-rendering',
  'dominant-baseline', 'transform-box', 'paint-order'];

const HTML_STYLES = ['padding', 'min-width', 'max-width', 'height',
  'border-width', 'border-style', 'border-color', 'box-sizing', 'background',
  'width', 'grid-template-columns', 'text-align'];

const REMOVE_ATTRIBUTES = ['class', 'tabindex', 'contenteditable'];

const DONT_INHERIT = new Set(['opacity', 'transform-box', 'transform-origin', 'border-width', 'border-style', 'border-color']);

const STYLE_DEFAULTS: Record<string, string> = {
  'font-style': 'normal',
  'font-weight': '400',
  'letter-spacing': 'normal',
  'text-decoration': 'none',
  'display': 'block',
  'visibility': 'visible',
  'alignment-baseline': 'auto',
  'baseline-shift': '0px',
  'text-anchor': 'start',
  'clip': 'auto',
  'clip-path': 'none',
  'clip-rule': 'nonzero',
  'mask': 'none',
  'opacity': '1',
  'filter': 'none',
  'fill': 'rgb(0, 0, 0)',
  'fill-rule': 'nonzero',
  'marker': 'none',
  'stroke': 'none',
  'stroke-dasharray': 'none',
  'stroke-dashoffset': '0px',
  'stroke-linecap': 'butt',
  'stroke-linejoin': 'miter',
  'stroke-width': '1px',
  'text-rendering': 'auto',
  'transform': 'none',
  'dominant-baseline': 'auto',
  'transform-origin': '0px 0px',
  'transform-box': 'view-box',
  'paint-order': 'normal'
};

type El = HTMLElement|SVGElement;

export function cleanSVG(node: El) {
  if (node.getAttribute('hidden') || node.style.opacity === '0' || node.style.display === 'none') {
    // The element is hidden, so remove entirely.
    node.parentNode?.removeChild(node);
  } else {
    // Clean all child elements
    for (const child of Array.from(node.children)) cleanSVG(child as El);
    if (node.tagName === 'g' && node.childElementCount === 0) {
      // If there are no more child elements of this group, remove, too.
      node.parentNode?.removeChild(node);
    } else {
      // Otherwise, clean attributes.
      for (const a of REMOVE_ATTRIBUTES) {
        if (node.hasAttribute(a)) node.removeAttribute(a);
      }
    }
  }
}

function inheritedStyle(node: El, prop: string) {
  let n = node.parentElement;
  while (n) {
    const value = n.style.getPropertyValue(prop);
    if (value) return value;
    n = n.parentElement;
  }
}

export function copySVGStyles(source: El, copy: El, isHTML = false) {
  const style = window.getComputedStyle(source);
  copy.removeAttribute('style');  // Clean up previous values.

  const html = isHTML || (source.tagName === 'foreignObject');
  const properties = [...COMMON_STYLES, ...(html ? HTML_STYLES : SVG_STYLES)];

  // TODO Fix transform-origin and transform-box for compass and playing cards.
  for (const p of properties) {
    const value = style.getPropertyValue(p);
    const inherited = inheritedStyle(copy, p);
    if (value === STYLE_DEFAULTS[p] && !inherited) continue;  // This property is a default.
    if (!DONT_INHERIT.has(p) && value === inherited) continue;  // This property is inherited.
    copy.style.setProperty(p, value);
  }

  const sourceChildren = source.children;
  const copyChildren = copy.children;
  for (let i = 0; i < copyChildren.length; ++i) {
    copySVGStyles(sourceChildren[i] as El, copyChildren[i] as El, html);
  }
}
