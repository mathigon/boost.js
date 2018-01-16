// =============================================================================
// Boost.js | Animations
// (c) Mathigon
// =============================================================================



import { defer, delay, total, contains } from '@mathigon/core';

// prevent animations on page load
let isReady = false;
setTimeout(function() { isReady = true; });


// -----------------------------------------------------------------------------
// Simple Animations

export function animate(callback, duration) {
  if (duration === 0) {callback(); return; }

  let startTime = Date.now();
  let time = 0;
  let running = true;

  let deferred = defer();
  let then = deferred.promise.then.bind(deferred.promise);

  function getFrame() {
    if (running && (!duration || time <= duration))
      window.requestAnimationFrame(getFrame);

    time = Date.now() - startTime;
    callback(duration ? Math.min(1,time/duration) : time);
    if (duration && time >= duration) deferred.resolve();
  }

  getFrame();

  return {
    cancel: function() { running = false; deferred.reject(); },
    then };
}


// -----------------------------------------------------------------------------
// Easing

function easeIn(type, t, s) {
  switch (type) {

    case 'quad':   return t * t;
    case 'cubic':  return t * t * t;
    case 'quart':  return t * t * t * t;
    case 'quint':  return t * t * t * t * t;
    case 'circ':   return 1 - Math.sqrt(1 - t * t);
    case 'sine':   return 1 - Math.cos(t * Math.PI / 2);
    case 'exp':    return (t <= 0) ? 0 : Math.pow(2, 10 * (t - 1));

    case 'back':
      if (!s) s = 1.70158;
      return t * t * ((s + 1) * t - s);

    case 'elastic':
      if (!s) s = 0.3;
      return - Math.pow(2, 10 * (t - 1)) * Math.sin(((t - 1) * 2 / s - 0.5) * Math.PI );

    case 'swing':
      return 0.5 - Math.cos(t * Math.PI) / 2;

    case 'spring':
      return 1 - (Math.cos(t * 4.5 * Math.PI) * Math.exp(-t * 6));

    case 'bounce':
      if (t < 1/11) return 1/64 - 7.5625 * (0.5/11 - t) * (0.5/11 - t);  // 121/16 = 7.5625
      if (t < 3/11) return 1/16 - 7.5625 * (  2/11 - t) * (  2/11 - t);
      if (t < 7/11) return 1/4  - 7.5625 * (  5/11 - t) * (  5/11 - t);
      return 1    - 7.5625 * (     1 - t) * (     1 - t);

    default:
      return t;
  }
}

export function ease(type, t = 0, s = 0) {

  if (t === 0) return 0;
  if (t === 1) return 1;
  type = type.split('-');

  if (type[1] === 'in')  return     easeIn(type[0], t, s);
  if (type[1] === 'out') return 1 - easeIn(type[0], 1 - t, s);
  if (t <= 0.5)          return     easeIn(type[0], 2 * t,     s) / 2;
  return 1 - easeIn(type[0], 2 * (1-t), s) / 2;
}


// -----------------------------------------------------------------------------
// Element Animations

export function transition($el, properties, duration = 400, delay = 0, easing = 'ease-in-out') {
  if (!isReady) {
    Object.keys(properties).forEach(k => { let p = properties[k]; $el.css(k, Array.isArray(p) ? p[1] : p); });
    return Promise.resolve();
  }

  // Cancel any previous animations
  if ($el._data._animation) $el._data._animation.cancel();

  let to = {}, from = {};
  let deferred = defer();

  let style = window.getComputedStyle($el._el);
  Object.keys(properties).forEach(function(k) {
    let p = properties[k];
    from[k] = Array.isArray(p) ? p[0] : style.getPropertyValue(k);
    to[k] = Array.isArray(p) ? p[1] : p;
  });

  // Special rules for animations to height: auto
  let oldHeight = to.height;
  if (to.height == 'auto') to.height = total($el.children.map($c => $c.outerHeight)) + 'px';

  let player = $el._el.animate([from, to], { duration, delay, easing, fill: 'forwards' });

  player.onfinish = function(e) {
    if ($el._el) Object.keys(properties).forEach(k => { $el.css(k, k == 'height' ? oldHeight : to[k]); });
    deferred.resolve(e);
    player.cancel();  // bit ugly, but needed for Safari...
  };

  let animation = {
    then: deferred.promise.then.bind(deferred.promise),
    cancel: function() {
      if ($el._el) Object.keys(properties).forEach(k => { $el.css(k, $el.css(k)); });
      return player.cancel();
    }
  };

  // Only allow cancelling of animation in next thread.
  setTimeout(function() { $el._data._animation = animation; });
  return animation;
}


