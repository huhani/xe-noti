'use strict';
importScripts("./modules/noti/tpl/js/NotiStore.js");

var notiStore = NotiStoreContainer.getInstance();

var getDocumentSrl = function(url) {
	var regex = [
		':\\/\\/(?:\\.?\\w+)+\\/[a-zA-Z_\\-]\\w+/(\\d+)',
		':\\/\\/(?:\\.?\\w+)+\\/(\\d+)',
		'(?!target_)(?:^.{0,})document_srl=(\\d+)'
	];
	if(url) {
		for(var i=0; i<regex.length; i++) {
			var eachRegex = new RegExp(regex[i]);
			var result = eachRegex.exec(url);
			if(result) {
				return parseInt(result[1], 10);
			}
		}
	}

	return null;
}

var sendEvent = function(evtObj) {
	// push_srl, endpoint
	var data = new FormData();
	Object.keys(evtObj).forEach(function(key){
		data.append(key, evtObj[key]);
	});

	return fetch('/index.php?act=procNotiServiceWorkerEvent', {
		method: "POST",
		body: data,
		cache: 'no-cache',
		credentials: 'omit',
		headers: {
			'Accept': 'application/json'
		}
	}).then(function(response){
		return response.json();
	});
};

var notiEventHandler = function(eventName, push_srl, data) {
	return Promise.all([self.registration.pushManager.getSubscription(), notiStore.get('endpoint_srl')]).then(function(resolveData) {
		var subscription = resolveData[0];
		var endpoint_srl = resolveData[1];
		if(!subscription || !subscription.endpoint) {
			return Promise.resolve();
		}

		var endpoint = subscription.endpoint;
		var obj = {
			eventName: eventName,
			endpoint: endpoint,
			endpoint_srl: endpoint_srl,
			push_srl: push_srl
		};

		Object.keys(data).forEach(function(key){
			obj[key] = data[key];
		});

		return sendEvent(obj);
	});
}

var getClientPriority = function (clientObj) {
	return ((clientObj.isUrlMatched ? 1 : 0) << 3) +
		((clientObj.focused && clientObj.visibilityState === "visible" ? 1 : 0) << 2) +
		((clientObj.visibilityState === "visible" ? 1 : 0) << 1);
};

self.addEventListener('push', function(event) {
	var payload = null;
	var eventObj = {
		timestamp: Date.now()
	};

	event.waitUntil(new Promise(function(resolve, reject){
			var error = null;
			try {
				if(event.data) {
					payload = event.data.json();
					return notiStore.insertPushLog(payload).then(function(){
						return notiStore.deleteOldPushLog();
					}).then(function() {
						resolve(payload);
					});
				}
			} catch(err) {
				error = err;
			}
			if(!payload) {
				fetch('/index.php?act=getNotiPushDefaultMessage', {
					method: "POST",
					cache: 'no-cache',
					credentials: 'omit',
					headers: {
						'Accept': 'application/json'
					}
				}).then(function(resp){
					return resp.json();
				}).then(function(data){
					payload = data;
					if(payload) {
						resolve(data);
					} else {
						reject(error);
					}
				})['catch'](function(err){
					reject(err);
				});
			}
		}).then(function(){
			return Promise.all([self.registration.pushManager.getSubscription(), notiEventHandler('push', payload.push_srl, eventObj), notiStore.get('config')]);
		}).then(function(retData) {
			var subscription = retData[0];
			var pushMessageType = retData[2] && retData[2].pushMessageType || "push";
			if(!subscription) {
				throw new Error('PushManager: Can\'t get endpoint info.');
			}

			var notificationArgs = ['title', 'body', 'icon', 'image', 'badge', 'requireInteraction', 'silent', 'renotify', 'tag'];
			var actions = payload.actions;
			var title = payload.title;
			var body = payload.body;
			var icon = payload.icon;
			var image = payload.image;
			var badge = payload.badge;
			var data = payload.data;
			var requireInteraction = payload.requireInteraction;
			var renotify = payload.renotify;
			var silent = payload.silent;
			var tag = payload.tag;
			var pushGroup = payload.pushGroup;
			var maxNotificationCount = pushGroup.max_count;
			var useCountSummary = pushGroup.use_count_summary;
			var countSummaryTemplate = pushGroup.count_summary_template;
			var timestamp = Date.now();

			var notificationData = {};
			var sw = {};
			notificationData.__sw = sw;
			Object.keys(payload).forEach(function(key) {
				if(notificationArgs.indexOf(key) === -1) {
					notificationData[key] = payload[key];
				}
			});

			return clients.matchAll({
				type: "window",
				includeUncontrolled: true
			}).then(function(clientList){

				var targetClient = clientList.find(function(eachClient){
					return eachClient.focused && eachClient.visibilityState === "visible";
				});
				if(targetClient && (pushMessageType === "mix" || pushMessageType === "both")) {
					targetClient.postMessage({
						name: 'push',
						type: payload.type,
						pushSrl: payload.push_srl || 0,
						title: title,
						body: body,
						icon: icon,
						image: image,
						launchUrl: payload.launchUrl || null,
						timestamp: timestamp,
					});
				}

				if(pushMessageType === "both" ||
					((pushMessageType === "push_without_focus" || pushMessageType === "mix") && !targetClient) ||
					pushMessageType === "push"
				) {
					return registration.getNotifications({}).then(function(notifications) {
						var prevNotificationInfo = notifications.filter(function(notification) {
							var split = notification.tag ? notification.tag.split('@') : null;
							return notification.tag && notification.data && notification.data.__sw && (notification.tag == tag || (split && split.length && split[0] == tag) );
						}).sort(function(a, b){
							return a.data.__sw.timestamp - b.data.__sw.timestamp;
						}).reduce(function(val, current, idx, arr){
							var data = current.data;
							var __sw = data ? data.__sw : null;
							var removed = false;
							if(__sw) {
								if(arr.length-val.removeCount >= maxNotificationCount) {
									current.close();
									removed = true;
									val.removeCount++;
								}

								if(__sw.notReadedMessageCount) {
									val.notReadedMessageMaxCount = Math.max(val.notReadedMessageMaxCount, __sw.notReadedMessageCount);
								} else if(!removed) {
									val.nonCountNotification++;
								}
							}

							return val;
						}, {
							notReadedMessageMaxCount: 0,
							nonCountNotification: 0,
							removeCount: 0
						});

						var notificationBody = body;
						var notificationTag = maxNotificationCount > 1 ? tag + "@" + Date.now() + "." + Math.random().toString(36).substr(2) : tag;
						sw.notReadedMessageCount = (prevNotificationInfo.notReadedMessageMaxCount ? prevNotificationInfo.notReadedMessageMaxCount : prevNotificationInfo.nonCountNotification) + prevNotificationInfo.removeCount;
						sw.pushTimestamp = timestamp;
						if(sw.notReadedMessageCount > 0 && useCountSummary && countSummaryTemplate && body) {
							notificationBody = countSummaryTemplate.replace('[@content_summary]', body.substring(0, 45));
							notificationBody = notificationBody.replace('[@count]', sw.notReadedMessageCount);
						}
						var notificationOptions = {
							actions: actions,
							body: notificationBody,
							icon: icon,
							data: notificationData,
							image: image,
							badge: badge,
							requireInteraction: requireInteraction,
							silent: silent,
							renotify: renotify,
							tag: notificationTag
						};
						Object.keys(notificationOptions).forEach(function(eachKey){
							if(notificationOptions[eachKey] === null || notificationOptions[eachKey] === void 0) {
								delete(notificationOptions[eachKey]);
							}
						});

						return self.registration.showNotification(title, notificationOptions);
					})
				}

				return Promise.resolve();
			});


		}).catch(function(e) {
			console.error(e);
		})

	);
});

