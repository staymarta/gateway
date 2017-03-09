/**
 * Simple Router.
 *
 * @author StayMarta
 * @license BSD (See git repo for exact varient.)
 * @version 1.0
 **/

const debug          = require('./logger.js')('staymarta:router')
const Communication  = require('./communication.js');

const communication  = new Communication()

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

  // Always declared wait before sending.
  // Example microservice.
  communication.wait(rmqString, async msg => {
    debug('service', 'sending reply');

    await msg.reply({
      hello: 'world'
    })
    msg.ack();
  });

  // Send the message and await the response.
  communication.sendAndWait(rmqString, {
      request: {
        id: id,
        created: Date.now()
      }
  })
  .catch(() => {
    debug('error', id, `couldn\'t reach '${service}' in time.`)
    return res.error('Failed to retrieve response in allocated time.')
  })
  .then(data => {
    debug('message', data.body)
    if(!data.body.request) return debug('no request, panic')

    let requestId = data.body.request.id;
    let potentialRequest = req.app.requests[requestId]

    if(!potentialRequest) {
      debug('req.app.requests =', req.app.requests)
      return debug(`invalid request, '${requestId}' panic`)
    }

    return res.send({
      metadata: {
        info: {
          method: method,
          version: version,
          service: service
        },
        rabbitmq: {
          type: rmqString
        }
      },
      [service]: data.body.data || null
    })
  })
}

module.exports = router;
