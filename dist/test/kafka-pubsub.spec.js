"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock('../index');
var index_1 = require("../index");
index_1.KafkaPubSub.mockImplementation(function () {
    return {
        publish: jest.fn(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        asyncIterator: jest.fn(),
    };
});
var pubsub = new index_1.KafkaPubSub({
    topic: 'something',
    host: 'localhost',
    port: '9092',
    createProducer: function () { return ({
        write: function (msg) { return msg; }
    }); }
});
describe('KafkaPubSub', function () {
    it('should subscribe correctly', function () {
        pubsub.asyncIterator('testchannel');
        expect(pubsub.subscribe).toBeCalled();
    });
});
//# sourceMappingURL=kafka-pubsub.spec.js.map