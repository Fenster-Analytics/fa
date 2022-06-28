import * as common from "./common.mjs";
import {Element} from "./element.mjs"

export class Application extends Element {
    constructor(template) {
        super(template);
        common.setApp(this);
    }

    get state() {
        const appState = {'test': 69};
        return appState;
    }

    evalFilter(filter) {
        return common.matchFilter(this.state, filter);
    }

    get template() {
        // TODO: Switch template depending on login status
        //return 'fa_progress_bar2';
        return this._template;
    }
}
