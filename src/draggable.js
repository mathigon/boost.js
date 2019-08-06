// =============================================================================
// Boost.js | Draggable Component
// (c) Mathigon
// =============================================================================


import { Evented, applyDefaults } from '@mathigon/core';
import { Point } from '@mathigon/fermat';
import { Browser } from './browser';
import { slide } from './events';


const defaultOptions = {
  moveX: true,
  moveY: true,
  snap: 1,
  useTransform: false,
  margin: 0,
  round: (p => p),
  width: null,
  height: null,
  responsive: false  // TODO This should be the default for SVG elements.
};


/**
 * A draggable HTML element.
 * @emits {void} Draggable#start when the user starts dragging this element.
 * @emits {Point} Draggable#drag while the user is dragging this element.
 * @emits {void} Draggable#click when the user clicks on the this element.
 * @emits {void} Draggable#end after the user stops dragging this element.
 * @emits {Point} Draggable#move When the position of this element changes.
 */
export class Draggable extends Evented {

  /**
   * @param {Element} $el
   * @param {Element} $parent
   * @param {Object} options
   * @param {boolean=} options.moveX Whether it is draggable along the x-axis.
   * @param {boolean=} options.moveY Whether it is draggable along the y-axis.
   * @param {number=} options.snap Interval for snapping (in px)
   * @param {boolean=} options.useTransform Whether to use CSS transforms rather
   *                   than `left` and `right`.
   * @param {number=} options.margin Margin within the `$parent` element.
   * @param {Function=} options.round Custom rounding function.
   * @param {number=} options.width Override `$parent` width.
   * @param {number=} options.height Override `$parent` height.
   * @param {boolean=} options.responsive Whether to use the intrinsic svgWidth
   *                   and svgHeight when positioning the element.
   */
  constructor($el, $parent, options={}) {
    super();

    this.$el = $el;
    this.position = new Point(0, 0);
    this.options = applyDefaults(options, defaultOptions);
    this.disabled = false;
    this.setDimensions($parent);

    let startPosn = null;
    slide($el, {
      start: () => {
        if (this.disabled) return;
        startPosn = this.position;
        this.trigger('start');
      },
      move: (posn, start) => {
        if (this.disabled) return;
        this.setPosition(startPosn.x + posn.x - start.x,
            startPosn.y + posn.y - start.y);
        this.trigger('drag', this.position);
      },
      end: (last, start) => {
        if (this.disabled) return;
        this.trigger(last.equals(start) ? 'click' : 'end');
      }
    });

    Browser.resize(() => {
      const oldWidth = this.width;
      const oldHeight = this.height;
      this.setDimensions($parent);
      this.setPosition(this.position.x * this.width  / oldWidth || 0,
          this.position.y * this.height / oldHeight || 0);
    });
  }

  /** @private */
  setDimensions($parent) {
    this.width  = this.options.width || (this.options.responsive ? $parent.svgWidth : $parent.width);
    this.height = this.options.height || (this.options.responsive ? $parent.svgHeight : $parent.height);
  }

  /**
   * Sets the position of the element.
   * @param {number} x
   * @param {number} y
   */
  setPosition(x, y) {
    const m = this.options.margin;
    const p = this.options.round(new Point(x, y)
        .clamp(m, this.width - m, m, this.height - m)
        .round(this.options.snap));

    if (!this.options.moveX) p.x = 0;
    if (!this.options.moveY) p.y = 0;

    if (p.equals(this.position)) return;
    this.position = p;

    if (this.options.useTransform) {
      this.$el.translate(p.x, p.y);
    } else {
      if (this.options.moveX) this.$el.css('left', p.x + 'px');
      if (this.options.moveY) this.$el.css('top', p.y + 'px');
    }

    this.trigger('move', p);
  }

}
