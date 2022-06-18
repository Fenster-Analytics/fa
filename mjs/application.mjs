import {Element} from "./element.mjs"

export class Application extends Element {
    constructor(template) {
        super(template);
        console.log('Application constructor');
    }
}
