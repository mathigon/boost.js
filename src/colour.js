// =============================================================================
// Boost.js | Colours
// (c) Mathigon
// =============================================================================



import { clamp, tabulate } from '@mathigon/core';

const shortHexRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
const longHexRegex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;


// -----------------------------------------------------------------------------
// Static Colours (gradients from http://www.sron.nl/~pault/colourschemes.pdf)

const rainbow = ['#22ab24', '#0f82f2', '#cd0e66','#fd8c00'];

const temperature = ['#3D52A1', '#3A89C9', '#77B7E5', '#B4DDF7', '#E6F5FE',
  '#FFFAD2', '#FFE3AA', '#F9BD7E', '#ED875E', '#D24D3E', '#AE1C3E'];

const solar = ['#FFFFE5', '#FFF7BC', '#FEE391', '#FEC44F', '#FB9A29',
  '#EC7014', '#CC4C02', '#993404', '#662506'];


// -----------------------------------------------------------------------------
// Helper Functions

function pad2(str) {
  return str.length === 1 ? '0' + str : str;
}

// Gets the colour of a multi-step gradient at a given percentage p
function getColourAt(gradient, p) {
  p = clamp(p, 0, 0.9999);  // FIXME
  const r = Math.floor(p * (gradient.length - 1));
  const q = p * (gradient.length - 1) - r;
  return Colour.mix(gradient[r + 1], gradient[r], q);
}


/**
 * Colour generation and conversion class.
 */
export class Colour {

  // -------------------------------------------------------------------------
  // Gradients

  /**
   * Generates a rainbow gradient with a given number of steps.
   * @param {number} steps
   * @returns {Colour[]}
   */
  static rainbow(steps) {
    return tabulate(x => getColourAt(rainbow, x/(steps-1)), steps);
  }

  /**
   * Generates a temperature gradient with a given number of steps.
   * @param {number} steps
   * @returns {Colour[]}
   */
  static temperature(steps) {
    const scale = clamp(0.1 * steps, 0, 1);
    return tabulate(function(x) {
      return getColourAt(temperature, (1-scale)/2 + scale*x/(steps-1) ); }, steps);
  }

  /**
   * Generates a solar gradient with a given number of steps.
   * @param {number} steps
   * @returns {Colour[]}
   */
  static solar(steps) {
    return tabulate(x => getColourAt(solar, x/(steps-1)), steps);
  }


  // -------------------------------------------------------------------------
  // Constructor Functions

  /**
   * @param {number} r
   * @param {number} g
   * @param {number} b
   * @param {number=} a
   */
  constructor(r, g, b, a = 1) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }

  /**
   * Creates a Colour instance from a hex string.
   * @param {string} hex
   * @returns {Colour}
   */
  static fromHex(hex) {
    hex = hex.replace(shortHexRegex, function(m, r, g, b) {
      return r + r + g + g + b + b;
    });

    const rgbParts = longHexRegex.exec(hex);
    if (!rgbParts) return new Colour(0,0,0);

    return new Colour(
      parseInt(rgbParts[1], 16),
      parseInt(rgbParts[2], 16),
      parseInt(rgbParts[3], 16)
    );
  }

  /**
   * Creates a Colour instance from an rgb or rgba CSS string.
   * @param {string} rgb
   * @returns {Colour}
   */
  static fromRgb(rgb) {
    const c = rgb.replace(/rgba?\(/,'').replace(')','').split(',');

    return new Colour(
      +c[0],
      +c[1],
      +c[2],
      (c.length > 3) ? +c[3] : 1
    );
  }


  // -------------------------------------------------------------------------
  // Properties

  /**
   * Converts this colour to a hex string.
   * @returns {string}
   */
  get hex() {
    const c = [this.r, this.g, this.b].map(x => pad2(Math.round(x).toString(16)));
    return '#' + c.join('');
  }

  /**
   * Converts this colour to an rgba string.
   * @returns {string}
   */
  get rgb() {
    const c = [this.r, this.g, this.b].map(x => Math.round(x)).join(',');
    return 'rgba(' + c + ',' + this.a + ')';
  }

  /**
   * Converts this colour to an hsl string.
   * @returns {string}
   */
  get hsl() {
    const r = this.r / 255;
    const g = this.g / 255;
    const b = this.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);

    let h, s;
    const l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch(max){
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return 'hsl(' + [h, s, l].join(',') + ')';
  }

  toString() {
    return this.rgb;
  }

  /**
   * Creates a copy of this colour.
   * @returns {Colour}
   */
  copy() {
    return new Colour(this.r, this.g, this.b, this.a);
  }


  // -------------------------------------------------------------------------
  // Operations

  /**
   * Linearly interpolates two colours or hex strings.
   * @param {Colour|string} c1
   * @param {Colour|string} c2
   * @param {number} p
   * @returns {Colour}
   */
  static mix(c1, c2, p = 0.5) {
    p = clamp(p, 0, 1);

    if (!(c1 instanceof Colour)) c1 = Colour.fromHex(c1);
    if (!(c2 instanceof Colour)) c2 = Colour.fromHex(c2);

    return new Colour(
        p * c1.r + (1 - p) * c2.r,
        p * c1.g + (1 - p) * c2.g,
        p * c1.b + (1 - p) * c2.b,
        p * c1.a + (1 - p) * c2.a
    );
  }
}
