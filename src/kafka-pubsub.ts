import * as Kafka from 'kafkajs'
import { PubSubEngine } from 'graphql-subscriptions'
import * as Logger from 'bunyan';
import { createChildLogger } from './child-logger';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

export interface IKafkaOptions {
  topic: string
  host: string
  port: string
  logger?: Logger,
  groupId?: any,
  globalConfig?: object,
  topicConfig?: object,
  useHeaders?: boolean,
  keyFun?: (any) => Buffer
}

const defaultLogger = Logger.createLogger({
  name: 'pubsub',
  stream: process.stdout,
  level: 'info'
})

export class KafkaPubSub extends PubSubEngine {

  protected kafka: Kafka.Kafka
  protected producer: Kafka.Producer // ProducerStream not exported
  protected consumer: Kafka.Consumer // ConsumerStream not exported
  protected options: any

  private eventEmitter: EventEmitter;
  private subscriptions: { [key: string]: [string, (...args: any[]) => void] }
  private subIdCounter: number;

  protected logger: Logger

  constructor(options: IKafkaOptions) {
    super()
    this.options = options
    this.logger = createChildLogger(this.options.logger || defaultLogger, 'KafkaPubSub')

    this.eventEmitter = new EventEmitter();
    this.subscriptions = {};
    this.subIdCounter = 0;

    this.kafka = new Kafka.Kafka(
      Object.assign(this.options, { brokers: this.brokerList() })
    )
  }

  brokerList(){
    return this.options.port ? [`${this.options.host}:${this.options.port}`] : this.options.host.split(',')
  }

  public async publish(channel: string, payload: any): Promise<void> {
    // only create producer if we actually publish something
    this.producer = this.producer || await this.createProducer()

    let kafkaPayload = payload

    if (!this.options.useHeaders) {
      kafkaPayload = {
        channel: channel,
        timestamp: Date.now(),
        payload: payload
      }
    }

    if (this.logger.debug) {
      this.logger.debug("Publish %s", JSON.stringify(kafkaPayload))
    }

    this.producer.send({
      topic: this.options.topic,
      messages: [
        {
          key: this.options.keyFun ? this.options.keyFun(kafkaPayload) : null,
          headers: this.options.useHeaders ? { channel: Buffer.from(channel) } : {},
          value: this.serialiseMessage(kafkaPayload)
        }
      ]
    })
  }

  public async subscribe(channel: string, onMessage: (...args: any[]) => void, options?: Object): Promise<number> {
    this.logger.info("Subscribing to %s", channel)
    this.consumer = this.consumer || await this.createConsumer(this.options.topic)
    const wrapper = (...args: any[]) => {
      if (this.options.useHeaders) {
        onMessage(this.deserialiseMessage(args[0]))
      } else {
        onMessage(...args)
      }
    }
    this.eventEmitter.addListener(channel, wrapper)
    this.subIdCounter = this.subIdCounter + 1
    this.subscriptions[this.subIdCounter] = [channel, wrapper]
    return Promise.resolve(this.subIdCounter)
  }

  public unsubscribe(index: number) {
    const [channel, onMessage] = this.subscriptions[index];
    this.logger.info("Unsubscribing from %s", channel)
    delete this.subscriptions[index]
    this.eventEmitter.removeListener(channel, onMessage);
  }

  public async close(): Promise<void> {
    if (this.producer) {
      await this.producer.disconnect()
    }

    if (this.consumer) {
      await this.consumer.disconnect()
    }
  }

  private serialiseMessage(message: any): string {
    return JSON.stringify(message)
  }

  private deserialiseMessage(message: string): any {
    return JSON.parse(message)
  }

  private async createProducer(): Promise<Kafka.Producer> {
    const producer = this.kafka.producer()
    await producer.connect()
    return producer
  }

  private async handleMessage(topic: string, _: number, message: Kafka.Message) {
    if (this.options.useHeaders && message.headers) {
      const channelHeader = message.headers['channel']
      if (channelHeader) {
        const channel = channelHeader.toString()
        this.eventEmitter.emit(channel, message.value) // do not parse yet
      } else {
        this.logger.warn("Missing 'channel' header")
      }
    } else {
      const parsedMessage = this.deserialiseMessage(message.value.toString())
      if (parsedMessage.channel) {
        // Using channel abstraction
        this.eventEmitter.emit(parsedMessage.channel, parsedMessage.payload)
      } else {
        // No channel abstraction, publish over the whole topic
        this.eventEmitter.emit(topic, parsedMessage)
      }
    }
  }

  private async createConsumer(topic: string): Promise<Kafka.Consumer> {
    // Create a group for each instance. The consumer will receive all messages from the topic
    const groupId = this.options.groupId || uuidv4()

    const consumer = this.kafka.consumer({ groupId })
    await consumer.connect()
    await consumer.subscribe({ topic: this.options.topic })
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        this.handleMessage(topic, partition, message)
      },
    })
    return consumer
  }
}
