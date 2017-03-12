/**
 * Simple Router.
 *
 * @author StayMarta
 * @license BSD (See git repo for exact varient.)
 * @version 1.0
 **/

const debug          = require('./logger.js')('staymarta:router')
const Communication  = require('./communication.js');

const communication  = new Communication();

(async () => {
  await communication.connect();

  // Always declared wait before sending.
  // Example microservice.
  debug('service', 'waiting for messages');
  communication.wait('v1.message.get', async msg => {
    debug('service', 'sending reply');

    await msg.reply({
      hello: 'world'
    })
  });
})()

/**
 * Service Router.
 *
 * @param {Object} req - ExpressJS request object.
 * @param {Object} res - ExpressJS response object.
 * @param {Function} next - callback
 *
 * @returns {*} next value.
 **/
let router = (req, res) => {
  let splitPath = req.path.split('/')

  if(!splitPath[2]|| splitPath.length <= 2) return res.error('Invalid Path')

  let version = splitPath[1];
  let service = splitPath[2];
  let method  = req.method.toLowerCase();

  // Generate message string.
  let rmqString = `${version}.${service}.${method}`;
  let id = req.id;

  debug('request', id)

  // Send the message and await the response.
  communication.sendAndWait(rmqString, {
      request: {
        id: id,
        created: Date.now()
      }
  })
  .then(data => {
    debug('message', data.body)
    if(!data.body.request) console.warn('Message didn\'t have request integreity checking abilities.')
    let requestId = data.body.request.id;
    if(!requestId === req.id) console.warn('Recieved request not for us...')

    return res.send({
      metadata: {
        info: {
          method: method,
          version: version,
          service: service
        },
        rabbitmq: {
          type: rmqString
        },
        gateway: {
          id: communication.service_id,
          time: Date.now()
        }
      },
      [service]: data.body.data || null
    })
  })
  .catch(err => {
    console.log('error', err)
    debug('error', id, `couldn\'t reach '${service}' in time.`)
    return res.error('Failed to retrieve response in allocated time.', 200, 503)
  })
}

module.exports = router;
