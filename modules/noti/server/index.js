
const webpush = require('web-push');
var AMQPManager = require('./src/AMQPManager');
var config = require('./config');
var DB = require('./src/DB');
var makeDeferred = require("./src/makeDeferred");
var always = require('./src/always');
var RXHelper = require('./src/RXHelper/RXHelper');


var amqpManager = new AMQPManager(config.MessageQueue);
var connectManager = amqpManager.getConnectManager();
var channel = connectManager.createChannel();
var db = new DB(config.RhymixDB);
channel.assertQueue("noti-queue-push");
channel.prefetch(config.MessageQueue.pushPrefetchCount);
channel.consume("noti-queue-push", function(msg){
    always(new Promise(function(resolve, reject){
        db.getConnection().then(function(conn){
            var rxHelper = new RXHelper(config, conn);
            var data = JSON.parse(msg.content);
            var args = {};
            args.mqChannel = channel;
            args.data = data;
            var trigger = rxHelper.callTrigger('pushNotification', args);
            var promise = trigger ? always(trigger.whenComplete()) : Promise.resolve();
            promise.then(function(){
                if(conn.state !== 'disconnected') {
                    conn.release();
                }
                resolve();
            });
        })['catch'](function(err){
            console.error(err);
            reject(err);
        });
    })).then(function(){
        console.log("DONE!!!");
        channel.ack(msg);
    });

});



channel.consume("noti-queue-trigger", function(msg){
    always(new Promise(function(resolve, reject){
        db.getConnection().then(function(conn){
            var rxHelper = new RXHelper(config, conn);
            var data = JSON.parse(msg.content);
            var args = {};
            var triggerName = data.type;
            args.mqChannel = channel;
            args.type = data.type;
            args.client = data.client;
            args.logged_info = data.logged_info;
            args.request = data.request;
            args.data = data.data;

            var trigger = rxHelper.callTrigger(triggerName, args);
            var promise = trigger ? always(trigger.whenComplete()) : Promise.resolve();
            promise.then(function(){
                if(conn.state !== 'disconnected') {
                    conn.release();
                }
                resolve();
            });
        })['catch'](function(err){
            console.error(err);
            reject(err);
        });
    })).then(function(){
        channel.ack(msg);
    });


});
