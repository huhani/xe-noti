(function($) {

	if('NotiClientContainer' in window) {
		var NotiClient = NotiClientContainer.getInstance();
		NotiClient.isPushEnabled().then(function(enabled) {
			return enabled ? NotiClient.subscribe() : Promise.resolve(void 0);
		})['catch'](function(err){
			//console.log(err);
			if('NotiStoreContainer' in window) {
				NotiStoreContainer.getInstance().clear();
			}

		});
	}

})(jQuery);
