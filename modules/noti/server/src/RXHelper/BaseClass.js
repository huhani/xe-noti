
var BaseClass = function() {
    function BaseClass(rxHelper) {
        this._rxHelper = rxHelper;
    }

    BaseClass.prototype.query = function(query, args) {
        return this._rxHelper.query(query, args);
    };

    BaseClass.prototype.getNextSequence = function() {
        return this._rxHelper.getNextSequence();
    };

    BaseClass.prototype.getConfig = function() {
        return this._rxHelper.getConfig();
    };

    BaseClass.prototype.getModel = function(model) {
        return this._rxHelper.getModel(model);
    };

    BaseClass.prototype.getDBPrefix = function() {
        return this._rxHelper.getDBPrefix();
    };

    BaseClass.prototype.getNumberingPath = function(no, size) {
        return this._rxHelper.getNumberingPath(no, size);
    };

    BaseClass.prototype.getController = function(controller) {
        return this._rxHelper.getController(controller)
    };

    return BaseClass;
}();

module.exports = BaseClass;