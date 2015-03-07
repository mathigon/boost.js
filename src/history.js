// =================================================================================================
// Boost.js | History Utilities
// (c) 2015 Mathigon / Philipp Legner
// =================================================================================================


(function() {

    var hasHistory = M.browser.hasHistory;
    var id = 0;

    var root = window.location.origin + window.location.port;
    var path = window.location.pathname.replace(root, '');
    var hash = window.location.hash.replace(/^#/, '');

    var History = M.Class.extend({

        back: function() {
            if(hasHistory) window.history.back();
        },

        forward : function() {
            if (hasHistory) window.history.forward();
        },

        go: function(n) {
            if (hasHistory) window.history.go(n);
        },

        push: function(url, state) {
            ++id;
            if (!state) state = { url: url };
            if (hasHistory) window.history.pushState({id: id, state: state }, '', url);
        },

        replace: function(url, state) {
            if (!state) state = { url: url };
            if (hasHistory) window.history.replaceState(state, '', url);
        }

    });

    M.history = new History();

    Object.defineProperty(M.history, 'hash', {
        enumerable: true,
        configurable : true,
        get: function() {
            return hash;
        },
        set: function(newHash) {
            ++id;
            hash = newHash;
            if (hasHistory) {
                window.history.pushState({id: id, state: {}}, '', path + '#' + hash);
            } else {
                window.location.hash = '#' + hash;
            }
        }
    });

    var popped = ('state' in window.history);
    var initialURL = location.href;

    window.onpopstate = function(e) {
        var validPop = popped || location.href === initialURL;
        popped = true;

        if (!validPop) return;

        path = window.location.pathname;
        hash = window.location.hash.replace(/^#/, '');

        var state = e.state || { id: 0, state: { url: path } };
        var newId = state.id;

        M.history.trigger('change', state.state);
        if (newId < id) M.history.trigger('back', state.state);
        if (newId > id) M.history.trigger('forward', state.state);
        id = newId;
    };

})();
