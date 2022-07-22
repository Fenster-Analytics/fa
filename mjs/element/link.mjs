import {Element, ActiveMixIn} from "../element.mjs"
import * as common from "../common.mjs";

export class Link extends ActiveMixIn(HTMLAnchorElement) {
    static get observedAttributes() {
        return [...super.observedAttributes, 'link-action'];
    }

    constructor(template) {
        super();

        this._linkAction = 'set';

        this.addEventListener('click', e => {
            console.log('Link click', this._activeFilter, this._linkAction);
                        
            if (this._linkAction === 'set') {
                common.getApp().setState(this._activeFilter);
            }
            else if (this._linkAction === 'add') {
                common.getApp().addState(this._activeFilter);
            }
            else if (this._linkAction === 'remove') {
                common.getApp().removeState(this._activeFilter);
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
        console.log('GET HREF', this._linkAction);
        if (this._linkAction === 'remove') {
            return `#`;
        }

        const hrefJson = common.strToJsonSafe(this._activeFilter);
        const hrefStr = common.JsonToUrlEncodedStr(hrefJson);
        return `#${hrefStr}`;
    }
}
window.customElements.define('fa-link', Link, {extends: 'a'});