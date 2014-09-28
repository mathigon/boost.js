// =================================================================================================
// Volta.js | TODO
// (c) 2014 Mathigon / Philipp Legner
// =================================================================================================


(function() {

	M.$body = $(document.body);
	M.$html = $T('html');
	M.$window = $(window);
	M.$doc = $(window.document.documentElement);

	M.$html.addClass( M.browser.isTouch ? 'is-touch' : 'not-touch' );
	M.$html.addClass( M.browser.isMobile ? 'is-mobile' : 'not-mobile' );


	// ---------------------------------------------------------------------------------------------
	// RESIZE EVENTS

    // Multiple queues, to allow ordering of resize events
    var events = [[], [], []];

    var trigger = function() {
        var size = [window.innerWidth, window.innerHeight];
        events.each(function(queue) {
            queue.each(function(fn) {
                fn.call(null, size);
            });
        });
    };

    M.resize = function(fn, queue) {
        if (fn) {
            events[queue||0].push(fn);
        } else {
            trigger();
        }
    };

	// TODO remove resize events

    var timeout = null;
    M.$window.on('resize', function() {
        clearTimeout(timeout);
        timeout = setTimeout(function() {
            trigger();
        }, 50);
    });


	// ---------------------------------------------------------------------------------------------
	// LOAD EVENTS

	var loadQueue = [];
	var loaded = false;

	window.onload = function() {
		loaded = true;
		for (var i=0; i<loadQueue.length; ++i) loadQueue[i]();
	};

	M.onload = function(fn) {
		if (loaded) {
			fn();
		} else {
			loadQueue.push(fn);
		}
	};

})();
