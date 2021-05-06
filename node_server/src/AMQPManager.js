var AMQP = require('amqplib/callback_api');
var EventDispatcher = require("./EventDispatcher");
var makeDeferred = require("./makeDeferred");
var AbortableJob = require("./AbortableJob");
var retry = require("./retry");

var AMQPManager = function AMQPManager () {


    var AMQPConnection = function() {
        function AMQPConnection(host, port, userID, userPW, vhost, heartbeat) {
            this._host = host;
            this._port = port;
            this._userID = userID;
            this._userPW = userPW;
            this._vhost = vhost;
            this._heartbeat = heartbeat;
            this._listeners = [];
            this._connection = null;
            this._connectionDeferred = makeDeferred();
            this._connectionPromise = this._connectionDeferred.promise;
            this._closed = false;
            this._ready = false;
            this.onClose = new EventDispatcher();
            this.onError = new EventDispatcher();
            this._onCloseHandler = this._onClose.bind(this);
            this._onErrorHandler = this._onError.bind(this);

            this._init();
        }

        AMQPConnection.getURI = function(host, port, userID, userPW, vhost, heartbeat) {
            var uri = "AMQP://" + userID + ":" + userPW + "@" + host + ":" + port + "/" + vhost;
            if(heartbeat) {
                uri += "?heartbeat="+heartbeat;
            }
            
            return uri;
        }

        AMQPConnection.prototype._init = function() {
            try {
                var that = this;
                var url = this.constructor.getURI(this._host, this._port, this._userID, this._userPW, this._vhost, this._heartbeat);
                AMQP.connect(url, function(err, conn){
                    if(that.isClosed()) {
                        conn.close();
                    } else if(err) {
                        that._closed = true;
                        that.onError.dispatch(err);
                        that._connectionDeferred.reject(err);
                    } else {
                        that._ready = true;
                        that._connection = conn;
                        that._connectionDeferred.resolve(conn);
                        that._registerListeners();
                    }
                });
            } catch(e) {
                console.error(e);
                this._closed = true;
                this._onError(e);
                this._connectionDeferred.reject(e);
            }
        };

        AMQPConnection.prototype._onClose = function(evt) {
            console.trace();
            console.log("닫힘!!!", this._closed);
            this._closed = true;
            this.onClose.dispatch(evt);
        };

        AMQPConnection.prototype._onError = function(evt){
            this.onError.dispatch(evt);
        };

        AMQPConnection.prototype._registerListeners = function() {
            if(this._connection) {
                this._connection.on("close", this._onCloseHandler);
                this._connection.on("error", this._onErrorHandler);
            }
        };

        AMQPConnection.prototype.getConnection = function() {
            return this._connection;
        };

        AMQPConnection.prototype.getConnectionPromise = function() {
            if(this.isClosed()) {
                return Promise.reject(new Error("Connection was closed"));
            }
            return this.isReady() ? Promise.resolve(this._connection) : this._connectionPromise;
        };

        AMQPConnection.prototype.isReady = function() {
            return !this.isClosed() && this._ready;
        };

        AMQPConnection.prototype.isClosed = function() {
            return this._closed;
        };

        AMQPConnection.prototype.close = function() {
            if(!this.isClosed()) {
                this._closed = true;
                this._ready = false;
                if(this._connectionDeferred && !this._connectionDeferred.isEnded()) {
                    this._connectionDeferred.reject(new Error("Connecting job has been aborted."));
                } else if(this._connection) {
                    this._connection.close();
                }

            }
        };

        return AMQPConnection;

    }()

    var AMQPChannel = function() {
        // 채널 정보 객체.
        // AMQPConnection정보를 계속 받아서 처리한다.
        function AMQPChannel() {
            this._consumer = [];
            this._publishQueue = [];
            this._amqpConnection = null;
            this._connectionDeferred = null;
            this._channel = null;
            this._assert = null;
            this._assertOptions = null;
            this._prefetch = 1;
            this._closed = false;
        }

        AMQPChannel.prototype._ensureNotClosed = function () {
            if(this.isClosed()) {
                throw new Error("This connection was closed.");
            }
        };

        AMQPChannel.prototype._closeCurrentChannel = function() {
            console.log('closed!!!');
            if(this._amqpConnection && this._amqpConnection.isReady()) {
                if(this._channel) {
                    this._channel.close();
                    this._channel = null;
                }
                this._amqpConnection = null;
            }
        };

        AMQPChannel.prototype.consume = function(queue, handler, options) {
            console.log(" ==> AMQPChannel.consume");
            this._ensureNotClosed();
            this._consumer.push({
                queue: queue,
                handler: handler,
                options: options
            });
            if(this._amqpConnection && this._amqpConnection.isReady()) {
                console.log(" ==> this._channel.consume");
                this._channel.consume(queue, handler, options);
            }
        };

        AMQPChannel.prototype.publish = function(exchange, routingKey, content, options) {
            this._ensureNotClosed();
            if(this._amqpConnection && this._amqpConnection.isReady()) {
                this._channel.publish(exchange, routingKey, content, options);
            } else {
                this._publishQueue.push({
                    exchange: exchange,
                    routingKey: routingKey,
                    content: content,
                    options: options
                });
            }
        };

        AMQPChannel.prototype.sendToQueue = function(queue, content, options) {
            this._ensureNotClosed();
            if(this._amqpConnection && this._amqpConnection.isReady()) {
                this._channel.sendToQueue(queue, content, options);
            }
        };

        AMQPChannel.prototype.assertQueue = function(queue, options) {
            this._ensureNotClosed();
            this._assert = queue;
            this._assertOptions = options;
            if(this._amqpConnection && this._amqpConnection.isReady()) {
                console.log(" ==> this._channel.assertQueue");
                this._channel.assertQueue(this._assert, this._assertOptions);
            }
        };

        AMQPChannel.prototype.prefetch = function(number) {
            this._ensureNotClosed();
            this._prefetch = number;
            if(this._amqpConnection && this._amqpConnection.isReady()) {
                this._channel.prefetch(this._prefetch);
            }
        };

        AMQPChannel.prototype.isClosed = function() {
            return this._closed;
        };

        AMQPChannel.prototype.close = function() {
            this._ensureNotClosed();
            this._closed = true;
            this._closeCurrentChannel();
            if(this._connectionDeferred && !this._connectionDeferred.isEnded()) {
                this._connectionDeferred.reject(AbortableJob.AbortError);
            }
        };

        AMQPChannel.prototype.ack = function(msg) {
            if(this._amqpConnection && this._amqpConnection.isReady()) {
                this._channel.ack(msg);
            }
        };

        AMQPChannel.prototype.nack = function() {
            if(this._amqpConnection && this._amqpConnection.isReady()) {
                this._channel.nack(msg);
            }
        };

        AMQPChannel.prototype._update = function(amqpConnection) {
            if(this._connectionDeferred && !this._connectionDeferred.isEnded()) {
                this._connectionDeferred.reject("Channel changed.");
            }
            var that = this;
            this._amqpConnection = amqpConnection;
            if(this._amqpConnection && !this._amqpConnection.isClosed()) {
                this._connectionDeferred = makeDeferred();
                this._amqpConnection.getConnectionPromise().then(function(){
                    var deferred = makeDeferred();
                    var connection = that._amqpConnection.getConnection();
                    connection.createChannel(function(err, channel){
                        if(err){
                            deferred.reject(err);
                        } else {
                            deferred.resolve(channel);
                        }
                    });

                    return deferred.promise;
                }).then(function(channel) {
                    that._channel = channel;
                    that._fetchJob();
                    that._connectionDeferred.resolve(that);
                })['catch'](function(err) {
                    console.error(err);
                    that._connectionDeferred.reject(err);
                });
            }
        };

        AMQPChannel.prototype._fetchJob = function() {
            var that = this;
            var channel = this._channel;
            if(this._assert) {
                this.assertQueue(this._assert, this._assertOptions);
            }
            this.prefetch(this._prefetch);
            this._consumer.forEach(function(each){
                that._channel.consume(each.queue, each.handler, each.options);
                console.log("==> this._consumer.forEach");
            });
            while(this._publishQueue.length > 0) {
                var shift = this._publishQueue.shift();
                channel.publish(shift.exchange, shift.routingKey, shift.content, shift.options);
                console.log("==> shift this._publishQueue");
            }
        };

        AMQPChannel.prototype.provideConnection = function(amqpConnection) {
            // 이미 연결되어있는 채널이 살아있는 경우 죽이고
            // 파라미터로 받은 connection을 연결한다.
            this._closeCurrentChannel();
            this._update(amqpConnection);
        };

        return AMQPChannel;
    }();

    var AMQPConnectManager = function AMQPConnectManager () {

        // AMQPConnection의 연결을 중재해주는 역할.
        // config는 host, port, userID, userPW, vhost, heartbeat를 포함해야 함.
        function AMQPConnectManager(config) {
            this._config = config;
            this._amqpChannel = [];
            this._amqpConnection = null;
            this._amqpConnectionJob = null;
            this._closed = false;
            this._retryTimerID = null;
            this.onError = new EventDispatcher();
            this.onClose = new EventDispatcher();
            this.onConnectionClose = new EventDispatcher();
            this._onConnectionErrorHandler = this._onConnectionError.bind(this);
            this._onConnectionCloseHandler = this._onConnectionClose.bind(this);

            this._listenHandler = [];
            this._init();
        }

        AMQPConnectManager.prototype._init = function() {
            this._performConnect();
        };

        AMQPConnectManager.prototype._onConnectionError = function(err) {
            this.onError.dispatch(err);
        };

        AMQPConnectManager.prototype._onConnectionClose = function(evt) {
            this._unregisterConnectionListener();
            this._setRetryTimer();
        };

        AMQPConnectManager.prototype._registerConnectionListener = function() {
            this._listenHandler.push(this._amqpConnection.onClose.subscribe(this._onConnectionCloseHandler));
            this._listenHandler.push(this._amqpConnection.onError.subscribe(this._onConnectionErrorHandler));
        };

        AMQPConnectManager.prototype._unregisterConnectionListener = function() {
            console.log("unregister connection listeners");
            while(this._listenHandler.length > 0) {
                var shift = this._listenHandler.shift();
                shift.remove();
            }
        };

        AMQPConnectManager.prototype._setRetryTimer = function() {
            if(!this._closed) {
                var that = this;
                this._retryTimerID = setTimeout(function() {
                    that._performConnect();
                }, this._config.retry * 1000);
            }
        };

        AMQPConnectManager.prototype._clearRetryTimer = function() {
            if(this._retryTimerID !== null) {
                clearTimeout(this._retryTimerID);
                this._retryTimerID = null;
            }
        };

        AMQPConnectManager.prototype._performConnect = function() {
            var that = this;
            this._clearRetryTimer();
            this._connect().then(function(amqpConn){
                if(that._closed) {
                    return;
                }
                that._amqpConnection = amqpConn;
                that._registerConnectionListener();
                that._amqpChannel.forEach(function(each){
                    each.provideConnection(amqpConn);
                });
            })['catch'](function(err){
                console.error(err);
                if(!that._closed) {
                    that.onError.dispatch(err);
                }
            });
        };

        AMQPConnectManager.prototype._connect = function() {
            if(this._amqpConnectionJob && !this._amqpConnectionJob.isDone()) {
                this._amqpConnectionJob.abort();
            }
            var that = this;
            this._amqpConnectionJob = retry(new AbortableJob(function(){
                var host = that._config.host;
                var port = that._config.port;
                var userID = that._config.userID;
                var userPW = that._config.userPW;
                var vhost = that._config.vhost;
                var heartbeat = that._config.heartbeat || void 0;
                var connection = new AMQPConnection(host, port, userID, userPW, vhost, heartbeat);

                var aborted = false;
                var deferred = makeDeferred();
                var abort = function() {
                    if(!aborted) {
                        aborted = true;
                        if(!deferred.isEnded()) {
                            deferred.reject(AbortableJob.AbortError);
                        }
                        connection.close();
                    }
                };
                connection.getConnectionPromise().then(function(){
                    if(!aborted) {
                        deferred.resolve(connection);
                    }
                })['catch'](function(err){
                    console.error(err);
                    if(!aborted) {
                        deferred.reject(err);
                    }
                });

                return {
                    promise: deferred.promise,
                    abort: abort
                };
            }), this._config.retry * 1000);

            return this._amqpConnectionJob.promise;
        };

        AMQPConnectManager.prototype.createChannel = function() {
            var channel = new AMQPChannel();
            this._amqpChannel.push(channel);

            return channel;
        };

        AMQPConnectManager.prototype.isClosed = function() {
            return this._closed;
        };

        AMQPConnectManager.prototype.disconnect = function() {
            if(this._amqpConnectionJob && !this._amqpConnectionJob.isDone()) {
                this._amqpConnectionJob.abort();
                this._amqpConnectionJob = null;
            }
            if(!this._amqpConnection.isClosed()) {
                this._amqpConnection.close();
            }
            this._unregisterConnectionListener();
            this._amqpConnection = null;
        };

        AMQPConnectManager.prototype.close = function() {
            if(!this._closed) {
                this._closed = true;
                this._clearRetryTimer();
                this.disconnect();
            }
        };

        return AMQPConnectManager;
    }();

    function AMQPManager(config) {
        this._config = config;
        this._retryTimerID = null;
        this._destructed = false;
        this._amqpConnectManager = [];
    }

    AMQPManager.prototype.getConnectManager = function() {
        var connectManager = new AMQPConnectManager(this._config);

        return connectManager;
    };

    AMQPManager.prototype.isDestructed = function() {
        return this._destructed;
    };

    AMQPManager.prototype.distruct = function() {
        if(!this._destructed) {
            this._destructed = true;
            clearTimeout(this._retryTimerID);
            this._retryTimerID = null;
        }
    };

    return AMQPManager;

}();

module.exports = AMQPManager;
