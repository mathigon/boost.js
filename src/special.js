// =================================================================================================
// Volta.js | TODO
// (c) 2014 Mathigon / Philipp Legner
// =================================================================================================


(function() {

	M.$body = $(document.body);
	M.$html = $(document.getElementsByTagName('html')[0]);
	M.$window = $(window);

	M.$html.addClass( M.browser.isTouch ? 'touch' : 'no-touch' );
	M.$html.addClass( M.browser.isMobile ? 'mobile' : 'no-mobile' );

    // Multiple queues, to allow ordering of resize events
    var events = [[], [], []];

    var trigger = function() {
        var size = [window.innerWidth, window.innerHeight];
        events.each(function(queue) {
            queue.each(function(fn) {
                fn(size);
            });
        })
    };

    M.resize = function(fn, queue) {
        if (fn) {
            events[queue||0].push(fn);
        } else {
            trigger();
        };
    };

    M.offResize = function(fn) {
        var index = events.indexOf(fn);
        if (index >= 0) events.splice(index, 1);
    };

    var timeout = null;
    M.$window.on('resize', function() {
        clearTimeout(timeout);
        timeout = setTimeout(function() {
            trigger();
        }, 100);
    });

})();
