// =============================================================================
// Boost.js | Icon Component
// (c) Mathigon
// =============================================================================


import {$N, CustomElementView, register} from '../';

/**
 * SVG icon component, which loads from a global `/icons.svg` file.
 */
@register('x-icon')
export class IconView extends CustomElementView {

  ready() {
    // The element already has an SVG child, or is being copied at runtime by
    // a library like Vue.js.
    if (this.children.length) return;

    const $svg = $N('svg', {viewBox: '0 0 24 24', alt: '', role: 'presentation'}, this);
    const $use = $N('use', {}, $svg);

    const size = +this.attr('size') || 24;
    for (const $el of [this, $svg]) $el.css({width: `${size}px`, height: `${size}px`});

    this.onAttr('name', (n) => $use.setAttr('href', `/icons.svg#${n}`));
    // TODO ARIA attributes / alt text
    // TODO Maybe polyfill if <use> is not supported
  }
}
