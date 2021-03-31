(function(){

    if('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', function(event) {
            if(event.data) {
                var evtData = event.data;
                var name = evtData.name;
                var launchUrl = evtData.launchUrl;
                var isUrlMatched = evtData.isUrlMatched;
                switch(name) {
                    case 'notificationclick':
                        if(launchUrl) {
                            window.location.href = launchUrl;
                        }
                        break;
                }
            }
        });
    }

})();