FA.pageState = null;
FA.groupState = {};

/// Add new state onto the current hash state
FA.addHashState = function(addState) {
    const hashStr = document.location.hash.substring(1);
    const prevState = FA.toJsonFromUrlEncoded(hashStr);
    const newHashState = Object.assign(prevState, addState);
    FA.setHashState(newHashState);
};

/// Set only the current hash state
FA.setHashState = function(newHashState) {
    // Remove empty strings from the hash state altogether before setting
    for (const[key, val] of Object.entries(newHashState)) {
        if (val === '') {
            delete newHashState[key];
        }
    }
    const newHashStr = '#' + FA.toUrlEncodedString(newHashState);
    document.location.hash = newHashStr;
};

/// Add new state, but overwrite the history, so the back button maintains the same target
FA.addHashStateOverwrite = function(addState) {
    const hashStr = document.location.hash.substring(1);
    const prevState = FA.toJsonFromUrlEncoded(hashStr);
    const newHashState = Object.assign(prevState, addState);
    const newHashStr = '#' + FA.toUrlEncodedString(newHashState);

    history.replaceState(null, null, newHashStr);
};

/// Add hidden state, which doesn't show up in the URL/hash (e.g. for sub-sections, drop-down menus, etc)
FA.addHiddenState = function(addHiddenState) {
    Object.assign(FA.pageState, addState);

    // Force update of current elements
    document.querySelectorAll('[active-filter]').forEach(function(el) {
        FA.updateActiveState(el);
    });
}

// // TODO: Flip global state based on whether an element is active (not based on the global state value)
// TODO: Handle empty clicks -- like a temporary state
// FA.toggleState = function(key) {
//     const prevState = FA.pageState[key];

//     // Convert to strict boolean types
//     FA.pageState = prevState ? false : true;
// }

/// Set the entire URL state (don't merge with the previous state)
///  Changing query state will load a new page
FA.setUrlState = function(newQueryState, newHashState) {
    var urlStr = '';
    if (newQueryState) {
        urlStr += '?' + FA.toUrlEncodedString(newQueryState);
    }
    if (newHashState) {
        urlStr += '#' + FA.toUrlEncodedString(newHashState);
    }
    document.location.href = urlStr;
};

/// Initialize the global pageState object using the current query parameters (not hash params yet)
FA.initPageState = function(defaultPageState) {
    FA.defaultPageState = defaultPageState;

    // Create the pageState; sanity check that this doesn't get called twice
    // (if there are cases where it would, just early out here if it is non-null)
    assert(!FA.pageState);
    //FA.pageState = FA.defaultPageState;

    // Allow the URL search string to set the initial page state
    const searchStr = document.location.search.substring(1);
    const initState = FA.toJsonFromUrlEncoded(searchStr);

    // Overwrite the base state with the hash state
    const hashStr = document.location.hash.substring(1);
    const hashState = FA.toJsonFromUrlEncoded(hashStr);

    FA.pageState = Object.assign({}, FA.defaultPageState, initState, hashState);
    console.log('initial pageState:', FA.pageState);

    // Listen for future hash state changes
    window.addEventListener('hashchange', FA.onHashStateChange);

    // Trigger anything waiting for initial HTML content to load
    document.addEventListener('DOMContentLoaded', function(event) {
        console.log('DOMContentLoaded');
        document.querySelectorAll('[active-filter]').forEach(function(el) {
            FA.updateActiveState(el);
        });
    });

    // Listen for page changes (typically to check for unsaved changes)
    window.onbeforeunload = function(e) {
        console.log('TODO: Check with registered components for page unload');
    };

    // Listen for key presses
    document.addEventListener('keydown', FA.onKeyDown);
    //document.addEventListener('keyup', FA.onKeyUp);
};

/// Update the pageState based on the hash parameters
FA.onHashStateChange = function() {
    // Allow the URL search string to set the initial page state
    const searchStr = document.location.search.substring(1);
    const searchState = FA.toJsonFromUrlEncoded(searchStr);
    //FA.pageState = searchState;

    // Overwrite the base state with the hash state
    const hashStr = document.location.hash.substring(1);
    const hashState = FA.toJsonFromUrlEncoded(hashStr);

    FA.pageState = Object.assign({}, FA.defaultPageState, searchState, hashState);

    console.log('hash change pageState:', FA.pageState);
    // Notify all top-level active-filter elements, and all top-level components listening to page-state
    FA.notifyPageStateChange(document);
};

