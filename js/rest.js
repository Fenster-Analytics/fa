FA.RestAPI = class {
    constructor(baseUrl, user=null, pass=null) {
        assert(baseUrl);

        // Remove trailing slash (request paths should always begin with a slash)
        this._baseUrl = baseUrl.replace(/\/$/, '');

        // Optional, if the remote API requires user/pass
        this._user = user;
        this._pass = pass;

        this._promiseCache = {};
        this._requestListeners = [];
    }

    addRequestListener(callbackFn, delayMS=500) {
        this._requestListeners.push({
            'callbackFn': callbackFn,
            'delayMS': delayMS,
            'handle': null,
        });
    }

    /// taskOptions:
    ///   display   -- on-screen notification while the task is running
    ///   block     -- show a blocking layer while the task is running
    ///   cache     -- true for always; integer for ms cache lifetime
    ///   silent    -- don't trigger attached listeners (e.g. to avoid recursion in a listener making an API call)
    ///   atomic    -- don't consolidate even if possible

    get(route, params=null, taskOptions=null) {
        return this.request('GET', {
            route: route,
            params: params,
        }, taskOptions);
    }

    post(route, params=null, content=null, taskOptions=null) {
        return this.request('POST', {
            route: route,
            params: params,
            content: content,
        }, taskOptions);
    }

    postFile(route, params, file, taskOptions=null) {
        return this.request('POST', {
            route: route,
            params: params,
            file: file,
        }, taskOptions);
    }

    put(route, params=null, content=null, taskOptions=null) {
        return this.request('PUT', {
            route: route,
            params: params,
            content: content,
        }, taskOptions);
    }

    delete(route, params=null, taskOptions=null) {
        return this.request('DELETE', {
            route: route,
            params: params,
        }, taskOptions);
    }

    /// options:
    ///   route
    ///   params
    ///   content
    ///   file
    request(method, options, taskOptions) {
        const self = this;

        //console.log('REQUEST', method, options, taskOptions);
        method = method.toUpperCase();
        if (taskOptions === null) taskOptions = {};
        const routeString = FA.toUrl(options.route, options.params);

        taskOptions.route = options.route;
        taskOptions.params = options.params;

        //
        // Check the promise cache
        //
        let requestPromise = null;
        const promiseKey = method + routeString;

        if (!taskOptions.atomic) {
            const promiseInfo = this._promiseCache[promiseKey];
            if (promiseInfo) {
                if (FA.isNumeric(taskOptions.cache) && promiseInfo.completed) {
                    // Only re-use the promise if the cache hasn't expired
                    const expirationMS = parseInt(taskOptions.cache);
                    const cacheAge = Date.now() - promiseInfo.t;

                    if (cacheAge < expirationMS) {
                        requestPromise = promiseInfo.p;
                        FA.TaskMan.recordCacheHit(taskOptions);
                    }
                }
                else {
                    requestPromise = promiseInfo.p;
                    FA.TaskMan.recordCacheHit(taskOptions);
                }
            }
        }

        //
        // Create the request if necessary
        //
        if (requestPromise === null) {
            requestPromise = this._createRequestPromise(routeString, method, options, taskOptions);

            // Create the promise cache entry
            this._promiseCache[promiseKey] = {
                t: Date.now(),
                p: requestPromise,
            };

            if (taskOptions.cache) {
                requestPromise.then(() => {
                    const promiseInfo = self._promiseCache[promiseKey];
                    if (promiseInfo) {
                        promiseInfo.completed = true;
                    }
                })
                .catch(() => {
                    const promiseInfo = self._promiseCache[promiseKey];
                    if (promiseInfo) {
                        promiseInfo.completed = true;
                    }
                });
            }
            else {
                // If not cached, clear the cache on completion
                requestPromise.then(() => {
                    self._promiseCache[promiseKey] = null;
                })
                .catch(() => {
                    self._promiseCache[promiseKey] = null;
                });
            }

            // Register the promise with TaskMan
            FA.TaskMan.registerPromise(requestPromise, taskOptions);
        }

        //
        // Notify API listeners
        //
        if (!taskOptions.silent) {
            this._triggerRequestListeners();
        }

        return requestPromise;
    }

    _createRequestPromise(routeString, method, options, taskOptions) {
        const self = this;
        const url = this._baseUrl + routeString;
        const content = FA.isNullOrUndefined(options.content) ? null : JSON.stringify(options.content);

        return new Promise(function(resolve, reject) {
            const xhr = new XMLHttpRequest();
            xhr.open(method, url, true, self._user, self._pass);
            // xhr.setRequestHeader("Authorization", "Basic " + btoa(self._user + ":" self._pass))

            //
            // Headers
            //
            if (options.file) {
                // Leave defaults
                //xhr.setRequestHeader('Content-Type', 'multipart/form-data');
            }
            else {
                xhr.setRequestHeader('Accept', 'application/json');
                if (method === 'POST' || method === 'PUT') {
                    // Body of GET should be empty
                    // (so RequestParser on server would fail this)
                    xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
                }
                xhr.setRequestHeader('Cache-Control', 'no-store');

                if (taskOptions.download) {
                    xhr.responseType = 'blob';
                }
            }

            //
            // Add Event Listeners
            //
            xhr.addEventListener('load', function(e) {
                const contentType = xhr.getResponseHeader('Content-Type');
                const lastModified = xhr.getResponseHeader('Last-Modified');

                if (taskOptions.download) {
                    self._download(this, taskOptions);
                }

                assert(this.readyState === 4);
                if (this.status < 400) {
                    self._succeed(this, resolve);
                }
                else {
                    self._fail(this, 'server error', reject);
                }
            });

            xhr.addEventListener('error', function(e) {
                self._fail(this, 'network error', reject);
            });

            xhr.addEventListener('abort', function(e) {
                console.warn('ABORT', this, e);
                self._fail(this, 'abort', reject);
            });

            //
            // Send
            //
            if (options.file) {
                const formData = new FormData();
                formData.append('file', options.file, options.file.name);
                xhr.send(formData);
            }
            else {
                xhr.send(content);
            }
        });
    }

    _succeed(xhr, resolve) {
        const data = FA.toJson(xhr.response);
        resolve(data);
    }

    _fail(xhr, reason, reject) {
        const response = FA.toJson(xhr.response);
        console.error('REST Request failed', reason, response);

        reject({
            'status': xhr.status,
            'response': response,
            'responseURL': xhr.responseURL,
            'readyState': xhr.readyState,
            'reason': reason,
        });
    }

    _download(xhr, taskOptions) {
        const blob = xhr.response;
        if (!taskOptions.filename) {
            const contentDisposition = xhr.getResponseHeader('Content-Disposition');
            if (contentDisposition) {
                taskOptions.filename = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)[1];
            }
            else {
                taskOptions.filename = 'file'
            }
        }

        const a = document.createElement('a');
        a.href = window.URL.createObjectURL(blob);
        a.download = taskOptions.filename;
        a.dispatchEvent(new MouseEvent('click'));
    }

    _triggerRequestListeners() {
        for (let requestListener of this._requestListeners) {
            // Only if the requestListener hasn't already been queued
            if (!requestListener.handle) {
                requestListener.handle = setTimeout(
                    function() {
                        requestListener.handle = null;
                        requestListener.callbackFn();
                    },
                    requestListener.delayMS
                );
            }
        }
    }
};