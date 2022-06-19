import * as common from "./common.mjs";
import {Element} from "./element.mjs"

export class Application extends Element {
    constructor(template) {
        super(template);
        console.log('Application constructor');
        common.setApplication(this);
    }

    get state() {
        const appState = {'test': 69};
        return appState;
    }

    evalFilter(filter) {
        return common.matchFilter(this.state, filter);
    }
}
