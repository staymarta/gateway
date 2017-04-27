/**
 * Simple Router.
 *
 * @author StayMarta
 * @license BSD-3-Clause
 * @version 1.0
 **/

const debug          = require('./logger.js')('staymarta:router')
const Communication  = require('libcommunication');

const communication  = new Communication();

communication.connect()
.then(() => {
  debug('rabbitmq', 'connected')
})

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
  let commandString = null;
  let splitPath = req.url.split('/')

  if(!splitPath[2]|| splitPath.length <= 2) return res.error('Invalid Path')

  let version = splitPath[1];
  let service = splitPath[2];
  let method  = req.method.toLowerCase();

  // Generate message string.
  let rmqString = `${version}.${service}.${method}`;
  let id = req.id;

  debug('request', id)

  // Check if we have any input her.
  if(splitPath.length >= 3) {
    commandString = splitPath[3];
  }


  // Send the message and await the response.
  communication.sendAndWait(rmqString, {
      request: {
        id: id,
        created: Date.now(),
        string: commandString
      }
  })
  .then(data => {
    const metadata = {
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
    }, serviceRes = data.body.data;

    debug('message', data.body)
    if(!data.body.request) console.warn('Message didn\'t have request integreity checking abilities.')
    let requestId = data.body.request.id;
    if(!requestId === req.id) console.warn('Recieved request not for us...')

    metadata.gateway.request_id = data.body.request.id;
    if(data.body.reply) metadata[service] = data.body.reply;

    // Handle errors.
    if(serviceRes.error) {
      return res.error(serviceRes.error, serviceRes.code)
    }

    return res.send({
      metadata: metadata,
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
