const _cssMap = {};
var _cachedHeaderHTML = '';

export class Element extends HTMLElement {
    constructor(template, context) {
        super();
        console.log('ELEMENT constructor');
    }

    static registerCSS(key, cssFile) {
        _cssMap[key] = cssFile;

        _cachedHeaderHTML = '';
        for (const[key, cssFile] of Object.entries(_cssMap)) {
            _cachedHeaderHTML += `<link rel="stylesheet" href="${cssFile}" />`;
        }
    }
}