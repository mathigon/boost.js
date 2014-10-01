// =================================================================================================
// Boost.js | History Utilities
// (c) 2014 Mathigon / Philipp Legner
// =================================================================================================


(function() {

    var hasHistory = !!window.history;
    var id = 0;

    var root = window.location.origin + window.location.port;
    var path = window.location.pathname.replace(root, '');
    var hash = window.location.hash.replace(/^#/, '');

    M.History = new M.Class.extend({

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

    Object.defineProperty(M.History, 'hash', {
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

    window.addEventListener('popstate', function(e){
        var validPop = popped || location.href === initialURL;
        popped = true;
        if (!validPop) return;

        path = window.location.pathname;
        hash = window.location.hash.replace(/^#/, '');

        if (!e.state) return;
        var newId = e.state.id;
        M.History.trigger('change', e.state.state);
        if (newId < id) M.History.trigger('back', e.state.state);
        if (newId > id) M.History.trigger('forward', e.state.state);
        id = newId;
    });

})();
