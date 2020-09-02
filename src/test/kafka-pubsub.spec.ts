require("dotenv").config()
import { KafkaPubSub } from '../index'
import * as Logger from 'bunyan';

let pubsub: KafkaPubSub

beforeAll(() => {
  jest.setTimeout(60000);
  pubsub = new KafkaPubSub({
    topic: process.env.KAFKA_TOPIC || 'test',
    host: process.env.KAFKA_HOST || 'localhost',
    port: process.env.KAFKA_PORT || '9092',
    logger: Logger.createLogger({
      name: 'pubsub',
      stream: process.stdout,
      level: 'info'
    }),
    useHeaders: false,
    globalConfig: {
      'security.protocol': process.env.KAFKA_SECURITY || 'PLAINTEXT',
    }
  })
});

afterAll(async () => {
  await pubsub.close()
});

describe('KafkaPubSub Basic Tests', () => {
  test('should subscribe and publish messages correctly', async (done) => {

    const inputChannel = 'test-subscribe'
    const inputPayload = {
      id: 'subscribe-value',
    }

    function onMessage(payload) {
      try {
        expect(payload).toStrictEqual(inputPayload);
        done();
      } catch (error) {
        done(error);
      }
    }

    const subscription = await pubsub.subscribe(inputChannel, onMessage)
    await new Promise(r => setTimeout(r, 5000));
    await pubsub.publish(inputChannel, inputPayload)
  })

  test('should subscribe correctly using asyncIterator', async () => {

    const inputChannel = 'test-iterator'
    const iter = pubsub.asyncIterator(inputChannel)

    await new Promise(r => setTimeout(r, 5000));

    var i: number;
    const rep = 10;

    for (i = 0; i < rep; i++) {
      const inputPayload = { id: "iter-"+i }
      const promise = iter.next()
      await pubsub.publish(inputChannel, inputPayload)
      expect(await (await promise).value).toStrictEqual({ id: "iter-"+i })
    }

    await iter.return();
  })

})
