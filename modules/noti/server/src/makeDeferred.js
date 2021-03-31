var makeDeferred = function() {
    var __resolve, __reject;
    var ended = false;
    var promise = new Promise(function(resolve, reject){
        __resolve = resolve;
        __reject = reject;
    });

    return {
        promise: promise,
        resolve: function(data) {
            if(!ended) {
                __resolve(data);
                ended = true;
            }
        },
        reject: function(e) {
            if(!ended) {
                __reject(e);
                ended = true;
            }
        },
        isEnded: function() {
            return ended;
        }
    };
};

module.exports = makeDeferred;
