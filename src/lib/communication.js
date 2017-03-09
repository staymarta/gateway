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

    // HACK: To maybe be async?
    const init = async () => {
      this.exchange = 'v1.staymarta';
      this.timeout  = 5000;

      let unique_queue = `${this.exchange}.api`
      this.unique_queue = unique_queue;

      await rabbot.configure({
        connection: {
          host: rabbitmq,
          port: 5672,
          timeout: 2000,
          heatbeat: 10,
          vhost: '%2f',
          publishTimeout: 2000
        },

        exchanges: [
          {
            name: this.exchange,
            type: 'fanout',
            autoDelete: true
          },
          {
            name: unique_queue,
            type: 'direct',
            autoDelete: true
          }
        ],

        queues: [
          {
            name: this.exchange,
            autoDelete: true,
            subscribe: true,
            limit: 20
          },

          {
            name: unique_queue,
            autoDelete: true,
            subscribe: true
          }
        ],

        // binds exchanges and queues to one another
        bindings: [
          {
            exchange: 'v1.staymarta',
            target: 'v1.staymarta',
            keys: ''
          },
          {
            exchange: unique_queue,
            target: unique_queue,
            keys: process.env.HOST
          }
        ]
      })

      rabbot.on('unreachable', () => {
        debug('rabbit', 'unreacheable.')
      })

      this.rabbit = rabbot;
    };

    init()
  }

  /**
   * Wait for message type {type}
   *
   * @param {String} type - type of message to handle.
   * @param {Function} cb - callback to handle message.
   * @returns {Promise} handle promise
   **/
  wait(type, cb) {
    let timeout =  this.timeout;
    let exchange = this.exchange

    // send reply
    debug(`waiting for message type: ${type}`)
    const handler = this.rabbit.handle({
      queue: exchange,
      type: type,
      context: { // isolate the context
        rabbit: this.rabbit
      }
    }, msg => {
      let request = msg.body.request;
      if(!request) return debug('notice', 'failed to access the request object.')


      /**
       * Message reply override to include custom type and autorequest insertion
       *
       * @param {Object} sendData - data to send.
       * @returns {Promise} rabbot#publish
       **/
      msg.reply = sendData => {
        const data = {};
        let routingKey = null;

        // Copy over request setup / reply queue.
        if(request) {
          data.request = request;

          // Add custom routing if present in the message.
          exchange = data.request.reply || exchange;
          routingKey = data.request.key || null;
        }
        data.data = sendData;

        handler.remove()
        return this.rabbit.publish(exchange, {
          routingKey: routingKey || '',
          type: `${type}.response`,
          contentType: 'application/json',
          expiresAfter: timeout,
          body: data,
          timeout: timeout,
          timestamp: Date.now(),
          mandatory: true
        })
      }

      return cb(msg)
    });
  }

  /**
   * Send a message with $type and wait for a reply
   *
   * @param {String} type - message type.
   * @param {*} data - data to send
   * @returns {Promise} .then/.progress, see rabbot.
   **/
  sendAndWait(type, data) {
    let timeout = 10000;
    let exchange = this.exchange;

    const replyPromise = new Promise(resolv => {
      this.rabbit.handle({
        queue: this.unique_queue,
        type: `${type}.response`,
        context: {
          rabbit: this.rabbit
        }
      }, msg => {
        return resolv(msg)
      })
    })

    // handle reply
    debug(`sending message '${type}' on '${exchange}', waiting on '${this.unique_queue}'`)
    if(!data.request) return debug('rejecting non-request object.')
    data.request.reply = this.unique_queue;
    data.request.key   = process.env.HOST

    this.rabbit.publish(exchange, {
      type: type,
      contentType: 'application/json',
      body: data,
      expiresAfter: timeout,
      timeout: timeout,
      timestamp: Date.now(), // posix timestamp (long)
      mandatory: true //Must be set to true for onReturned to receive unqueued message
    })

    return replyPromise;
  }
}

module.exports = ServiceCommunication;
