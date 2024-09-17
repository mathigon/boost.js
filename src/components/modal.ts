// =============================================================================
// Boost.js | Modal Component
// (c) Mathigon
// =============================================================================


import {last} from '@mathigon/core';
import {$$, $body, $N, AnimationResponse, Browser, CustomElementView, ElementView, MediaView, register, Router, stopEvent} from '../';


const $modalBackground = $N('div', {class: 'modal-background'}, $body);
let backgroundAnimation: AnimationResponse|undefined;

let $openModal: Modal|undefined = undefined;
let lastFocusElement: HTMLElement|undefined = undefined;

const TITLE_ID = 'boost-modal-title';

function tryClose() {
  if ($openModal && $openModal.canClose) $openModal.close();
}

$modalBackground.on('click', tryClose);
$body.onKey('Escape', (e: Event) => {
  stopEvent(e);
  tryClose();
});
Router.on('change', tryClose);

$modalBackground.on('scrollwheel touchmove', stopEvent);

$body.onKey('Space ArrowUp ArrowDown PageDown PageUp', (e: Event) => {
  if ($openModal) stopEvent(e);
});

// -----------------------------------------------------------------------------

/**
 * Modal component
 */
@register('x-modal')
export class Modal extends CustomElementView {
  private isOpen = false;
  private $iframe?: ElementView;
  private $video?: MediaView;
  canClose = true;

  ready() {
    this.canClose = !this.hasAttr('no-close');
    this.$iframe = this.$('iframe[data-src]')!;
    this.$video = this.$('video') as MediaView|undefined;

    const $buttons = $$(`[data-modal=${this.id}]`);
    for (const $b of $buttons) $b.on('click', () => this.open());

    // Look for new modals to open, after browser navigation.
    Router.on('afterChange', ({$viewport}) => {
      const $buttons = $viewport.$$(`[data-modal=${this.id}]`);
      for (const $b of $buttons) $b.on('click', () => this.open());
    });

    // Open modals that are shown on pageload
    if ((this.hasClass('open') || Browser.getHash() === this.id) && !$openModal) this.open(true);

    // Change positioning for modals containing input fields on small screens,
    // to have a better layout when the keyboard panel is shown.
    if (this.$('input')) this.addClass('interactive');

    const $close = this.$('.close');
    if ($close) $close.on('click', () => this.close());

    // Used for Modal.confirm()
    for (const $btn of this.$$('.btn')) $btn.on('click', () => this.trigger('btn-click', $btn));

    // a11y
    this.setAttr('tabindex', -1);
    this.setAttr('role', 'dialog');
    this.setAttr('aria-modal', 'true');
    this.setAttr('aria-labelledby', TITLE_ID);
    this.onKey('Tab', (e: KeyboardEvent) => {
      if (!this.isOpen) return;
      const $focus = this.$$('input:not([type="hidden"]), a, button, textarea, [tabindex="0"]');
      if (e.shiftKey && e.target === $focus[0]._el) {
        e.preventDefault();
        last($focus).focus();
      } else if (!e.shiftKey && e.target === last($focus)._el) {
        e.preventDefault();
        $focus[0].focus();
      }
    });
  }

  open(noAnimation = false) {
    if (this.isOpen) return;

    $modalBackground.setClass('light', this.hasClass('light'));
    if ($openModal) {
      $openModal.close(true);
    } else if (noAnimation) {
      $modalBackground.show();
    } else if ($modalBackground.css('display') === 'block') {
      // Special handling if modals are immediately closed and then opened.
      backgroundAnimation?.cancel();
    } else {
      $modalBackground.enter('fade', 250);
    }

    this.isOpen = true;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    $openModal = this;
    if (this.$iframe) this.$iframe.setAttr('src', this.$iframe.data.src);
    if (this.$video) this.$video.play();

    if (noAnimation) {
      this.show();
    } else {
      this.enter('pop', 250).promise.then(() => this.css('transform', ''));
    }

    // a11y
    this.$('h2')?.setAttr('id', TITLE_ID);
    lastFocusElement = document.activeElement as HTMLElement;
    (this.$('input:not([type=hidden]), textarea') || this).focus();

    this.trigger('open');

    window.ga?.('send', 'event', 'Modal', this.id);
    window.gtag?.('event', 'modal', {action: this.id});
  }

  close(keepBg = false, noEvent = false) {
    if (!this.isOpen) return;
    this.isOpen = false;
    $openModal = undefined;

    if (this.$iframe) this.$iframe.setAttr('src', '');
    if (this.$video) this.$video.pause();

    // a11y
    this.$(`#${TITLE_ID}`)?.removeAttr('id');

    if (!keepBg) backgroundAnimation = $modalBackground.exit('fade', 250);
    this.exit('pop', 250).promise.then(() => this.css('transform', ''));
    if (!noEvent) this.trigger('close');
    if (lastFocusElement) lastFocusElement.focus();
  }

  getOpenModal() {
    return $openModal;
  }
}
