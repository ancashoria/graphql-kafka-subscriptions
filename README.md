# graphql-kafka-subscriptions

**Apollo graphql subscriptions over Kafka protocol**

One producer and one consumer for each node instance. Communication happens over a single kafka topic.

## Installation
`npm install graphql-kafka-subscriptions`

## Usage
```javascript
import { KafkaPubSub } from 'graphql-kafka-subscriptions'

export const pubsub = new KafkaPubSub({
  topic: 'anything',
  host: 'INSERT_KAFKA_IP',
  port: 'INSERT_KAFKA_PORT',
})
```

With multiple Kafka nodes
```javascript
export const pubsub = new KafkaPubSub({
  topic: 'anything',
  host: 'kafka-10.development.foobar.com:9092,kafka-21.development.foobar.com:9092,kafka-22.development.foobar.com:9092',
})
```

```javascript
// as mentioned in the comments of https://github.com/ancashoria/graphql-kafka-subscriptions/issues/4
// you will need to upate the site calls of `publish` in your application as called out below.

// the stock PubSub::publish expects a string and an object
      pubsub.publish('messageAdded', {
        messageAdded: newMessage,
        channelId: message.channelId
      });

// KafkaPubSub::publish expects the first parameter to be inserted into the object
      pubsub.publish({
        channel: 'messageAdded',
        messageAdded: newMessage,
        channelId: message.channelId
      });
```

Special thanks to:
- [davidyaha](https://github.com/davidyaha) for [graphql-redis-subscriptions](https://github.com/davidyaha/graphql-redis-subscriptions) which was the main inspiration point for this project
- [Apollo graphql community](http://dev.apollodata.com/community/)

Help greatly appreciated
