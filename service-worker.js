'use strict';

// ServiceWorker에선 localStorage, Cookies를 사용할 수 없다.
// 당연히 DOM(window, document)에도 접근이 불가능하다. 하지만 indexedDB는 사용 가능하다.
var DB = null;

function openDB() {
	return DB ? Promise.resolve(DB) : new Promise(function(resolve, reject) {
		var open = self.indexedDB.open("swpushnotidb");
		open.onerror = reject;
		open.onsuccess = function() {
			var result = open.result;
			if (result.objectStoreNames.contains("swpushnotistore")) {
				DB = result;
				resolve(DB);
			} else {
				return self.indexedDB.deleteDatabase("swpushnotidb"), openDB();
			}
		};
		open.onupgradeneeded = upgradeDB
	})
}

function upgradeDB(DBResult) {

	DBResult = DBResult.target.result;
	if(DBResult.objectStoreNames.contains("swpushnotistore")) {
		DBResult.deleteObjectStore("swpushnotistore");
	}

	DBResult.createObjectStore("swpushnotistore", {
		keyPath: "key"
	});
};

function putDB(key, value) {

	return openDB().then(function(db) {
		var obj = {};
		obj.key = key;
		obj.value = value;
		return new Promise(function(resolve, reject) {
			var result = db.transaction("swpushnotistore", "readwrite").objectStore("swpushnotistore").put(obj);
			result.onsuccess = resolve;
			result.onerror = reject;
		})
	})

}

function getDB(target) {
	return openDB().then(function(db) {
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
}


var notiClick = function(endpoint, reg_srl) {
	var data = new FormData();
	data.append("endpoint", endpoint);
	data.append("reg_srl", reg_srl);

	return fetch('/index.php?act=procNotiClickNotification', {
		method: "POST",
		body: data
	});
}

self.addEventListener('push', function(event) {
	event.waitUntil(self.registration.pushManager.getSubscription().then(function(subscription) {
		if(!subscription) {
			throw new Error('PushManager: Can\'t get endpoint info.');
		}

		//return 구문 꼬박꼬박 안 붙여주면 백그라운드에서 업데이트 되었다고 추가적으로 알림 뜬다.
		//크롬 최신버전에선 그래도 왠만해선 안 뜨는데 삼성브라우저 4와 같이 크로미움이 상당히 구버전이면
		// 추가 알림이 뜨는 문제가 있다. 물론 showNotification가 포함되어 있지 않다면
		// 크로미움 최신 버전에서도 추가 알림이 뜬다.
		// 해당 문제에 대해선 http://stackoverflow.com/questions/31108699 참고 바람.
		return Promise.all([getDB('Endpoint'), getDB('reg_srl')]).then(function(result) {
			var endpoint = subscription.endpoint.split("/").slice(-1).pop();
			var reg_srl = result[1];
			var data = new FormData();
			data.append("endpoint", endpoint);
			data.append("reg_srl", reg_srl);

			if(endpoint && result[0] && endpoint !== result[0]) {
				console.log("Endpoint value is changed.");
				console.log(result[0] + "=== TO ===" + endpoint);
				putDB('Endpoint', endpoint);
			}

			return fetch("/index.php?act=getNotiNotificationByServiceWorker", {
				method: "POST",
				body: data
			}).then(function(response) {
				//console.log(response);
				if(response.status !== 200) {
					console.log('Server Error. Status Code: ' + response.status);  
					throw new Error(); 
				}

				return response.json().then(function(data) {
					if(data.error) {
						console.error('The API returned an error.', data.error);  
						throw new Error();
					} 

					// requireInteraction 값이 true이면 클릭할때까지 절대로 안꺼짐.
					// 안드로이드의 경우 현재 개발하는 시점에선 이 값에 상관없이 안꺼짐.
					if(data.type == 'test' || data.status != 'SUCCESS') {
						return self.registration.showNotification(data.default_title, {
							body: data.default_message,
							icon: data.default_icon,
							data: {
								endpoint: null,
								target_url: data.default_url,
								reg_srl: null
							},
							requireInteraction: false
						});
					}

					var title = data.title;
					var message = data.content_summary;
					var icon = data.target_profile_image;
					var last_recv = data.date;
					if(!icon) {
						icon = '/modules/noti/tpl/default.jpg';
					}
					data.endpoint = endpoint;
					data.reg_srl = reg_srl;

					putDB('LastReceive', last_recv);

					// data항목 파이어폭스 모바일에선 안 먹히는 현상이 있음.
					// 나중에 icon URL 뒤에 data항목을 json stringfy한 뒤 넘겨주기.
					return self.registration.showNotification(title, {
						body: message,
						icon: icon,
						data: data,
						requireInteraction: false
					});
				});

			});
		});
	}).catch(function(e) {
		console.log(e);
	}));
});
 
 
 
self.addEventListener('notificationclick', function (event) {
	//console.log(event);

	var data = event.notification.data;
	event.notification.close();
	event.waitUntil(clients.matchAll({
		type: "window",
		includeUncontrolled: true
	}).then(function (clientList) {
		for(var i = 0; i < clientList.length; i++) {
			var client = clientList[i];
			if(client.url == '/' && 'focus' in client) {
				return client.focus();
			}
		}
		if(clients.openWindow) {
			return clients.openWindow(data.target_url);
		}
	}));

	event.waitUntil(notiClick(data.endpoint, data.reg_srl));
});


self.addEventListener('notificationclose', function(event) {
	event.waitUntil(
		Promise.all([])
	);
});
