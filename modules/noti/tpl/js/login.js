(function($, global) {

	var isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
	$(document).ready(function() {
		if(isChrome && global.notiFunc.isAvailableNoti()) {
			Promise.all([global.notiDB.getDB('Endpoint'), global.notiDB.getDB('reg_srl')]).then(function(result) {
				//등록요청
				var endpoint = result[0];
				var reg_srl = result[1];
				if(!endpoint || !reg_srl) {
					global.notiFunc.subscribeDevice();
				} else {
					global.notiFunc.checkUseNotiDevice(endpoint, reg_srl).then(function(checkDevice) {
						if(checkDevice != 'EXIST_DEVICE' || Notification.permission !== 'granted') {
							global.notiDB.clearDB();
							global.notiFunc.subscribeDevice();
						}
					});
				}
			});
		}
	});


})(jQuery, this);
