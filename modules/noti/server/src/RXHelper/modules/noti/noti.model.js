var BaseClass = require("../../BaseClass");
var crc32 = require("./crc32");
var makeDeferred = require("../../../makeDeferred");
var __extend = require("../../../extend");
var NotiModel = function() {
    function NotiModel() {
        BaseClass.apply(this, arguments);
    }

    __extend(NotiModel, BaseClass);

    NotiModel.prototype.getEndpoint = function(member_srl) {
        var deferred = makeDeferred();
        var query = "select * from ?? where member_srl= ? ";
        var args = [this.getDBPrefix() + "noti_endpoint", member_srl];
        this.query(query, args).then(function(data){
            deferred.resolve(data);
        })['catch'](deferred.reject);

        return deferred.promise;
    };

    NotiModel.prototype.getEndpointCRC32 = function(endpoint) {
        return crc32(endpoint);
    };

    return NotiModel;

}();

module.exports = NotiModel;