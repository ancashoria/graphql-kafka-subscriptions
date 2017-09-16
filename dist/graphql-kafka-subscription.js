"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var Kafka = require("node-rdkafka");
var pubsub_async_iterator_1 = require("./pubsub-async-iterator");
var KafkaPubSub = (function () {
    function KafkaPubSub(options) {
        var _this = this;
        this.options = options;
        this.subscriptionMap = {};
        this.channelSubscriptions = {};
        this.producer = this.createProducer(this.options.topic);
        this.consumer = this.createConsumer(this.options.topic);
        this.consumer.on('data', function (message) {
            console.log('Got message');
            _this.onMessage(JSON.parse(message.value.toString()));
        });
    }
    KafkaPubSub.prototype.publish = function (payload) {
        return this.producer.write(new Buffer(JSON.stringify(payload)));
    };
    KafkaPubSub.prototype.subscribe = function (channel, onMessage, options) {
        var index = Object.keys(this.subscriptionMap).length;
        this.subscriptionMap[index] = [channel, onMessage];
        this.channelSubscriptions[channel] = (this.channelSubscriptions[channel] || []).concat([
            index
        ]);
        return Promise.resolve(index);
    };
    KafkaPubSub.prototype.unsubscribe = function (index) {
        var channel = this.subscriptionMap[index][0];
        this.channelSubscriptions[channel] = this.channelSubscriptions[channel].filter(function (subId) { return subId !== index; });
    };
    KafkaPubSub.prototype.asyncIterator = function (triggers) {
        return new pubsub_async_iterator_1.PubSubAsyncIterator(this, triggers);
    };
    KafkaPubSub.prototype.onMessage = function (_a) {
        var channel = _a.channel, message = __rest(_a, ["channel"]);
        var subscriptions = this.channelSubscriptions[channel];
        if (!subscriptions) {
            return;
        }
        for (var _i = 0, subscriptions_1 = subscriptions; _i < subscriptions_1.length; _i++) {
            var subId = subscriptions_1[_i];
            var _b = this.subscriptionMap[subId], cnl = _b[0], listener = _b[1];
            listener(message);
        }
    };
    KafkaPubSub.prototype.createProducer = function (topic) {
        var producer = Kafka.Producer.createWriteStream({
            'metadata.broker.list': this.options.host + ":" + this.options.port
        }, {}, { topic: topic });
        producer.on('error', function (err) {
            console.error('Error in our kafka stream');
            console.error(err);
        });
        return producer;
    };
    KafkaPubSub.prototype.createConsumer = function (topic) {
        var randomGroupId = Math.ceil(Math.random() * 9999);
        var consumer = Kafka.KafkaConsumer.createReadStream({
            'group.id': "kafka-group-" + randomGroupId,
            'metadata.broker.list': this.options.host + ":" + this.options.port,
        }, {}, {
            topics: [topic]
        });
        return consumer;
    };
    return KafkaPubSub;
}());
exports.KafkaPubSub = KafkaPubSub;
//# sourceMappingURL=graphql-kafka-subscription.js.map