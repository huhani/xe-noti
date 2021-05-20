var moment = require('moment-timezone');
var getDate = function() {
    return moment().tz('Asia/Seoul').format('YYYYMMDDHHmmss');
};

module.exports = {
    getDate: getDate
};