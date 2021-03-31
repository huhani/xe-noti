(function($, global) {

	if('NotiClientContainer' in window) {


		// 상황에 따라 비회원 구독으로 설정할 필요가 있음.
		NotiClientContainer.getInstance().unsubscribe()['catch'](function(err){
			console.log(err);
		})
	}

})(jQuery, this);
