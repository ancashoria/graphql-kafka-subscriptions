import * as Kafka from 'node-rdkafka'
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

  protected producer: Kafka.HighLevelProducer // ProducerStream not exported
  protected consumer: Kafka.KafkaConsumer // ConsumerStream not exported 
  protected options: any

  private ee: EventEmitter;
  private subscriptions: { [key: string]: [string, (...args: any[]) => void] }
  private subIdCounter: number;

  protected logger: Logger

  constructor(options: IKafkaOptions) {
    super()
    this.options = options
    this.logger = createChildLogger(this.options.logger || defaultLogger, 'KafkaPubSub')

    this.ee = new EventEmitter();
    this.subscriptions = {};
    this.subIdCounter = 0;
  }

  public async publish(channel: string, payload: any): Promise<void> {
    // only create producer if we actually publish something
    this.producer = this.producer || await this.createProducer()

    let kafkaPayload = payload
    if (!this.options.useHeaders) {
      kafkaPayload = {
        channel: channel,
        payload: payload
      }
    }

    if (this.logger.debug) {
      this.logger.debug("Publish %s", JSON.stringify(kafkaPayload))
    }

    return new Promise((resolve, reject) => {
      this.producer.produce(
        this.options.topic,
        null,
        this.serialiseMessage(kafkaPayload),
        this.options.keyFun ? this.options.keyFun(kafkaPayload) : null,
        Date.now(),
        this.options.useHeaders ? [{ channel: Buffer.from(channel) }] : null,
        (err) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
    })
  }

  public async subscribe(channel: string, onMessage: (...args: any[]) => void, options?: Object): Promise<number> {
    this.logger.info("Subscribing to %s", channel)
    this.consumer = this.consumer || await this.createConsumer(this.options.topic)
    const internalMessage = (...args: any[]) => {
      if (this.options.useHeaders) {
        onMessage(this.deserialiseMessage(args[0]))
      } else {
        onMessage(...args)
      }
    }
    this.ee.addListener(channel, internalMessage)
    this.subIdCounter = this.subIdCounter + 1
    this.subscriptions[this.subIdCounter] = [channel, internalMessage]
    return Promise.resolve(this.subIdCounter)
  }

  public unsubscribe(index: number) {
    const [channel, onMessage] = this.subscriptions[index];
    this.logger.info("Unsubscribing from %s", channel)
    delete this.subscriptions[index]
    this.ee.removeListener(channel, onMessage);
  }

  public async close(): Promise<void> {
    let producerPromise: Promise<void>
    producerPromise = new Promise((resolve, reject) => {
      if (this.producer) {
        this.producer.disconnect((err) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      }
    })
    let consumerPromise: Promise<void>
    consumerPromise = new Promise((resolve, reject) => {
      if (this.consumer) {
        this.consumer.disconnect((err) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      }
    })
    return Promise.all([producerPromise, consumerPromise]).then()
  }

  brokerList() {
    return this.options.port ? `${this.options.host}:${this.options.port}` : this.options.host
  }

  private serialiseMessage(message: any): Buffer {
    return Buffer.from(JSON.stringify(message))
  }

  private deserialiseMessage(message: Buffer): any {
    return JSON.parse(message.toString())
  }

  private async createProducer(): Promise<Kafka.HighLevelProducer> {
    const producer = new Kafka.HighLevelProducer(
      Object.assign(
        {},
        {
          'metadata.broker.list': this.brokerList(),
        },
        this.options.globalConfig),
      Object.assign(
        {},
        {},
        this.options.topicConfig
      )
    );
    producer.on('event.error', (err) => {
      this.logger.error(err)
    })
    return new Promise((resolve, reject) => {
      producer.on('ready', (data, metadata) => {
        let topics = metadata.topics.map(topic => topic.name);
        this.logger.info('Connected, found topics: %s', topics);

        resolve(producer);
      })

      this.logger.info("Connecting producer ...")
      producer.connect();
    })
  }

  private async createConsumer(topic: string): Promise<Kafka.KafkaConsumer> {
    // Create a group for each instance. The consumer will receive all messages from the topic
    const groupId = this.options.groupId || uuidv4()

    const consumer = new Kafka.KafkaConsumer(
      Object.assign(
        {},
        {
          'group.id': `kafka-pubsub-${groupId}`,
          'metadata.broker.list': this.brokerList()
        },
        this.options.globalConfig,
      ),
      Object.assign(
        {},
        { "auto.offset.reset": "latest" },
        this.options.topicConfig
      ));

    consumer.on('data', (message) => {
      if (this.logger.debug) {
        this.logger.debug("Received %s", message.value.toString())
      }

      if (this.options.useHeaders && message.headers) {
        const channelHeader = message.headers.find((header: Kafka.MessageHeader) => { return "channel" in header })
        if (channelHeader) {
          const channel = channelHeader.channel.toString()
          this.ee.emit(channel, message.value) // do not parse yet
        } else {
          this.logger.warn("Missing 'channel' header")
        }
      } else {
        const parsedMessage = this.deserialiseMessage(message.value)
        if (parsedMessage.channel) {
          // Using channel abstraction
          this.ee.emit(parsedMessage.channel, parsedMessage.payload)
        } else {
          // No channel abstraction, publish over the whole topic
          this.ee.emit(topic, parsedMessage)
        }
      }

    })

    consumer.on('event.log', (event) => {
      this.logger.debug(event);
    });

    return new Promise((resolve, reject) => {
      consumer.on('ready', (data, metadata) => {
        let topics = metadata.topics.map(topic => topic.name);
        this.logger.info('Connected, found topics: %s', topics);

        this.logger.info("Subscribing to %s", topic)
        consumer.subscribe([topic]);
        consumer.consume();
        resolve(consumer);
      })

      this.logger.info("Connecting consumer ...")
      consumer.connect();
    })
  }
}
