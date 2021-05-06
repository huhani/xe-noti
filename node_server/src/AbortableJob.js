var makeDeferred = require("./makeDeferred");

var AbortableJob = function AbortableJob() {

    var Job = function Job() {
        function Job(fn) {
            this._aborted = false;
            this._done = false;
            this._fn = fn;
            this._deferred = makeDeferred();
            this._currentJob = null;
            this._errors = [];
            this._run();
        }

        Job.prototype._resolve = function(result) {
            if(!this._done) {
                this._done = true;
                this._deferred.resolve(result);
            }
        };

        Job.prototype._reject = function(e) {
            if(!this._done) {
                this._done = true;
                this._deferred.reject(e);
            }
        };

        Job.prototype._run = function() {
            try {
                var that = this;
                this._currentJob = this._fn();
                this._currentJob.promise.then(function(result){
                    that._resolve(result);
                })['catch'](function(e){
                    that._reject(e);
                });
            } catch(e) {
                this._reject(e);
            }
        };

        Job.prototype.getPromise = function() {
            return this._deferred.promise;
        };

        Job.prototype.abort = function() {
            if(!this._done) {
                this._aborted = true;
                if(this._currentJob && this._currentJob.abort) {
                    this._currentJob.abort();
                }
                this._reject(new Error("Aborted"));
            }
        };

        Job.prototype.isDone = function() {
            return this._done;
        };

        Job.prototype.isAborted = function() {
            return this._aborted;
        };

        return Job;
    }();


    // fn ( abort, promise)
    function AbortableJob(fn) {
        this._fn = fn;
        this._currentJob = null;
        this._count = 0;
    }

    AbortableJob.AbortError = new Error("Aborted");

    AbortableJob.prototype.run = function() {
        this._count++;
        if(!this._currentJob || this._currentJob.isDone()) {
            this._currentJob = new Job(this._fn);
        }
        var that = this;
        var job = this._currentJob;
        return {
            promise: Job.prototype.getPromise.call(job),
            abort: function() {
                if(!Job.prototype.isAborted.call(job)) {
                    that._count--;
                    Job.prototype.abort.call(job)
                }
            },
            isDone: Job.prototype.isDone.bind(job)
        };
    };

    return AbortableJob;

}();

module.exports = AbortableJob;