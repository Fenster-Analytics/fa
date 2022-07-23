import {Element} from "./element.mjs"
import * as common from "./common.mjs";

export class Application extends Element {
    constructor(mainTemplate, loginTemplate) {
        super(mainTemplate);
        this._loginTemplate = loginTemplate;

        this._user = undefined;
        this._version = 'b1.0';

        const hashStr = document.location.hash.substring(1);
        if (hashStr) {
            const initStateStackDict = common.urlEncodedStrToJson(hashStr);
            const initStateStack = common.kvpObjToArray(initStateStackDict);
            this._stateStack = initStateStack;
            this._flushState();
        }
        else {
            this.setState({'section': 'home'});
        }

        common.setApp(this);
    }

    getRenderContext() {
        return {
            'state': this._currentState,
            'user': this._user,
            'version': this._version,
        }
    }

    get user() {
        return this._user;
    }

    _flushState() {
        console.log('FLUSH STATE', this._stateStack);
        this._currentState = this._stateStack[this._stateStack.length - 1];
        this.updateContent();
        const newHashStr = '#' + common.JsonToUrlEncodedStr(this._stateStack);
        document.location.hash = newHashStr;
    }

    setState(state) {
        // Wipes the entire stack and sets a new root state
        this._stateStack = [state];
        this._flushState();
        return this;
    }

    pushState(state) {
        // Creates new state on top of the stack
        this._stateStack.push(state);
        this._flushState();
        return this;
    }

    gotoState(state) {
        // Changes the state at the current level
        this._stateStack[this._stateStack.length - 1] = this._state;
        this._flushState();
        return this;
    }

    addState(state) {
        // Activates a sub-state within the current state e.g. for tab groups
        const lastIndex = this._stateStack.length - 1;
        const currentState = this._stateStack[lastIndex];
        this._stateStack[lastIndex] = Object.assign({}, currentState, state);
        this._flushState();
        return this;
    }

    removeState(state) {
        console.log('REMOVE STATE', state);
        const lastIndex = this._stateStack.length - 1;
        const currentState = this._stateStack[lastIndex];
        const newState = {};
        for (const[key, val] of Object.entries(currentState)) {
            if (state[key] !== val) {
                newState[key] = val;
            }
        }
        console.log('NEW STATE', newState);
        this._stateStack[lastIndex] = newState;
        this._flushState();
        return this;
    }

    popState(state) {
        if (this._stateStack.length > 1) {
            this._stateStack.pop();
            this._flushState();
        }
        return this;
    }

    evalFilter(filter) {
        // TODO: Instead of true, maybe return the depth?
        // So depth of zero would become 'active' and anything else 'passive'
        return common.matchFilter(this._currentState, filter);
    }

    renderContent() {
        this.initAuthClient().then((isAuthenticated) => {
            if (isAuthenticated) {
                this._auth0.getUser().then((user) => {
                    this._user = user;
                    console.log('LOGGED IN USER:', user);
                    super.renderContent(this._template);
                }).catch((e) => {
                    console.error('error getting user:', e);
                    super.renderContent(this._loginTemplate);
                });
            }
            else {
                super.renderContent(this._loginTemplate);
            }
        });
    }

    fetchAuthConfig() {
        return fetch("/auth_config.json");
    }

    async initAuthClient() {
        const response = await this.fetchAuthConfig();
        const config = await response.json();

        this._auth0 = await createAuth0Client({
            'domain': config.domain,
            'client_id': config.clientId,
            'cacheLocation': config.cacheLocation,
            //'organization': config.organization,
            'responseType': 'token id_token',
            'audience': config.audience, //'YOUR_API_IDENTIFIER', matches .env file on API"
            'scope': config.scope,
        });

        const query = window.location.search;
        const shouldParseResult = query.includes("code=") && query.includes("state=");
        if (shouldParseResult) {
            try {
                const redirectResult = await this._auth0.handleRedirectCallback();
                // Logged in
                window.history.replaceState({}, document.title, "/");
                return true;
            }
            catch (e) {
                console.log("Error parsing redirect:", e);
                return false;
            }
        }

        const isAuthenticated = await this._auth0.isAuthenticated();
        return isAuthenticated;
    }

    login() {
        const options = {
            'redirect_uri': window.location.origin,
            //'appState': TODO
        };

        this._auth0.loginWithRedirect(options).catch((e) => {
            console.error('login error:', e);
        });
    }

    logout() {
        const options = {
            'returnTo': window.location.origin,
        };

        this._auth0.logout(options).catch((e) => {
            console.error('logout error:', e);
        });
    }

    testAPI() {
        this._auth0.getTokenSilently()
            .then(accessToken => {
                fetch('http://localhost:5000/api/test', {
                    'method': 'GET',
                    'headers': {
                        'Authorization': `Bearer ${accessToken}`,
                    }
                })
            .then(result => result.json())
            .then(data => {
                console.log('API DATA', data);
            })
            .catch(e => {
                console.error('API ERROR', e);
            });
        });
    }

    // Add single command to the buffer
    // Schedule recurring commands?
    // Or polling commands, like the backend status,
    // that should have minimum and maximum polling intervals
    // like they could attach themselves to every call
    // but if some amount of time has passed, they will initiate a call
}
