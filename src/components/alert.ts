// =============================================================================
// Boost.js | Alert Component
// (c) Mathigon
// =============================================================================


import {$body, $N, CustomElementView, register} from '../';

let $openAlert: Alert|undefined;
const $alertParent = $N('div', {class: 'snackbar'}, $body);


@register('x-alert')
export class Alert extends CustomElementView {

  ready() {
    $alertParent.append(this);
    this.$('button')?.on('click', () => this.close());
  }

  async open(duration = 2000) {
    if ($openAlert === this) return;
    if ($openAlert) await $openAlert.close();
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    $openAlert = this;
    await this.enter('pop', 300).promise;
    this.setAttr('role', 'alert');
    if (duration) setTimeout(() => this.close(), duration);
  }

  async close() {
    if ($openAlert !== this) return;
    $openAlert = undefined;
    this.removeAttr('role');
    await this.exit('pop', 300).promise;
  }
}
