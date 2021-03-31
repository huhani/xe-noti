(function($){
    window.notiPushPreview = function(push_srl) {
        exec_json('noti.getNotiAdminPushLog', {
            push_srl: push_srl,
            module: 'admin'
        }, function(ret_obj) {
            var data = ret_obj.data;
            var push_srl = data ? data.push_srl : null;
            if(push_srl) {
                var payload = JSON.parse(data.push_payload);
                var notiClient = NotiClientContainer.getInstance();
                if(notiClient.constructor.isSupported()) {
                    notiClient.showNotification(payload)['catch'](function(err){
                        alert('Error: '+err.name + "\n<BR>Message: "+err.message)
                    });
                }
            } else {
                alert("푸시 데이터를 가져올 수 없습니다.");
            }

        });
    };

    var resendCount = null;
    var currentCount = null;
    var canceled = false;
    var resendTimerID = null;

    window.notiPushResendCancel = function notiPushResendCancel() {
        if(resendTimerID !== null) {
            window.clearTimeout(resendTimerID);
            resendTimerID = null;
        }
        canceled = true;
        var $resendPushStatus = $('.resend-push-status');
        $('.resend-push-btn').removeClass('x_disabled');
        $resendPushStatus.hide();
        $resendPushStatus.find('.current-count').html('0');
        $resendPushStatus.find('.total-count').html('0');
        resendCount = null;
        currentCount = null;
        canceled = false;
        resendTimerID = null;
    };

    window.notiPushResend = function(push_srl) {
        var $resendPushStatus = $('.resend-push-status');
        var $pushBtn = $('.resend-push-btn');
        var $pushCount = $('.resend-push-count');
        var $currentCount = $resendPushStatus.find('.current-count');
        var $totalCount = $resendPushStatus.find('.total-count');
        if($pushBtn.hasClass('x_disabled')) {
            return;
        }

        canceled = false;
        var count = parseInt($pushCount.val(), 10);
        if(isNaN(count) || count <= 0 || count > 100000000) {
            alert("올바르지 않은 입력값입니다.");
            return;
        }

        if(!confirm("한 번 전송요청된 메세지는 취소할 수 없습니다.\n정말로 보내시겠습니까?")) {
            return false;
        }

        if(count >= 20) {
            var msg = confirm(count+"개의 푸시를 재전송합니다.\n" +
                "공격급에 해당하는 대량의 메세지를 해당 단말기로 보냅니다." +
                "\n테스트 용도가 아닌 이상 이 기능을 사용하지 마십시오." +
                "\n정말로 요청을 진행하시겠습니까?");
            if(!msg) {
                return false;
            }
        }



        $('.resend-push-status').show();
        resendCount = count;
        leftCount = resendCount;
        currentCount = 0;
        $pushBtn.addClass('x_disabled');
        $currentCount.html('0');
        $totalCount.html(resendCount);

        var fn = function() {
            if(leftCount <= 0) {
                alert("재전송 요청 완료.");
            }
            if(canceled || leftCount <= 0) {
                notiPushResendCancel();
                return;
            }

            var eachCount = Math.min(leftCount, 2500);
            currentCount += eachCount;
            leftCount -= eachCount;
            exec_json('noti.procNotiAdminPushResend', {
                push_srl: push_srl,
                module: 'admin',
                resend_count: eachCount
            }, function(ret_obj) {
                $currentCount.html(resendCount - leftCount);
                resendTimerID = window.setTimeout(fn,170);
            }, function() {
                notiPushResendCancel();
            });
        };

        fn();
    };


})(window.jQuery);