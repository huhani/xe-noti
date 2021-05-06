var __extend = function() {
    var setProperty = Object.setPrototypeOf || {
            __proto__: []
        } instanceof Array && function(subClass, superClass) {
            subClass.__proto__ = superClass;
        }
        || function(subClass, superClass) {
            for (var key in superClass) {
                superClass.hasOwnProperty(key) && (subClass[key] = superClass[key]);
            }
        };

    return function(subClass, superClass) {
        function fn() {
            this.constructor = subClass;
        }

        setProperty(subClass, superClass);
        if(superClass === null) {
            subClass.prototype = Object.create(superClass);
        } else {
            fn.prototype = superClass.prototype;
            subClass.prototype = new fn;
        }
    };
}();

module.exports = __extend;