(function(){

    var makeDeferred = function() {
        var __resolve, __reject;
        var ended = false;
        var promise = new Promise(function(resolve, reject){
            __resolve = resolve;
            __reject = reject;
        });

        return {
            promise: promise,
            resolve: function(data) {
                if(!ended) {
                    __resolve(data);
                    ended = true;
                }
            },
            reject: function(e) {
                if(!ended) {
                    __reject(e);
                    ended = true;
                }
            },
            isEnded: function() {
                return ended;
            }
        };
    };

    var always = function(promise) {
        return new Promise(function(resolve) {
            promise.then(function(data){
                resolve(data);
            })['catch'](function(e){
                resolve(e);
            });
        });
    };

    var AbortableJob = function AbortableJob() {

        var Job = function Job() {
            function Job(fn) {
                this._aborted = false;
                this._done = false;
                this._fn = fn;
                this._deferred = makeDeferred();
                this._currentJob = null;
                this._errors = [];
                this._run();
            }

            Job.prototype._resolve = function(result) {
                if(!this._done) {
                    this._done = true;
                    this._deferred.resolve(result);
                }
            };

            Job.prototype._reject = function(e) {
                if(!this._done) {
                    this._done = true;
                    this._deferred.reject(e);
                }
            };

            Job.prototype._run = function() {
                try {
                    var that = this;
                    this._currentJob = this._fn();
                    this._currentJob.promise.then(function(result){
                        that._resolve(result);
                    })['catch'](function(e){
                        that._reject(e);
                    });
                } catch(e) {
                    this._reject(e);
                }
            };

            Job.prototype.getPromise = function() {
                return this._deferred.promise;
            };

            Job.prototype.abort = function() {
                if(!this._done) {
                    this._aborted = true;
                    if(this._currentJob && this._currentJob.abort) {
                        this._currentJob.abort();
                    }
                    this._reject(new Error("Aborted"));
                }
            };

            Job.prototype.isDone = function() {
                return this._done;
            };

            Job.prototype.isAborted = function() {
                return this._aborted;
            };

            return Job;
        }();


        // fn ( abort, promise)
        function AbortableJob(fn) {
            this._fn = fn;
            this._currentJob = null;
            this._count = 0;
        }

        AbortableJob.AbortError = new Error("Aborted");

        AbortableJob.prototype.run = function() {
            this._count++;
            if(!this._currentJob || this._currentJob.isDone()) {
                this._currentJob = new Job(this._fn);
            }
            var that = this;
            var job = this._currentJob;
            return {
                promise: Job.prototype.getPromise.call(job),
                abort: function() {
                    if(!Job.prototype.isAborted.call(job)) {
                        that._count--;
                        Job.prototype.abort.call(job)
                    }
                },
                isDone: Job.prototype.isDone.bind(job)
            };
        };

        return AbortableJob;

    }();

    var DataRetriever = function() {

        function parseHeader(header) {
            var split = header ? header.trim().split("\r\n") : [];
            var obj = {};
            var regex = /(\S+):\s?(.*)/g;
            split.forEach(function(each){
                regex.lastIndex = 0;
                var match = regex.exec(each);
                if(match) {
                    obj[match[1]] = match[2];
                }
            });

            return obj;
        }

        function getResponseData(xhr, aborted) {
            if(aborted === void 0) {
                aborted = false;
            }

            return {
                status: xhr && xhr.state ? xhr.state : 0,
                data: xhr ? xhr.response : null,
                header: xhr ? parseHeader(xhr.getAllResponseHeaders()) : {},
                aborted: aborted
            };
        }

        function DataRetriever (url, headers, send, timeout, responseType) {
            if(timeout === void 0) {
                timeout = 15000;
            }

            return new AbortableJob(function(){
                var aborted = false;
                var deferred = makeDeferred();
                var xhr = new XMLHttpRequest();
                var header = null;
                var done = false;
                var abort = function abort() {
                    if(!aborted && !done) {
                        aborted = true;
                        done = true;
                        xhr.abort();
                        deferred.reject(getResponseData(null, true));
                    }
                };
                var timerID = timeout ? setTimeout(function() {
                    if(!abort && !done) {
                        abort();
                    }
                }, timeout) : null;
                var clearTimer = function() {
                    if(timerID !== null) {
                        window.clearTimeout(timerID);
                        timerID = null;
                    }
                };

                xhr.open(send ? "POST" : "GET", url, true);
                if(headers) {
                    Object.keys(headers).forEach(function(key){
                        xhr.setRequestHeader(key, headers[key]);
                    });
                }
                if(responseType !== void 0) {
                    xhr.responseType = responseType;
                }
                xhr.send(send);
                xhr.onreadystatechange = function(evt) {
                    if(xhr.readyState === XMLHttpRequest.DONE) {
                        done = true;
                        clearTimer();
                        if(!aborted && (xhr.status === 200 || xhr.status === 206)) {
                            deferred.resolve(getResponseData(xhr, aborted));
                        } else {
                            deferred.reject(getResponseData(xhr, aborted));
                        }
                    }
                };

                return {
                    promise: deferred.promise,
                    abort: abort
                };
            });
        };

        DataRetriever.XE = {
            JSON: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            XML: {
                'Accept': 'application/xml, text/xml',
                'Content-Type': 'text/plain'
            }
        };

        return DataRetriever;
    }();

    var retry = function retry() {
        function retry(job, retryTime) {
            return new AbortableJob(function(){
                var aborted = false;
                var done = false;
                var retryTimerID = null;
                var deferred = makeDeferred();
                var run = null;
                var tryAgain = function() {
                    run = null;
                    if(!aborted) {
                        retryTimerID = setTimeout(function(){
                            exec();
                        }, retryTime);
                    }
                };
                var exec = function() {
                    run = job.run();
                    run.promise.then(function(data){
                        done = true;
                        if(!aborted) {
                            deferred.resolve(data);
                        }
                    })['catch'](function(err) {
                        if(!aborted && !done) {
                            tryAgain();
                        }
                    });
                };

                var abort = function() {
                    if(!aborted && !done) {
                        aborted = true;
                        if(!deferred.isEnded()) {
                            deferred.reject(AbortableJob.AbortError);
                        }
                        if(retryTimerID !== null) {
                            clearTimeout(retryTimerID);
                            retryTimerID = null;
                        }
                        if(run && !run.isDone()) {
                            run.abort();
                        }
                        run = null;
                    }
                };
                exec();

                return {
                    promise: deferred.promise,
                    abort: abort
                };

            }).run();
        }

        return retry;
    }();

    var NotiClient = function NotiClient() {

        var urlsafeBase64 = {
            encode: function(data) {
                return window.btoa(data)
                    .replace(/\+/g, '-')
                    .replace(/\//g, '_')
                    .replace(/=+$/, '');
            },
            decode: function(base64) {
                base64 += Array(5 - base64.length % 4).join('=');
                base64 = base64
                    .replace(/\-/g, '+')
                    .replace(/\_/g, '/');
                var strData = atob(base64);
                var len = strData.length;
                var bytes = new Uint8Array(len);
                for (var i = 0; i < len; i++) {
                    bytes[i] = strData.charCodeAt(i);
                }

                return bytes.buffer;
            }
        };

        var SW_VERSION = "0.0.0";
        var ServerKeyNotFoundError = new Error("Cannot load VAPID private key.");
        var NotificationDeniedError = new Error('Push messages are blocked.');
        var NotificationBadPermissionError = new Error('Bad permission result');

        function NotiClient() {
            this._swVersion = SW_VERSION;
            this._currentJob = null;
            this._vapidPublicKey = null;
            this._serverID = null;
            this._initialized = false;
            this._initializeDeferred = makeDeferred();
            this._initializePromise = this._initializeDeferred.promise;
            this._store = window.NotiStoreContainer.getInstance();
            this._notificationGrantRetryJob = null;
            this._init();
        }

        // abort 기능 사용시 get계열 요청에만 사용할 것!
        NotiClient.exec_json = function exec_json(module_act, params, callback, fail_callback) {
            return (new AbortableJob(function() {
                if(params === void 0) {
                    params = {};
                }
                var action = module_act.split('.');
                if(action.length !== 2) {
                    throw new Error("Invalid format.");
                }

                var $wfsr = window.$(".wfsr");
                var timeoutId = $wfsr.data('timeout_id');
                var isRhymix = !!$('meta[content="Rhymix"]').length;
                if(timeoutId) {
                    window.clearTimeout(timeoutId);
                }
                $wfsr.css('opacity', 0.0);
                timeoutId = window.setTimeout(function(){
                    $wfsr.css('opacity', '');
                }, 1000);
                $wfsr.data('timeout_id', timeoutId);
                if(window.show_waiting_message && 'waiting_message' in window) {
                    $wfsr.html(waiting_message).show();
                }
                params.module = action[0];
                params.act = action[1];
                var headers = {};
                Object.keys(DataRetriever.XE.JSON).forEach(function(key){
                    headers[key] = DataRetriever.XE.JSON[key];
                });
                if(isRhymix) {
                    params._rx_ajax_compat = "JSON";
                    params._rx_csrf_token = getCSRFToken();
                    headers['x-csrf-token'] = getCSRFToken();
                    headers['x-requested-with'] = 'XMLHttpRequest';
                }
                if(typeof(window.xeVid) != 'undefined') {
                    params['vid'] = window.xeVid;
                }

                var url = window.request_uri;
                var retriever = (new DataRetriever(url, headers, $.param(params))).run();
                var deferred = makeDeferred();
                var aborted = false;
                var clearWaitingMsg = function() {
                    if(timeoutId !== null) {
                        window.clearTimeout(timeoutId);
                        timeoutId = null;
                    }
                };
                var abort = function() {
                    if(!retriever.isDone()) {
                        clearWaitingMsg();
                        $wfsr.hide();
                        retriever.abort();
                    }
                };
                retriever.promise.then(function(response){
                    clearWaitingMsg();
                    $wfsr.hide().trigger('cancel_confirm');
                    var data = JSON.parse(response.data);
                    response.data = data;
                    deferred.resolve(response);
                    if(data.hasOwnProperty('_rx_debug') && data._rx_debug) {
                        data._rx_debug.page_title = "AJAX : " + module_act;
                        if (window.rhymix_debug_add_data) {
                            window.rhymix_debug_add_data(data._rx_debug)
                        } else {
                            window.rhymix_debug_pending_data.push(data._rx_debug)
                        }
                    }
                    if(data.error != '0' && data.error > -1000) {
                        if(fail_callback) {
                            fail_callback(data);
                        }
                        return;
                    }
                    if(callback) {
                        callback(data);
                    }
                })['catch'](function(err){
                    clearWaitingMsg();
                    $wfsr.hide();
                    deferred.reject(err);
                });

                return {
                    promise: deferred.promise,
                    abort: abort
                };
            })).run();
        };

        NotiClient.isSupported = function() {
            return window.location.protocol === 'https:' && 'serviceWorker' in navigator && 'PushManager' in window && 'showNotification' in ServiceWorkerRegistration.prototype;
        };

        NotiClient.prototype._init = function() {
            var that = this;
            this.constructor.exec_json('noti.getNotiServerKey', {}).promise.then(function(response){
                var data = response.data;
                if(data.publicKey) {
                    that._vapidPublicKey = urlsafeBase64.decode(data.publicKey);
                    that._serverID = data.serverID;
                }
                that._initialized = true;
                if(that.hasServerKey()) {
                    that._initializeDeferred.resolve();
                } else {
                    that._initializeDeferred.reject(ServerKeyNotFoundError);
                }

            })['catch'](function(err){
                console.error(err);
            });
        };

        NotiClient.prototype.isSubscribed = function() {
            if(!this.constructor.isSupported()) {
                return Promise.resolve(false);
            }

            return navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
                return serviceWorkerRegistration.pushManager.getSubscription();
            }).then(function(subscription){
                return Promise.resolve(!!subscription);
            })['catch'](function(err){
                console.error(err);
                return Promise.resolve(false);
            }).then(function(result){
                return Promise.resolve(result);
            });
        };

        NotiClient.prototype.getPromise = function() {
            if(this._initialized) {
                return this.hasServerKey() ? Promise.resolve() : Promise.reject(ServerKeyNotFoundError);
            }

            return this._initializePromise;
        };

        NotiClient.prototype.hasServerKey = function() {
            return this._serverID && (!!this._vapidPublicKey || !!this._vapidPublicKey.byteLength);
        };

        NotiClient.prototype.showNotification = function(payload) {
            var that = this;
            var registerServiceWorker = null;
            return this.registerServiceWorker().then(function(sw){
                registerServiceWorker = sw;
                return that.getNotificationGrant();
            }).then(function(){
                return registerServiceWorker.getNotifications({}).then(function(notifications){
                    var notificationArgs = ['title', 'body', 'icon', 'image', 'badge', 'requireInteraction', 'silent', 'renotify', 'tag'];
                    var actions = payload.actions;
                    var title = payload.title;
                    var body = payload.body;
                    var icon = payload.icon;
                    var image = payload.image;
                    var badge = payload.badge;
                    var data = payload.data;
                    var requireInteraction = payload.requireInteraction;
                    var renotify = payload.renotify;
                    var silent = payload.silent;
                    var tag = payload.tag;
                    var pushGroup = payload.pushGroup;
                    var maxNotificationCount = pushGroup.max_count;
                    var useCountSummary = pushGroup.use_count_summary;
                    var countSummaryTemplate = pushGroup.count_summary_template;
                    var timestamp = Date.now();
                    var notificationData = {};
                    var sw = {};
                    notificationData.__sw = sw;
                    Object.keys(payload).forEach(function(key) {
                        if(notificationArgs.indexOf(key) === -1) {
                            notificationData[key] = payload[key];
                        }
                    });
                    var prevNotificationInfo = notifications.filter(function(notification) {
                        var split = notification.tag ? notification.tag.split('@') : null;
                        return notification.tag && notification.data && notification.data.__sw && (notification.tag == tag || (split && split.length && split[0] == tag) );
                    }).sort(function(a, b){
                        return a.data.__sw.timestamp - b.data.__sw.timestamp;
                    }).reduce(function(val, current, idx, arr){
                        var data = current.data;
                        var __sw = data ? data.__sw : null;
                        var removed = false;
                        if(__sw) {
                            if(arr.length-val.removeCount >= maxNotificationCount) {
                                current.close();
                                removed = true;
                                val.removeCount++;
                            }
                            if(__sw.notReadedMessageCount) {
                                val.notReadedMessageMaxCount = Math.max(val.notReadedMessageMaxCount, __sw.notReadedMessageCount);
                            } else if(!removed) {
                                val.nonCountNotification++;
                            }
                        }

                        return val;
                    }, {
                        notReadedMessageMaxCount: 0,
                        nonCountNotification: 0,
                        removeCount: 0
                    });

                    var notificationBody = body;
                    var notificationTag = maxNotificationCount > 1 ? tag + "@" + Date.now() + "." + Math.random().toString(36).substr(2) : tag;
                    sw.notReadedMessageCount = (prevNotificationInfo.notReadedMessageMaxCount ? prevNotificationInfo.notReadedMessageMaxCount : prevNotificationInfo.nonCountNotification) + prevNotificationInfo.removeCount;
                    sw.pushTimestamp = timestamp;
                    if(sw.notReadedMessageCount > 0 && useCountSummary && countSummaryTemplate && body) {
                        notificationBody = countSummaryTemplate.replace('[@content_summary]', body.substring(0, 45));
                        notificationBody = notificationBody.replace('[@count]', sw.notReadedMessageCount);
                    }
                    var notificationOptions = {
                        actions: actions,
                        body: notificationBody,
                        icon: icon,
                        data: notificationData,
                        image: image,
                        badge: badge,
                        requireInteraction: requireInteraction,
                        silent: silent,
                        renotify: renotify,
                        tag: notificationTag
                    };
                    Object.keys(notificationOptions).forEach(function(eachKey){
                        if(notificationOptions[eachKey] === null || notificationOptions[eachKey] === void 0) {
                            delete(notificationOptions[eachKey]);
                        }
                    });

                    return registerServiceWorker.showNotification(title, notificationOptions);
                });
            });
        };

        NotiClient.prototype.closeAllNotification = function() {
            return this.constructor.isSupported() ? navigator.serviceWorker.ready.then(function(registerServiceWorker) {
                return registerServiceWorker.getNotifications({}).then(function(notifications){
                    notifications.forEach(function(notification){
                        notification.close();
                    });
                });
            }) : Promise.resolve();
        };

        NotiClient.prototype.getNotificationGrant = function() {
            var that = this;
            var deferred = makeDeferred();
            var abort = function() {
                deferred.reject(AbortableJob.AbortError);
                if(that._notificationGrantRetryJob) {
                    that._notificationGrantRetryJob.abort();
                    that._notificationGrantRetryJob = null;
                }
            };
            if(!('Notification' in window)) {
                deferred.reject(new Error('Browser does not supported notification.'));
            } else {
                var permission = Notification.permission;
                if (permission === "grant") {
                    deferred.resolve();
                } else if (permission === "denied") {
                    deferred.reject(NotificationDeniedError);
                } else if (permission === "default") {
                    this._notificationGrantRetryJob = retry(new AbortableJob(function () {
                        var deferred = makeDeferred();
                        var abort = function () {};
                        var permission = Notification.permission;
                        switch (permission) {
                            case "denied":
                                deferred.resolve(NotificationDeniedError);
                                break;
                            case "granted":
                                deferred.resolve();
                                break;
                            case "default":
                                deferred.reject(NotificationBadPermissionError);
                                break;
                            default:
                                deferred.reject(new Error("Unexcepted type of permission"));
                        }

                        return {
                            abort: abort,
                            promise: deferred.promise
                        };
                    }), 350);
                    Notification.requestPermission(function(result) {
                        if(result === 'granted') {
                            deferred.resolve();
                        } else if(result === 'denied') {
                            deferred.reject(NotificationDeniedError);
                        }
                    });
                    this._notificationGrantRetryJob.promise.then(function(result) {
                        if(result && result instanceof Error) {
                            deferred.reject(result);
                        } else {
                            deferred.resolve();
                        }
                        that._notificationGrantRetryJob = null;
                    })['catch'](deferred.reject);
                }
            }

            return {
                promise: deferred.promise,
                abort: abort
            };

        };

        NotiClient.prototype.registerServiceWorker = function() {
            var that = this;
            return Promise.all([this.getPromise(), this._store.get('serverID')]).then(function(resolve) {
                return Promise.all([
                    !resolve[1] || resolve[1] === that._serverID ? Promise.resolve() : that.unsubscribe(),
                    that._store.set('serverID', that._serverID)
                ]);
            }).then(function() {
                return navigator.serviceWorker.register('/service-worker.js', {
                    updateViaCache: 'none'
                });
            }).then(function() {
                return navigator.serviceWorker.ready;
            });
        };

        NotiClient.prototype.subscribe = function() {
            if(!this.constructor.isSupported()) {
                return Promise.reject(new Error("Subscription is not available"));
            }
            if(this._notificationGrantRetryJob) {
                this._notificationGrantRetryJob.abort();
            }

            var that = this;
            var deferred = makeDeferred();
            var grantJob = this.getNotificationGrant();
            grantJob.promise.then(function() {
                return that.registerServiceWorker();
            }).then(function(serviceWorkerRegistration){
                return serviceWorkerRegistration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: that._vapidPublicKey
                });
            }).then(function(subscription){
                var json = subscription.toJSON();
                var keys = json && json.keys ? json.keys : {};
                var contentEncoding = (PushManager.supportedContentEncodings || ['aesgcm']).join(',');
                var data = {
                    endpoint : subscription.endpoint,
                    key: keys && keys.p256dh ? keys.p256dh : null,
                    auth: keys && keys.auth ? keys.auth : null,
                    contentEncoding: contentEncoding
                };

                return Promise.all([
                    that._store.set('endpoint', data.endpoint),
                    that.sendClientSubscription(data).promise
                ]);
            }).then(function(ret_obj) {
                var response = ret_obj[1];
                var data = response.data;
                var endpoint_srl = data && data.endpoint_srl ? parseInt(data.endpoint_srl, 10) : -1;
                if(isNaN(endpoint_srl)) {
                    endpoint_srl = -1;
                }
                that._store.set('endpoint_srl', endpoint_srl).then(function(){
                    if(data.error !== 0 || isNaN(endpoint_srl) || endpoint_srl === -1) {
                        deferred.reject(data);
                    } else {
                        deferred.resolve(data);
                    }
                })['catch'](function(err){
                    deferred.reject(err);
                });
            })['catch'](function(err){
                console.error(err);
                deferred.reject(err);
            });

            return deferred.promise;
        };

        NotiClient.prototype.unsubscribe = function() {
            if(!this.constructor.isSupported()) {
                return Promise.reject(new Error("Subscription is not available"));
            }

            var that = this;
            var endpointFromSubscription = null;
            return always(navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
                return serviceWorkerRegistration.pushManager.getSubscription();
            }).then(function(subscription){
                if(subscription) {
                    endpointFromSubscription = subscription.endpoint;
                    return always(subscription.unsubscribe());
                } else {
                    return Promise.resolve();
                }
            })).then(function() {
                return endpointFromSubscription ? Promise.resolve(endpointFromSubscription) : always(that._store.get('endpoint'));
            }).then(function(endpoint){
                return endpoint ? always(that.sendClientUnsuscription(endpoint).promise) : Promise.resolve();
            }).then(function() {
                return that._store.clearConfig();
            });
        };

        NotiClient.prototype.enablePush = function() {

        };

        NotiClient.prototype.disablePush = function() {

        };

        NotiClient.prototype.sendClientSubscription = function(data) {
            return this.constructor.exec_json('noti.procNotiDeviceInsert', Object.assign({
                endpoint: data.endpoint,
                key: data.key,
                auth: data.auth,
                contentEncoding: data.contentEncoding,
            }, this.getClientAttributes()));
        };

        NotiClient.prototype.sendClientUnsuscription = function(endpoint) {
            return this.constructor.exec_json('noti.procNotiDeviceDelete', {
                endpoint: endpoint
            });
        };

        NotiClient.prototype.removeServiceWorker = function() {
            return this._store.clear().then(function() {
                return navigator.serviceWorker.getRegistrations();
            }).then(function(registrations) {
                return Promise.all(registrations.map(function(registration){
                    return registration.unregister();
                }));
            });
        };

        NotiClient.prototype.getClientAttributes = function() {
            var data = {
                utcTimeZone: "UTC" + -(new Date).getTimezoneOffset() / 60,
                lang: navigator.language
            };
            if (window.Intl) {
                try {
                    data.timeZone = window.Intl.DateTimeFormat().resolvedOptions().timeZone;
                } catch (e) {
                    // console.error(e);
                }
            }
            if('connection' in navigator && navigator.connection.type) {
                data.connectionType = navigator.connection.type;
            }
            if(window.screen) {
                data.screen = {
                    width: window.screen.width,
                    height: window.screen.height,
                    devicePixelRatio: window.devicePixelRatio || null,
                    touchscreen: ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0)
                };
            }

            return data;
        };

        return NotiClient;
    }();


    window.NotiClientContainer = new (function(){
        function NotiClientContainer() {
            this._notiClient = null;
        }

        NotiClientContainer.prototype.getInstance = function() {
            if(!this._notiClient) {
                this._notiClient = new NotiClient;
            }

            return this._notiClient;
        };

        return NotiClientContainer;
    }());

})();
