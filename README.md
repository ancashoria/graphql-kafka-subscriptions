# graphql-kafka-subscriptions

It implements the PubSubEngine Interface from the graphql-subscriptions package and also the new AsyncIterator interface. It allows you to connect your subscriptions manager to a single Kafka topic used as Pub/Sub communication channel.

## Installation

`npm install graphql-kafka-subscriptions`

### Mac OS High Sierra / Mojave

OpenSSL has been upgraded in High Sierra and homebrew does not overwrite default system libraries. That means when building node-rdkafka, because you are using openssl, you need to tell the linker where to find it:

```sh
export CPPFLAGS=-I/usr/local/opt/openssl/include
export LDFLAGS=-L/usr/local/opt/openssl/lib
```

Then you can run `npm install` on your application to get it to build correctly.

## Usage


### Initializing the kafka pubsub client

```js
import { KafkaPubSub } from 'graphql-kafka-subscriptions'

export const pubsub = new KafkaPubSub({
  topic: 'name-of-the-topic',
  host: 'INSERT_KAFKA_IP',
  port: 'INSERT_KAFKA_PORT',
  globalConfig: {} // options passed directly to the consumer and producer
})
```

### Publishing messages to the subcrition

```js
payload = {
  firstName: "John",
  lastName: "Doe"
}

pubsub.publish('pubSubChannel', payload);
```

###  Subscribing to a channel

```js
const onMessage = (payload) => {
  console.log(payload);
}

const subscription = await pubsub.subscribe('pubSubChannel', onMessage)
```

## Running the test

This repository uses Docker and Docker Compose to run the tests. Please use the script *test.sh* to run the tests.

```bash
./test.sh
```

## Contributing

Contributions are welcome. Make sure to check the existing issues (including the closed ones) before requesting a feature, reporting a bug or opening a pull requests.

For sending a PR follow:

1. Fork it (<https://github.com/ancashoria/graphql-kafka-subscriptions/fork>)
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create a new Pull Request


**Horia Miron notes:**

Thanks to [davidyaha][1] for [graphql-redis-subscriptions][2] which was the main inspiration point for this project.

[1]: https://github.com/davidyaha
[2]: https://github.com/davidyaha/graphql-redis-subscriptions
