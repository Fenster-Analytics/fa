import {Element} from "../element.mjs"

export class Progress extends Element {
    constructor() {
        super('fa_progress_bar2');

        this.status = 'init status';
        this.listValue = ['A', 'B', 'C'];
    }

    updateTransients() {
        console.log('PROGRESS TRANSIENTS');
        super.updateTransients();
        // virtual to calculate transient values
        this.status = 'updated status';
        this._value += 0.1;
        this.listValue.push('D');
    }

    // onActivate() {
    //     const progressRaw = this.hasAttribute('value') ? parseFloat(this.getAttribute('value')) : 0;
    //     const progress = progressRaw ? progressRaw : 0;
    //     const progressPct = parseInt(progress * 100);
    //     const progressStr = `${progressPct}%`;

    //     const status = this.getAttribute('status');
    //     const duration = parseFloat(this.getAttribute('duration'));
    //     const durationStr = duration ? `(${FA.secToHMS(duration)})` : '';

    //     this.data = {
    //         'status': `${status}`,
    //         'progress': progress,
    //         'duration': durationStr,
    //     }

    //     super.onActivate();
    // }
};
window.customElements.define('fa-progress', Progress);