// =================================================================================================
// Volta.js | TODO
// (c) 2014 Mathigon / Philipp Legner
// =================================================================================================


(function() {

	M.colour = {
	    red:    '#D90000',
	    orange: '#F15A24',
	    yellow: '#edd200',
	    lime:   '#b2d300',
	    green:  '#00B200',
	    cyan:   '#29ABE2',
	    blue:   '#006DD9',
	    violet: '#662D91',
	    purple: '#9d0069',
	    pink:   '#ED1E79'
	};

	M.colour.parse = function(c) {
	    if (c[0] === '#') {
	        return [ parseInt(c.substr(1,2),16), parseInt(c.substr(3,2),16), parseInt(c.substr(5,2),16) ];
	    } else if (c.indexOf('rgb') >= 0) {
	        return c.replace('rgb(','').replace('rgba(','').replace(')','').split(',')
	                .each(function(x){ return +x; });
	    }
	    return null;
	};

    var pad2 = function(str) {
        return str.length === 1 ? '0' + str : str;
    };

    var makeHex = function(colour) {
        var c = M.colour.parse(colour);
        return '#' + c.each(function(x) { return pad2(Math.round(x).toString(16)); }).join('');
    };

    var makeRgb = function(c) {
        var alpha = (c[3] || (c[3] === 0));
        return 'rgb' + (alpha ? 'a(' : '(') + c.slice(0,3).each(function(x) {
			return Math.round(x); }).join(',') + (alpha ? ',' + c[3] : '') + ')';
    };

    M.colour.toRgb = function(c) {
        return makeRgb(M.colour.parse(c));
    };

    M.colour.toHex = function(c) {
        return makeHex(M.colour.parse(c));
    };

    M.colour.interpolate = function(c1, c2, p) {
        p = p.bound(0,1);

        c1 = M.colour.parse(c1);
        c2 = M.colour.parse(c2);
        var alpha = (c1[3] != null || c2[3] != null);
        if (c1[3] == null) c1[3] = 1;
        if (c2[3] == null) c2[3] = 1;

        return makeRgb([
            p*c1[0]+(1-p)*c2[0],
            p*c1[1]+(1-p)*c2[1],
            p*c1[2]+(1-p)*c2[2],
            alpha ? p*c1[3]+(1-p)*c2[3] : null
        ]);
    };

	// Gets the colour of a multi-step gradient at a given percentage p
	M.colour.getColourAt = function(gradient, p) {
	    p = p.bound(0, 0.999);
	    var r = Math.floor(p * (gradient.length - 1));
	    var q = p * (gradient.length - 1) - r;
	    return M.colour.interpolate(gradient[r+1], gradient[r], q);
	};

    // Colour Schemes from http://www.sron.nl/~pault/colourschemes.pdf

    var rainbow = ['#D92120', '#E6642C', '#E68E34', '#D9AD3C', '#B5BD4C', '#7FB972', '#63AD99',
	               '#55A1B1', '#488BC2', '#4065B1', '#413B93', '#781C81'];
    M.colour.rainbow = function(steps) {
        var scale = (0.4 + 0.15 * steps).bound(0,1);
        return FM.tabulate(function(x){ return M.colour.getColourAt(rainbow, scale*x/(steps-1)); }, steps);
    };

    var temperature = ['#3D52A1', '#3A89C9', '#77B7E5', '#B4DDF7', '#E6F5FE', '#FFFAD2', '#FFE3AA',
                       '#F9BD7E', '#ED875E', '#D24D3E', '#AE1C3E'];
    M.colour.temperature = function(steps) {
        var scale = (0.1 * steps).bound(0,1);
        return FM.tabulate(function(x){
            return M.colour.getColourAt(temperature, (1-scale)/2 + scale*x/(steps-1) ); }, steps);
    };

    var solar = ['#FFFFE5', '#FFF7BC', '#FEE391', '#FEC44F', '#FB9A29', '#EC7014', '#CC4C02',
                 '#993404', '#662506'];
    M.colour.solar = function(steps) {
        return FM.tabulate(function(x){ return M.colour.getColourAt(solar, x/(steps-1)); }, steps);
    };

})();
