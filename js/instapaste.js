FA.Instapaste = class extends HTMLButtonElement {
    constructor() {
        super();

        const self = this;
        this.addEventListener('click', function(event) {
            const value = self.getAttribute('value');
            const target = FA.pasteTarget;
            self.insertText(target, value);
        });
    }

    insertText(target, txt) {
        if (document.selection) {
            // IE (maybe? Don't have a PC to test on)
            target.focus();
            const sel = document.selection.createRange();
            sel.text = txt;
        }
        else if (target.selectionStart || target.selectionStart === 0) {
            var startPos = target.selectionStart;
            var endPos = target.selectionEnd;
            target.value = target.value.substring(0, startPos)
                + txt
                + target.value.substring(endPos, target.value.length);
            target.selectionStart = startPos + txt.length;
            target.selectionEnd = startPos + txt.length;
        }
        else {
            target.value += txt;
        }
        target.focus();
    }
};
window.customElements.define('fa-instapaste', FA.Instapaste, {extends: 'button'});
