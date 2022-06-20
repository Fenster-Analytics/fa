FA.Element = class extends HTMLElement {
    static _cssMap = {};
    static _headerHTML = '';

    constructor(template, context) {
        super();

        this._data = {};

        // Dictionary to pass to the base template
        if (context !== undefined) {
            this._context = Object.assign({}, FA.global, context);
        }
        else {
            this._context = FA.global;
        }

        if (template) {
            // Create the shadow dom immediately in the constructor
            // (preferred)
            this._root = this.attachShadow({mode: 'open'});
            this._template = template;
            this._childClass = null; // No deferred child
            this._createRootContent();
        }
        else {
            // Look for a deferred template in the connectedCallback
            this._root = null;
        }
    }

    static registerCSS(key, cssFile) {
        console.log('registerCSS', key, cssFile);
        FA.Element._cssMap[key] = cssFile;

        // Regenerate the cached header HTML
        FA.Element._headerHTML = '';
        for (const[key, cssFile] of Object.entries(FA.Element._cssMap)) {
            FA.Element._headerHTML += `<link rel="stylesheet" href="${cssFile}" />`;
        }
    }

    _header() {
        // TODO: Allow custom header HTML based on the keys to include
        return FA.Element._headerHTML;
    }

    onPageStateChange() {
        if (this._root) {
            FA.notifyPageStateChange(this._root);
        }
    }

    _createRootContent() {
        const self = this;

        // Hacking our own slot system
        //  save the original elements,
        //  replace slot-target elements after rendering
        if (!this._slotChildren) {
            this._slotChildren = this.children;
            this._originalHTML = this.innerHTML;
        }

        // Build the base HTML
        if (this._childClass) {
            // Create the deferred child
            const childElement = document.createElement(this._childClass);
            // Enable page state on the child element if fa-element has it
            if (this.hasAttribute('enable-page-state')) {
                childElement.setAttribute('enable-page-state', true);
            }
            // Initialize child attributes
            if (this.hasAttribute('init-attributes')) {
                const initAttributesStr = this.getAttribute('init-attributes');
                const initAttributes = JSON.parse(initAttributesStr);
                for (const [key, val] of Object.entries(initAttributes)) {
                    childElement.setAttribute(key, val);
                }
            }
            this._root.innerHTML = this._header();
            this._root.appendChild(childElement);
        }
        else if (this._childUrl) {
            // Load content from an external source
            // (could potentially allow client-side templates here)
            this._root.innerHTML = FA.loadingHTML;

            const xhr = new XMLHttpRequest();
            xhr.open('GET', this._childUrl);
            xhr.addEventListener('load', function(e) {
                let htmlStr = self._header();
                htmlStr += this.response;
                self._root.innerHTML = htmlStr;
            });

            xhr.send();
        }
        else if (this._template) {
            let htmlStr = self._header();
            htmlStr += Template.render(this._template, this._context);
            this._root.innerHTML = htmlStr;
        }
        else {
            // Include any original slot children
            // HTMLCollection requires old-school iteration
            for (var i=0; i<self._slotChildren.length; i++) {
                const node = self._slotChildren[i];
                this._root.appendChild(node.cloneNode(true));
            }
        }

        // Replace slot tag with original children
        if (this._slotChildren && this._slotChildren.length) {
            this._root.querySelectorAll('[slot-target]').forEach(function(el) {
                // // HTMLCollection requires old-school iteration
                // for (var i=0; i<self._slotChildren.length; i++) {
                //     const node = self._slotChildren[i];
                //     el.appendChild(node.cloneNode(true));
                // }
                el.innerHTML = self._originalHTML;
            });
        }

        this._initRootContent();

        this._registerListeners();

        this._initLocalState();

        //
        // Activate newly created children if necessary
        //
        this.onPageStateChange();
    }

    _initRootContent() {
        const self = this;

        // Compile internal templates
        this._root.querySelectorAll('[data-bind-template]').forEach(function(el) {
            const compiledTemplate = Handlebars.compile(el.innerHTML);
            if (el.matches('script')) {
                // Grab the literal html from the script tag
                // Then replace the script tag with the intended outer element
                const elType = el.hasAttribute('new-element') ?
                        el.getAttribute('new-element')
                        : 'div';
                const newEl = document.createElement(elType);
                newEl.cTemplate = compiledTemplate;
                newEl.innerHTML = FA.loadingHTML;
                newEl.setAttribute('data-bind-template', el.dataset.bindTemplate);
                el.parentNode.replaceChild(newEl, el);
            }
            else {
                el.cTemplate = compiledTemplate;
                el.innerHTML = FA.loadingHTML;
            }
        });
        this._root.querySelectorAll('[data-bind-href]').forEach(function(el) {
            const compiledTemplate = Handlebars.compile(el.getAttribute('href'));
            el.cHrefTemplate = compiledTemplate;
        });
        this._root.querySelectorAll('[meta-bind-template]').forEach(function(el) {
            const compiledTemplate = Handlebars.compile(el.innerHTML);
            el.cMetaTemplate = compiledTemplate;
            el.innerHTML = FA.loadingHTML;
        });

        // Auto-Register specific child elements
        this.el = {};
        this._root.querySelectorAll('[auto-register]').forEach(function(el) {
            const key = el.id;
            self.el[key] = el;
        });

        // Set element values that are bound to this element's attributes
        this._root.querySelectorAll('[data-sync-attribute]').forEach(function(el) {
            const attributeName = el.dataset.syncAttribute;
            const val = self.getAttribute(attributeName);
            el.value = val;
        });

        // Set element values synced to pageState
        this._root.querySelectorAll('[data-sync-pagestate]').forEach(function(el) {
            const keyPath = el.dataset.syncPagestate;
            const val = FA.getPathValue(FA.pageState, keyPath);
            el.value = val;
        });
    }

    _registerListeners() {
        const self = this;
        //
        // Listen to internal events
        //

        // Shortcut-keys to trigger a click on children with shortcut-keys
        // (only if this component is active though)
        this._root.querySelectorAll('[shortcut-key]').forEach(function(el) {
            const shortcutKeyStr = el.getAttribute('shortcut-key');
            FA.setKeyListener(shortcutKeyStr, function() {
                if (self._isActive) {
                    const e = new Event('click', {bubbles: true, composed: false});
                    el.dispatchEvent(e);
                }
            });
        });

        // Shortcut for binding activate listener functions
        this._root.addEventListener('activate', function(event) {
            if (event.target.hasAttribute('activate-function')) {
                if (!event.target.preventActiveFunction) {
                    const fnName = event.target.getAttribute('activate-function');

                    // Trigger the function by name, pass in the instigator
                    assert(self[fnName], `${fnName} is not a member`);
                    const fn = self[fnName].bind(self);
                    const result = fn(event.target);

                    // Save the result on the event target
                    //console.log('PREVENT ACTIVE', result);
                    event.target.preventActiveFunction = result;
                }
            }
        });

        // Shortcut for binding deactivate listener functions
        this._root.addEventListener('deactivate', function(event) {
            if (event.target.hasAttribute('deactivate-function')) {
                const fnName = event.target.getAttribute('deactivate-function');

                // Trigger the function by name, pass in the instigator
                assert(self[fnName], `${fnName} is not a member`);
                const fn = self[fnName].bind(self);
                fn(event.target);
            }
        });

        // Reflect synced attributes from element values (doesn't necessarily need a data-bind)
        this._root.addEventListener('change', function(event) {
            const val = FA.getElementValue(event.target);

            // Sync the root attribute from this value
            if (event.target.hasAttribute('data-sync-attribute')) {
                self.setAttribute(event.target.dataset.syncAttribute, val);
            }

            if (event.target.hasAttribute('data-sync-pagestate')) {
                const deltaState = FA.setPathValue(
                    {},
                    event.target.dataset.syncPagestate,
                    val
                );
                console.log(deltaState);
                FA.addHashState(deltaState);
            }

            if (event.target.hasAttribute('data-bind-value')) {
                // Completely re-render this element's data on value change if requested
                if (event.target.hasAttribute('data-sync-refresh')) {
                    self.setDataValue(event.target.dataset.bindValue, val, true);
                    self._renderData();
                }
            }
        });

        // Shortcut for binding onClick functions (without doing "this.getRootNode().host.[function]")
        this._root.addEventListener('click', function(event) {
            // Shortcut to trigger click functions
            if (event.target.hasAttribute('click-function')) {
                const fnName = event.target.getAttribute('click-function');

                // Trigger the function by name, pass in the instigator
                assert(self[fnName], `${fnName} is not a member of`, self);
                const fn = self[fnName].bind(self);
                fn(event.target);
            }

            // Shortcut to trigger a bubble-up event on click
            if (event.target.hasAttribute('click-event')) {
                const eventName = event.target.getAttribute('click-event');
                const e = new Event(eventName, {bubbles: true, composed: true});
                event.target.dispatchEvent(e);
            }

            // Activate local state
            if (event.target.hasAttribute('click-activate-local')) {
                const localFilterStr = event.target.getAttribute('local-filter');
                const localFilter = JSON.parse(localFilterStr);
                self.activateLocalFilter(localFilter);
            }

            // Toggle additive local state
            if (event.target.hasAttribute('click-toggle-local-group')) {
                // Sync the active state of all local elements in this group
                const shouldBeActive = !event.target._isActive;
                const localGroup = event.target.getAttribute('local-group');
                self.setLocalGroup(localGroup, shouldBeActive);
            }

            // Toggle global group state
            // TODO: This is a little hacky, since it isn't replicated up to all components
            // But is mainly intended for unique local state keys that should survive save & load of settings
            if (event.target.hasAttribute('click-toggle-global-group')) {
                const globalGroup = event.target.getAttribute('global-group');
                const shouldBeActive = !FA.groupState[globalGroup];
                self.setGlobalGroup(globalGroup, shouldBeActive);
            }
        });

        // Auto drag-functionality
        this._root.addEventListener('dragstart', function(event) {
            if (event.target.matches('[drag-value]')) {
                const dragValue = event.target.getAttribute('drag-value');
                console.log('DRAG START', dragValue);
                //event.dataTransfer.setData('value', dragValue);
                event.dataTransfer.setData('value', {
                    'value': dragValue,
                    'isVar': event.target.getAttribute('drag-is-variable'),
                });
                event.dataTransfer.setData('is-variable', event.target.getAttribute('drag-is-variable'));
                event.dataTransfer.effectAllowed = "copy";
            }
        });
    }

    _initLocalState() {
        const self = this;

        // Children with the 'active' attribute are active by default
        this._root.querySelectorAll('[active]').forEach(function(el) {
            FA.updateActiveState(el, true);
            el.removeAttribute('active');
        });

        // Init local filter
        if (this.hasAttribute('init-local-filter')) {
            const localFilterStr = this.getAttribute('init-local-filter');
            const localFilter = JSON.parse(localFilterStr);
            this.activateLocalFilter(localFilter);
        }

        // Init local groups
        if (this.hasAttribute('init-local-groups')) {
            const localGroupStr = this.getAttribute('init-local-groups');
            if (localGroupStr) {
                const localGroupList = JSON.parse(localGroupStr);
                if (localGroupList) {
                    localGroupList.forEach(localGroup => self.setLocalGroup(localGroup, true));
                }
            }
        }

        // Init global groups
        this._root.querySelectorAll('[global-group]').forEach(function(el) {
            const globalGroup = el.getAttribute('global-group');
            const shouldBeActive = FA.groupState[globalGroup];
            FA.setActiveState(el, shouldBeActive);
        });
    }

    setLocalGroup(localGroup, shouldBeActive) {
        this._root.querySelectorAll(`[local-group="${localGroup}"]`).forEach(function(el) {
            FA.setActiveState(el, shouldBeActive);
        });
    }

    setGlobalGroup(globalGroup, shouldBeActive) {
        FA.groupState[globalGroup] = shouldBeActive;
        this._root.querySelectorAll(`[global-group="${globalGroup}"]`).forEach(function(el) {
            FA.setActiveState(el, shouldBeActive);
        });
    }

    // Technically should be "activateLocalState"
    activateLocalFilter(localFilter) {
        // Back up the state so it can be reactivated
        this._localFilter = localFilter;

        // Activate local elements
        this._root.querySelectorAll('[local-filter]').forEach(function(el) {
            const elFilterStr = el.getAttribute('local-filter');
            const elFilter = JSON.parse(elFilterStr);
            const shouldBeActive = FA.matchPosFilter(localFilter, elFilter);
            // NOTE: *might* have to compare against the pageState active filter as well
            FA.setActiveState(el, shouldBeActive);
        });
    }

    reActivateLocalFilter() {
        const localFilter = this._localFilter;

        // Activate local elements
        this._root.querySelectorAll('[local-filter]').forEach(function(el) {
            const elFilterStr = el.getAttribute('local-filter');
            const elFilter = JSON.parse(elFilterStr);
            const shouldBeActive = FA.matchPosFilter(localFilter, elFilter);
            // NOTE: *might* have to compare against the pageState active filter as well
            FA.setActiveState(el, shouldBeActive, true);
        });
    }

    /// Indicate that all data-bound elements will fail
    _loadFail(data) {
        console.log('_loadFail:', data);
        this.loading = false;

        this._root.querySelectorAll('[data-bind-template]').forEach(function(el) {
            el.innerHTML = FA.failedHTML;
        });

        if (data.response) {
            // TODO: Create a list of these in taskman
            // (they aren't deleted on close here)
            const msg = data.response.message ? data.response.message : data.response;
            const modal = document.createElement('fa-modal');
            modal.setAttribute('title', `${data.status}: ${data.reason}`);
            modal.setAttribute('auto-destroy-button', true);
            modal.content = msg;
            const body = document.querySelector('body');
            body.appendChild(modal);
        }
    }

    static get observedAttributes() {
        return ['active-filter'];
    }

    attributeChangedCallback(name, oldVal, newVal) {
        if (name === 'active-filter') {
            this._activeFilter = JSON.parse(newVal);
            FA.updateActiveState(this);
        }

        if (this._root && oldVal !== newVal) {
            this._root.querySelectorAll(`[data-sync-attribute="${name}"]`).forEach(function(el) {
                el.value = newVal;
            });
        }
    }

    connectedCallback() {
        this._connected = true;
        this._isTransient = this.hasAttribute('transient');

        // Merge in the init data
        // (conceivable that _data has already been given values in the constructor)
        const initDataStr = this.getAttribute('init-data');
        const initData = initDataStr ? JSON.parse(initDataStr) : {};
        Object.assign(this._data, initData);

        // Elements with active-filters should be inactive by default
        // (IOW elements without any active-filter attribute should self-activate)
        const initActive = (!this.hasAttribute('active-filter') && !this.hasAttribute('inactive'));
        FA.updateActiveState(this, initActive);
    }

    disconnectedCallback() {
        this._connected = false;
    }

    onActivate() {
        // Create the deferred template if it doesn't exist, or if this element is transient
        if (!this._root) {
            // Create a shadow dom (preferred), or use the element directly if necessary
            // (because some 3rd party libs may not work well inside shadow doms)
            const noShadow = this.getAttribute('no-shadow');
            this._template = this.getAttribute('deferred-template');
            this._childClass = this.getAttribute('deferred-child');
            this._childUrl = this.getAttribute('deferred-content-url');
            this._root = noShadow ? this : this.attachShadow({mode: 'open'});
            this._createRootContent();
        }
        else if (this._isTransient) {
            // Remove and re-create the root content
            this._root.innerHTML = '';
            this._createRootContent();
        }

        // Update data-driven content
        this._renderData(undefined);
    }

    onDeactivate() {
        // Optionally clear the children when inactive
        // (this is useful for editor sub-settings)
        if (this.hasAttribute('unload-inactive')) {
            this._root.innerHTML = '';
            this._isTransient = true;
        }
    }

    set loading(v) {
        this._loading = v;
        if (this._loading) {
            this._root.querySelectorAll('[data-bind-template]').forEach(function(el) {
                el.innerHTML = FA.loadingHTML;
            });
        }
    }

    get loading() {
        return this._loading;
    }

    set data(data) {
        this.loading = false;
        this._data = data ? data : {};
        this._renderData();
    }

    get value() {
        const self = this;

        const completeValue = {};

        if (!this._root) {
            assert(false, `not initialized yet`);
            return undefined;
        }

        // Sync all data values from any bound elements
        this._root.querySelectorAll(`[data-bind-value]`).forEach(function(el) {
            const val = FA.getElementValue(el);
            if (val !== undefined) {
                FA.setPathValue(completeValue, el.dataset.bindValue, val);
            }
        });

        return completeValue;
    }

    /// Almost the same as value,
    // but will use inherited values if no local value
    // Needed if any part of an editor depends on the current edited value elsewhere
    getPureValue() {
        const self = this;

        const completeValue = {};

        if (!this._root) {
            assert(false, `not intitialized yet`);
            return undefined;
        }

        // Sync all data values from any bound elements
        this._root.querySelectorAll(`[data-bind-value]`).forEach(function(el) {
            const val = el.getPureValue ? el.getPureValue() : FA.getElementValue(el);
            if (val !== undefined) {
                FA.setPathValue(completeValue, el.dataset.bindValue, val);
            }
        });

        return completeValue;
    }

    setDataValue(path, value, noRender=false) {
        FA.setPathValue(this._data, path, value);
        if (!noRender) {
            this._renderData(path);
        }
    }

    setDataFailed(path) {
        // Update anything that starts with this path
        const matchExp = (path === undefined) ? '' : `^="${path}"`;

        this._root.querySelectorAll(`[data-bind-template${matchExp}]`).forEach(function(el) {
            el.innerHTML = FA.failedHTML;
        });
    }

    set meta(m) {
        this._root.querySelectorAll('[meta-bind-template]').forEach(function(el) {
            const val = FA.getPathValue(m, el.getAttribute('meta-bind-template'));
            if (!el.cMetaTemplate) {
                console.error('No cMetaTemplate for:', el);
            }
            else {
                el.innerHTML = el.cMetaTemplate(val);
                FA.notifyPageStateChange(el);
            }
        });
    }

    _renderData(path) {
        const self = this;
        // If it's just attributes initializing (change events),
        // we don't want to re-render yet
        if (!this._connected) {
            return false;
        }

        // Can't extract path values if the render data isn't an object
        const dataType = typeof(this._data);
        assert(dataType === 'object' || dataType === 'array', `Invalid dataType: ${dataType}`);

        // Update anything that starts with this path
        const matchExp = (path === undefined) ? '' : `^="${path}"`;

        this._root.querySelectorAll(`[data-bind-template${matchExp}]`).forEach(function(el) {
            const val = el._getPathValue ?
                el._getPathValue(self._data, el.dataset.bindTemplate)
                : FA.getPathValue(self._data, el.dataset.bindTemplate);
            if (!el.cTemplate) {
                console.error('No cTemplate for:', el, matchExp);
            }
            else {
                el.innerHTML = el.cTemplate(val);
                FA.notifyPageStateChange(el);
            }
        });
        this._root.querySelectorAll(`[data-bind-data${matchExp}`).forEach(function(el) {
            const val = el._getPathValue ?
                el._getPathValue(self._data, el.dataset.bindData)
                : FA.getPathValue(self._data, el.dataset.bindData);
            el.data = val;
        });
        this._root.querySelectorAll(`[data-bind-value${matchExp}]`).forEach(function(el) {
            // Don't assume _getPathValue is defined (core elements won't have it)
            const val = el._getPathValue ?
                el._getPathValue(self._data, el.dataset.bindValue)
                : FA.getPathValue(self._data, el.dataset.bindValue);

            // Ignore if not in the data struct (so the element's defaults are used)
            if (val === undefined) {
                return;
            }

            // Manually set the element value (handle checkbox and radio button edge case)
            FA.setElementValue(el, val);
        });
        this._root.querySelectorAll(`[data-bind-href${matchExp}]`).forEach(function(el) {
            const val = el._getPathValue ?
                el._getPathValue(self._data, el.dataset.bindData)
                : FA.getPathValue(self._data, el.dataset.bindData);
            const href = el.cHrefTemplate(val)
            el.setAttribute('href', href);
        });

        return true;
    }

    _getPathValue(data, path) {
        // By default, the path is a literal route into the data
        // (But custom settings will override this)
        return FA.getPathValue(data, path);
    }
};
window.customElements.define('fa-element', FA.Element);

// TODO: Do this manually in the application
//FA.Element.registerCSS('fenster', 'dist/fa/fa.css');

FA.TestElement = class extends FA.Element {
    constructor() {
        super('_test');
    }

    changeInitData(instigator) {
        const val = instigator.getAttribute('click-data');
        this.data = {'testval': val};
    }
};
window.customElements.define('fa-test-element', FA.TestElement);
