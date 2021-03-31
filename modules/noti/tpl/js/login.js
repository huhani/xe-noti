(function($) {

	if('NotiClientContainer' in window) {
		var NotiClient = NotiClientContainer.getInstance();
		NotiClient.subscribe()['catch'](function(err){
			console.log(err);
		});
		if('chrome' in window || Notification.permission === 'granted') {

		} else {

		}

	}

})(jQuery);
