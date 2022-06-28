import * as common from "./common.mjs";
import * as template from "./template.mjs";

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
        return ['active-filter', 'value'];
    }

    constructor(template) {
        super();

        this._template = template;
        this._root = null;
        this._connected = false;
        this._rendered = false;
        this._value = undefined;
        this._active = undefined;
        this._activeFilter = undefined;
        this._slotChildren = this.children;
        this._root = this.attachShadow({mode: 'open'});
    }

    attributeChangedCallback(name, oldVal, newVal) {
        console.log('ATTR CHANGE', name, oldVal, newVal);
        if (oldVal == newVal) {
            return;
        }

        if (name === 'value') {
            const parsedVal = common.parseStrVal(newVal);
            this.value = parsedVal;
        }
        else if (name === 'active-filter') {
            this._activeFilter = newVal ? JSON.parse(newVal) : null;
            this.updateActive();
        }
        else {
            // TODO: Propagate newVal to element value
            //this._root.querySelectorAll(`[data-sync-attribute="${name}"]`).forEach((el) => {el.value = newVal;});
        }
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

    set value(jsonVal) {
        this._value = jsonVal;
        this.updateContent();
    }

    get value() {
        if (!this._rendered) {
            return this._value;
        }

        return scrapeValue();
    }

    scrapeValue() {
        if (!this._rendered) {
            console.error('scrapeValue: element not yet rendered', this);
            return undefined;
        }

        const v = {};
        this._root.querySelectorAll('[data-bind-value]').forEach((el) => {
            const val = common.getElementValue(el);
            if (val !== undefined) {
                common.setPathValue(v, el.dataset.bindValue, val);
            }
        });
        return v;
    }

    set active(val) {
        if (val !== this._active) {
            this._active = val;
            if (val) {
                this.onActivate();
            }
            else {
                this.onDeactivate();
            }
        }
    }

    get active() {
        return this._active;
    }

    get template() {
        return this._template;
    }

    get context() {
        return {
            'data': this.dataset,
            'value': this._value,
            'self': this,
        };
    }

    get visible() {
        return (this.offsetWidth && this.offsetHeight);
    }

    updateTransients() {
        // virtual to calculate transient values
    }

    onActivate() {
        common.assert(this._connected, 'activated disconnected element');

        this.classList.add('active');

        this.renderContent();

        if (this.hasAttribute('activate-function')) {
            common.assert(false, 'TODO: Call the activate-function');
        }

        const e = new Event('activate', {bubbles: true, composed: false});
        this.dispatchEvent(e);
    }

    onDeactivate() {
        this.classList.remove('active');

        if (this.hasAttribute('unload-inactive')) {
            this._value = this.scrapeValue(); // cache the value
            this._root.innerHTML = '';
            this._rendered = false;
        }

        const e = new Event('deactivate', {bubbles: true, composed: false});
        this.dispatchEvent(e);
    }

    renderContent() {
        if (this._rendered) {
            console.warn('Element already rendered', this);
            return;
        }

        this._root.innerHTML = _cachedHeaderHTML + template.render(this.template, this.context);
        this._root.querySelectorAll('template[element-type]').forEach((el) => {
            console.log(el.innerHTML);
            const dataPath = el.dataset.bindTemplate;
            const elType = el.getAttribute('element-type');
            const newEl = document.createElement(elType);
            console.log(elType, dataPath);
            newEl.innerHTML = '[LOADING]';
            el.parentNode.replaceChild(newEl, el);
        });
        // this._root.querySelectorAll('[data-bind-template]').forEach((el) => {
        //     el.cTemplate = template.compile(el.innerHTML);
        //     el.innerHTML = '[LOADING]';
        // });

        this._rendered = true;

        // Render the dynamic content
        this.updateContent();
    }

    updateContent() {
        if (!this._rendered) {
            // No reason to update content that doesn't exist yet
            return;
        }

        this.updateTransients();

        const context = this.context;
        // this._root.querySelectorAll('[data-bind-template]').forEach((el) => {
        //     el.innerHTML = el.cTemplate(context);
        // });
        this._root.querySelectorAll('[data-bind-value]').forEach((el) => {
            common.setElementValue(el, common.getPathValue(context.value, el.bindValue));
        });
    }
}
window.customElements.define('fa-element', Element);