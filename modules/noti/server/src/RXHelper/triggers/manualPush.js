var BaseTrigger = require("../BaseTrigger");
var webPush = require('web-push');
var makeDeferred = require("../../makeDeferred");
var always = require("../../always");
var helper = require("../../helper");
var __extend = require("../../extend");
var manualPush = function() {
    
    function manualPush() {
        var that = BaseTrigger.apply(this, arguments) || this;
        that._mqChannel = that._args.mqChannel;
    }

    __extend(manualPush, BaseTrigger);

    manualPush.prototype._run = function() {
        var that = this;
        var args = this._args;
        var argsData = args.data;
        var type = argsData.type;
        var promise = type === 'public' ? this.sendPublic() :
            type === 'private' ? this.sendPrivate() :
                Promise.resolve();

        promise.then(function(result){
            that.resolve(result);
        })['catch'](function(err){
            that.reject(err);
        })

    };

    manualPush.prototype.sendPublic = async function() {
        var args = this._args;
        var argsData = args.data;
        var payload = argsData.payload;
        var memberIterator = this.getEndpointAll();
        for await(var each of memberIterator) {
            for(var eachEndpoint of each) {
                try {
                    for(var count = 0; count< argsData.sendCount; count++) {
                        this.insertPushMessageQueue(eachEndpoint);
                    }
                } catch(e) {
                    console.error(e);
                }
            }
        }
    };

    manualPush.prototype.sendPrivate = async function() {
        var args = this._args;
        var argsData = args.data;
        var payload = argsData.payload;
        var targetMemberSrls = argsData.targetMemberSrls;
        var targetEndpointSrls = argsData.targetEndpointSrls;


        for(var eachMemberSrl of targetMemberSrls) {
            var memberEndpointList = await this.getEndpointByMemberSrl(eachMemberSrl);
            for(var eachEndpoint of memberEndpointList) {
                try {
                    for(var count = 0; count< argsData.sendCount; count++) {
                        this.insertPushMessageQueue(eachEndpoint);
                    }
                } catch(e) {
                    console.error(e);
                }
            }
        }
        for(var eachEndpointSrl of targetEndpointSrls) {
            var eachEndpoint = await this.getEndpoint(eachEndpointSrl);
            if(eachEndpoint) {
                try {
                    for(var count = 0; count< argsData.sendCount; count++) {
                        this.insertPushMessageQueue(eachEndpoint);
                    }
                } catch(e) {
                    console.error(e);
                }
            }
        }
    };

    manualPush.prototype.insertPushMessageQueue = function(endpointData) {
        var mqChannel = this._mqChannel;
        var args = this._args;
        var argsData = args.data;
        var loggedInfo = args.logged_info ? args.logged_info : null;
        var payload = argsData.payload;
        var senderMemberSrl = loggedInfo ? loggedInfo.member_srl : 0;
        var senderNickName = loggedInfo ? loggedInfo.nick_name : 'unknown';
        var pushData = {
            data: {
                type: 'manual',
                module_srl: 0,
                notify: null,
                sender_member_srl: senderMemberSrl,
                sender_nick_name: senderNickName,
                sender_profile_image: null,
                receiver_member_srl: endpointData.member_srl,
                receiver_nick_name: endpointData.nick_name,
                target_url: payload.launchUrl,
                content_summary: payload.body,
                document_srl: 0,
                target_srl: argsData.manualPushSrl,
                payload: payload
            },
            endpoint: endpointData
        };

        return mqChannel.sendToQueue('noti-queue-push', new Buffer(JSON.stringify(pushData)), {
            contentType: 'text/plain',
            type: 'halftime.push.message'
        });
    };

    manualPush.prototype.getEndpointByMemberSrl = async function(memberSrl) {
        var query = `SELECT 
    noti_endpoint.member_srl AS member_srl,
    \`member\`.nick_name AS nick_name,
    noti_endpoint.endpoint_srl AS endpoint_srl,
    noti_endpoint.endpoint AS endpoint,
    noti_endpoint.\`key\` AS \`key\`,
    noti_endpoint.auth AS auth,
    noti_endpoint.supported_encoding AS supportedEncoding
FROM
   ?? AS noti_endpoint
        JOIN
    ?? AS \`member\` ON noti_endpoint.member_srl = \`member\`.member_srl
WHERE
    noti_endpoint.member_srl = ?`;
        var queryArgs = [this.getDBPrefix() + "noti_endpoint", this.getDBPrefix() + "member", memberSrl];
        var output = await this.query(query, queryArgs);
        output.forEach(function(each){
            each.supportedEncoding = each.supportedEncoding ? each.supportedEncoding.split(',') : each.supportedEncoding
        });

        return output;
    };

    manualPush.prototype.getEndpoint = async function(endpoint_srl) {
        var query = `SELECT 
    noti_endpoint.member_srl AS member_srl,
    \`member\`.nick_name AS nick_name,
    noti_endpoint.endpoint_srl AS endpoint_srl,
    noti_endpoint.endpoint AS endpoint,
    noti_endpoint.\`key\` AS \`key\`,
    noti_endpoint.auth AS auth,
    noti_endpoint.supported_encoding AS supportedEncoding
FROM
    ?? AS noti_endpoint
        JOIN
    ?? AS \`member\` ON noti_endpoint.member_srl = \`member\`.member_srl
WHERE
    noti_endpoint.endpoint_srl = ?`;
        var queryArgs = [this.getDBPrefix() + "noti_endpoint", this.getDBPrefix() + "member", endpoint_srl];
        var output = await this.query(query, queryArgs);
        if(output) {
            output[0].supportedEncoding = output[0].supportedEncoding ? output[0].supportedEncoding.split(',') : output[0].supportedEncoding;
            return output[0];
        }

        return null;
    }

    manualPush.prototype.getEndpointAll = async function* () {
        var lastEndpointSrl = 0;
        var chunkCount = 1;
        while(true) {
            //console.log('loopStart');
            var query = `SELECT 
    noti_endpoint.member_srl as member_srl,
    noti_endpoint.endpoint_srl as endpoint_srl,
    \`member\`.nick_name as nick_name,
    noti_endpoint.endpoint as endpoint,
    noti_endpoint.\`key\` as \`key\`,
    noti_endpoint.auth as auth,
    noti_endpoint.supported_encoding AS supportedEncoding
    FROM
    ?? AS noti_endpoint
        JOIN ?? AS \`member\` ON noti_endpoint.member_srl = \`member\`.member_srl
    WHERE
        noti_endpoint.endpoint_srl > ?
    ORDER BY noti_endpoint.endpoint_srl ASC
    LIMIT ?`;
            var queryArgs = [this.getDBPrefix() + "noti_endpoint", this.getDBPrefix() + "member", lastEndpointSrl, chunkCount];
            var output = await this.query(query, queryArgs);
            if(!output.length) {
                return;
            } else {
                output.forEach(function(each){
                    each.supportedEncoding = each.supportedEncoding ? each.supportedEncoding.split(',') : each.supportedEncoding
                });
            }

            yield output;
            lastEndpointSrl = output[output.length-1].endpoint_srl;
        }

    };

    return manualPush;

}();

module.exports = manualPush;
