(function($, global) {

	if('NotiClientContainer' in window) {
		var notiClient = NotiClientContainer.getInstance();
		// 상황에 따라 비회원 구독으로 설정할 필요가 있음.
		Promise.all([notiClient.getConfig(), notiClient.isPushEnabled()]).then(function(result) {
			var config = result[0];
			var pushEnabled = result[1];
			var memberToGuest = config && config.memberToGuest || false;

			return !pushEnabled || !memberToGuest ? notiClient.unsubscribe() : notiClient.subscribe();
		});
		document.cookie = "__notiLogout__=; " + "Max-Age=-1";

	}

})(jQuery, this);
