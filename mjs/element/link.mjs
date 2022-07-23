import {Element, ActiveMixIn} from "../element.mjs"
import * as common from "../common.mjs";

export class Link extends ActiveMixIn(HTMLAnchorElement) {
    static get observedAttributes() {
        return [...super.observedAttributes, 'link-action'];
    }

    constructor(template) {
        super();

        this._linkAction = 'goto';
        this.href = this.getHref();

        this.addEventListener('click', e => {
            this.href = this.getHref();
        });

        this.addEventListener('contextmenu', e => {
            this.href = this.getHref();
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
        const app = common.getApp();
        const stateStack = app.getTransformedStateStack(this._linkAction, this._activeFilter);
        const hrefStr = common.stateStackToHashStr(stateStack);
        return `#${hrefStr}`;
    }
}
window.customElements.define('fa-link', Link, {extends: 'a'});