self.addEventListener('notificationclick', function (event) {
	var notification = event.notification;
	var data = notification.data;
	var launchUrl = data ? data.launchUrl : null;
	var push_srl = data ? data.push_srl : null;
	if(event.action && data && data.actions) {
		var targetAction = data.actions.find(function(eachAction){
			return eachAction.action === event.action;
		});
		if(targetAction) {
			launchUrl = targetAction.launchUrl;
		}
	}
	notification.close();

	var timestamp = Date.now();
	var eventObj = {
		timestamp: timestamp
	};
	var document_srl = getDocumentSrl(launchUrl);
	event.waitUntil(Promise.all([
		launchUrl ? clients.matchAll({
		type: "window",
		includeUncontrolled: true
	}).then(function (clientList) {
		var targetClient = clientList.reduce(function(val, client) {
			if(client.frameType === "top-level") {
				var eachVal = {
					client: client,
					isUrlMatched: (document_srl && document_srl === getDocumentSrl(client.url)) || (launchUrl === client.url),
					focused: client.focused,
					visibilityState: client.visibilityState
				};
				if(!val) {
					val = eachVal;
				} else {
					val = getClientPriority(eachVal) >= getClientPriority(val) ? eachVal : val;
				}
			}

			return val;
		}, null);
		if(targetClient) {
			targetClient.client.postMessage({
				name: 'notificationclick',
				title: event.title,
				launchUrl: launchUrl,
				timestamp: timestamp,
				isUrlMatched: targetClient.isUrlMatched
			});

			return targetClient.client.focus();
		}
		if(clients.openWindow) {
			return clients.openWindow(launchUrl);
		}
	}) : Promise.resolve(),
		notiEventHandler('notificationclick', push_srl, eventObj),
		notiStore.onClickPushNotification(push_srl)
	]));
});


self.addEventListener('notificationclose', function(event) {
	event.waitUntil(
		Promise.all([])
	);
});

self.addEventListener('install', function(event) {
	return self.skipWaiting();
});


self.addEventListener('pushsubscriptionchange', function(evt) {
	var data = new FormData();
	data.append('oldEndpoint', evt.oldSubscription ? evt.oldSubscription.endpoint : null);
	data.append('newEndpoint', evt.newSubscription ? evt.newSubscription.endpoint : null);
	data.append('key', evt.newSubscription ? event.newSubscription.toJSON().keys.p256dh : null);
	data.append('auth', evt.newSubscription ? event.newSubscription.toJSON().keys.auth : null);
	data.append('expirationTime', evt.newSubscription ? event.newSubscription.toJSON().expirationTime : null);
	event.waitUntil(
		fetch('/index.php?act=procNotiPushSubscriptionChange', {
			method: "POST",
			body: data,
			cache: 'no-cache',
			credentials: 'omit',
			headers: {
				'Accept': 'application/json'
			}
		}).then(function(response){
			return response.json();
		}).then(function(data){
			if(!data || data.endpoint_srl === -1) {
				return notiStore.clear();
			}
			if(evt.newSubscription) {
				notiStore.set('endpoint', evt.newSubscription.endpoint);
			}
		})
	);
});
