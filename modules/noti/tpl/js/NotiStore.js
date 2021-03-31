self.NotiStoreContainer = (function() {
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

    var NotiDB = function NotiDB () {
        function NotiDB(config) {
            if(config.dbVersion === void 0) {
                config.dbVersion = 1;
            }
            this._dbName = config.dbName;
            this._dbVersion = config.dbVersion;
            this._store = config.store;
            this._db = null;
            this._onUpgradeEnded = this.onUpgradeEnded.bind(this);

        }

        NotiDB.prototype.getDBName = function() {
            return this._dbName;
        };

        NotiDB.prototype.getStoreName = function() {
            return this._store.name;
        };

        NotiDB.prototype.getDBVersion = function() {
            return this._dbVersion;
        };

        NotiDB.prototype.open = function() {
            var that = this;
            if(this._db) {
                return Promise.resolve(this._db);
            }

            var deferred = makeDeferred();
            var open = indexedDB.open(this.getDBName(), this._dbVersion);
            open.onerror = deferred.reject;
            open.onsuccess = function() {
                var result = open.result;
                that._db = result;
                deferred.resolve(result);
            };
            open.onupgradeneeded = this._onUpgradeEnded;

            return deferred.promise;
        };

        NotiDB.prototype.onUpgradeEnded = function(DBResult) {
            var that = this;
            DBResult = DBResult.target.result;
            if(this._store && this._store.length > 0) {
                this._store.forEach(function(eachStoreInfo){
                    if(DBResult.objectStoreNames.contains(eachStoreInfo.name)) {
                        DBResult.deleteObjectStore(eachStoreInfo.name);
                    }
                    var store = DBResult.createObjectStore(eachStoreInfo.name, eachStoreInfo.options);
                    if(eachStoreInfo.indexes && eachStoreInfo.indexes.length > 0) {
                        eachStoreInfo.indexes.forEach(function(eachIndexInfo){
                            store.createIndex(eachIndexInfo.name, eachIndexInfo.keyPath, eachIndexInfo.options);
                        });
                    }
                });
            }
        };

        NotiDB.prototype.put = function(store, item, key) {
            var that = this;
            return this.open().then(function(db) {
                return new Promise(function(resolve, reject) {
                    var objectStore = db.transaction(store, "readwrite").objectStore(store);
                    var result = key !== void 0 ? objectStore.put(item, key) : objectStore.put(item);
                    result.onsuccess = resolve;
                    result.onerror = reject;
                })
            });
        };

        NotiDB.prototype.delete = function(store, key) {
            var that = this;
            return this.open().then(function(db) {
                return new Promise(function(resolve, reject) {
                    var result = db.transaction(store, "readwrite").objectStore(store).delete(key);
                    result.onsuccess = resolve;
                    result.onerror = reject;
                });
            });
        };

        NotiDB.prototype.get = function(store, key) {
            var that = this;
            return this.open().then(function(db) {
                return new Promise(function(resolve, reject) {
                    var DBResult = db.transaction(store).objectStore(store).get(key);
                    DBResult.onsuccess = function() {
                        resolve(DBResult.result);
                    };
                    DBResult.onerror = function() {
                        reject('Unable to get key "' + key + '" from object store.');
                    };
                })
            }).catch (function() {
                return Promise.reject("Unable to open IndexedDB.")
            });
        };

        NotiDB.prototype.getAll = function(store, query, count) {
            var that = this;
            return this.open().then(function(db) {
                return new Promise(function(resolve, reject){
                    var DBResult = db.transaction(store).objectStore(store).getAll(query,  count);
                    DBResult.onsuccess = function(evt) {
                        resolve(evt.target.result);
                    };
                    DBResult.onerror = function() {
                        reject('Unable to get key-value pairs from '+ store);
                    };
                });
            });
        };

        NotiDB.prototype.index = function() {

        };

        NotiDB.prototype.getList = function(store, key, direction, offset, limit, options) {
            if(offset === void 0) {
                offset = 0;
            }
            if(limit === void 0) {
                limit = Infinity;
            }
            if(options === void 0) {
                options = {
                    action: "select",
                    callback: void 0
                };
            }

            var that = this;
            return this.open().then(function(db){
                var deferred = makeDeferred();
                var objectStore = db.transaction(store, "readwrite").objectStore(store);
                var cursorRequest = objectStore.openCursor(key, direction);
                var cursorResult = null;
                var list = [];
                var count = 0;
                var currentOffset = 0;
                var onSuccess = function(evt) {
                    var cursor = cursorRequest.result;
                    if(cursor && cursor.value && currentOffset >= offset) {
                        var callbackResult = options.callback ? options.callback(cursor.value) : true;
                        switch(options.action) {
                            case "select":
                                list.push(cursor.value);
                                break;

                            case "delete":
                                if(callbackResult) {
                                    var request = cursor.delete();
                                    request.onsuccess = function(evt) {};
                                    request.onerror = function(err) {};
                                    break;
                                }

                            case "update":
                                if(callbackResult) {
                                    var request = cursor.update(callbackResult);
                                    request.onsuccess = function(evt) {};
                                    request.onerror = function(err) {};
                                    break;
                                }
                        }
                    }
                    if(!cursor || count >= limit) {
                        deferred.resolve(options.action === "select" ? list : void 0);
                        return;
                    }

                    if(currentOffset === 0 && offset > 0) {
                        cursor.advance(offset);
                        currentOffset = offset;
                    } else {
                        currentOffset++;
                        count++;
                        cursor.continue();
                    }
                };
                var onError = function(err) {
                    deferred.reject(err);
                };
                cursorRequest.onsuccess = onSuccess;
                cursorRequest.onerror = onError;

                return deferred.promise;
            });
        };

        NotiDB.prototype.clear = function(store) {
            var that = this;
            return this.open().then(function(db) {
                return new Promise(function(resolve, reject) {
                    var result = db.transaction(store, "readwrite").objectStore(store).clear();
                    result.onsuccess = resolve;
                    result.onerror = reject;
                });
            });
        };

        NotiDB.prototype.remove = function() {
            var that = this;
            return new Promise(function(resolve, reject) {
                indexedDB.deleteDatabase(that.getDBName());
                that._db = null;
                resolve();
            });
        };

        return NotiDB;

    }();

    var NotiStore = function NotiStore() {
        var KEYVAL_STORE_NAME = 'keyvalstore';
        var PUSHLOG_NAME = 'pushlog';

        var INDEXEDDB_NAME = "swnotistore";
        var INDEXEDDB_VERSION = 2;
        var INDEXEDDB_CONFIG = {
            dbName: INDEXEDDB_NAME,
            dbVersion: INDEXEDDB_VERSION,
            store: [
                {
                    name: KEYVAL_STORE_NAME,
                    options: {
                        keyPath: 'key'
                    }
                },
                {
                    name: PUSHLOG_NAME,
                    options: {
                        keyPath: 'pushSrl',
                    },
                    indexes: [
                        {
                            name: 'timestamp',
                            keyPath: 'timestamp',
                            options: {}
                        }
                    ]
                }
            ]
        };

        function NotiStore(config) {
            if(config === void 0) {
                config = {
                    pushLogMaxCount: 100
                };
            }

            this._pushLogMaxCount = config.pushLogMaxCount;
            this._db = new NotiDB(INDEXEDDB_CONFIG);
        }

        NotiStore.prototype.get = function(key) {
            return this._db.get(KEYVAL_STORE_NAME, key).then(function(result){
                return result ? result.value : null;
            });
        };

        NotiStore.prototype.set = function(key, value) {
            var obj = {
                key: key,
                value: value
            };
            return this._db.put(KEYVAL_STORE_NAME, obj);
        };

        NotiStore.prototype.getValues = function() {
            return this._db.getAll(KEYVAL_STORE_NAME).then(function(result){
                return result.reduce(function(val, current){
                    val[current.key] = current.value;
                    return val;
                }, {});
            });
        };

        NotiStore.prototype.setValues = function(obj) {
            if(!obj) {
                obj = {};
            }
            var that = this;
            return this._db.clear(KEYVAL_STORE_NAME).then(function() {
                return that.updateValues(obj);
            });
        };

        NotiStore.prototype.updateValues = function(obj) {
            if(!obj) {
                return Promise.resolve();
            }

            var that = this;
            return Promise.all(Object.keys(obj).map(function(key) {
                return that.set(key, obj[key]);
            }));
        };

        NotiStore.prototype.delete = function(key) {
            console.log("delete", key);
            return this._db.delete(KEYVAL_STORE_NAME, key);
        };

        NotiStore.prototype.clear = function() {
            return Promise.all([this.clearConfig(), this.clearPushLog()]);
        };

        NotiStore.prototype.clearConfig = function() {
            return this._db.clear(KEYVAL_STORE_NAME);
        };

        NotiStore.prototype.clearPushLog = function() {
            return this._db.clear(PUSHLOG_NAME);
        };

        NotiStore.prototype.getPushLog = function(pushSrl) {
            return this._db.get(PUSHLOG_NAME, pushSrl);
        };

        NotiStore.prototype.insertPushLog = function(payload) {
            if(!payload || !payload.push_srl) {
                return Promise.resolve(void 0);
            }

            var data = {
                pushSrl: payload.push_srl,
                timestamp: Date.now(),
                payload: payload,
                clicked: false,
                clickTimestamp: null
            };

            return this._db.put(PUSHLOG_NAME, data);
        };

        NotiStore.prototype.deletePushLog = function(pushSrl) {
            return this._db.delete(PUSHLOG_NAME, pushSrl);
        };

        NotiStore.prototype.deleteOldPushLog = function() {
            return this._db.getList(PUSHLOG_NAME, null, 'prev', 100, void 0, {
                action: 'delete'
            });
        };

        NotiStore.prototype.onClickPushNotification = function(pushSrl) {
            var that = this;
            return this.getPushLog(pushSrl).then(function(result){
                if(!result) {
                    return Promise.resolve();
                }

                result.clicked = true;
                result.clickTimestamp = Date.now();
                return that._db.put(PUSHLOG_NAME, result);
            });
        };

        return NotiStore;
    }();

    var notiStore = null;

    return {
        getInstance: function() {
            if(!notiStore) {
                notiStore = new NotiStore();
            }

            return notiStore;
        }
    };
})();