// -----------------------------------------------------------------------------
// Element CSS Animations Effects

export function enter($el, effect = 'fade', duration = 500, _delay = 0) {
  if (!isReady) { $el.show(); return; }

  delay(function() { $el.show(); }, _delay);
  let animation;

  if (effect === 'fade') {
    animation = transition($el, { opacity: [0, 1] }, duration, _delay);

  } else if (effect === 'pop') {
    let transform = $el.transform.replace(/scale\([0-9\.]*\)/, '')
                                 .replace(/matrix\([0-9\.]*\)/, '');
    let from = transform + ' scale(0.5)';
    let to   = transform + ' scale(1)';
    let easing = 'cubic-bezier(0.175, 0.885, 0.32, 1.275)';

    transition($el, { opacity: [0, 1] }, duration, _delay);
    animation = transition($el, { 'transform': [from, to] }, duration, _delay, easing);

  } else if (effect.startsWith('slide')) {
    let options = effect.split('-');
    let properties = {};

    if (contains(options, 'left') || contains(options, 'right')) {
      let t = contains(options,'right') ? '50%' : '-50%';
      properties.transform = [`translateX(${t})`, 'none'];
      properties.opacity = [0, 1];
    }
    if (contains(options, 'down')) properties.height = [0, 'auto'];

    animation = transition($el, properties, duration, _delay);

  } else if (effect === 'draw') {
    let l = $el.strokeLength + 'px';
    $el.css({ opacity: 1, 'stroke-dasharray': l + ' ' + l });
    animation = transition($el, { 'strokeDashoffset': [l, 0] }, duration, _delay, 'linear');
    animation.then(function() { $el.css('stroke-dasharray', ''); });
  }

  return animation;
}

export function exit($el, effect = 'fade', duration = 400, delay = 0) {
  if (!isReady) { $el.hide(); return; }

  if ($el.css('display') === 'none') return;
  let animation;

  if (effect === 'fade') {
    animation = transition($el, { opacity: [1, 0] }, duration, delay);

  } else if (effect === 'pop') {
    let transform = $el.transform.replace(/scale\([0-9\.]*\)/, '');
    let from = transform + ' scale(1)';
    let to   = transform + ' scale(0.5)';
    let easing = 'cubic-bezier(0.68, -0.275, 0.825, 0.115)';

    transition($el, { opacity: [1, 0] }, duration, delay);
    animation = transition($el, { transform: [from, to] }, duration, delay, easing);

  } else if (effect.startsWith('slide')) {
    let options = effect.split('-');
    let properties = {};

    if (contains(options, 'left') || contains(options, 'right')) {
      let t = contains(options,'right') ? '50%' : '-50%';
      properties.transform = ['none', `translateX(${t})`];
      properties.opacity = [1, 0];
    }

    if (contains(options, 'up')) properties.height = 0;

    animation = transition($el, properties, duration, delay);

  } else if (effect === 'draw') {
    let l = $el.strokeLength + 'px';
    $el.css('stroke-dasharray', l + ' ' + l);
    animation = transition($el, { 'strokeDashoffset': [0, l] }, duration, delay, 'linear');
  }

  animation.then(function() { $el.hide(); });
  return animation;
}

// these animations are defined in effects.css
// pulse-down, pulse-up, flash, bounce-up, bounce-right
export function effect(element, name) {
  element.animationEnd(function(){
    element.removeClass('effects-' + name);
  });
  element.addClass('effects-' + name);
}
