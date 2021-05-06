
var NotiTriggerManager = require("NotiTriggerManager");
var NotiPushManager = require("NotiPushManager");
var AMQP = require('amqplib/callback_api');

var Noti = function Noti() {

    function Noti(config) {
        this._config = config;
        this._amqp = null;
        this._notiPushManager = null;
        this._notiTriggerManager = null;
        this._init();
    }

    Noti.prototype._init = function() {
        this._amqp = amqp.connect('amqp://mq_test:mq_test@127.0.0.1/mq_test', function(error0, connection) {

        });
        this._notiPushManager = new NotiPushManager();
        this._notiTriggerManager = new NotiTriggerManager();

    };

    Noti.prototype.onError = function(err) {

    };

    Noti.prototype.destruct = function() {

    };


    return Noti;
}();


module.export = Noti;