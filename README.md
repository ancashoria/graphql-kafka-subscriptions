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

Special thanks to:
- [davidyaha](https://github.com/davidyaha) for [graphql-redis-subscriptions](https://github.com/davidyaha/graphql-redis-subscriptions) which was the main inspiration point for this project
- [Apollo graphql community](http://dev.apollodata.com/community/)

Help greatly appreciated