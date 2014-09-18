// =================================================================================================
// Volta.js | TODO
// (c) 2014 Mathigon / Philipp Legner
// =================================================================================================


(function() {

	M.storage = {};

	M.storage.set = function(key, value) {

	    var keys = (key||'').split('.');
	    var storage = JSON.parse(window.localStorage.getItem('M') || '{}');
	    var path = storage;

	    for (var i=0; i<keys.length-1; ++i) {
	        if (path[keys[i]] == null) path[keys[i]] = {};
	        path = path[keys[i]];
	    }

	    path[keys.last()] = value;

	    window.localStorage.setItem('M', JSON.stringify(storage));
	};

	M.storage.get = function(key) {

	    var keys = (key||'').split('.');
	    var storage = JSON.parse(window.localStorage.getItem('M') || '{}');
	    var path = storage;

	    for (var i=0; i<keys.length-1; ++i) {
	        if (path[keys[i]] == null) return null;
	        path = path[keys[i]];
	    }

	    return key ? path[keys.last()] : path;
	};

	M.storage.clear = function(key) {
	    if (key) {
	        M.storage.set(key, null);
	    } else {
	        window.localStorage.setItem('M', '');
	    }
	};

})();
