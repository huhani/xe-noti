(function(){

    Messenger.options = {
        extraClasses: "messenger-fixed messenger-on-bottom messenger-on-left",
        maxMessages: 5,
        theme: "air"
    };

    if('serviceWorker' in navigator) {
        $(document).on('click', 'a[data-push-srl]', function(evt){
            var $target = $(evt.target);
            var pushSrl = parseInt($target.attr('data-push-srl'), 10);
            if(isNaN(pushSrl)) {
                return;
            }

            setTimeout(function(){
                var notiClient = NotiClientContainer.getInstance();
                notiClient.setPushClick(pushSrl);
            }, 0);

            return true;
        });

        navigator.serviceWorker.addEventListener('message', function(event) {
            if(event.data) {

                var evtData = event.data;
                var name = evtData.name;
                switch(name){

                    case 'push':
                        var launchUrl = evtData.launchUrl || "javascript:;";
                        var body = evtData.body;
                        if(body && body.indexOf("\n") > -1) {
                            body = "<BR>" + body.replace(/(?:\r\n|\r|\n)/g, '<br>');
                        }
                        var type = evtData.type;
                        var typeText = type.name !== "manual" ? type.text + " 알림" : type.text;
                        options = {
                            type: "success",
                            message: '<a href="' + launchUrl + '" data-push-srl="'+evtData.pushSrl+'"><strong>'+type.text+'</strong>: ' + body + '</a>',
                            hideAfter: 20,
                            showCloseButton: true
                        };
                        Messenger().post(options);

                        break;

                    case 'notificationclick':
                        var launchUrl = evtData.launchUrl;
                        var isUrlMatched = evtData.isUrlMatched;
                        if(launchUrl) {
                            window.location.href = launchUrl;
                        }

                        break;
                }
            }
        });
    }

})();