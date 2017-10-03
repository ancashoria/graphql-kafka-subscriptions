jest.mock('../index')

import { KafkaPubSub } from '../index'

KafkaPubSub.mockImplementation(() => {
  return {
    publish: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    asyncIterator: jest.fn(),
  }
})

const pubsub = new KafkaPubSub({
  topic: 'something',
  host: 'localhost',
  port: '9092',
  createProducer: () => ({
    write: (msg) => msg
  })
})

describe('KafkaPubSub', () => {
  it('should subscribe correctly', () => {
    pubsub.asyncIterator('testchannel')
    expect(pubsub.subscribe).toBeCalled()
  })
})