
var off = function() {
    var fn = function(log) {
        var args_len = arguments.length;
        var arr = [];
        for (var i=1; i<args_len; i++) {
            arr[i-1] = arguments[i];
        }
    };
    return {
        debug: fn,
        error: fn,
        info: fn,
        warn: fn
    };
}();
var _console = {
    debug: function(log) {
        var contents = [];
        var args_len = arguments.length;
        var logger;
        for(var i=1; i<args_len; i++){
            contents[i-1] = arguments[i];
        }
        logger = console.debug || console.log;
        logger.call.apply(logger, [console, log].concat(contents));
    },

    error: function(log) {
        var contents = [];
        var args_len = arguments.length;
        var logger;
        for(var i=1; i<args_len; i++){
            contents[i-1] = arguments[i];
        }
        logger = console.error || console.log;
        logger.call.apply(logger, [console, log].concat(contents));
    },

    info: function(log) {
        var contents = [];
        var args_len = arguments.length;
        var logger;
        for(var i=1; i<args_len; i++){
            contents[i-1] = arguments[i];
        }
        logger = console.info || console.log;
        logger.call.apply(logger, [console, log].concat(contents));
    },

    warn: function(log) {
        var contents = [];
        var args_len = arguments.length;
        var logger;
        for(var i=1; i<args_len; i++){
            contents[i-1] = arguments[i];
        }
        logger = console.warn || console.log;
        logger.call.apply(logger, [console, log].concat(contents));
    }
};
function prefix(logger, type) {
    return {
        debug: function(log) {
            var args_len = arguments.length;
            var contents = [];
            for (var i=1; i<args_len; i++) {
                contents[i-1] = arguments[i];
            }

            return logger.debug.apply(logger, ["[" + type + "] " + log].concat(contents));
        },

        error: function(log) {
            var args_len = arguments.length;
            var contents = [];
            for (var i=1; i<args_len; i++) {
                contents[i-1] = arguments[i];
            }

            return logger.error.apply(logger, ["[" + type + "] " + log].concat(contents));
        },

        info: function(log) {
            var args_len = arguments.length;
            var contents = [];
            for (var i=1; i<args_len; i++) {
                contents[i-1] = arguments[i];
            }

            return logger.info.apply(logger, ["[" + type + "] " + log].concat(contents));
        },

        warn: function(log) {
            var args_len = arguments.length;
            var contents = [];
            for (var i=1; i<args_len; i++) {
                contents[i-1] = arguments[i];
            }

            return logger.warn.apply(logger, ["[" + type + "] " + log].concat(contents));
        }
    };
}
function clone() {
    var clone_arr = [];
    var i;
    var args = arguments;
    var args_len = args.length;
    for(i=0; i<args_len; i++) {
        clone_arr[i] = args[i];
    }

    return {
        debug: function(log) {
            var contents = [];
            var args_len = arguments.length;
            for (var i=1; i<args_len; i++) {
                contents[i-1] = arguments[i];
            }
            return clone_arr.forEach(function(each) {
                return each.debug.apply(each, [log].concat(contents));
            });
        },

        error: function(log) {
            var contents = [];
            var args_len = arguments.length;
            for (var i=1; i<args_len; i++) {
                contents[i-1] = arguments[i];
            }
            return clone_arr.forEach(function(each) {
                return each.error.apply(each, [log].concat(contents));
            });
        },

        info: function(log) {
            var contents = [];
            var args_len = arguments.length;
            for (var i=1; i<args_len; i++) {
                contents[i-1] = arguments[i];
            }
            return clone_arr.forEach(function(each) {
                return each.info.apply(each, [log].concat(contents));
            });
        },

        warn: function(log) {
            var contents = [];
            var args_len = arguments.length;
            for (var i=1; i<args_len; i++) {
                contents[i-1] = arguments[i];
            }
            return clone_arr.forEach(function(each) {
                return each.warn.apply(each, [log].concat(contents));
            });
        }
    };
}

module.exports = {
    off: off,
    console: _console,
    prefix: prefix,
    clone: clone
};
