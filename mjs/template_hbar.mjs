/// Wrapper to render template partials
export function render(name, data) {
    const template = Handlebars.partials[name];
    if (!template) {
        return `["${name}" template not found]`;
    }
    const html = template(data);
    return html;
};

Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
    return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});
Handlebars.registerHelper('ifNotEquals', function(arg1, arg2, options) {
    return (arg1 != arg2) ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('toFixed', function(num, dp) {
    return parseFloat(num).toFixed(dp);
});

Handlebars.registerHelper('toString', function(val) {
    return String(val);
});

Handlebars.registerHelper('fromJson', function(val) {
    const returnVal = (val === undefined) ? 'null' : JSON.stringify(val, 2);
    //console.log('fromJson', val, returnVal);
    return returnVal;
});
Handlebars.registerHelper('urlEncodeJson', function(val) {
    const returnVal = (val === undefined) ? 'null' : FA.toUrlEncodedString(val);
    //console.log('fromJson', val, returnVal);
    return returnVal;
});
Handlebars.registerHelper('urlEncodeString', function(val) {
    if (typeof(val) === 'object') {
        return encodeURIComponent(JSON.stringify(val));
    }
    return encodeURIComponent(val);
});

Handlebars.registerHelper('length', function(list) {
    if (typeof(list) === 'object') {
        return list ? list.length : 0;
    }
    return '';
});

Handlebars.registerHelper('templateDebug', function(val) {
    console.log('DEBUG:', val);
    return val;
});

Handlebars.registerHelper('getArrayValue', function(list, idx) {
    return list[idx];
});

Handlebars.registerHelper('add', function(v0, v1) {
    return v0 + v1;
});

Handlebars.registerHelper('secToHMS', function(v) {
    return FA.secToHMS(v);
});

Handlebars.registerHelper('secToDHM', function(v) {
    return FA.secToDHM(v);
});

Handlebars.registerHelper('truncDateTime', function(v) {
    return FA.truncDateTime(v);
});

Handlebars.registerHelper('eachItem', function(context, options) {
    var ret = "";

    if (!context) return ret;

    for (var i = 0, j = context.length; i < j; i++) {
        ret = ret + options.fn(context[i]);
    }

    return ret;
});
