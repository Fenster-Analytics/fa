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


export function setPathValue(obj, pathStr, val) {
    if (!obj) {
        return undefined;
    }
    if (!pathStr) {
        for (const[key, subval] of Object.entries(val)) {
            obj[key] = subval;
        }
        return obj;
    }

    let node = obj;
    const pathList = pathStr.split('.');
    const pathLength = pathList.length;
    assert(pathLength > 0);

    for (let p=0; p<pathLength-1; p++) {
        const key = pathList[p];
        let nextNode = node[key];
        if (nextNode === undefined) {
            nextNode = {};
            node[key] = nextNode;
        }
        node = nextNode;
    }
    const finalKey = pathList[pathLength-1];
    node[finalKey] = val;

    return obj;
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
    return parseStrVal(el.value);
}


export function setElementValue(el, val) {
    if (el.matches('[type="checkbox"]')) {
        el.checked = val;
    }
    else {
        el.value = val;
    }
}


export function strToJsonSafe(val) {
    try {
        return JSON.parse(val);
    }
    catch(e) { }
    return val;
}


export function JsonToUrlEncodedStr(obj) {
    var str = '';
    var hasPrev = false;
    for (const [key, val] of Object.entries(obj)) {
        // Omit null values altogether
        if (val === null) {
            continue;
        }

        if (hasPrev) str += '&';
        else hasPrev = true;

        // Either convert the object to a string, otherwise encode the string directly
        const dataType = typeof(val);
        const strVal = (dataType === 'object' || dataType === 'array')
                    ? encodeURIComponent(JSON.stringify(val))
                    : encodeURIComponent(val);
        str += `${key}=${strVal}`;
    }
    return str;
}


export function urlEncodedStrToJson(strVal) {
    if (strVal.length > 2) {
        const jsonStr = '{"' + strVal.replace(/&/g, '","').replace(/=/g,'":"') + '"}';
        const jsonData = JSON.parse(
            jsonStr,
            function(key, value) {
                // return top-level value
                if (key === '') return value;

                const strValue = decodeURIComponent(value);
                return strToJsonSafe(strValue);
            }
        );
        return jsonData;
    }
    return {};
}


export function kvpObjToArray(obj) {
    const maxIndex = Math.max(...Object.keys(obj));
    const returnArray = Array(maxIndex + 1);
    for (const [key, val] of Object.entries(obj)) {
        returnArray[parseInt(key)] = val;
    }
    return returnArray;
}


export function stateStackToHashStr(stateStack) {
    //const hashStr = btoa(JsonToUrlEncodedStr(stateStack));
    const hashStr = JsonToUrlEncodedStr(stateStack);
    return hashStr;
}


export function hashStrToStateStack(hashStr) {
    //const stateStackDict = urlEncodedStrToJson(atob(hashStr));
    const stateStackDict = urlEncodedStrToJson(hashStr);
    const stateStack = kvpObjToArray(stateStackDict);
    return stateStack;
}