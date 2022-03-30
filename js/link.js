/// Updates PageState instead of replacing it
FA.DeltaLink = class extends HTMLAnchorElement {
    constructor() {
        super();

        this.addEventListener("click", e => {
            const hrefParts = this.href.split('#');
            const hashStr = hrefParts[1];

            // Layer the hash values onto the page state
            // (follow the link normally if no hash string)
            if (hashStr) {
                const deltaHashState = FA.toJsonFromUrlEncoded(hashStr);
                FA.addHashState(deltaHashState);
                e.preventDefault();
            }
        });
    }

    connectedCallback() {
        // Allow an href attribute to manually override the filter value
        this._hasHref = this.hasAttribute('href');
    }

    static get observedAttributes() {
        return ['active-filter'];
    }

    attributeChangedCallback(name, oldVal, newVal) {
        // Generate the href from the filter
        if (name === 'active-filter' && !this._hasHref) {
            const hrefJson = FA.toJson(newVal);
            const hrefStr = FA.toUrlEncodedString(hrefJson);
            this.href = `#${hrefStr}`;
        }
    }
};
window.customElements.define('fa-delta-link', FA.DeltaLink, {extends: 'a'});

/// Specifically for showing a modal / pop-up / popup
/// TODO: Optionally for replacing the page state with the additive state if opened in a new window
FA.ModalLink = class extends FA.DeltaLink {
};
window.customElements.define('fa-modal-link', FA.ModalLink, {extends: 'a'});
