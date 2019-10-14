/// <reference types="node" />
import { PubSubEngine } from 'graphql-subscriptions';
import * as Logger from 'bunyan';
export interface IKafkaOptions {
    topic: string;
    host: string;
    port: string;
    logger?: Logger;
    groupId?: any;
    globalConfig?: object;
}
export interface IKafkaProducer {
    write: (input: Buffer) => any;
}
export interface IKafkaTopic {
    readStream: any;
    writeStream: any;
}
export declare class KafkaPubSub implements PubSubEngine {
    protected producer: any;
    protected consumer: any;
    protected options: any;
    protected subscriptionMap: {
        [subId: number]: [string, Function];
    };
    protected channelSubscriptions: {
        [channel: string]: Array<number>;
    };
    protected logger: Logger;
    constructor(options: IKafkaOptions);
    publish(payload: any): any;
    subscribe(channel: string, onMessage: Function, options?: Object): Promise<number>;
    unsubscribe(index: number): void;
    asyncIterator<T>(triggers: string | string[]): AsyncIterator<T>;
    private onMessage;
    brokerList(): any;
    private createProducer;
    private createConsumer;
}
