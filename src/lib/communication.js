/**
 * (c) 2017 StayMarta
 *
 * RabbitMQ communication librarary.
 * @author Jared Allard <jaredallard@outlook.com>
 * @version 1.0
 **/

const debug  = require('./logger.js')('staymarta:communication')

/**
 * @class
 **/
class ServiceCommunication {
  constructor(rabbitmq = 'rabbitmq') {
    let rabbot = require('rabbot')

    // TODO: .configure method
    rabbot.configure({
      connection: {
        host: rabbitmq,
        port: 5672,
        timeout: 2000,
        heatbeat: 10,
        vhost: "%2f",
        publishTimeout: 2000
      },

      exchanges: [
        {
          name: "staymarta-v1",
          type: "fanout",
          autoDelete: false
        }
      ],

      // setup the queues, only subscribing to the one this service
      // will consume messages from
      queues: [
        {
          name: "staymarta-v1",
          autoDelete: true,
          durable: true,
          subscribe: "requests",
          limit: 20
        }
      ],

      // binds exchanges and queues to one another
      bindings: [
        {
          exchange: "staymarta-v1",
          target: "staymarta-v1",
          keys: []
        },
      ]
    }).then(null, err => {
      if(!err) return;

      debug('rabbot:configure', 'failed to configure with', err);
    })

    rabbot.on('unreachable', () => {
      debug('rabbit', 'unreacheable.')
    })

    this.rabbit = rabbot;
  }

  test(string) {
    let timeout = 10000;
    let exchange = 'staymarta-v1';

    // send reply
    this.rabbit.handle({
      queue: exchange,
      type: string,
      context: { // isolate the context
        rabbit: this.rabbit
      }
    }, msg => {

      debug('reply:service', 'send reply')
    	this.rabbit.publish(exchange, {
        type: `${string}.response`,
        contentType: "application/json",
        body: { text: "done" },
        expiresAfter: timeout,
        timeout: timeout,
        timestamp: Date.now(), // posix timestamp (long)
        mandatory: true //Must be set to true for onReturned to receive unqueued message
      })

    	msg.ack();
    });

    // handle reply
    debug(`sending message '${string}' on '${exchange}'`)
    this.rabbit.handle({
      queue: exchange,
      type: `${string}.response`
    }, msg => {
      debug('reply', 'response', JSON.stringify(msg.body))

      let recieved = Date.now();
      let diff = recieved - sent;
      debug('reply', `roundtrip was ${diff}ms`)
      msg.ack();
    });

    let sent = Date.now()
    this.rabbit.publish(exchange, {
      type: string,
      contentType: "application/json",
      body: { text: "hello!" },
      expiresAfter: timeout,
      timeout: timeout,
      timestamp: Date.now(), // posix timestamp (long)
      mandatory: true //Must be set to true for onReturned to receive unqueued message
    }).then(() => {
      debug('publish', 'event sent')
    })
  }
}

module.exports = ServiceCommunication;
