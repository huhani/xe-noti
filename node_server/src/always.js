var always = function(promise) {
    return new Promise(function(resolve) {
        promise.then(function(data){
            resolve(data);
        })['catch'](function(e){
            resolve(e);
        });
    });
};

module.exports = always;