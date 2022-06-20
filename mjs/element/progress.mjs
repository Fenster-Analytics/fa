import {Element} from "../element.mjs"

export class Progress extends Element {
    constructor() {
        super('fa_progress_bar2');
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