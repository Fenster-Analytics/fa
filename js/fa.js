const FA = {};

FA.global = {};
FA.savingHTML = 'Saving...';
FA.loadingText = 'Loading...';
FA.loadingHTML = 'Loading...';
FA.failedHTML = '(failed)';

// Nunjucks config
if (window.nunjucks !== undefined) {
    nunjucks.installJinjaCompat();
    FA.env = nunjucks.configure({ autoescape: false });

    // FA.env.addFilter('data', function(v) {
    //     console.log('DATA FILTER', v);
    //     //if (v === null) return 'null';
    //     return JSON.stringify(v);
    // }, false);
    // FA.env.addFilter('shorten', function(str, count) {
    //     return str.slice(0, count || 5);
    // });
}

//
// Global functions
//

/// Assert function (if not already defined)
if (typeof(assert) === 'undefined') {
    //console.log('Defining assert function');
    var assert = function(val, ...msgArgs) {
        if (!val) {
            var msg = "Assertion failed";
            if (msgArgs) {
                msg = msgArgs.join(' ');
            }
            
            if (typeof Error !== "undefined") {
                throw new Error(msg);
            }
            throw msg; // Fallback
        }
    }
}
else {
    console.log('Using predefined assert function');
}

Math.clamp = function(value, min, max) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
};

Math.getRandomInt = function(max) {
    return Math.floor(Math.random() * max);
};

FA.copy = function(val) {
    navigator.clipboard.writeText(val);
};

//
// Utility functions
//

// For sorting numerically, then alphabetically
FA.localeCompare = function(a, b) {
    if (a === null) return 1;
    if (b === null) return -1;
    if (a === null && b === null) return 0;

    const result = a - b;

    if (isNaN(result)) {
        return a.toString().localeCompare(b);
    }
    else {
        return result;
    }
}

FA.setElementValue = function(el, val) {
    if (el.matches('[type="checkbox"]')) {
        el.checked = val;
    }
    else {
        el.value = val;
    }
};

FA.getElementValue = function(el) {
    if (el.matches('[type="checkbox"]')) {
        return el.checked;
    }
    return FA.parseVal(el.value);
}

FA.isVisible = function(el) {
    return (el.offsetWidth && el.offsetHeight);
}

/// Convert to a number
FA.parseFloat = function(val, defaultVal=0) {
    const floatVal = parseFloat(val);
    return isNaN(floatVal) ? defaultVal : floatVal;
};

FA.isNumeric = function(val) {
    return !isNaN(val) && !isNaN(parseFloat(val));
};

/// This is for scanning col types, but FA.parseVal (below) is slightly optimized for its own case
FA.isNull = function(val) {
    if (val === null || val === undefined) return true;
    if (typeof(strVal) === 'string') {
        const lVal = strVal.toLowerCase();
        return (strVal === 'null');
    }
    return false;
};

FA.scanColumnType = function(data, colIndex) {
    const colType = {
        'numeric': true,
        'datetime': true,
        'json': true,
        'object': true,
        'onlyStr': false, // Can only be considered a string
    };
    for (let r=0; r<data.length; r++) {
        const row = data[r];
        const val = row[colIndex];

        if (FA.isNull(val)) {
            continue;
        }
        if (val === '') {
            continue;
        }
        if (colType.numeric && !FA.isNumeric(val)) {
            colType.numeric = false;
            colType.onlyStr = colType.onlyStr || !(colType.datetime || colType.json);
        }
        if (colType.datetime && !FA.isDateTime(val)) {
            colType.datetime = false;
            colType.onlyStr = colType.onlyStr || !(colType.numeric || colType.json);
        }
        if (colType.json && !FA.isJson(val)) {
            colType.json = false;
            colType.onlyStr = colType.onlyStr || !(colType.numeric || colType.datetime);
        }
        if (colType.object && !FA.isObject(val)) {
            colType.object = false;
        }

        if (colType.onlyStr) {
            return colType;
        }
    }
    return colType;
};

FA.updateColumnType = function(colType, addColType) {
    for (const[key, val] of Object.entries(colType)) {
        colType[key] = colType[key] && addColType[key];
    }
    return colType;
};

/// Convert string to a bool or number if possible
FA.parseVal = function(strVal) {
    if (typeof(strVal) !== 'string') {
        return strVal;
    }

    const lVal = strVal.toLowerCase();
    if (lVal === 'null') return null;
    if (lVal === 'true') return true;
    if (lVal === 'false') return false;

    if (isNaN(strVal)) {
        return strVal;
    }

    const floatVal = parseFloat(strVal);
    if (!isNaN(floatVal)) {
        return floatVal;
    }

    return strVal;
};

/// Convert to a CSV cell value
FA.escapeForCSV = function(v) {
    if (v === undefined) {
        return '';
    }
    if (v === null) {
        return 'NULL';
    }
    const innerVal = v.toString().replace(/\"/g, "\"\"");
    return `"${innerVal}"`;
}

