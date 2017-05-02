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

communication.connect('gateway')
.then(() => {
  debug('libcommunication', 'connected')
})
.catch(() => {
  debug('libcommunication', 'failed to connect')
})

/**
 * Track service errors for the circuit breaker.
 * @return {Integer}        0, for compat until implemented.
 */
const error = () => {
  debug('error', 'reporting not implemented.')
  return 0
}

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
  let commandString;
  const splitPath = req.url.split('/')
  const version   = splitPath[1];
  const service   = splitPath[2];
  const method    = req.method.toLowerCase();

  // Check if it's even a valid route.
  if(splitPath.length <= 2) {
    return res.error('Invalid Path')
  }

  // Generate message string.
  let rmqString = `${version}.${service}.${method}`;
  let id        = req.id;

  debug('request', id)

  // Check if we have any input here.
  if(splitPath.length >= 3) {
    commandString = splitPath[3]
  }

  // Send the message and await the response.
  communication.sendAndWait(rmqString, {
      request: {
        id: id,
        created: Date.now(),
        string: commandString
      }
  })

  // Handle service data.
  .then(data => {
    console.log(data.body)
    const metadata   =
          {
            gateway: {
              id: communication.service_id,
              time: Date.now()
            }
          },
          body       = data.body,
          serviceRes = body.data,
          reqMeta    = body.request,
          requestId  = reqMeta.id

    // set scope
    req = global.requests[requestId].req
    res = global.requests[requestId].res

    debug('message', body)

    // Handle service reported errors.
    if(serviceRes.error) {
      error(service);
      return res.error(serviceRes.error, serviceRes.code)
    }

    // modify metadata to include request id.
    metadata.gateway.request_id = requestId

    // if service responded, include that data.
    if(body.reply) {
      metadata[service] = body.reply
    }

    // send a response back...
    return res.send({
      metadata: metadata,
      [service]: serviceRes || null
    })
  })

  // Handle service timeout.
  .catch(() => {
    debug('error', id, `couldn\'t reach '${service}' in time.`)
    error(service);
    return res.error('Failed to retrieve response in allocated time.', 200, 503)
  })
}

module.exports = router;