/// Notify all top-level active-filter elements, and all top-level components listening to page-state
FA.notifyPageStateChange = function(root) {
    // OPT: Could diff the pageState, and search for affected active keys only
    root.querySelectorAll('[active-filter]').forEach(function(el) {
        FA.updateActiveState(el);
    });
    // All fa-elements also need to notify their children
    root.querySelectorAll('[enable-page-state]').forEach(function(el) {
        el.onPageStateChange();
    });
};

/// Static function to activate/deactivate an element depending on pageState
FA.updateActiveState = function(el, initActive) {
    FA.cacheActiveFilter(el);

    let shouldBeActive = initActive;

    // Check for an active key & val, and compare against the page state
    if (!shouldBeActive && el._activeFilter) {
        shouldBeActive = FA.matchPosFilter(FA.pageState, el._activeFilter);
    }

    FA.setActiveState(el, shouldBeActive);
};
FA.cacheActiveFilter = function(el) {
    if (el._activeFilter === undefined) {
        const activeFilterStr = el.getAttribute('active-filter');
        el._activeFilter = activeFilterStr ? JSON.parse(activeFilterStr) : null;
    }
};
FA.setActiveState = function(el, shouldBeActive, force=false) {
    if (shouldBeActive) {
        if (!el._isActive || force) {
            el._isActive = true;
            el.classList.add('active');
            // TODO: onActivate might be deprecated
            // in favor of the general purpose event
            if (el.onActivate) el.onActivate();
            // Activate Event
            const e = new Event('activate', {bubbles: true, composed: false});
            el.dispatchEvent(e);
        }
    }
    else {
        if (el._isActive || force) {
            el._isActive = false;
            el.classList.remove('active');
            if (el.onDeactivate) el.onDeactivate();
            // Deactivate Event
            const e = new Event('deactivate', {bubbles: true, composed: false});
            el.dispatchEvent(e);
        }
    }
};
FA.toggleActiveState = function(el) {
    const active = !el._isActive;
    FA.setActiveState(el, active);
}

FA.setKeyListener = function(keyStr, callback) {
    if (FA._keyPaths === undefined) {
        FA._keyPaths = {};
    }

    // Convert the keyStr to a consistent path
    // (for a simple decision tree)
    // 'ctrl+shift+A' => 'A.ctrl.shift'

    // pre-process the elements to capitalize and prepend `Key${letter}`
    var hasCtrl = false;
    var hasShift = false;
    var hasAlt = false;
    var charKeys = [];
    const keyArray = keyStr.split('+');
    for (key of keyArray) {
        const ucKey = key.toUpperCase();
        if (ucKey === 'CTRL') hasCtrl = true;
        else if (ucKey === 'SHIFT') hasShift = true;
        else if (ucKey === 'ALT') hasAlt = true;
        else if (ucKey === 'ENTER') charKeys.push(`Enter`);
        else if (ucKey === 'DELETE') charKeys.push(`Delete`);
        else charKeys.push(`Key${ucKey}`);
    }

    // Generate the ordered final string command
    const finalKeyArray = [];
    if (hasCtrl) finalKeyArray.push('CTRL');
    if (hasAlt) finalKeyArray.push('ALT');
    if (hasShift) finalKeyArray.push('SHIFT');
    finalKeyArray.push(...charKeys.sort());

    const keyPath = finalKeyArray.join('+');

    FA._keyPaths[keyPath] = callback;
};

FA.onKeyDown = function(e) {
    //console.log('KEY DOWN', e.code);
    //console.log(FA._keyPaths);
    // Allow elements to register key press handlers
    // with optional ctrl and shift filters
    if (!FA._keyPaths) return;

    // Build the key path
    const finalKeyArray = [];
    if (e.ctrlKey) finalKeyArray.push('CTRL');
    if (e.altKey) finalKeyArray.push('ALT');
    if (e.shiftKey) finalKeyArray.push('SHIFT');
    finalKeyArray.push(e.code);

    const keyPath = finalKeyArray.join('+');

    const callback = FA._keyPaths[keyPath];
    if (callback) {
        callback();
        e.preventDefault();
    }
};
