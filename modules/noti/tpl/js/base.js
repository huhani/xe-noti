/*!
 * @overview es6-promise - a tiny implementation of Promises/A+.
 * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
 * @license   Licensed under MIT license
 *            See https://raw.githubusercontent.com/stefanpenner/es6-promise/master/LICENSE
 * @version   v4.2.8+1e68dce6
 */
!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e():"function"==typeof define&&define.amd?define(e):t.ES6Promise=e()}(this,function(){"use strict";function t(t){var e=typeof t;return null!==t&&("object"===e||"function"===e)}function e(t){return"function"==typeof t}function n(t){W=t}function r(t){z=t}function o(){return function(){return process.nextTick(a)}}function i(){return"undefined"!=typeof U?function(){U(a)}:c()}function s(){var t=0,e=new H(a),n=document.createTextNode("");return e.observe(n,{characterData:!0}),function(){n.data=t=++t%2}}function u(){var t=new MessageChannel;return t.port1.onmessage=a,function(){return t.port2.postMessage(0)}}function c(){var t=setTimeout;return function(){return t(a,1)}}function a(){for(var t=0;t<N;t+=2){var e=Q[t],n=Q[t+1];e(n),Q[t]=void 0,Q[t+1]=void 0}N=0}function f(){try{var t=Function("return this")().require("vertx");return U=t.runOnLoop||t.runOnContext,i()}catch(e){return c()}}function l(t,e){var n=this,r=new this.constructor(p);void 0===r[V]&&x(r);var o=n._state;if(o){var i=arguments[o-1];z(function(){return T(o,r,i,n._result)})}else j(n,r,t,e);return r}function h(t){var e=this;if(t&&"object"==typeof t&&t.constructor===e)return t;var n=new e(p);return w(n,t),n}function p(){}function v(){return new TypeError("You cannot resolve a promise with itself")}function d(){return new TypeError("A promises callback cannot return that same promise.")}function _(t,e,n,r){try{t.call(e,n,r)}catch(o){return o}}function y(t,e,n){z(function(t){var r=!1,o=_(n,e,function(n){r||(r=!0,e!==n?w(t,n):A(t,n))},function(e){r||(r=!0,S(t,e))},"Settle: "+(t._label||" unknown promise"));!r&&o&&(r=!0,S(t,o))},t)}function m(t,e){e._state===Z?A(t,e._result):e._state===$?S(t,e._result):j(e,void 0,function(e){return w(t,e)},function(e){return S(t,e)})}function b(t,n,r){n.constructor===t.constructor&&r===l&&n.constructor.resolve===h?m(t,n):void 0===r?A(t,n):e(r)?y(t,n,r):A(t,n)}function w(e,n){if(e===n)S(e,v());else if(t(n)){var r=void 0;try{r=n.then}catch(o){return void S(e,o)}b(e,n,r)}else A(e,n)}function g(t){t._onerror&&t._onerror(t._result),E(t)}function A(t,e){t._state===X&&(t._result=e,t._state=Z,0!==t._subscribers.length&&z(E,t))}function S(t,e){t._state===X&&(t._state=$,t._result=e,z(g,t))}function j(t,e,n,r){var o=t._subscribers,i=o.length;t._onerror=null,o[i]=e,o[i+Z]=n,o[i+$]=r,0===i&&t._state&&z(E,t)}function E(t){var e=t._subscribers,n=t._state;if(0!==e.length){for(var r=void 0,o=void 0,i=t._result,s=0;s<e.length;s+=3)r=e[s],o=e[s+n],r?T(n,r,o,i):o(i);t._subscribers.length=0}}function T(t,n,r,o){var i=e(r),s=void 0,u=void 0,c=!0;if(i){try{s=r(o)}catch(a){c=!1,u=a}if(n===s)return void S(n,d())}else s=o;n._state!==X||(i&&c?w(n,s):c===!1?S(n,u):t===Z?A(n,s):t===$&&S(n,s))}function M(t,e){try{e(function(e){w(t,e)},function(e){S(t,e)})}catch(n){S(t,n)}}function P(){return tt++}function x(t){t[V]=tt++,t._state=void 0,t._result=void 0,t._subscribers=[]}function C(){return new Error("Array Methods must be provided an Array")}function O(t){return new et(this,t).promise}function k(t){var e=this;return new e(L(t)?function(n,r){for(var o=t.length,i=0;i<o;i++)e.resolve(t[i]).then(n,r)}:function(t,e){return e(new TypeError("You must pass an array to race."))})}function F(t){var e=this,n=new e(p);return S(n,t),n}function Y(){throw new TypeError("You must pass a resolver function as the first argument to the promise constructor")}function q(){throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.")}function D(){var t=void 0;if("undefined"!=typeof global)t=global;else if("undefined"!=typeof self)t=self;else try{t=Function("return this")()}catch(e){throw new Error("polyfill failed because global object is unavailable in this environment")}var n=t.Promise;if(n){var r=null;try{r=Object.prototype.toString.call(n.resolve())}catch(e){}if("[object Promise]"===r&&!n.cast)return}t.Promise=nt}var K=void 0;K=Array.isArray?Array.isArray:function(t){return"[object Array]"===Object.prototype.toString.call(t)};var L=K,N=0,U=void 0,W=void 0,z=function(t,e){Q[N]=t,Q[N+1]=e,N+=2,2===N&&(W?W(a):R())},B="undefined"!=typeof window?window:void 0,G=B||{},H=G.MutationObserver||G.WebKitMutationObserver,I="undefined"==typeof self&&"undefined"!=typeof process&&"[object process]"==={}.toString.call(process),J="undefined"!=typeof Uint8ClampedArray&&"undefined"!=typeof importScripts&&"undefined"!=typeof MessageChannel,Q=new Array(1e3),R=void 0;R=I?o():H?s():J?u():void 0===B&&"function"==typeof require?f():c();var V=Math.random().toString(36).substring(2),X=void 0,Z=1,$=2,tt=0,et=function(){function t(t,e){this._instanceConstructor=t,this.promise=new t(p),this.promise[V]||x(this.promise),L(e)?(this.length=e.length,this._remaining=e.length,this._result=new Array(this.length),0===this.length?A(this.promise,this._result):(this.length=this.length||0,this._enumerate(e),0===this._remaining&&A(this.promise,this._result))):S(this.promise,C())}return t.prototype._enumerate=function(t){for(var e=0;this._state===X&&e<t.length;e++)this._eachEntry(t[e],e)},t.prototype._eachEntry=function(t,e){var n=this._instanceConstructor,r=n.resolve;if(r===h){var o=void 0,i=void 0,s=!1;try{o=t.then}catch(u){s=!0,i=u}if(o===l&&t._state!==X)this._settledAt(t._state,e,t._result);else if("function"!=typeof o)this._remaining--,this._result[e]=t;else if(n===nt){var c=new n(p);s?S(c,i):b(c,t,o),this._willSettleAt(c,e)}else this._willSettleAt(new n(function(e){return e(t)}),e)}else this._willSettleAt(r(t),e)},t.prototype._settledAt=function(t,e,n){var r=this.promise;r._state===X&&(this._remaining--,t===$?S(r,n):this._result[e]=n),0===this._remaining&&A(r,this._result)},t.prototype._willSettleAt=function(t,e){var n=this;j(t,void 0,function(t){return n._settledAt(Z,e,t)},function(t){return n._settledAt($,e,t)})},t}(),nt=function(){function t(e){this[V]=P(),this._result=this._state=void 0,this._subscribers=[],p!==e&&("function"!=typeof e&&Y(),this instanceof t?M(this,e):q())}return t.prototype["catch"]=function(t){return this.then(null,t)},t.prototype["finally"]=function(t){var n=this,r=n.constructor;return e(t)?n.then(function(e){return r.resolve(t()).then(function(){return e})},function(e){return r.resolve(t()).then(function(){throw e})}):n.then(t,t)},t}();return nt.prototype.then=l,nt.all=O,nt.race=k,nt.resolve=h,nt.reject=F,nt._setScheduler=n,nt._setAsap=r,nt._asap=z,nt.polyfill=D,nt.Promise=nt,nt.polyfill(),nt});

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

        NotiClient.eventSender = function eventSender(eventName, push_srl, data) {
            var notiStore = window.NotiStoreContainer.getInstance();
            notiStore.getValues().then(function(result){
                var endpoint = result.endpoint;
                var endpoint_srl = result.endpoint_srl;
                if(!endpoint || !endpoint_srl) {
                    return;
                }

                var obj = {
                    eventName: eventName,
                    endpoint: endpoint,
                    endpoint_srl: endpoint_srl,
                    push_srl: push_srl
                };
                Object.keys(data).forEach(function(key){
                    obj[key] = data[key];
                });

                if('sendBeacon' in navigator) {
                    var formData = Object.keys(obj).reduce(function(val, current){
                        val.append(current, obj[current]);
                        return val;
                    }, new FormData);
                    navigator.sendBeacon(request_uri + 'index.php?act=procNotiServiceWorkerEvent', formData);
                    return;
                }

                exec_json("noti.procNotiServiceWorkerEvent", obj);
            });
        };

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
                if('getCSRFToken' in window) {
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
                    that._config = data.config;
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

        NotiClient.prototype.setPushClick = function(pushSrl) {
            var evtObj = {
                timestamp: Date.now()
            };
            var that = this;
            return this._store.getPushLog(pushSrl).then(function(result) {
                if(result && !result.clicked) {
                    that.constructor.eventSender('notificationclick', pushSrl, evtObj);
                    return that._store.onClickPushNotification(pushSrl);
                }
            });
        };

        NotiClient.prototype.updateConfig = function() {
            var that = this;
            return this.getPromise().then(function(){
                return that._store.set('config', that._config);
            });
        };

        NotiClient.prototype.getPromise = function() {
            if(this._initialized) {
                return this.hasServerKey() ? Promise.resolve() : Promise.reject(ServerKeyNotFoundError);
            }

            return this._initializePromise;
        };

        NotiClient.prototype.getConfig = function() {
            var that = this;
            return this.getPromise().then(function(){
                return that._config;
            });
        };

        NotiClient.prototype.hasServerKey = function() {
            return this._serverID && (!!this._vapidPublicKey || !!this._vapidPublicKey.byteLength);
        };

        NotiClient.prototype.showNotification = function(payload) {
            var that = this;
            var registerServiceWorker = null;
            return this.registerServiceWorker().then(function(sw){
                registerServiceWorker = sw;
                return that.getNotificationGrant().promise;
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
            if(this._notificationGrantRetryJob) {
                this._notificationGrantRetryJob.abort();
            }
            if(!('Notification' in window)) {
                deferred.reject(new Error('Browser does not supported notification.'));
            } else {
                var permission = Notification.permission;
                if (permission === "granted") {
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
                    that._store.set('serverID', that._serverID),
                    that._store.set('config', that._config)
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
            return always(this.getEndpoint().then(function(subscription){
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
                return that._store.removeSubscribeConfig();
            });
        };

        NotiClient.prototype.enablePush = function() {
            return this._store.set('enablePush', true);
        };

        NotiClient.prototype.disablePush = function() {
            return this._store.set('enablePush', false);
        };

        NotiClient.prototype.isPushEnabled = function() {
            return this._store.get('enablePush').then(function(result) {
                return Promise.resolve(result !== false);
            });
        };

        NotiClient.prototype.isSubscribed = function(withoutServerCheck) {
            if(!this.constructor.isSupported()) {
                return Promise.resolve(false);
            }
            var that = this;
            return Promise.all([this.getEndpoint(), this._store.get('endpoint_srl')]).then(function(resolve){
                var serviceWorkerRegistration = resolve[0];
                var endpoint_srl = resolve[1];
                if(serviceWorkerRegistration && endpoint_srl) {
                    if(withoutServerCheck) {
                        return Promise.resolve(true);
                    }

                    var toJSON = serviceWorkerRegistration.toJSON();
                    return that.constructor.exec_json("noti.getNotiCheckValidEndpoint", {
                        endpoint: toJSON.endpoint,
                        endpoint_srl: endpoint_srl
                    }).promise.then(function(result) {
                        return Promise.resolve(result.data && result.data.isValid);
                    });
                }

                return Promise.resolve(false);
            })['catch'](function(err){
                console.error(err);
                return Promise.resolve(false);
            }).then(function(result){
                return Promise.resolve(result);
            });
        };

        NotiClient.prototype.getEndpoint = function() {
            if(!('serviceWorker' in navigator && 'PushManager' in window)) {
                return Promise.resolve(null);
            }

            return navigator.serviceWorker.getRegistrations().then(function(serviceWorkerRegistration) {
                return serviceWorkerRegistration.length > 0 ?
                    serviceWorkerRegistration[0].pushManager.getSubscription() :
                    Promise.resolve(null);
            });
        };

        NotiClient.prototype.sendClientSubscription = function(data) {
            return this.constructor.exec_json('noti.procNotiDeviceInsert', {
                endpoint: data.endpoint,
                key: data.key,
                auth: data.auth,
                contentEncoding: data.contentEncoding,
                clientDetails: window.btoa(JSON.stringify(this.getClientAttributes()))
            });
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
            if('connection' in navigator) {
                data.connection = ['type', 'effectiveType', 'downlinkMax', 'downlink', 'rtt'].reduce(function(connection, eachAttr) {
                    if(eachAttr in navigator.connection) {
                        connection[eachAttr] = navigator.connection[eachAttr];
                    }
                    return connection;
                }, {});
            }
            if(window.screen) {
                data.screen = {
                    width: window.screen.width,
                    height: window.screen.height,
                    availWidth: window.screen.availWidth,
                    availHeight: window.screen.availHeight,
                    devicePixelRatio: window.devicePixelRatio || null,
                    touchscreen: ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0),
                    colorDepth: window.screen.colorDepth,
                    pixelDepth: window.screen.pixelDepth,
                    supportedColorGamut: {
                        srgb: 'matchMedia' in window ? window.matchMedia('(color-gamut: srgb)').matches : false,
                        p3: 'matchMedia' in window ? window.matchMedia('(color-gamut: p3)').matches : false,
                        rec2020: 'matchMedia' in window ? window.matchMedia('(color-gamut: rec2020)').matches : false,
                    }
                };
            }
            if(navigator.deviceMemory) {
                data.deviceMemory = navigator.deviceMemory;
            }

            return data;
        };

        NotiClient.prototype.pushTest = function() {
            var that = this;
            return this._store.getValues().then(function(result) {
                if(result && result.endpoint && result.endpoint_srl) {
                    return that.constructor.exec_json('noti.procNotiPushTest', {
                        endpoint: result.endpoint,
                        endpoint_srl: result.endpoint_srl
                    }).promise;
                }
            });
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
