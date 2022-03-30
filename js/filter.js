FA.Filter = class extends HTMLElement {
    constructor() {
        super();
        this._root = this.attachShadow({mode: 'open'});

        const self = this;

        // Stop propagation, since editors, etc shouldn't care about the change
        // (doesn't actually change value state)
        this._root.addEventListener('keyup', function(event) {
            self.apply();
            event.stopPropagation();
        });
        this._root.addEventListener('change', function(event) {
            self.apply();
            event.stopPropagation();
        });
    }

    connectedCallback() {
        this._targetSelector = this.getAttribute('filter-target');
        this._searchRoot = this.parentNode.getRootNode().host._root ?
                this.parentNode.getRootNode().host._root
                : this.parentNode.getRootNode().host.shadowRoot;

        if (!this._searchRoot) {
            this._root.innerHTML = "[no search root]";
            return;
        }

        this._target = this._searchRoot.querySelector(this._targetSelector);
        if (!this._target) {
            this._root.innerHTML = "[no target]";
            return;
        }

        const placeholder = this.getAttribute('placeholder');
        const value = this.hasAttribute('value') ? this.getAttribute('value') : '';
        this._root.innerHTML = 
`<style>
:host {display: flex; flex-direction: row; align-items: center; font-family: 'Roboto Condensed';}
input {flex: 1 0 auto; width: 40%;}
select {flex: 0 0 auto; font-family: 'Roboto Condensed';}
div {flex: 0 0 auto; font-size: 12px; text-align: center; min-width: 5em;}
[has-matches=true] {
    background: #AFA;
}
[has-matches=false] {
    background: #FAA;
}
</style>
<input placeholder="${placeholder}" value="${value}" />
<select>
    <option value="and" selected>AND</option>
    <option value="not_and">NOT(AND)</option>
    <option value="or">OR</option>
    <option value="not_or">NOT(OR)</option>
</select>
<div></div>`;

        this.el = {
            'input': this._root.querySelector('input'),
            'stats': this._root.querySelector('div'),
            'method': this._root.querySelector('select'),
        };

        this.apply();
    }

    apply() {
        if (!this._target) {
            this.el.stats.innerHTML = 'no target';
            return;
        }

        const filterMethod = this.el.method.value;
        const searchTermList = this.el.input.value.toLowerCase().split(' ')
            .map(term => term.trim())
            .filter(term => term != '');

        let shown, total;
        if (filterMethod === 'or') {
            [shown, total] = this.filterOr(searchTermList);
        }
        else if (filterMethod === 'not_and') {
            [shown, total] = this.filterNotAnd(searchTermList);
        }
        else if (filterMethod === 'not_or') {
            [shown, total] = this.filterNotOr(searchTermList);
        }
        else {
            [shown, total] = this.filterAnd(searchTermList);
        }

        if (searchTermList.length === 0) {
            this.el.input.removeAttribute('has-matches');
        }
        else if (shown === 0) {
            this.el.input.setAttribute('has-matches', 'false');
        }
        else {
            this.el.input.setAttribute('has-matches', 'true');
        }

        this.el.stats.innerHTML = `${shown} / ${total}`;
    }

    filterAnd(searchTermList) {
        let total = 0;
        let shown = 0;

        this._target.querySelectorAll('[filter-value]').forEach(function(el) {
            total++;
            const filterValue = el.getAttribute('filter-value').toLowerCase();

            // Check if all terms match
            let hasMatch = true;
            for (let i=0; i<searchTermList.length; i++) {
                const searchTerm = searchTermList[i];
                if (filterValue.indexOf(searchTerm) === -1) {
                    hasMatch = false;
                    break;
                }
            }

            // Update the visibility and stats
            if (hasMatch) {
                shown++;
                el.style.display = '';
            }
            else {
                el.style.display = 'none';
            }
        });

        return [shown, total];
    }

    filterNotOr(searchTermList) {
        let total = 0;
        let shown = 0;

        this._target.querySelectorAll('[filter-value]').forEach(function(el) {
            total++;
            const filterValue = el.getAttribute('filter-value').toLowerCase();

            // Check if any terms don't match
            let hasMatch = true;
            for (let i=0; i<searchTermList.length; i++) {
                const searchTerm = searchTermList[i];
                if (filterValue.indexOf(searchTerm) !== -1) {
                    hasMatch = false;
                    break;
                }
            }

            // Update the visibility and stats
            if (hasMatch) {
                shown++;
                el.style.display = '';
            }
            else {
                el.style.display = 'none';
            }
        });

        return [shown, total];
    }

    filterOr(searchTermList) {
        let total = 0;
        let shown = 0;

        this._target.querySelectorAll('[filter-value]').forEach(function(el) {
            total++;
            const filterValue = el.getAttribute('filter-value').toLowerCase();

            // Check if any terms match
            let hasMatch = searchTermList.length === 0;
            for (let i=0; i<searchTermList.length; i++) {
                const searchTerm = searchTermList[i];
                if (filterValue.indexOf(searchTerm) !== -1) {
                    hasMatch = true;
                    break;
                }
            }

            // Update the visibility and stats
            if (hasMatch) {
                shown++;
                el.style.display = '';
            }
            else {
                el.style.display = 'none';
            }
        });

        return [shown, total];
    }

    filterNotAnd(searchTermList) {
        let total = 0;
        let shown = 0;

        this._target.querySelectorAll('[filter-value]').forEach(function(el) {
            total++;
            const filterValue = el.getAttribute('filter-value').toLowerCase();

            // Check if any terms don't match
            let hasMatch = searchTermList.length === 0;
            for (let i=0; i<searchTermList.length; i++) {
                const searchTerm = searchTermList[i];
                if (filterValue.indexOf(searchTerm) === -1) {
                    hasMatch = true;
                    break;
                }
            }

            // Update the visibility and stats
            if (hasMatch) {
                shown++;
                el.style.display = '';
            }
            else {
                el.style.display = 'none';
            }
        });

        return [shown, total];
    }
};
window.customElements.define('fa-filter', FA.Filter);
