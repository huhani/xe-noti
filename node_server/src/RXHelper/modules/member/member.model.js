var BaseClass = require("../../BaseClass");
var makeDeferred = require("../../../makeDeferred");
var __extend = require("../../../extend");
var PHPUnserialize = require('php-unserialize');

var MemberModel = function() {
    function MemberModel() {
        BaseClass.apply(this, arguments);
    }

    __extend(MemberModel, BaseClass);

    MemberModel.prototype.getMemberInfoByMemberSrl = function(member_srl) {

    };

    MemberModel.prototype.getProfileImage = function(member_srl) {

    };

    return MemberModel;

}();

module.exports = MemberModel;