FA.DropDown = class extends HTMLElement {
    constructor() {
        super();
        //this._template = 'fa_drop_down';
        this._context = undefined;
        this._root = this;
        this.el = {};
    }

    connectedCallback() {
        //this._root.innerHTML = Template.render(this._template, this._context);
        this.el.title = this._root.querySelector('fa-drop-down-title');
        this.el.content = this._root.querySelector('fa-drop-down-content');

        const self = this;

        // If show-on-hover
        this.addEventListener('mouseenter', function(event) {
            self.show();
        });
        this.addEventListener('mouseleave', function(event) {
            self.hide();
        });
        // If toggle-on-click
        this.el.title.addEventListener('click', function(event) {
            self.toggle();
        });
    }

    toggle() {
        this._on = !this._on;
        if (this._on) {
            this.show();
            this.classList.add('toggled-on');
        }
        else {
            this.classList.remove('toggled-on');
            this.hide();
        }
    }

    show() {
        //const scrollLeft = window.pageXOffset || this.scrollLeft;
        //const scrollTop = window.pageYOffset || this.scrollTop;
        const contentLocation = this.getAttribute('content-location');
        const rect = this.getBoundingClientRect();

        // Render first to get the width of the content, then position it
        FA.setActiveState(this.el.content, true);

        const contentWidth = this.el.content.scrollWidth;

        switch(contentLocation) {
            case 'right':
                this.el.content.style.left = rect.right + 'px';
                this.el.content.style.top = rect.top + 'px';
                break;
            case 'left':
                this.el.content.style.left = (rect.left - contentWidth) + 'px';
                this.el.content.style.top = rect.top + 'px';
                break;
            case 'bottom-left':
                this.el.content.style.left = (rect.right - contentWidth) + 'px';
                this.el.content.style.top = rect.bottom + 'px';
                break;
            case 'bottom':
            default:
                this.el.content.style.left = rect.left + 'px';
                this.el.content.style.top = rect.bottom + 'px';
        }
    }

    hide() {
        if (this._on) {
            return;
        }

        FA.setActiveState(this.el.content, false);
    }
};
window.customElements.define('fa-drop-down', FA.DropDown);

//TODO: Propagate local-filter to parent
// FA.showDropDown = function() {
//     console.log('SHOW DROP DOWN');
//     // Track active drop-downs
// };

// window.onclick = function(event) {
//     console.log('WINDOW CLICK');
//     if (!event.target.matches('button')) {
//         // TODO: Iterate over active drop-downs
//         // el.classList.remove('active');
//     }
// };
