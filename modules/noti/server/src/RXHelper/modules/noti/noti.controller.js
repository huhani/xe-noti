var BaseClass = require("../../BaseClass");
var __extend = require("../../../extend");
var always = require("../../../always");
var helper = require("../../../helper");
var makeDeferred = require("../../../makeDeferred");
var WebPush = require('web-push');

var NotiController = function() {
    function NotiController() {
        BaseClass.apply(this, arguments);
    }

    __extend(NotiController, BaseClass);

    NotiController.prototype.endpointSendCountUp = function(endpoint_srl) {
        var query = "update ?? set send_count = send_count + 1, last_send = ? where endpoint_srl = ?";
        return this.query(query, [
            this.getDBPrefix() + "noti_endpoint",
            helper.getDate(),
            endpoint_srl
        ])['catch'](function(err){
            console.error(err);
        });
    };

    NotiController.prototype.send = function(endpoint, key, auth, contentEncoding, payload) {
        var config = this.getConfig();
        var vapid = config.VAPID;
        var fcm = config.FCM;
        var ttl = payload && payload.ttl ? payload.ttl : 60 * 60 * 24 * 3;
        var pushSubscription = {
            endpoint: endpoint,
            keys: {
                p256dh: key,
                auth: auth
            }
        };
        var options = {
            gcmAPIKey: fcm.serverKey,
            vapidDetails: {
                subject: vapid.subject,
                publicKey: vapid.publicKey,
                privateKey: vapid.privateKey
            },
            timeout: 2,
            TTL: payload.ttl,
            headers: {
                Urgency: payload.urgency
            },
            contentEncoding: contentEncoding.length > 0 ? contentEncoding[0] : 'aesgcm'
        };

        var removeKeys = ['urgency', 'topic'];
        var sendPayload = {};
        Object.keys(payload).forEach(function(eachKey){
            if(removeKeys.indexOf(eachKey) === -1) {
                sendPayload[eachKey] = payload[eachKey];
            }
        });

        sendPayload.sendTimestamp = Date.now();
        return WebPush.sendNotification(
            pushSubscription,
            JSON.stringify(sendPayload),
            options
        );
    };

    NotiController.prototype.insertPushLog = function(push_srl, endpoint_srl, data, payload, response) {
        if(!push_srl || !endpoint_srl) {
            return Promise.reject(new Error("push_srl and endpoint must be exists."));
        }
        if(!payload.push_srl) {
            payload.push_srl = push_srl;
        }
        var type = data.type;
        var module_srl = data.module_srl;
        var notify = data.notify;
        var sender_member_srl = data.sender_member_srl;
        var sender_nick_name = data.sender_nick_name;
        var sender_profile_image = data.sender_profile_image;
        var receiver_member_srl = data.receiver_member_srl;
        var receiver_nick_name = data.receiver_nick_name;
        var target_url = payload.launchUrl || data.target_url;
        var content_summary = payload.body || data.content_summary;
        var document_srl = data.document_srl;
        var target_srl = data.target_srl;
        var push_payload = JSON.stringify(payload);
        var push_response = null;
        var status_code = 0;
        if(response) {
            if(response instanceof Error) {
                var errorContent = {
                    error: true,
                    name: response.name,
                    message: response.message,
                    stack: response.stack ? response.stack : null
                };
                ['endpoint', 'statusCode'].forEach(function(each){
                    if(response.hasOwnProperty(each)) {
                        errorContent[each] = response[each];
                    }
                });
                push_response = JSON.stringify(errorContent);
            } else {
                push_response = JSON.stringify(response);
            }
            if(response.hasOwnProperty('statusCode')) {
                status_code = response.statusCode;
            }
        }
        var regdate = helper.getDate();
        var pushLogQuery = "insert into ?? (push_srl, endpoint_srl, member_srl, nick_name, `type`, notify, sender_member_srl, sender_nick_name, sender_profile_image, content_summary, document_srl, target_srl, target_url, push_payload, push_response, status_code, regdate) " +
            "values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        var pushLogArgs = [ this.getDBPrefix() + "noti_push", push_srl, endpoint_srl, receiver_member_srl, receiver_nick_name,
            type, notify, sender_member_srl, sender_nick_name, sender_profile_image, content_summary, document_srl, target_srl, target_url, push_payload, push_response, status_code, regdate
        ];

        return this.query(pushLogQuery, pushLogArgs)['catch'](function(err){
            console.error(err);
        });
    };

    NotiController.prototype.removeEndpointByEndpointSrl = function(endpoint_srl) {
        if(!endpoint_srl) {
            return Promise.reject();
        }

        var query = "delete from ?? where endpoint_srl = ?";
        return this.query(query, [this.getDBPrefix() + "noti_endpoint", endpoint_srl]);
    };

    NotiController.prototype.removeEndpoint = function(endpoint) {
        if(!endpoint) {
            return Promise.reject();
        }

        var query = "delete from ?? where endpoint_crc32 = ? and endpoint = ?";
        return this.query(query, [this.getDBPrefix() + "noti_endpoint", this.getModel('noti').getEndpointCRC32(endpoint), endpoint]);
    };

    return NotiController;

}();

module.exports = NotiController;
