
var MySQL = require("mysql");
var DB = function() {

    function DB(config) {
        this._config = config;
        this._host = this._config.host;
        this._port = this._config.port;
        this._dbName = this._config.dbName;
        this._dbUserID = this._config.dbUserID;
        this._dbUserPW = this._config.dbUserPW;
        this._connectionLimit = this._config.connectionLimit;
        this._closed = false;
        this._pool = null;
        this._init();
    }

    DB.prototype._init = function() {
        this._pool = MySQL.createPool({
            host: this._host,
            port: this._port,
            user: this._dbUserID,
            password: this._dbUserPW,
            database: this._dbName,
            connectionLimit: 100
        })
    };

    DB.prototype.getConnection = function() {
        var that = this;
        return new Promise(function(resolve, reject){
            that._pool.getConnection(function(err, conn){
                if(err) {
                    reject(err);
                } else {
                    resolve(conn);
                }
            })
        });
    };

    return DB;

}();

module.exports = DB;
