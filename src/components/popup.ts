// =============================================================================
// Boost.js | Popup Component
// (c) Mathigon
// =============================================================================


import {$body, CustomElementView, ElementView, register} from '../';


/**
 * Popup component that reveals its `.popup-body` child when clicked.
 */
@register('x-popup')
export class Popup extends CustomElementView {
  private animation!: string;
  private $bubble!: ElementView;
  isOpen = false;

  ready() {
    this.animation = this.attr('animation') || 'pop';

    this.$bubble = this.$('.popup-body')!;
    this.$bubble.hide();

    const $target = this.$('.popup-target')!;
    $target.on('click', () => this.toggleOpen());
    this.on('clickOutside', () => this.close());
    for (const $a of this.$bubble.$$('a')) $a.on('click', () => this.close());

    $body.onKey('Escape', () => this.close());
  }

  toggleOpen() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;

    this.addClass('active');
    this.$bubble.enter(this.animation, 150);
    this.$bubble.setAttr('role', 'dialog');
    this.$bubble.focus();
    this.trigger('open');
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;

    this.removeClass('active');
    this.$bubble.exit(this.animation, 150);
    this.$bubble.removeAttr('role');
    this.trigger('close');
  }
}
