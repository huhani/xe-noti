var BaseTrigger = require("../BaseTrigger");
var __extend = require("../../extend");

var exitNodeServer = function() {

    function exitNodeServer() {
        var that = BaseTrigger.apply(this, arguments) || this;
        that._mqChannel = that._args.mqChannel;
    }

    __extend(exitNodeServer, BaseTrigger);

    exitNodeServer.prototype._run = function() {
        this.resolve();
        console.log("강제종료!!!");
        process.exit(1);
    };

    return exitNodeServer;

}();

module.exports = exitNodeServer;
