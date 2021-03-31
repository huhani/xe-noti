var BaseTrigger = require("../BaseTrigger");
var webPush = require('web-push');
var makeDeferred = require("../../makeDeferred");
var always = require("../../always");
var helper = require("../../helper");
var __extend = require("../../extend");
var pushNotification = function() {

    // fcm, vapid서버에 전송해주는 역할
    //
    function pushNotification() {
        var that = BaseTrigger.apply(this, arguments) || this;
        that._mqChannel = that._args.mqChannel;
    }

    __extend(pushNotification, BaseTrigger);

    pushNotification.prototype._run = function() {
        var that = this;
        var args = this._args;
        var notiController = this.getController('noti');
        var argsData = args.data;
        var data = argsData.data;
        var payload = data.payload;
        var endpoint = argsData.endpoint;
        this.getNextSequence().then(function(sequence){
            payload.push_srl = sequence;
            return always(notiController.send(endpoint.endpoint, endpoint.key, endpoint.auth, endpoint.supportedEncoding, payload)).then(function(response){
                var promiseList = [
                    notiController.insertPushLog(sequence, endpoint.endpoint_srl, data, payload, response),
                    notiController.endpointSendCountUp(endpoint.endpoint_srl)
                ];
                if(response instanceof webPush.WebPushError && (response.statusCode === 404 || response.statusCode === 410)) {
                    promiseList.push(notiController.removeEndpoint(endpoint.endpoint));
                } else if(response instanceof Error) {
                    console.error(response);
                }

                return always(Promise.all(promiseList));
            });

        }).then(function() {
            that.resolve();
        })['catch'](function(err) {
            console.error(err);
            that.reject(err);
        });

    };

    return pushNotification;

}();

module.exports = pushNotification;
