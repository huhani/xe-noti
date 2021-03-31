var makeDeferred = require("../makeDeferred");
var fs = require('fs');

var RXHelper = function() {
    function RXHelper(config, connection) {
        this._config = config;
        this._connection = connection;
        this._relased = false;
    }

    RXHelper.prototype.getModel = function(name) {
        var path = __dirname+"/modules/"+name+"/"+name+".model.js";
        return fs.existsSync(path) ? new (require(path))(this) : null;
    };

    RXHelper.prototype.callTrigger = function(name, args) {
        var path = __dirname+"/triggers/"+name+".js";
        return fs.existsSync(path) ? new (require(path))(this, args) : null;
    }

    RXHelper.prototype.getController = function(name) {
        var path = __dirname+"/modules/"+name+"/"+name+".controller.js";
        return fs.existsSync(path) ? new (require(path))(this) : null;
    };

    RXHelper.prototype.getConfig = function() {
        return this._config;
    }

    RXHelper.prototype.getDBPrefix = function() {
        return this._config.RhymixDB.prefix;
    };

    RXHelper.prototype.query = function(query, args) {
        if(args === void 0) {
            args = [];
        }
        var deferred = makeDeferred();
        if(this._relased) {
            deferred.reject()
        } else {
            this._connection.query(query, args, function(err, data){
                if(err) {
                    deferred.reject(err);
                } else {
                    deferred.resolve(data);
                }
            });
        }

        return deferred.promise;
    };
    
    RXHelper.prototype.getNextSequence = function() {
        var that = this;
        var deferred = makeDeferred();
        var query = "insert into " + this.getDBPrefix() + "sequence (seq) values ('0')";
        this.query(query, []).then(function(req){
            var insertId = req.insertId;
            if(insertId % 10000 === 0) {
                that.query("delete from "+ that.getDBPrefix() + "sequence where seq < "+ insertId).then(function(){
                    deferred.resolve(insertId);
                })['catch'](function(err){
                    deferred.reject(err);
                });
            } else {
                deferred.resolve(insertId);
            }
        })['catch'](deferred.reject);

        return deferred.promise;
    };

    RXHelper.prototype.getNumberingPath = function(no, size) {
        if(size === void 0) {
            size = 3;
        }
        var mod = Math.pow(10, size);
        var output =  ("0".repeat(size)+(no % mod)).slice(size*-1) + "/";
        if(no >= mod) {
            output += RXHelper.prototype.getNumberingPath(Math.floor(no / mod) , size);
        }

        return output;
    }

    RXHelper.prototype.close = function() {
        if(!this._relased) {
            this._connection.release();
            this._relased = true;
        }
    };


    return RXHelper;

}();

module.exports = RXHelper;