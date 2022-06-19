import * as common from "./common.mjs";

const _cssMap = {};
var _cachedHeaderHTML = '';

export class Element extends HTMLElement {
    static registerCSS(key, cssFile) {
        _cssMap[key] = cssFile;

        _cachedHeaderHTML = '';
        for (const[key, cssFile] of Object.entries(_cssMap)) {
            _cachedHeaderHTML += `<link rel="stylesheet" href="${cssFile}" />`;
        }
    }

    static get observedAttributes() {
        return ['active-filter'];
    }

    constructor(template, context) {
        super();

        this._context = context ? context : {};

        this._template = template;
        this._root = null;
        this._connected = false;
        this._active = undefined;
        this._activeFilter = undefined;
        this._data = null;
        this._slotChildren = this.children;
        this._originalHTML = this.innerHTML;
        console.log('OG HTML', this._originalHTML);
        console.log('INIT CHILDREN', this._slotChildren);
    }

    attributeChangedCallback(name, oldVal, newVal) {
        console.log('ATTR CHANGE', name, oldVal, newVal);
        if (oldVal == newVal) {
            return;
        }

        if (name === 'active-filter') {
            this._activeFilter = newVal ? JSON.parse(newVal) : null;
            this.updateActive();
        }

        // if (this._root && oldVal !== newVal) {
        //     this._root.querySelectorAll(`[data-sync-attribute="${name}"]`).forEach(function(el) {
        //         el.value = newVal;
        //     });
        // }
    }

    connectedCallback() {
        this._connected = true;
        this.updateActive();
    }

    disconnectedCallback() {
        this._connected = false;
    }

    updateActive() {
        if (!this._connected) {
            return;
        }

        if (!this._activeFilter) {
            this.active = true;
            return;
        }

        this.active = common.getApp().evalFilter(this._activeFilter);
        console.log('ACTIVE FILTER', this.active);
    }

    set active(val) {
        if (val !== this._active) {
            if (val) {
                this.onActivate();
            }
            else {
                this.onDeactivate();
            }
            this._active = val;
        }
    }

    get active() {
        return this._active;
    }

    onActivate() {
        common.assert(this._connected, 'activated disconnected element');

        common.assert(false, 'TODO: Create content if doesnt exist');
        this._root = this.attachShadow({mode: 'open'});
        if (this.hasAttribute('activate-function')) {
            common.assert(false, 'TODO: Call the activate-function');
        }
    }

    onDeactivate() {
        if (this.hasAttribute('unload-inactive')) {
            this._root.innerHTML = '';
            this._isTransient = true;
        }
    }
}
window.customElements.define('fa-element', Element);