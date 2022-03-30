FA.Modal = class extends FA.Element {
    constructor() {
        super();
        this._modal = undefined;
        this._root = undefined;
    }

    connectedCallback() {
        super.connectedCallback();

        // console.log('MODAL CONNECTED', this, this.innerHTML);
        // // Save the original contents
        //this._slotChildren = this.children;
        // console.log(this._slotChildren);
        // this.innerHTML = '';
    }

    set content(v) {
        this._content = v;
    }

    onActivate() {
        const self = this;

        this._context = {
            'title': this.getAttribute('title'),
            'closeButton': this.hasAttribute('auto-close-button'),
            'destroyButton': this.hasAttribute('auto-destroy-button'),
            'content': this._content,
        }

        // Create the wrapper if it doesn't already exist
        if (!this._modal) {
            this._modal = this.attachShadow({mode: 'open'});
            this._modal.innerHTML = this._header() + Template.render('fa_modal', this._context);

            this._modal.addEventListener('close', function(event) {
                self.close();
            });
        }

        // (re)Create the inner contents
        if (this._modal && !this._root) {
            this._template = this.getAttribute('deferred-template');
            this._childClass = this.getAttribute('deferred-child');
            this._childUrl = this.getAttribute('deferred-content-url');
            this._root = this._modal.querySelector('modal-content');
            this._createRootContent();
        }

        // Update data-driven content
        this._renderData(undefined);
    }

    onDeactivate() {
        if (this.hasAttribute('unload-inactive')) {
            this._root.innerHTML = '';
            this._root = null;
        }
    }

    _createRootContent() {
        super._createRootContent();

        const self = this;

        // Shortcut for binding onClick functions (without doing "this.getRootNode().host.[function]")
        this._modal.addEventListener('click', function(event) {
            // Shortcut to trigger click functions
            if (event.target.hasAttribute('click-function')) {
                const fnName = event.target.getAttribute('click-function');

                // Trigger the function by name, pass in the instigator
                assert(self[fnName], `${fnName} is not a member`);
                const fn = self[fnName].bind(self);
                fn(event.target);
            }

            // Shortcut to trigger a bubble-up event on click
            if (event.target.hasAttribute('click-event')) {
                const eventName = event.target.getAttribute('click-event');
                const e = new Event(eventName, {bubbles: true, composed: true});
                event.target.dispatchEvent(e);
            }
        });
    }

    getDeactivateFilter() {
        const filter = {};
        for (const[key, val] of Object.entries(this._activeFilter)) {
            filter[key] = '';
        }
        //console.log('DEACTIVATE FILTER', this._activeFilter, filter);
        return filter;
    }

    open() {
        FA.setActiveState(this, true);
    }

    close() {
        if (this._activeFilter) {
            const filter = this.getDeactivateFilter();
            console.log(filter);
            FA.addHashState(filter);
        }
        else {
           FA.setActiveState(this, false);
        }
    }

    destroy() {
        
    }
};
window.customElements.define('fa-modal', FA.Modal);
