window.notiDB = {

	DB: null,
	openDB: function() {
		return this.DB ? Promise.resolve(this.DB) : new Promise(function(resolve, reject) {
			var open = window.indexedDB.open("swpushnotidb");
			open.onerror = reject;
			open.onsuccess = function() {
				var result = open.result;
				if (result.objectStoreNames.contains("swpushnotistore")) {
					notiDB.DB = result;
					resolve(notiDB.DB);
				} else {
					return window.indexedDB.deleteDatabase("swpushnotidb"), notiDB.openDB();
				}
			};
			open.onupgradeneeded = notiDB.upgradeDB;
		})
	},

	upgradeDB: function(DBResult) {
		DBResult = DBResult.target.result;
		if(DBResult.objectStoreNames.contains("swpushnotistore")) {
			DBResult.deleteObjectStore("swpushnotistore");
		}

		DBResult.createObjectStore("swpushnotistore", {
			keyPath: "key"
		});
	},

	putDB: function(key, value) {
		return this.openDB().then(function(db) {
			var obj = {};
			obj.key = key;
			obj.value = value;
			return new Promise(function(resolve, reject) {
				var result = db.transaction("swpushnotistore", "readwrite").objectStore("swpushnotistore").put(obj);
				result.onsuccess = resolve;
				result.onerror = reject;
			})
		})
	},

	deleteDB: function(key) {
		return this.openDB().then(function(db) {
			return new Promise(function(resolve, reject) {
				var result = db.transaction("swpushnotistore", "readwrite").objectStore("swpushnotistore").delete(key);
				result.onsuccess = resolve;
				result.onerror = reject;
			})
		})
	},

	getDB: function(target) {
		return this.openDB().then(function(db) {
			return new Promise(function(resolve, reject) {
				var DBResult = db.transaction("swpushnotistore").objectStore("swpushnotistore").get(target);
				DBResult.onsuccess = function() {
					var result = DBResult.result;
					resolve(result ? result.value : null)
				};
				DBResult.onerror = function() {
					reject('Unable to get key "' + target + '" from object store.')
				}
			})
		}).catch (function() {
			return Promise.reject("Unable to open IndexedDB.")
		});
	},

	clearDB: function() {
		return this.openDB().then(function(db) {
			return new Promise(function(resolve, reject) {
				var result = db.transaction("swpushnotistore", "readwrite").objectStore("swpushnotistore").clear();
				result.onsuccess = resolve;
				result.onerror = reject;
			})
		})
	},

	// 이 함수 사용시 주의. 이거 쓰고 난 다음 openDB하면 promise 안먹힘.
	// close하지 않고 막 지워버려서 그런 것 같다.
	removeDB: function() {
		return new Promise(function(resolve, reject) {
			window.indexedDB.deleteDatabase("swpushnotidb");
			this.DB = null;
			resolve();
		})
	}

};


