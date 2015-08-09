// =============================================================================
// Boost.js | Colours
// (c) 2015 Mathigon
// =============================================================================



import { clamp } from 'utilities';
import { tabulate } from 'arrays';


const shortHexRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
const longHexRegex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;


// -----------------------------------------------------------------------------
// Static Colours (gradients from http://www.sron.nl/~pault/colourschemes.pdf)

const red    = '#D90000';
const orange = '#F15A24';
const yellow = '#edd200';
const lime   = '#b2d300';
const green  = '#00B200';
const cyan   = '#29ABE2';
const blue   = '#006DD9';
const violet = '#662D91';
const purple = '#9d0069';
const pink   = '#ED1E79';

const rainbow = ['#D92120', '#E6642C', '#E68E34', '#D9AD3C', '#B5BD4C', '#7FB972', 
                 '#63AD99', '#55A1B1', '#488BC2', '#4065B1', '#413B93', '#781C81'];

const temperature = ['#3D52A1', '#3A89C9', '#77B7E5', '#B4DDF7', '#E6F5FE', '#FFFAD2', 
                     '#FFE3AA', '#F9BD7E', '#ED875E', '#D24D3E', '#AE1C3E'];

const solar = ['#FFFFE5', '#FFF7BC', '#FEE391', '#FEC44F', '#FB9A29', 
               '#EC7014', '#CC4C02', '#993404', '#662506'];


// -----------------------------------------------------------------------------
// Helper Functions

function pad2(str) {
    return str.length === 1 ? '0' + str : str;
}


export default class Colour {

    // -------------------------------------------------------------------------
    // Static Methods

    static interpolate(c1, c2, p) {
        p = clamp(p, 0, 1);

        if (!(c1 instanceof Colour)) c1 = new Colour(c1);
        if (!(c2 instanceof Colour)) c2 = new Colour(c2);

        return makeRgb([
            p * c1[0] + (1 - p) * c2[0],
            p * c1[1] + (1 - p) * c2[1],
            p * c1[2] + (1 - p) * c2[2],
            alpha ? p * c1[3] + (1 - p) * c2[3] : null
        ]);
    }

    // Gets the colour of a multi-step gradient at a given percentage p
    static getColourAt(gradient, p) {
        p = clamp(p, 0, 0.9999);  // FIXME
        let r = Math.floor(p * (gradient.length - 1));
        let q = p * (gradient.length - 1) - r;
        return interpolate(gradient[r + 1], gradient[r], q);
    }

    static rainbow(steps) {
        let scale = clamp(0.4 + 0.15 * steps, 0, 1);
        return tabulate(x => getColourAt(rainbow, scale * x/(steps-1)), steps);
    }

    static temperature(steps) {
        let scale = clamp(0.1 * steps, 0, 1);
        return tabulate(function(x) {
            return getColourAt(temperature, (1-scale)/2 + scale*x/(steps-1) ); }, steps);
    }

    static solar(steps) {
        return tabulate(x => getColourAt(solar, x/(steps-1)), steps);
    }


    // -------------------------------------------------------------------------
    // Constructor Functions

    constructor(r, g, b, a = 1) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }

    static fromHex(hex) {
        hex = hex.replace(shortHexRegex, function(m, r, g, b) {
            return r + r + g + g + b + b;
        });

        let rgbParts = longHexRegex.exec(hex);
        if (!rgbParts) return new Colour(0,0,0);

        return [
            parseInt(rgbParts[1], 16),
            parseInt(rgbParts[2], 16),
            parseInt(rgbParts[3], 16)
        ];
    }

    static fromRgb(rgb) {
        let c = rgb.replace(/rgba?\(/,'').replace(')','').split(',');
        this.r = +c[0];
        this.g = +c[1];
        this.b = +c[2];
        this.a = (c.length > 3) ? +c[3] : 1;
    }


    // -------------------------------------------------------------------------
    // Getter Functions

    get hex() {
        let c = [this.r, this.g, this.b].map(x => pad2(Math.round(x).toString(16)));
        return '#' + c.join('');
    }

    get rgb() {
        let c = [this.r, this.g, this.b].map(x => Math.round(x)).join(',');
        return 'rgba(' + c + ',' + this.a + ')';
    }

    get hsl() {
        let r = this.r / 255;
        let g = this.g / 255;
        let b = this.b / 255;
        
        let max = Math.max(r, g, b);
        let min = Math.min(r, g, b);

        let h, s;
        let l = (max + min) / 2;

        if (max === min) {
            h = s = 0; // achromatic
        } else {
            let d = max - min;
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

    get complement() {
        // TODO
    }

    get inverse() {
        // TODO
    }

    toString() {
        return this.rgb;
    }


    // -------------------------------------------------------------------------
    // Prototype Functions

    lighten(p) {
        // TODO
    }

    darken(p) {
        // TODO
    }

    saturate(p) {
        // TODO
    }

    desaturate(p) {
        // TODO
    }

    grayscale(p = 1) {
        // TODO
    }

}