/// Check if the KVPs in posFilter all appear in the currentState
///  posFilter RHS can be an array of acceptable values
FA.matchPosFilter = function(currentState, posFilter) {
    for(const[key, val] of Object.entries(posFilter)) {
        //const currentVal = currentState[key];
        if (val === '*') {
            // Allow wildcard; mainly so modals can clear parameters in getDeactivateFilter
            continue;
        }
        const currentVal = FA.getPathValue(currentState, key);
        if (Array.isArray(val)) {
            if (!val.includes(currentVal)) return false;
        }
        else {
            if (currentVal !== val) return false;
        }
    }
    return true;
};

//
// Object extensions
//
/// Get an object's property based on a path string
FA.getPathValue = function(obj, pathStr, defaultVal) {
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
};

FA.getDictValue = function(obj, key, defaultVal) {
    if (!obj) {
        return defaultVal;
    }
    if (!key) {
        return obj;
    }
    const val = obj[key];
    if (val === undefined) {
        return defaultVal;
    }
    return val;
};

/// Set an object's property/sub-property based on a path string
FA.setPathValue = function(obj, pathStr, val) {
    if (!obj) {
        return undefined;
    }
    if (!pathStr) {
        // Merge in the data at the root
        //obj = {...val};
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
};

// 
FA.escapeStr = function(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
};

FA.subDict = function(str, dict) {
    if (str === undefined || str === null) {
        return '';
    }
    if (!dict) {
        return str;
    }
    str = str.toString();
    for (const [key, val] of Object.entries(dict)) {
        const tagStr = FA.escapeStr(`{{${key}}}`);
        str = str.replace(new RegExp(tagStr, 'g'), val);
    }
    return str;
};

// // For large array-index replacement, optimize by only generating the regex once (given number of columns)
// FA.prepareRegExLookup = function(numColumns) {
//     const regExLookup = [];
//     for (let i=0; i<numColumns; i++) {
//         const tagStr = FA.escapeStr(`{{${i}}}`);
//         regExLookup.push(new RegExp(tagStr, 'g'));
//     }
//     return regExLookup
// };
// FA.subArray = function(str, array, regExLookup=undefined) {
//     if (str === undefined || str === null) {
//         return '';
//     }
//     if (!array) {
//         return str;
//     }

//     // Compile the RegExp values, if we haven't already optimized
//     if (!regExLookup) {
//         regExLookup = FA.prepareRegExLookup(array.length);
//     }

//     str = str.toString();
//     for (let i=0; i<array.length; i++) {
//         const val = array[i];
//         const regEx = regExLookup[i];
//         str = str.replace(regEx, val);
//     }

//     return str;
// }

// Recursive substitution
FA.flattenParams = function(obj) {
    const maxDepth = 3;
    for (let i=0; i<maxDepth; i++) {
        let changeCount = 0;
        for (const [key, val] of Object.entries(obj)) {
            const oldVal = val;
            const newVal = FA.subDict(val, obj);
            if (newVal !== oldVal) {
                changeCount++;
                obj[key] = newVal;
            }
        }
        if (!changeCount) {
            return obj;
        }
    }
    return obj;
};

FA.toUrlEncodedString = function(obj) {
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
};

FA.toJsonFromUrlEncoded = function(strVal) {
    if (strVal.length > 2) {
        const jsonStr = '{"' + strVal.replace(/&/g, '","').replace(/=/g,'":"') + '"}';
        const jsonData = JSON.parse(
            jsonStr,
            function(key, value) {
                // return top-level value
                if (key === '') return value;

                const strValue = decodeURIComponent(value);
                return FA.toJson(strValue);
            }
        );
        return jsonData;
    }
    return {};
};

// /// Returns changes from objA to objB
// FA.diff(objA, objB) {
//     const objTypeA = typeof(objA);
//     const objTypeB = typeof(objB);
//     if (objTypeA === 'object') {
//         //for (const[key, val] of Object.entries(this._activeFilter)) {
//         //}
//     }
//     else if (objTypeA === 'array') {
//         const m = Math.max(objA.length, objB.length);
//         for (let a=0; a<objA.lenth; a++) {
//             const itemA = objA[a];
//             const itemB = objB[a];
//         }
//     }
//     else {
//         if (objA !== objB) {
//             return objB;
//         }
//     }
//     return undefined;
// }

FA.uniqueFilter = function(value, index, self) {
    return self.indexOf(value) === index;
}

/// Deep value equality comparison of any type
FA.deepEqual = function(objA, objB) {
    if (objA === null) return (objB === null);
    if (objB === null) return (objA === null);
    if (objA === undefined) return (objB === undefined);
    if (objB === undefined) return (objA === undefined);

    const objTypeA = typeof(objA);
    const objTypeB = typeof(objB);
    if (objTypeA !== objTypeB) {
        return false;
    }
    else if (objTypeA === 'object') {
        const keysA = Object.keys(objA);
        const keysB = Object.keys(objB);
        if (keysA.length !== keysB.length) {
            return false;
        }

        const allKeys = [...keysA, ...keysB].filter(FA.uniqueFilter);
        if (allKeys.length !== keysA.length) {
            return false;
        }
        
        for (let k=0; k<allKeys.length; k++) {
            const key = allKeys[k];
            const subA = objA[key];
            const subB = objB[key];
            if (!FA.deepEqual(subA, subB)) {
                return false;
            }
        }
    }
    else if (objTypeA === 'array') {
        if (objA.length !== objB.length) {
            return false;
        }
        for (let a=0; a<objA.length; a++) {
            const itemA = objA[a];
            const itemB = objB[a];
            if (!FA.deepEqual(itemA, itemB)) {
                return false;
            }
        }
    }
    else {
        const c = (objA === objB);
        return c;
    }
    return true;
}

//
// String extensions
//

/// Convert a string into a JSON struct/type, or fall back to the original string
FA.toJson = function(strVal) {
    try {
        if (typeof(strVal) === 'string') {
            return JSON.parse(strVal);
        }
    }
    catch(e) {
        //console.log('FA.toJson err', e, strVal);
    }
    return strVal;
};

FA.isJson = function(val) {
    try {
        JSON.parse(val);
    }
    catch (e) {
        return false;
    }
    return true;
};

FA.isObject = function(v) {
    const typeName = typeof(v);
    if (typeName === 'object') return true;
    if (typeName ==='array')return true;
}

FA.isNullOrUndefined = function(v) {
    return (v === null) || (v === undefined);
}

FA.isEmpty = function(v) {
    return (v === '') || FA.isNullOrUndefined(v);   
}

/// Clean up a url string (trim trailing slash) and append query params
FA.toUrl = function(urlStr, params) {
    if (!urlStr) urlStr = '';

    // Remove the initial leading slash to avoid double leading slashes
    //let strVal = '/' + urlStr.replace(/^\/$/, '');

    // Remove the leading and trailing slash (potentially results in empty string)
    let strVal = '/' + urlStr.replaceAll(/^\/|\/$/g, '');
    if (strVal === '') strVal = '/';

    // Append the encoded parameters
    if (params) {
        strVal += '?' + FA.toUrlEncodedString(params);
    }

    return strVal;
};

//
// Date Functions
//
FA.dateFormatRegEx = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2})(?::(\d{2}))(?::(\d{2}))(.\d*)?)?/;

