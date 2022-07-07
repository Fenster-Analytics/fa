import {Element} from "../element.mjs"

export class Test extends Element {
    constructor() {
        super('fa_test');

        this.status = 'init status';
        this.listValue = ['A', 'B', 'C'];

        console.log('INNER HTML', this.innerHTML);
    }

    updateTransients() {
        console.log('PROGRESS TRANSIENTS');
        super.updateTransients();
        // virtual to calculate transient values
        this.status = 'updated status';
        this._value += 0.1;
        this.listValue.push('D');
    }
};
window.customElements.define('fa-test', Test);