FA.SelectionControl = class extends HTMLElement {
    constructor() {
        super();
        this._root = this.attachShadow({mode: 'open'});
    }

    connectedCallback() {
        this._targetSelector = this.getAttribute('selection-target');
        this._searchRoot = this.parentNode.getRootNode().host._root ?
                this.parentNode.getRootNode().host._root
                : this.parentNode.getRootNode().host.shadowRoot;

        if (!this._searchRoot) {
            this._root.innerHTML = "[no search root]";
            return;
        }

        this._target = this._searchRoot.querySelector(this._targetSelector);
        if (!this._target) {
            this._root.innerHTML = "[no target]";
            return;
        }

        this._root.innerHTML = FA.Element._headerHTML +
`<style>
:host {display: flex; flex-direction: row; font-family: 'Roboto Condensed';}
button {flex: 1; font-size: 80%; overflow: hidden;}
</style>
<button id="all">Select All</button>
<button id="clear">Clear</button>
<button id="invert">Invert</button>`;

        this.el = {
            'all': this._root.querySelector('#all'),
            'clear': this._root.querySelector('#clear'),
            'invert': this._root.querySelector('#invert'),
        };

        this.el.all.addEventListener('click', () => this.selectAll());
        this.el.clear.addEventListener('click', () => this.clearSelection());
        this.el.invert.addEventListener('click', () => this.invertSelection());

        this._target.addEventListener('change', (event) => {
            // When something in the target list changes,
            //  dispatch an event from here (the selection control)
            // The selection control acts as a checkbox group then / proxy
            //  (can data-bind-value to the selection control, rather than each checkbox)
            this.dispatchEvent(new Event('change', {bubbles: true, composed: true}));
        });
    }

    selectAll() {
        this._target.querySelectorAll('input[type="checkbox"]').forEach(function(el) {
            if (FA.isVisible(el)) {
                el.checked = true;
            }
        });
        this.dispatchEvent(new Event('change', {bubbles: true, composed: true}));
    }

    clearSelection() {
        this._target.querySelectorAll('input[type="checkbox"]').forEach(function(el) {
            if (FA.isVisible(el)) {
                el.checked = false;
            }
        });
        this.dispatchEvent(new Event('change', {bubbles: true, composed: true}));
    }

    invertSelection() {
        this._target.querySelectorAll('input[type="checkbox"]').forEach(function(el) {
            if (FA.isVisible(el)) {
                el.checked = !el.checked;
            }
        });
        this.dispatchEvent(new Event('change', {bubbles: true, composed: true}));
    }

    get value() {
        const returnList = [];
        this._target.querySelectorAll('input[type="checkbox"]:checked').forEach(function(el) {
            returnList.push(FA.parseVal(el.value));
        });
        return returnList;
    }

    set value(selectedList) {
        this._target.querySelectorAll('input[type="checkbox"]').forEach(function(el) {
            el.checked = false;
        });
        for (const v of selectedList) {
            this._target.querySelectorAll(`input[value="${v}"]`).forEach(function(el) {
                el.checked = true;
            });
        }
    }
};
window.customElements.define('fa-selection-control', FA.SelectionControl);
