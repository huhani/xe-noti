#!/usr/bin/env node


const {
    performance
} = require('perf_hooks');

var args = process.argv.slice(2);

if (args.length == 0) {
    console.log("Usage: receive_logs_direct.js [info] [warning] [error]");
    process.exit(1);
}

amqp.connect('amqp://mq_test:mq_test@127.0.0.1/mq_test', function(error0, connection) {
    if (error0) {
        throw error0;
    }
    connection.createChannel(function(error1, channel) {
        if (error1) {
            throw error1;
        }
        var q = 'mq_test-queue';
        channel.assertQueue(q);
        channel.prefetch(1); // 큐에서 한개씩꺼내서 처리함.



        channel.consume(q, function(msg) {
            try {
                var data = JSON.parse(msg.content);
                var routingKey = msg.fields.routingKey;
                if(data.num % 100 == 0) {
                    console.log(" [x] %s: '%s'", msg.fields.routingKey, data.num);
                }
            } catch(e) {

            }

            channel.ack(msg);
        });

    });
});