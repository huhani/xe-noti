(function(){
    window.jQuery(document).ready(function($){
        var notiClient = NotiClientContainer.getInstance();
        var notiStore = NotiStoreContainer.getInstance();

        var requestJob = null;
        function updateUI() {
            if(requestJob) {
                requestJob.abort();
            }
            if('serviceWorker' in navigator && 'PushManager' in window) {
                navigator.serviceWorker.getRegistrations().then(function(serviceWorkerRegistration){
                    $('.notiDebugContainer .serviceWorkerStatus').html(serviceWorkerRegistration.length > 0 ? "설치" : "미설치");
                });
                $('.notiDebugContainer .supportedEncoding').html((PushManager.supportedContentEncodings || ['aesgcm']).join(', '));
            } else {
                $('.notiDebugContainer .serviceWorkerStatus').html("미지원");
            }

            if('serviceWorker' in navigator && 'showNotification' in ServiceWorkerRegistration.prototype) {
                $('.notiDebugContainer .notificationStatus').html(Notification.permission);
                Promise.all([notiClient.getEndpoint(), notiStore.get('endpoint_srl')]).then(function(result){
                    var subscription = result[0];
                    var endpoint_srl = result[1];
                    if(subscription) {
                        var toJSON = subscription.toJSON();
                        $('.notiDebugContainer .endpoint').html(toJSON.endpoint);
                        $('.notiDebugContainer .key').html(toJSON.keys.p256dh);
                        $('.notiDebugContainer .auth').html(toJSON.keys.auth);
                        if(endpoint_srl) {
                            requestJob = notiClient.constructor.exec_json("noti.getNotiCheckValidEndpoint", {
                                endpoint: toJSON.endpoint,
                                endpoint_srl: endpoint_srl
                            }, function(retObj){
                                $('.notiDebugContainer .isValid').html(retObj.isValid ? "유효" : "올바르지 않은 단말기");
                            });
                        }
                    } else {
                        $('.notiDebugContainer .endpoint').html("-");
                        $('.notiDebugContainer .key').html("-");
                        $('.notiDebugContainer .auth').html("-");
                        $('.notiDebugContainer .isValid').html("미등록");
                    }
                    $('.notiDebugContainer .endpointSrl').html(endpoint_srl ? endpoint_srl : "-");

                })['catch'](function(err) {
                    // todo
                });
            } else {
                $('.notiDebugContainer .notificationStatus').html("미지원");
            }
        }

        var subscribeJob = false;
        $(document).on('click', '.notiDebugContainer .subscribeBtn', function() {
            if(subscribeJob) {
                alert("이미 진행중인 작업이 있습니다.");
                return;
            }

            subscribeJob = true;
            notiClient.subscribe().then(function() {
                alert("구독 성공");
            })['catch'](function(err){
                alert("구독 실패.\n사유 : "+err.message);
            }).then(function(){
                subscribeJob = false;
                updateUI();
            });
        });

        $(document).on('click', '.notiDebugContainer .unsubscribeBtn', function() {
            if(subscribeJob) {
                alert("이미 진행중인 작업이 있습니다.");
                return;
            }

            subscribeJob = true;
            notiClient.closeAllNotification();
            notiClient.unsubscribe().then(function() {
                alert("구독해지 성공");
            })['catch'](function(err){
                alert("구독해지 실패.\n사유 : "+err.message);
            }).then(function(){
                subscribeJob = false;
                updateUI();
            });
        });

        var removeSW = false;
        $(document).on('click', '.notiDebugContainer .removeSWBtn', function() {
            if(!('serviceWorker' in navigator)) {
                return;
            }

            if(removeSW) {
                alert("이미 진행중인 작업이 있습니다.");
                return;
            }
            removeSW = true;
            notiClient.removeServiceWorker().then(function() {
                window.location.reload();
            });
        });

        $(document).on('click', '.notiDebugContainer .resetIndexedDBBtn', function() {
            if(notiStore.constructor.isSupported()) {
                notiStore.clearPushLog();
            }
        });

        $(document).on('click', '.notiDebugContainer .closeAllNotificationBtn', function() {
            notiClient.closeAllNotification();
        });

        $(document).on('click', '.notiDebugContainer .pushTestBtn', function() {
            if(!notiClient.constructor.isSupported()) {
                alert("푸시를 지원하지 않는 브라우저입니다.");
                return;
            }

            notiClient.getEndpoint().then(function(result){
                if(result) {
                    return notiClient.pushTest();
                } else {
                    alert("푸시가 활성화되지 않았거나 구독중이지 않습니다.");
                }
            });
        });

        updateUI();
    });
})();