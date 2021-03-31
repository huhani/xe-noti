(function($, global) {

	$(document).ready(function() {

	});

	initServiceWorker = function() {
		if(!isSupportSW()) {
			alert('push 알림을 지원하지 않는 브라우저입니다.');
			return false;
		}

		registerServiceWorker(true);
		return true;
	};

	isSupportSW = function() {
		if(!('serviceWorker' in navigator)) {
			console.log('Your Borwser does not supported ServiceWorker API.');
			return false;
		}

		if(!('PushManager' in window)) {
			console.log('PushManager API not avalible on this browser');
			return false;
		}

		return true;
	};

	var registerServiceWorker = function(subscribe) {

		//서비스워크 파일을 최상위에다 안 놔두면 navigator.serviceWorker.ready에서 promise 안 넘어간다.
		navigator.serviceWorker.register('/service-worker.js').then(function(){
			if(subscribe) {
				subscribeDevice();
			}
		}).catch(function(error) {
			console.log('======== SW 등록 실패');
		});

	};

	subscribeDevice = function() {

		return new Promise(function(resolve, reject) {
			if('Notification' in window) {
				var Permission = Notification.permission;
				if(Permission === 'denied') {
					global.useNoti();
					return reject(new Error('Push messages are blocked.'));
				}

				if(Permission === 'granted') {
					return resolve();
				}

				if(Permission === 'default') {
					Notification.requestPermission(function(result) {
						if (result !== 'granted') {
							global.useNoti();
							reject(new Error('Bad permission result'));
						}
						resolve();
					});
				}

			} else {
				return reject(new Error('Browser does not supported notification.'));
			}
		}).then(function() {
			return navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
				return serviceWorkerRegistration.pushManager.subscribe({
					userVisibleOnly: true
				});
			}).then(function(subscription) {
				insertDeviceInfo(subscription.endpoint);
			}).catch(function(e) {
				console.log(e);
			});

		});

	};

	unsubscribeDevice = function() {
		return new Promise(function(resolve, reject) {
			deleteDeviceInfo().then(function() {
				resolve();
				global.loadDeviceList();
				global.useNoti();
				global.notiFunc.deleteCookie('_noti');
			});
			navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
				serviceWorkerRegistration.pushManager.getSubscription().then(function(subscription) {
					if(!subscription) {
						return;
					}

					var endpoint = subscription.endpoint;
					subscription.unsubscribe().then(function(successful) {
						console.log('Unsubscribe !!');
					}).catch(function(e) {
						console.log(e);
					})
				});

			}).catch(function(e) {
				console.log(e);
			});
		})
	};


	var insertDeviceInfo = function(endpoint) {
		if(!endpoint) {
			return false;
		}

		var endpoint = endpoint.split("/").slice(-1).pop();
		var params = {
			endpoint: endpoint
		};

		exec_json("noti.procNotiDeviceInsert", params, function(ret_obj){
			var reg_srl = ret_obj.reg_srl;
			var status = ret_obj.status;
			if(status !== 'SUCCESS') {
				alert('더 이상 알림을 등록할 수 없습니다.');
				notiDB.clearDB();
				global.useNoti();
				return false;
			}
			Promise.all([notiDB.putDB('Endpoint', endpoint), notiDB.putDB('reg_srl', reg_srl)]).then(function(){
				var dev_id = ret_obj.dev_id;
				var _noti = reg_srl + "." + dev_id;

				global.loadDeviceList();
				global.notUseNoti();
				global.notiFunc.setCookie('_noti', _noti);
				reqNotiNewDevice(endpoint, reg_srl);
				console.log('IndexedDB: Insert Endpoint value.');
			});
		});
	};

	checkUseNotiDevice = function(endpoint, reg_srl) {
		return new Promise(function(resolve, reject) {
			var params = {
				endpoint: endpoint,
				reg_srl: reg_srl
			};
			exec_json("noti.getNotiCheckUseDevice", params, function(ret_obj){
				resolve(ret_obj.result);
			});
		});
	};

	var deleteDeviceInfo = function() {

		return new Promise(function(resolve, reject) {
			Promise.all([notiDB.getDB('Endpoint'), notiDB.getDB('reg_srl')]).then(function(result) {

				var params = {
					endpoint: result[0],
					reg_srl: result[1]
				};

				exec_json("noti.procNotiDeviceDelete", params, function(ret_obj){
					notiDB.clearDB().then(function(){
						console.log('IndexedDB: Delete Endpoint key.');
						//global.notiFunc.uninstallSW();
						resolve();
					});
				});
			});
		});
	};

	delteRegInfoAll = function() {
		return new Promise(function(resolve, reject) {
			Promise.all([notiDB.getDB('Endpoint'), notiDB.getDB('reg_srl')]).then(function(result) {
				exec_json("noti.procNotiRegInfoDeleteAll", {}, function(ret_obj){
					notiDB.clearDB().then(function(){
						console.log('IndexedDB: Delete Endpoint key.');
						//global.notiFunc.uninstallSW();
						resolve();
					});
				});
			});
		});
	};

	deleteRegInfo = function(reg_srl) {

		if('indexedDB' in window) {
			notiDB.getDB('reg_srl').then(function(result) {
				if(result == reg_srl) {
					return unsubscribeDevice().then(function(){
						global.loadDeviceList();
					});
				}
				reqDeleteRegInfo(reg_srl);
			}).catch(function(e){
				console.log(e);
				reqDeleteRegInfo(reg_srl);
			});

		} else {
			reqDeleteRegInfo(reg_srl);
		}

		return true;
	}

	var reqNotiNewDevice = function(endpoint, reg_srl) {
		if(endpoint && reg_srl) {
			exec_json("noti.procNotiNewDevicePost", {endpoint: endpoint, reg_srl: reg_srl}, void(0));
		} else {
			Promise.all([notiDB.getDB('Endpoint'), notiDB.getDB('reg_srl')]).then(function(result) {
				return exec_json("noti.procNotiNewDevicePost", {endpoint: result[0], reg_srl: result[1]}, void(0));
			});
		}
	}

	var reqDeleteRegInfo = function(reg_srl) {
		exec_json("noti.procNotiRegInfoDelete", {reg_srl: reg_srl}, function(ret_obj){
			global.loadDeviceList();
		});

		return true;
	}


})(jQuery, this);
