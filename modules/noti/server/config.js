
module.exports = {
    MessageQueue: {
        host: "127.0.0.1",
        port: 5672,
        vhost: "noti_vhost",
        userID: "noti_push",
        userPW: "nOt1t3stAcc0unt",
        retry: 10, // sec
        triggerPrefetchCount: 5,
        pushPrefetchCount: 120
    },
    RhymixDB: {
        host: "127.0.0.1",
        port: 3306,
        dbName: "",
        dbUserID: "",
        dbUserPW: "",
        prefix: "rx_",
        connectionLimit: 120
    },
    VAPID: {
        publicKey: "",
        privateKey: "",
        subject: "mailto:root@localhost"
    },
    FCM: {
        serverKey: "",
        id: ""
    }
};
