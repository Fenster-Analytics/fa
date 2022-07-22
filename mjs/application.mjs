import {Element} from "./element.mjs"
import * as common from "./common.mjs";

export class Application extends Element {
    constructor(mainTemplate, loginTemplate) {
        super(mainTemplate);
        this._loginTemplate = loginTemplate;

        this._user = undefined;
        this._version = 'b1.0';

        // TODO: Init state from the page state
        const hashStr = document.location.hash.substring(1);
        if (hashStr) {
            this._state = common.urlEncodedStrToJson(hashStr);
        }
        else {
            this._state = {'section': 'home'};
        }

        common.setApp(this);
    }

    // # TODO: Listen for back button presses
    //todoSyncLocation() {
        // generate url
        // manually push state onto the window history

        // const hrefJson = common.strToJsonSafe(this._activeFilter);
        // const hrefStr = common.JsonToUrlEncodedStr(hrefJson);
        // return `#${hrefStr}`;

        // const hrefParts = this.href.split('#');
        // const hashStr = hrefParts[1];

        // // Layer the hash values onto the page state
        // // (follow the link normally if no hash string)
        // if (hashStr) {
        //     const deltaHashState = common.urlEncodedStrToJson(hashStr);
        //     FA.addHashState(deltaHashState);
        //     e.preventDefault();
        // }
    //}

    get state() {
        return this._state;
    }

    get user() {
        return this._user;
    }

    getRenderContext() {
        return {
            'state': this._state,
            'user': this._user,
            'version': this._version,
        }
    }

    setState(state) {
        this.state = state;
    }

    addState(state) {
        this.state = Object.assign({}, this._state, state);
    }

    removeState(state) {
        const newState = {};
        for (const[key, val] of Object.entries(this._state)) {
            if (state[key] !== val) {
                newState[key] = val;
            }
        }
        this.state = newState;
    }

    set state(v) {
        // TODO: If state notDeepEqual
        this._state = v;
        this.updateContent();
        const newHashStr = '#' + common.JsonToUrlEncodedStr(this._state);
        document.location.hash = newHashStr;
    }

    evalFilter(filter) {
        return common.matchFilter(this.state, filter);
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
