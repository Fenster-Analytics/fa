import * as common from "./common.mjs";
import {Element} from "./element.mjs"

export class Application extends Element {
    constructor(mainTemplate, loginTemplate) {
        super(mainTemplate);
        this._loginTemplate = loginTemplate;

        common.setApp(this);
    }

    get state() {
        const appState = {'test': 69};
        return appState;
    }

    get user() {
        return this._user;
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
            //'organization': config.organization
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

    // TODO: Call API
    // <button id="call-api">Call an API</button>
    // //with async/await
    // document.getElementById('call-api').addEventListener('click', async () => {
    //   const accessToken = await auth0.getTokenSilently();
    //   const result = await fetch('https://myapi.com', {
    //     method: 'GET',
    //     headers: {
    //       Authorization: `Bearer ${accessToken}`
    //     }
    //   });
    //   const data = await result.json();
    //   console.log(data);
    // });

    // //with promises
    // document.getElementById('call-api').addEventListener('click', () => {
    //   auth0
    //     .getTokenSilently()
    //     .then(accessToken =>
    //       fetch('https://myapi.com', {
    //         method: 'GET',
    //         headers: {
    //           Authorization: `Bearer ${accessToken}`
    //         }
    //       })
    //     )
    //     .then(result => result.json())
    //     .then(data => {
    //       console.log(data);
    //     });
    // });
}
