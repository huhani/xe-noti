
const webpush = require('web-push');
var AMQPManager = require('./src/AMQPManager');
var config = require('./config');

/*

var amqpManager = new AMQPManager(config.MessageQueue);
var connectManager = amqpManager.getConnectManager();
var channel = connectManager.createChannel();
channel.assertQueue("noti-queue-push");
channel.prefetch(1);
channel.consume("noti-queue-push", function(msg){

    //var data = JSON.parse(msg.content);
    var routingKey = msg.fields.routingKey;
    console.log(msg);

    channel.ack(msg);
});

var channel2 = connectManager.createChannel();
channel2.assertQueue("noti-queue-push");
setInterval(function() {
    channel.publish("noti-exchange", "noti-key-push", Buffer.from("This is a test", 'utf-8'));
}, 3500);

*/


var endpoint = "https://fcm.googleapis.com/fcm/send/eHOcaMZHzaA:APA91bGjDmaTBtxiqM28brL89P9brv_jJMtHxuCJTvM5YU9jVbwRKglLiMBRHVMt5bJuvTcQWiRWRy1nL4a65_KzwkQ3a7WXEsO08XhyzDkZl-NE1jXyPMXc_K4qa3S9he-UGJGKe1Hn";
var auth = "W1dYqk_elafVhfi6vVjFBA";
var key = "BOTAAWkMOV2OvrVssRxiVqOjT0KI1KiHyOZNcll1qX9Q-63Gy6hDW8i2RfJCJtchmQOB5TjzhSWe8Y23lafKxaQ";
/*
var endpoint = "https://fcm.googleapis.com/fcm/send/e8hfypOFZtw:APA91bHEtnfKaPyElgvNRmMMNmJFip-lOuJZrCZHFFXjHXv7mWzhgaV3I7ugAz_bDuiSMA8lqp5o_ocwxgr9dAhdsHWLz0_YYFXVGFjZmTZc_6o_8N8YgJffvrW95hFtAdPmIGwEsO2n";
var auth = "-RlErb17hqNZm1ucERmfaA==";
var key = "BD--m47eZUbz64Ypx7m6Fz5mJKFrKYxRVje7Cwx5LpB8H7QbHuOqDsNksHXL4lFzEdsDRa6hQ1ZbwdNRwye4Nnw=";
*/
const pushSubscription = {
    endpoint: endpoint,
    keys: {
        p256dh: key,
        auth: auth
    }
};
const options = {
    gcmAPIKey: config.FCM.ServerKey,
    vapidDetails: {
        subject: config.VAPID.subject,
        publicKey: config.VAPID.publicKey,
        privateKey: config.VAPID.privateKey
    },
    timeout: 2,
    TTL: 1 * 60 * 60,
    headers: {
    },
    contentEncoding: 'aesgcm'
}


var payloadSample = {
    title: "개발 테스트4",
    body: "상황은 언제든지 바뀔 수 있다 내가 바뀌지 않기 떄문에 해결되지 않는 것이다 이 세상에서 가장 중요한 때는 바로 지금이고, 가장 중요한 사람은 바로 지금 내가 ...",
    icon: "https://dev43.dnip.co.kr/modules/noti/tpl/default.jpg",
    badge: null,
    image: "https://dev43.dnip.co.kr/files/attach/images/2021/01/31/54704749dab0ecb040313706355f2238.png",
    requireInteraction: false,
    renotify: true,
    silent: false,
    vibrate: [300, 300, 300, 300, 300, 300, 300],
    tag: 'notification-dev',
    actions: [],
    data: {
        count: 12355, teststr: "asdfffffffffffff"
    }
};


const payload = '안녕!!';
webpush.sendNotification(
    pushSubscription,
    JSON.stringify(payloadSample),
    options
).then(function(data){
    console.log("done!!", data);
})['catch'](function(err){
    console.error("Err", err);
})