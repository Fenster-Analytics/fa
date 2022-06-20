var _app = null;
export function setApp(app) {
    _app = app;
}
export function getApp() {
    return _app;
}


export function assert(b, ...msgArgs) {
    if (!b) {
        var msg = "Assertion failed";
        if (msgArgs) {
            msg = msgArgs.join(' ');
        }
        if (typeof Error !== "undefined") {
            throw new Error(msg);
        }
        throw msg;
    }
}


export function matchFilter(state, posFilter) {
    /// Check if the KVPs in posFilter all appear in the currentState
    ///  posFilter RHS can be an array of acceptable values

    for(const[key, val] of Object.entries(posFilter)) {
        //const currentVal = currentState[key];
        if (val === '*') {
            // Allow wildcard; mainly so modals can clear parameters in getDeactivateFilter
            continue;
        }
        const currentVal = getPathValue(state, key);
        if (Array.isArray(val)) {
            if (!val.includes(currentVal)) return false;
        }
        else {
            if (currentVal !== val) return false;
        }
    }
    return true;
}


export function getPathValue(obj, pathStr, defaultVal) {
    if (!obj) {
        return defaultVal;
    }

    if (!pathStr) {
        return obj;
    }

    let val = obj;
    const pathList = pathStr.split('.');

    for (let p=0; p<pathList.length; p++) {
        const key = pathList[p];
        val = val[key];
        if (val === undefined) {
            return defaultVal;
        }
    }

    return val;
}


export function parseStrVal(strVal) {
    if (typeof(strVal) !== 'string') {
        return strVal;
    }

    try {
        return JSON.parse(strVal);
    }
    catch(e) {
    }

    const floatVal = parseFloat(strVal);
    if (!isNaN(floatVal)) {
        return floatVal;
    }

    const lVal = strVal.toLowerCase();
    if (lVal === 'null') return null;
    if (lVal === 'true') return true;
    if (lVal === 'false') return false;

    return strVal;
}


export function getElementValue(el) {
    if (el.matches('[type="checkbox"]')) {
        return el.checked;
    }
    return FA.parseVal(el.value);
}


export function setElementValue(el, val) {
    if (el.matches('[type="checkbox"]')) {
        el.checked = val;
    }
    else {
        el.value = val;
    }
}