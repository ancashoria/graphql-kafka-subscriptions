# graphql-kafka-subscriptions

## Installation
`npm install graphql-kafka-subscriptions`

## Usage
```
import { KafkaPubSub } from 'graphql-kafka-subscriptions'

export const pubsub = new KafkaPubSub({
  topic: 'anything',
  host: 'INSERT_KAFKA_IP',
  port: 'INSERT_KAFKA_PORT',
})
```

