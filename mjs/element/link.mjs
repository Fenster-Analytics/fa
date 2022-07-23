import {Element, ActiveMixIn} from "../element.mjs"
import * as common from "../common.mjs";

export class Link extends ActiveMixIn(HTMLAnchorElement) {
    static get observedAttributes() {
        return [...super.observedAttributes, 'link-action'];
    }

    constructor(template) {
        super();

        this._linkAction = 'goto';

        this.addEventListener('click', e => {
            console.log('Link click', this._activeFilter, this._linkAction);
            const app = common.getApp();
            switch(this._linkAction) {
                case 'set':
                    // Wipes the entire stack and sets a new root state
                    app.setState(this._activeFilter);
                    break;
                case 'push':
                    // Creates new state on top of the stack
                    app.pushState(this._activeFilter);
                    break;
                case 'goto':
                    // Changes the state at the current level
                    app.gotoState(this._activeFilter);
                    break;
                case 'add':
                    // Activates a sub-state within the current state
                    // e.g. for tab groups
                    app.addState(this._activeFilter);
                    break;
                case 'remove':
                    // Removes a sub-state from the current state
                    app.removeState(this._activeFilter);
                    break;
                case 'pop':
                    // Pops the current state off the stack
                    app.popState();
                    break;
                default:
                    console.error('Unrecognized action:', this._linkAction);
            }
            e.preventDefault();
        });
    }

    attributeChangedCallback(name, oldVal, newVal) {
        super.attributeChangedCallback(name, oldVal, newVal);
        if (name === 'link-action') {
            this._linkAction = newVal.toLowerCase();
            this.href = this.getHref();
        }
    }

    set activeFilter(v) {
        super.activeFilter = v;
        this.href = this.getHref();
    }

    getHref() {
        // TODO: Build these based on the active application state
        console.log('GET HREF', this._linkAction);
        if (this._linkAction === 'remove') {
            return `#`;
        }
        if (this._linkAction === 'pop') {
            return `#`;
        }

        const hrefJson = common.strToJsonSafe(this._activeFilter);
        const hrefStr = common.JsonToUrlEncodedStr(hrefJson);
        return `#${hrefStr}`;
    }
}
window.customElements.define('fa-link', Link, {extends: 'a'});