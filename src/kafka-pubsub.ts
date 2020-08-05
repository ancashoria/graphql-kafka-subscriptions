import * as Kafka from 'node-rdkafka'
import { PubSubEngine } from 'graphql-subscriptions'
import * as Logger from 'bunyan';
import { createChildLogger } from './child-logger';
import { PubSubAsyncIterator } from './pubsub-async-iterator'

export interface IKafkaOptions {
  topic: string
  host: string
  port: string
  logger?: Logger,
  groupId?: any,
  globalConfig?: object,
}

export interface IKafkaProducer {
  write: (input: Buffer) => any
}

export interface IKafkaTopic {
  readStream: any
  writeStream: any
}

const defaultLogger = Logger.createLogger({
  name: 'pubsub',
  stream: process.stdout,
  level: 'info'
})

export class KafkaPubSub implements PubSubEngine {
  protected producer: any
  protected consumer: any
  protected options: any
  protected subscriptionMap: { [subId: number]: [string, Function] }
  protected channelSubscriptions: { [channel: string]: Array<number> }
  protected logger: Logger

  constructor(options: IKafkaOptions) {
    this.options = options
    this.subscriptionMap = {}
    this.channelSubscriptions = {}
    this.consumer = this.createConsumer(this.options.topic)
    this.logger = createChildLogger(
      this.options.logger || defaultLogger, 'KafkaPubSub')
  }

  public publish(payload) {
    // only create producer if we actually publish something
    this.producer = this.producer || this.createProducer(this.options.topic)
    return this.producer.write(new Buffer(JSON.stringify(payload)))
  }

  public subscribe(
    channel: string,
    onMessage: Function,
    options?: Object
): Promise<number> {
    const index = Object.keys(this.subscriptionMap).length
    this.subscriptionMap[index] = [channel, onMessage]
    this.channelSubscriptions[channel] = [
      ...(this.channelSubscriptions[channel] || []), index
    ]
    return Promise.resolve(index)
  }

  public unsubscribe(index: number) {
    const [channel] = this.subscriptionMap[index]
    this.channelSubscriptions[channel] = this.channelSubscriptions[channel].filter(subId => subId !== index)
  }

  public asyncIterator<T>(triggers: string | string[]): AsyncIterator<T> {
    return new PubSubAsyncIterator<T>(this, triggers)
  }

  private onMessage(channel: string, message) {
    const subscriptions = this.channelSubscriptions[channel]
    if (!subscriptions) { return } // no subscribers, don't publish msg
    for (const subId of subscriptions) {
      const [cnl, listener] = this.subscriptionMap[subId]
      listener(message)
    }
  }

  brokerList(){
    return this.options.port ? `${this.options.host}:${this.options.port}` : this.options.host
  }

  private createProducer(topic: string) {
    const producer = Kafka.createWriteStream(
        Object.assign({}, {'metadata.broker.list': this.brokerList()}, this.options.globalConfig),
        {},
        {topic}
    );
    producer.on('error', (err) => {
      this.logger.error(err, 'Error in our kafka stream')
    })
    return producer
  }

  private createConsumer(topic: string) {
    // Create a group for each instance. The consumer will receive all messages from the topic
    const groupId = this.options.groupId || Math.ceil(Math.random() * 9999)
    const stream = Kafka.createReadStream(
        Object.assign(
          {},
          {
            'group.id': `kafka-group-${groupId}`,
            'metadata.broker.list': this.brokerList(),
          },
          this.options.globalConfig,
        ),
        {},
        { topics: [topic] }
    );
    stream.on('data', (message) => {
      let parsedMessage = JSON.parse(message.value.toString())

      // Using channel abstraction
      if (parsedMessage.channel) {
        const { channel, ...payload } = parsedMessage
        this.onMessage(parsedMessage.channel, payload)

      // No channel abstraction, publish over the whole topic
      } else {
        this.onMessage(topic, parsedMessage)
      }
    })
    return stream
  }
}
