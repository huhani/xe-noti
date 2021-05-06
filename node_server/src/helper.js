var getDate = function() {
    var date_ob = new Date();
    var date = ("0" + date_ob.getDate()).slice(-2);
    var month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
    var year = date_ob.getFullYear();
    var h = ("0" + date_ob.getHours()).slice(-2);
    var m = ("0" + date_ob.getMinutes()).slice(-2);
    var s = ("0" + date_ob.getSeconds()).slice(-2);

    return year + month + date+ h + m + s;
};

module.exports = {
    getDate: getDate
};