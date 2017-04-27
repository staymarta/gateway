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

const circuitBreaker  = {
  max_errors: 50,
  schedule: 10000,
  min_downtime: 20000,
  services: {}
}

const watchdog = () => {

  debug('watchdog running')
  Object.keys(circuitBreaker.services).forEach(serv => {
    let service = circuitBreaker.services[serv];

    debug('watchdog', serv);

    // Check for error failure to close.
    if(service.errors > circuitBreaker.max_errors && service.status === 'OPEN') {
      debug('watchdog', 'closed', serv, 'with', service.errors)
      service.status = 'CLOSED';
      service.closed_at = Date.now();
    }

    if(service.closed_at && service.status === 'CLOSED'){
      let now = Date.now()
      let passed = (now - service.closed_at);

      // if over min, open circuit.
      if(passed > circuitBreaker.min_downtime) {
        debug('watchdog', `open '${serv}' after ${passed}ms`);
        service.errors = 0;
        service.status = 'OPEN';
        service.closed_at = 0;
      }
    }
  })
}

// Check service error rates
setInterval(watchdog, circuitBreaker.schedule)

communication.connect()
.then(() => {
  debug('rabbitmq', 'connected')
})

/**
 * Track errors for ciruit breaker.
 **/
let error = service => {
  const circuit = circuitBreaker.services[service]
  if(!circuit) return debug('notice', 'error on', service, 'but no circuit?')

  // up the error.
  debug('watchdog:error', 'up error count')
  circuit.errors++;

  // Close if errors over margin
  if(circuit.errors > circuitBreaker.max_errors) {
    debug('watchdog:error', 'closed', service, 'with', circuit.errors)
    circuit.status = 'CLOSED';
    circuit.closed_at = Date.now();
  }
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
  let commandString = null;
  let splitPath = req.url.split('/')

  if(!splitPath[2]|| splitPath.length <= 2) return res.error('Invalid Path')

  let version = splitPath[1];
  let service = splitPath[2];
  let method  = req.method.toLowerCase();

  // Generate message string.
  let rmqString = `${version}.${service}.${method}`;
  let id = req.id;

  let circuit = circuitBreaker.services[service];
  if(!circuitBreaker.services[service]) {
    debug('found service', service, `-> /${version}/${service} set OPEN`)
    circuit = circuitBreaker.services[service] = {
      status: 'OPEN',
      endpoint: `/${version}/${service}`,
      errors: 0
    }
  }

  // Check if switch is hit.
  if(circuit.status !== 'OPEN') {
    return res.error('Service is down.', 501)
  }

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
      error(service);
      return res.error(serviceRes.error, serviceRes.code)
    }

    return res.send({
      metadata: metadata,
      [service]: data.body.data || null
    })
  })
  .catch(err => {
    console.log('error', err)
    error(service);
    debug('error', id, `couldn\'t reach '${service}' in time.`)
    return res.error('Failed to retrieve response in allocated time.', 200, 503)
  })
}

module.exports = router;