FA.isDateTime = function(val) {
    return FA.dateFormatRegEx.test(val);
}

FA.strToDate = function(strVal) {
    if (!strVal || strVal === 'null') {
        return null;
    }

    const dateArray = strVal.match(FA.dateFormatRegEx);

    // Replace the undefined optional groups with zeroes
    for (let i=1; i<8; i++) {
        if (dateArray[i] === undefined) dateArray[i] = 0;
    }
    const ts = Date.UTC(
        dateArray[1],     //year,
        parseInt(dateArray[2]) - 1, //month is zero-based,
        dateArray[3],     //day,
        dateArray[4],               // hour
        dateArray[5],               // minute
        dateArray[6],               // second
        1000 * parseFloat(dateArray[7])
    );
    return ts;
};
// console.log(FA.strToDate('2020-10-15'));
// console.log(FA.strToDate('2020-10-15 01:02:03'));
// console.log(FA.strToDate('2020-10-15 01:02:03.123'));
// console.log(FA.strToDate('2020-10-15 01:02:03.123456'));

FA.truncDateTime = function(strVal) {
    if (!strVal || strVal === 'null') {
        return null;
    }

    const dateArray = strVal.match(FA.dateFormatRegEx);

    const year = dateArray[1];
    const month = dateArray[2];
    const day = dateArray[3];
    const hour = dateArray[4];
    const minute = dateArray[5];
    const second = dateArray[6];
    const ms = dateArray[7];

    return `${year}-${month}-${day} ${hour}:${minute}`;
};

FA.secToDHM = function(val) {
    if (!val) {
        return 'no timestamp';
    }
    let seconds = parseFloat(val);
    const days = parseInt(seconds / 86400);
    seconds -= 86400 * days;
    const hours = parseInt(seconds / 3600);
    seconds -= 3600 * hours;
    const minutes = parseInt(seconds / 60);
    seconds -= 60 * minutes;
    return `${days}d ${hours}h ${minutes}m`;
};

FA.secToHMS = function(val) {
    if (!val) {
        return 'no timestamp';
    }
    let seconds = parseFloat(val);
    const hours = Math.floor(seconds / 3600);
    seconds -= 3600 * hours;
    const minutes = Math.floor(seconds / 60);
    seconds -= 60 * minutes;
    seconds = parseInt(seconds);
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    else if (minutes > 0) return `${minutes}m ${seconds}s`;
    else return `${seconds}s`;
};

FA.rgbToStringColor = function(r, g, b, a=1.0, inverted=false) {
    if (inverted) {
        r = 255 - r;
        g = 255 - g;
        b = 255 - b;
    }
    return `rgba(${r},${g},${b},${a})`;
}

FA.hexColorToRGBA = function(hexColor, a=1.0) {
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hexColor)) {
        let c = hexColor.substring(1).split('');
        if (c.length == 3){
            c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c = '0x' + c.join('');
        const r = (c >> 16) & 255;
        const g = (c >> 8) & 255;
        const b = c & 255;
        return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    assert(false, 'Unable to convert', hexColor);
}
