var AbortableJob = require("./AbortableJob");
var makeDeferred = require("./makeDeferred");

var retry = function retry() {
    function retry(job, retryTime) {
        return new AbortableJob(function(){
            var aborted = false;
            var done = false;
            var retryTimerID = null;
            var deferred = makeDeferred();
            var run = null;
            var tryAgain = function() {
                console.log("[retry] tryAgain");
                run = null;
                if(!aborted) {
                    retryTimerID = setTimeout(function(){
                        exec();
                    }, retryTime);
                }
            };
            var exec = function() {
                run = job.run();
                run.promise.then(function(data){
                    done = true;
                    if(!aborted) {
                        deferred.resolve(data);
                    }
                })['catch'](function(err) {
                    if(!aborted && !done) {
                        tryAgain();
                    }
                });
            };

            var abort = function() {
                if(!aborted && !done) {
                    aborted = true;
                    if(!deferred.isEnded()) {
                        deferred.reject(AbortableJob.AbortError);
                    }
                    if(retryTimerID !== null) {
                        clearTimeout(retryTimerID);
                        retryTimerID = null;
                    }
                    if(run && !run.isDone()) {
                        run.abort();
                    }
                    run = null;
                }
            };

            exec();

            return {
                promise: deferred.promise,
                abort: abort
            };

        }).run();
    }

    return retry;
}();

module.exports = retry;
