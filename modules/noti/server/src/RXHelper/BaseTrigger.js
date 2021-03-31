var BaseClass = require("./BaseClass");
var makeDeferred = require("../makeDeferred");
var __extend = require("../extend");
var BaseTrigger = function() {
    function BaseTrigger(rxHelper, args) {
        var that = BaseClass.call(this, rxHelper) || this;
        that._args = args;
        that._completed = false;
        that._deferred = makeDeferred();
        setTimeout(function(){
            try {
                that._run();
            } catch(e){
                console.error(e);
                that.reject(e);
            }
        }, 0);
    }

    __extend(BaseTrigger, BaseClass);

    BaseTrigger.prototype.resolve = function() {
        if(!this._completed) {
            this._completed = true;
            this._deferred.resolve();
        }
    };

    BaseTrigger.prototype.reject = function(err) {
        if(!this._completed) {
            this._completed = true;
            this._deferred.reject(err);
        }
    };

    BaseTrigger.prototype.whenComplete = function() {
        return this._deferred.promise;
    };

    BaseTrigger.prototype._run = function() {
        return null;
    };

    return BaseTrigger;

}();

module.exports = BaseTrigger;
