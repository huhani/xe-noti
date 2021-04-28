
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
        dbName: "rx_test",
        dbUserID: "rx_test",
        dbUserPW: "rhymix_test!@",
        prefix: "rx_",
        connectionLimit: 120
    },
    VAPID: {
        publicKey: "BIXKW3zzWsF5957dyS-vYPvg_vU8i8rL7nkDu6uj5SLPM7ERllkKrj6dUfNirA86UqTo6NJQTVXstv6C2BMXtVs",
        privateKey: "oh0Mnq5muwS3xNb8SS8ETsbijaLYOZn_ZZ27dpGGElc",
        subject: "mailto:mmia268@gmail.com"
    },
    FCM: {
        serverKey: "AAAAFqYj14I:APA91bEIP4znqrJQInF3vVVg3VQSaQEkB1kMqJ5JCEH1tLv5vJtGlplcvyC_s3XOQBIRG8aQ8ZzPDgIgQK0YfrMCvC4o57HPsKW90ZKk691-9IUHKsKBXDnOTNj0jZCPVCH-CQ3gWief",
        id: "97276647298"
    }
};
