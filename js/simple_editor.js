FA.SimpleEditor = class extends FA.Element {
    constructor(template, context, endpoint) {
        super(template, context);
        this._endpoint = endpoint;

        const self = this;
        this._root.addEventListener('change', function(e) {
            // Immediately test for changed state on hard change
            self._checkForChange();
        });
        this._root.addEventListener('keyup', function(event) {
            // Buffer soft changes (like keypresses)
            // to avoid excessive comparisons while typing
            self._hasChangeEvent = true;
        });
    }

    set dirty(v) {
        if (this._dirty !== v) {
            this._dirty = v;
            this._root.querySelectorAll('[activate-on-dirty]').forEach(function(el) {
                FA.setActiveState(el, v);
            });
            if (v) {
                this._root.querySelectorAll('[enable-on-dirty]').forEach(function(el) {
                    el.removeAttribute('disabled');
                });
                this._root.querySelectorAll('[disable-on-dirty]').forEach(function(el) {
                    el.setAttribute('disabled', 'disabled');
                });
            }
            else {
                this._root.querySelectorAll('[enable-on-dirty]').forEach(function(el) {
                    el.setAttribute('disabled', 'disabled');
                });
                this._root.querySelectorAll('[disable-on-dirty]').forEach(function(el) {
                    el.removeAttribute('disabled');
                });
            }
        }
    }

    get dirty() {
        return this._dirty;
    }

    onActivate() {
        super.onActivate();
        // Start the soft-change poll
        const pollIntervalMS = 500;
        if (!this._changePoll) {
            this._changePoll = setInterval(function() {
                if (self._hasChangeEvent) {
                    self._checkForChange();
                }
            }, pollIntervalMS);
        }
    }

    _checkForChange() {
        this._hasChangeEvent = false;

        const currentVal = this.value;
        this.dirty = !FA.deepEqual(this._value, currentVal);
    }

    onActivate() {
        super.onActivate();
        this.request();
    }

    request() {
        if (this.loading) {
            console.warn("Editor data already requested");
            return;
        }

        this.loading = true;

        const taskOptions = {
            block: true,
            display: `Requesting editor data`,
        };

        FA.API.get(this._endpoint, null, taskOptions)
            .then( data => this._load(data) )
            .catch( data => this._loadFail(data) );
    }

    save() {
        if (this.loading) {
            console.warn("Can't save while loading");
            return;
        }

        const val = this.value;

        const taskOptions = {
            block: true,
            display: 'Saving editor data',
        };

        FA.API.put(this._endpoint, null, val, taskOptions)
            .then( data => this._load(data) )
            .catch( data => this._loadFail(data) );
    }

    _load(data) {
        // Render the data
        this.data = data;

        // Scrape the rendered value (won't necessarily match the data)
        this._value = this.value;

        this.dirty = false;
        this.loading = false;
    }

    _loadFail(data) {
        super._loadFail(data);

        this.loading = false;
    }
};