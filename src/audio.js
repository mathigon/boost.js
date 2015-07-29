// =============================================================================
// Boost.js | Audio
// (c) 2015 Mathigon
// =============================================================================



import Evented from 'evented';
import isString from 'types';
import $ from 'element';


// -----------------------------------------------------------------------------
// Audio

const files = Map();
let playing = null;

function loadAudio(src) {
    let audio = new window.Audio(src);
    audio.load();
    audio.addEventListener('timeupdate', function() { audio.update(); });

    files.set(src, audio);
    return audio;
}


class AudioChunk extends Evented {

    constructor(src, times) {
        super();

        if (isString(times)) times = times.split('|').map(x => parseFloat(x));
        if (!files.has(src)) files.set(src, loadAudio(src));

        this.times = times;
        this.currentTime = times[0];
        this.duration = times[1] - times[0];
        this.player = files.get(src);
        this.status = 'paused';
    }

    play() {
        var _this = this;

        if (this.player.readyState < 2) {
            $(this.player).one('canplay seeked', function() { _this.play(); });
            return;
        }

        if (playing) playing.pause();
        playing = this;

        this.status = 'playing';
        this.player.currentTime = this.currentTime;
        this.player.play();
        this.trigger('play', {
            p: (this.currentTime - this.times[0]) / this.duration,
            t: this.currentTime
        });
    }

    pause() {
        this.status = 'paused';
        if (playing === this) this.player.pause();
        this.trigger('pause');
    }

    setTime(time) {
        if (this.player.readyState) this.player.currentTime = time;
        this.trigger('timeupdate', { p: (time - this.times[0]) / this.duration, t: time });
    }

    reset() {
        if (playing === this) this.player.pause();
        if (this.player.readyState) this.currentTime = this.times[0];
        this.status = 'paused';
        this.trigger('reset');
    }

    update() {
        if (this.status === 'ended') return;

        if (playing === this)
            this.currentTime = this.player.currentTime;

        if (this.currentTime >= this.times[1]) {
            this.pause();
            this.status = 'ended';
            this.trigger('end');
            return;
        }

        this.trigger('timeupdate', {
            p: (this.currentTime - this.times[0]) / this.duration,
            t: this.currentTime
        });
    }
}


// -----------------------------------------------------------------------------
// Speech Recognition

function SpeechRecognition() {

    if (!('webkitSpeechRecognition' in window)) {
        return {
            start: function() { rec.start(); },
            stop: function() { rec.stop(); },
            addCommand: function(){},
            removeCommand: function(){},
            available: false
        };
    }

    var rec = new window.webkitSpeechRecognition();
    rec.continuous = true;
    rec.language = 'en-US';
    //rec.interimResults = true;

    var commands = {};

    var processCommand = function(name) {
        name = name.toLowerCase().trim();
        if (commands[name]) commands[name]();
    };

    rec.onresult = function(event) {
        for (var i = event.resultIndex; i < event.results.length; ++i) {
            console.debug('Voice Input: ', event.results[i][0].transcript);
            processCommand(event.results[i][0].transcript);
        }
    };

    //rec.onstart = function() { ... }
    //rec.onerror = function(event) { ... }
    //rec.onend = function() { ... }

    var addCommand = function(name, fn) {
        if (!(name instanceof Array)) name = [name];
        for (var i=0; i<name.length; ++i) commands[name[i].toLowerCase()] = fn;
    };

    var removeCommand = function(name) {
        if (!(name instanceof Array)) name = [name];
        for (var i=0; i<name.length; ++i) commands[name[i].toLowerCase()] = undefined;
    };

    return {
        start: function() { rec.start(); },
        stop: function() { rec.stop(); },
        addCommand: addCommand,
        removeCommand: removeCommand,
        available: true
    };
}

// -----------------------------------------------------------------------------

export default {
    playing: function() { return playing; },
    loadAudio, AudioChunk, SpeechRecognition
};