window.notiFunc = {

	isChrome: /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor),
	isAvailableNoti: function() {
		if(window.location.protocol != 'https:') {
			return false;
		}

		if(!('Notification' in window)) {
			return false;
		}

		if(!('indexedDB' in window)) {
			return false;
		}

		if(!('serviceWorker' in navigator)) {
			return false;
		}

		if(!('PushManager' in window)) {
			return false;
		}

		return true;
	},

	checkUseNotiDevice: function(endpoint, reg_srl, getDevID) {
		return new Promise(function(resolve, reject) {
			var params = {
				endpoint: endpoint,
				reg_srl: reg_srl,
				get_dev_id: getDevID ? '1' : null
			};
			exec_json("noti.getNotiCheckUseDevice", params, function(ret_obj){
				if(getDevID) {
					resolve(typeof(ret_obj.dev_id) !== 'undefined' ? ret_obj.dev_id : null);
				} else {
					resolve(ret_obj.result);
				}
			});
		});
	},


	subscribeDevice: function() {
		navigator.serviceWorker.register('/service-worker.js').then(function(){
			return new Promise(function(resolve, reject) {
				if('Notification' in window) {
					var Permission = Notification.permission;
					if(Permission === 'denied') {
						return reject(new Error('Push messages are blocked.'));
					}

					if(Permission === 'granted') {
						return resolve();
					}

					if(Permission === 'default') {
						Notification.requestPermission(function(result) {
							if (result !== 'granted') {
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
					notiFunc.insertDeviceInfo(subscription.endpoint);
				}).catch(function(e) {
					console.log(e);
				});
			});
		}).catch(function(error) {
			console.log('======== SW 등록 실패');
		});
	},


	insertDeviceInfo: function(endpoint) {
		if(!endpoint) {
			return false;
		}

		var endpoint = endpoint.split("/").slice(-1).pop();
		var params = {
			endpoint: endpoint
		};

		notiDB.clearDB();
		exec_json("noti.procNotiDeviceInsert", params, function(ret_obj){
			var reg_srl = ret_obj.reg_srl;
			var status = ret_obj.status;
			if(status !== 'SUCCESS') {
				alert('더 이상 알림을 등록할 수 없습니다.');
				return false;
			}
			Promise.all([notiDB.putDB('Endpoint', endpoint), notiDB.putDB('reg_srl', reg_srl), notiDB.putDB('AutoLogin', "Y")]).then(function(){
				var dev_id = ret_obj.dev_id;
				var _noti = reg_srl + "." + dev_id;
				notiFunc.setCookie('_noti', _noti);
				notiFunc.reqNotiNewDevice(endpoint, reg_srl);
				console.log('IndexedDB: Insert Endpoint value.');
			});
		});

	},


	reqNotiNewDevice: function(endpoint, reg_srl) {
		exec_json("noti.procNotiNewDevicePost", {endpoint: endpoint, reg_srl: reg_srl}, void(0));
		return true;
	},

	unsubscribeDevice: function(endpoint, reg_srl, uninstallSW) {
		return new Promise(function(resolve, reject) {
			notiDB.clearDB();
			notiFunc.deleteCookie('_noti');
			if(endpoint && reg_srl) {
				console.log("Post unsubscribe request to server.");
				notiFunc.deleteDeviceInfo(endpoint, reg_srl);
			}

			navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
				serviceWorkerRegistration.pushManager.getSubscription().then(function(subscription) {
					if(!subscription) {
						return;
						reject(new Error('PushManager: Can\'t get endpoint info.'));
					}

					var endpoint = subscription.endpoint;
					subscription.unsubscribe().then(function(successful) {
						console.log('Unsubscribe !!');
						if(uninstallSW) {
							notiFunc.uninstallSW();
						}
						resolve();
					}).catch(function(e) {
						console.log(e);
						reject(new Error('Exception unsubscribe processing !!'));
					})
				});

			}).catch(function(e) {
				console.log(e);
			});
		})
	},

	deleteDeviceInfo: function(endpoint, reg_srl) {
		if(!endpoint || !reg_srl) {
			return false;
		}
		var dev_id = null;
		if(endpoint.length === 32) {
			dev_id = endpoint;
		}

		var params = {
			endpoint: dev_id ? null : endpoint,
			dev_id: dev_id ? dev_id : null,
			reg_srl: reg_srl
		};

		exec_json("noti.procNotiDeviceDelete", params, void(0));
		return true;
	},

	uninstallSW: function() {
		navigator.serviceWorker.getRegistrations().then(function(registrations) {
			for(var i=0, len=registrations.length; i<len; i++) {
				registrations[i].unregister();
			}
		})
	},

	setCookie: function(key, value) {
		var today = new Date();
		today.setDate(today.getDate() + parseInt(450)); // 설정일로부터 450일
		document.cookie = key + "=" + escape(value) + "; path=/; expires=" + today.toGMTString() + ";";
	},

	deleteCookie: function(key) {
		document.cookie = key +'=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
	}
};


(function($, global) {
	if(!global.notiFunc.isChrome) {
		return;
	}

	$(document).ready(function() {
		var member_srl = notiInfo.member_srl;
		var status = notiInfo.noti_status;

		Promise.all([global.notiDB.getDB('Endpoint'), global.notiDB.getDB('reg_srl'), global.notiDB.getDB('AutoLogin')]).then(function(DBResult) {
			var endpoint = DBResult[0];
			var reg_srl = DBResult[1];
			var auto_login = DBResult[2] == "Y";
			var cookie = getCookie('_noti');
			if(!member_srl && auto_login) {
				return global.notiFunc.unsubscribeDevice(endpoint, reg_srl, true);
			}

			if(cookie && (!endpoint || !reg_srl)) {
				var regExp = /^(\d+).(\w{32})$/.exec(cookie);
				reg_srl = regExp !== null ? regExp[1] : null;
				var dev_id = regExp !== null ? regExp[2] : null;

				if(status) {
					if(!dev_id || !reg_srl) {
						console.log('Exception occurred from Cookies.');
					} else {
						console.log(dev_id, reg_srl);
						global.notiFunc.deleteDeviceInfo(dev_id, reg_srl);
					}
				}
				notiDB.clearDB();
				global.notiFunc.deleteCookie('_noti');
				global.notiFunc.uninstallSW();
				return;
			}

			if(reg_srl && Notification.permission !== 'granted') {
				notiDB.clearDB();
				global.notiFunc.deleteDeviceInfo(endpoint, reg_srl);
				global.notiFunc.deleteCookie('_noti');
				global.notiFunc.uninstallSW();
				return;
			}

			if(reg_srl && !status) {
				// Endpoint값이 유효한지 검사.
				// 로그아웃을 하여도, 쿠키를 날려먹어도 indexedDB에 남아있는 데이터를 이용하여 유효성 체크.
				// 유효하지 않을시 그냥 알림 설정 리셋.
				global.notiFunc.checkUseNotiDevice(endpoint, reg_srl, true).then(function(dev_id) {
					if(dev_id) {
						var _noti = reg_srl + '.' + dev_id;
						global.notiFunc.setCookie('_noti', _noti);
					} else {
						notiDB.clearDB();
						global.notiFunc.deleteCookie('_noti');
						global.notiFunc.uninstallSW();
					}
				});
			}
		});
	});

})(jQuery, this);
