FA.PlaybackControl = class extends FA.Element {
    constructor() {
        super('fa_playback_control');

        this._delay = 0;

        // Look for an auto-play attribute in attributeChangedCallback
        this.activateLocalFilter({'ctrl': 'pause'});

        const self = this;
        this.el.slider.addEventListener('change', function(event) {
            self.stop();
            self.value = event.target.value;
        });
    }

    static get observedAttributes() {
        const observedList = [...super.observedAttributes, 'min', 'max', 'delay', 'repeat'];
        return observedList;
    }

    attributeChangedCallback(name, oldVal, newVal) {
        super.attributeChangedCallback(name, oldVal, newVal);
        if (name === 'min' || name === 'max') {
            this.el.slider.setAttribute(name, newVal);
        }
        else if (name === 'delay') {
            this._delay = parseInt(newVal);
        }
        else if (name === 'repeat') {
            this._repeat = newVal;
        }
    }

    set value(v) {
        let intVal = parseInt(v);

        const oldVal = this._frameIndex;
        const maxVal = this.max;
        if (intVal > this.max) intVal = maxVal;
        if (intVal < this.min) intVal = this.min;

        this._frameIndex = intVal;
        if (this._frameIndex !== oldVal) {
            this.el.frameInfo.innerHTML = `${intVal} / ${maxVal}`;
            this.el.slider.value = this._frameIndex;
            this.dispatchEvent(new Event('change', {bubbles: true, composed: false}));
        }
    }

    get value() {
        return this._frameIndex;
    }

    get min() {
        return parseInt(this.getAttribute('min'));
    }

    get max() {
        return parseInt(this.getAttribute('max'));
    }

    stop() {
        if (this._interval !== undefined) {
            clearTimeout(this._interval);
            this._interval = undefined;
        }
    }

    ctrlFirstFrame(target, play=false) {
        this.stop();
        this.activateLocalFilter({'ctrl': 'first-frame'});
        this.value = this.min;
        if (play) {
            this.ctrlPlay();
        }
    }

    ctrlRewind() {
        this.stop();
        this.activateLocalFilter({'ctrl': 'rewind'});

        const self = this;
        this._interval = setInterval(function() {
            self.value--;
            if (self.value === self.min) {
                if (self._repeat === 'boomerang') {
                    self.ctrlPlay();
                }
                else if (self._repeat === 'loop') {
                    self.ctrlLastFrame(null, true);
                }
                else {
                    self.ctrlFirstFrame();
                }
            }
        }, this._delay);
    }

    ctrlStepBack() {
        this.stop();
        this.activateLocalFilter({'ctrl': 'step-back'});
        this.value--;
    }

    ctrlPause() {
        this.stop();
        this.activateLocalFilter({'ctrl': 'pause'});
    }

    ctrlStepForward() {
        this.stop();
        this.activateLocalFilter({'ctrl': 'step-forward'});
        this.value++;
    }

    ctrlPlay() {
        this.stop();
        this.activateLocalFilter({'ctrl': 'play'});

        // TODO: Wait for a frame-drawn event before queuing up the timer
        const self = this;
        this._interval = setInterval(function() {
            self.value++;
            if (self.value === self.max) {
                if (self._repeat === 'boomerang') {
                    self.ctrlRewind();
                }
                else if (self._repeat === 'loop') {
                    self.ctrlFirstFrame(null, true);
                }
                else {
                    self.ctrlLastFrame();
                }
            }
        }, this._delay);
    }

    ctrlLastFrame(target, play=false) {
        this.stop();
        this.activateLocalFilter({'ctrl': 'last-frame'});
        this.value = this.max;
        if (play) {
            this.ctrlRewind();
        }
    }
};
window.customElements.define('fa-playback-control', FA.PlaybackControl);
