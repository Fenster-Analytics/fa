import * as common from "./common.mjs";
import * as template from "./template_hbar.mjs";

const _cssMap = {};
var _cachedHeaderHTML = '';

export const ActiveMixIn = (Base) => class extends Base {
    static get observedAttributes() {
        return ['active-filter'];
    }

    connectedCallback() {
        this._connected = true;
        this.updateActive();
    }

    disconnectedCallback() {
        this._connected = false;
    }

    attributeChangedCallback(name, oldVal, newVal) {
        if (name === 'active-filter') {
            this.activeFilter = newVal ? JSON.parse(newVal) : null;
            this.updateActive();
        }
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

    set activeFilter(v) {
        this._activeFilter = v;
    }

    onActivate() {
        common.assert(this._connected, 'activated disconnected element');

        this.classList.add('active');

        if (this.renderContent) this.renderContent();

        if (this.hasAttribute('activate-function')) {
            common.assert(false, 'TODO: Call the activate-function');
        }

        const e = new Event('activate', {bubbles: true, composed: false});
        this.dispatchEvent(e);
    }

    onDeactivate() {
        this.classList.remove('active');

        // if (this.hasAttribute('unload-inactive')) {
        //     this._value = this.scrapeValue(); // cache the value
        //     this._root.innerHTML = '';
        //     this._rendered = false;
        // }

        const e = new Event('deactivate', {bubbles: true, composed: false});
        this.dispatchEvent(e);
    }
};


export class Element extends ActiveMixIn(HTMLElement) {
//export class Element extends HTMLElement {
    static registerCSS(key, cssFile) {
        _cssMap[key] = cssFile;

        _cachedHeaderHTML = '';
        for (const[key, cssFile] of Object.entries(_cssMap)) {
            _cachedHeaderHTML += `<link rel="stylesheet" href="${cssFile}" />`;
        }
    }

    static get observedAttributes() {
        return [...super.observedAttributes, 'value', 'template'];
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
        this._originalText = this.innerHTML;
        this._slotChildren = this.children;
        this.innerHTML = '';
        this._root = this.attachShadow({mode: 'open'});
        this._registerListeners();
    }

    attributeChangedCallback(name, oldVal, newVal) {
        super.attributeChangedCallback(name, oldVal, newVal);

        // TODO: get template from attribute
        if (name === 'value') {
            const parsedVal = common.parseStrVal(newVal);
            this.value = parsedVal;
        }
        else if (name === 'template') {
            this._template = newVal;
            this._rendered = false;
            if (this._active) {
                this.renderContent();
            }
        }
        else {
            // TODO: Propagate newVal to element value
            //this._root.querySelectorAll(`[data-sync-attribute="${name}"]`).forEach((el) => {el.value = newVal;});
        }
    }

    _registerListeners() {
        // Shortcut for binding onClick functions (without doing "this.getRootNode().host.[function]")
        this._root.addEventListener('click', (event) => {
            // Shortcut to trigger click functions
            if (event.target.hasAttribute('click-function')) {
                const fnName = event.target.getAttribute('click-function');

                // Trigger the function by name, pass in the instigator
                common.assert(this[fnName], `${fnName} is not a member of`, this);
                const fn = this[fnName].bind(this);
                fn(event.target);
            }

            // // Shortcut to trigger a bubble-up event on click
            // if (event.target.hasAttribute('click-event')) {
            //     const eventName = event.target.getAttribute('click-event');
            //     const e = new Event(eventName, {bubbles: true, composed: true});
            //     event.target.dispatchEvent(e);
            // }

            // // Activate local state
            // if (event.target.hasAttribute('click-activate-local')) {
            //     const localFilterStr = event.target.getAttribute('local-filter');
            //     const localFilter = JSON.parse(localFilterStr);
            //     self.activateLocalFilter(localFilter);
            // }

            // // Toggle additive local state
            // if (event.target.hasAttribute('click-toggle-local-group')) {
            //     // Sync the active state of all local elements in this group
            //     const shouldBeActive = !event.target._isActive;
            //     const localGroup = event.target.getAttribute('local-group');
            //     self.setLocalGroup(localGroup, shouldBeActive);
            // }

            // // Toggle global group state
            // // TODO: This is a little hacky, since it isn't replicated up to all components
            // // But is mainly intended for unique local state keys that should survive save & load of settings
            // if (event.target.hasAttribute('click-toggle-global-group')) {
            //     const globalGroup = event.target.getAttribute('global-group');
            //     const shouldBeActive = !FA.groupState[globalGroup];
            //     self.setGlobalGroup(globalGroup, shouldBeActive);
            // }
        });
    }

    set value(jsonVal) {
        this._value = jsonVal;
        this.updateContent();
    }

    get value() {
        if (!this._rendered) {
            return this._value;
        }

        return this.scrapeValue();
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

    get context() {
        const app = common.getApp();
        return {
            'data': this.dataset,
            'value': this._value,
            'self': this,
            'app': app.getRenderContext(),
        };
    }

    get visible() {
        return (this.offsetWidth && this.offsetHeight);
    }

    updateTransients() {
        // virtual to calculate transient values
    }

    renderContent(overrideTemplate) {
        if (this._rendered) {
            console.warn('Element already rendered', this);
            return;
        }

        const finalTemplate = overrideTemplate === undefined ? this._template : overrideTemplate;

        if (finalTemplate === undefined) {
            const cTemplate = template.compile(this._originalText);
            this._root.innerHTML = _cachedHeaderHTML + cTemplate(this.context);
        }
        else {
            this._root.innerHTML = _cachedHeaderHTML + template.render(finalTemplate, this.context);
        }

        this._root.querySelectorAll('[data-bind-template]').forEach((el) => {
            el.cTemplate = template.compile(el.innerHTML);
            el.innerHTML = '[LOADING]';
        });
        this._root.querySelectorAll('[element-type]').forEach((el) => {
            const cTemplate = template.compile(el.innerHTML);
            const dataPath = el.dataset.bindTemplate ? el.dataset.bindTemplate : '';
            const elType = el.getAttribute('element-type');

            const newEl = document.createElement(elType);
            newEl.innerHTML = '[TEMPLATE]';
            newEl.setAttribute('data-bind-template', dataPath);
            newEl.cTemplate = cTemplate;
            
            el.parentNode.replaceChild(newEl, el);
        });

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
        this._root.querySelectorAll('[data-bind-template]').forEach(el => {
            const pathVal = common.getPathValue(context, el.dataset.bindTemplate);
            el.innerHTML = el.cTemplate(pathVal);
        });
        this._root.querySelectorAll('[data-bind-value]').forEach(el => {
            common.setElementValue(el, common.getPathValue(context.value, el.dataset.bindValue));
        });

        // Check activation of child elements
        this._root.querySelectorAll('[active-filter]').forEach(el => {
            try {
                el.updateActive();
            }
            catch(e) {
                console.error(el, e);
            }
        });
    }
}
window.customElements.define('fa-element', Element);