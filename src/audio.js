// =============================================================================
// Boost.js | Audio
// (c) 2015 Mathigon
// =============================================================================



import Evented from 'evented';
import { isString } from 'types';
import { $ } from 'elements';


// -----------------------------------------------------------------------------
// Audio

const files = new Map();
let active = null;

export function loadAudio(src) {
    let audio = new window.Audio(src);
    audio.load();
    audio.addEventListener('timeupdate', function() { audio.update(); });

    files.set(src, audio);
    return audio;
}

export class Audio extends Evented {

    static playing() { return active; }

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

        if (active) active.pause();
        active = this;

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
        if (active === this) this.player.pause();
        this.trigger('pause');
    }

    setTime(time) {
        if (this.player.readyState) this.player.currentTime = time;
        this.trigger('timeupdate', { p: (time - this.times[0]) / this.duration, t: time });
    }

    reset() {
        if (active === this) this.player.pause();
        if (this.player.readyState) this.currentTime = this.times[0];
        this.status = 'paused';
        this.trigger('reset');
    }

    update() {
        if (this.status === 'ended') return;

        if (active === this)
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

export class SpeechRecognition extends Evented {

    constructor() {
        super({ splitBy: '|', lowercase: true });
        if (!this.isAvailable) return;

        this.rec = new window.webkitSpeechRecognition();
        this.rec.continuous = true;
        this.rec.language = 'en-US';
        //rec.interimResults = true;
        //rec.onstart = function() { ... }
        //rec.onerror = function(event) { ... }
        //rec.onend = function() { ... }

        this.rec.onresult = (event) => {
            for (var i = event.resultIndex; i < event.results.length; ++i) {
                let msg = event.results[i][0].transcript;
                this.trigger(msg);
            }
        };
    }

    start() {
        if (this.rec) this.rec.start();
    }

    stop() {
        if (this.rec) this.rec.stop();
    }

    static get isAvailable() {
        return 'webkitSpeechRecognition' in window;
    }

}
