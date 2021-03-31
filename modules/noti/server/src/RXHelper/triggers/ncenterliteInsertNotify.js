var BaseTrigger = require("../BaseTrigger");
var makeDeferred = require("../../makeDeferred");
var __extend = require("../../extend");
var ncenterliteInsertNotify = function() {

    // fcm, vapid서버에 전송해주는 역할
    //
    function ncenterliteInsertNotify() {
        var that = BaseTrigger.apply(this, arguments) || this;
        that._mqChannel = that._args.mqChannel;
    }

    __extend(ncenterliteInsertNotify, BaseTrigger);

    ncenterliteInsertNotify.prototype._run = function() {
        var notiController = this.getController('noti');
        var notiModel = this.getModel('noti');
        console.log("RUN!!!!", notiController, notiModel);
        this.resolve();
    };

    return ncenterliteInsertNotify;

}();

module.exports = ncenterliteInsertNotify;
