(function($, global) {

	var $bottom = null;
	var isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
	var isSecure = window.location.protocol == 'https:';
	$(document).ready(function() {
		$bottom = $('.noti_table_bottom');
		if(global.isSupportSW) {
			Promise.all([global.notiDB.getDB('Endpoint'), global.notiDB.getDB('reg_srl')]).then(function(result) {
				if(!result[0] || !result[1]) {
					return useNoti();
				} else {
					global.checkUseNotiDevice(result[0], result[1]).then(function(checkDevice) {
						if(checkDevice != 'EXIST_DEVICE' || Notification.permission !== 'granted') {
							global.notiDB.clearDB();
							return useNoti();
						}

						return notUseNoti();
					});
				}
			});
		} else {
			useNoti();
		}

	});


	useNoti = function() {
		var html = '<i class="fa fa-bell-o" aria-hidden="true"></i> 알림 <span class="status">켜기</span>';
		var $subscribe = $bottom.find('.subscribe');
		$subscribe.removeClass('processing not_use');
		$subscribe.addClass('use');
		$subscribe.html(html);
	};

	notUseNoti = function() {
		var html = '<i class="fa fa-bell-slash-o" aria-hidden="true"></i> 알림 <span class="status">끄기</span>';
		var $subscribe = $bottom.find('.subscribe');
		$subscribe.removeClass('processing use');
		$subscribe.addClass('not_use');
		$subscribe.html(html);
	};

	processingNoti = function() {
		var html = '<i class="fa fa-bell" aria-hidden="true"></i> 알림 <span class="status"> 작업중 ...</span>';
		var $subscribe = $bottom.find('.subscribe');
		$subscribe.removeClass('use not_use');
		$subscribe.addClass('processing');
		$subscribe.html(html);
	};

	$(document).on('click', '.noti_delete', function(e) {
		var $this = $(this);
		var reg_srl = $this.attr('data-src');
		if(!reg_srl) {
			return false;
		}

		global.deleteRegInfo(reg_srl);
		return false;
	});

	$(document).on('click', '.noti_table_bottom .subscribe', function(e) {
		var $this = $(this);
		$this.blur();

		if(!isSecure) {
			alert('HTTP SECURE 환경에서만 사용 가능합니다.');
			return false;
		}

		if(!isChrome) {
			alert('push알림을 지원하지 않는 브라우저입니다.');
			return false;
		}

		if($this.hasClass('processing')) {
			alert('작업중입니다. 잠시만 기다려주세요.');
			return false;
		}

		if($this.hasClass('use')) {
			processingNoti();
			return initServiceWorker();
		} else if($this.hasClass('not_use')) {
			processingNoti();
			return unsubscribeDevice();
		}

		return false;
	});

	$(document).on('click', '.noti_table_bottom .unsubscribe_all', function(e) {
		var $this = $(this);
		$this.blur();
		if($this.hasClass('processing')) {
			alert('작업중입니다. 잠시만 기다려주세요.');
			return false;
		}

		$this.addClass('processing');
		global.delteRegInfoAll().then(function(){
			$this.removeClass('processing');
			global.notiFunc.deleteCookie('_noti');
			loadDeviceList();
		});

		return false;
	});


	loadDeviceList = function(page) {
		page = $('.pagination .active a').text() || 1;
		var href = window.location.hostname.setQuery('mid', current_mid).setQuery('act', 'dispNotiDeviceList');
		$.ajax({
			type: "GET", 
			dataType: "html",
			url: href,
			success: function(response){
				var $response = $(response);
				$('.table thead').html($response.find('.table thead').html());
				$('.table tbody').html($response.find('.table tbody').html());
				$('.pagination').html($response.find('.pagination').html());
			}, 
			complete: function(){
				var $noti_table = $('#noti_table');
				var $table = $noti_table.find('table');
				var $empty_list = $noti_table.find('.empty_list');
				if(!$table.find('tbody tr').length) {
					$empty_list.show();
				} else {
					$empty_list.hide();
				}
			},
			error: function(e){  
				alert(e.responseText);
			}  
		}); 

		return true;
	};


})(jQuery, this);
