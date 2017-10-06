// =============================================================================
// Boost.js | Draggable Component
// (c) Mathigon
// =============================================================================


import { Evented, clamp } from '@mathigon/core';
import { roundTo } from '@mathigon/fermat';
import { Browser } from './browser';
import { slide } from './events';


export class Draggable extends Evented {

  constructor($el, $parent, direction = '', margin = 0, useTransform = false, snap = null) {
    super();
    let _this = this;
    let lastPosn, noMove;

    this.$el = $el;
    this._posn = { x: null, y: null };
    this.move = { x: direction !== 'y', y: direction !== 'x' };
    this.useTransform = useTransform;
    this.snap = snap;
    this.disabled = false;

    slide($el, {
      start: function(posn) {
        if (_this.disabled) return;
        lastPosn = posn;
        noMove = true;
        _this.trigger('start');
      },
      move: function(posn) {
        if (_this.disabled) return;
        noMove = false;

        let x = clamp(_this._posn.x + posn.x - lastPosn.x, 0, _this.width);
        let y = clamp(_this._posn.y + posn.y - lastPosn.y, 0, _this.height);

        lastPosn = posn;
        _this.position = { x, y };
        _this.trigger('drag');
      },
      end: function() {
        if (_this.disabled) return;
        _this.trigger(noMove ? 'click' : 'end');
      }
    });

    Browser.resize(function () {
      let oldWidth = _this.width;
      let oldHeight = _this.height;

      _this.width  = $parent.width  - margin * 2;
      _this.height = $parent.height - margin * 2;

      let x = _this.width  / oldWidth  * _this._posn.x;
      let y = _this.height / oldHeight * _this._posn.y;
      _this.draw({ x, y });
    });
  }

  get position() {
    return this._posn;
  }

  set position(posn) {
    this.draw(posn);
    this._posn = posn;
    this.trigger('move', posn);
  }

  draw({ x, y }) {
    if (this.snap) {
      x = roundTo(x, this.snap);
      y = roundTo(y, this.snap);
    }

    if (this.useTransform) {
      this.$el.translate(this.move.x ? Math.round(x) : 0, this.move.y ? Math.round(y) : 0);
    } else {
      if (this.move.x) this.$el.css('left', Math.round(x) + 'px');
      if (this.move.y) this.$el.css('top',  Math.round(y) + 'px');
    }
  }

}
