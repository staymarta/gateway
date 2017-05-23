/**
 * Simple Router.
 *
 * @author StayMarta
 * @license BSD-3-Clause
 * @version 1.0
 **/

const debug          = require('./logger.js')('staymarta:router')
const request        = require('request-promise-native')
const fs             = require('fs-promise')
const path           = require('path')
const os             = require('os')
const yaml           = require('js-yaml')

// attempt to load a services.yaml
let serviceMap;
const serviceConfig  = path.join(__dirname, '../services.yaml');
if(fs.existsSync(serviceConfig)) {
  debug('serviceConfig', 'loading config file ...')

  serviceMap = yaml.safeLoad(fs.readFileSync(serviceConfig, 'utf8'))
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
  const smenvname     = serviceMap.environment;
  const splitPath     = req.url.split('/')
  const version       = splitPath[1]
  const service       = splitPath[2]
  const method        = req.method.toLowerCase()

  // allow this to be re-assigned later.
  let serviceUrl      = `${version}.${service}`
  const oldServiceUrl = serviceUrl

  // check if we are mapping service urls to something.
  if(smenvname !== 'real') {
    const smenv = serviceMap.environments[smenvname];
    const serviceMapped = smenv[serviceUrl];

    // load a mapped service config.
    if(serviceMapped) {
      const newServiceUrl = `${serviceMapped.hostname}:${serviceMapped.port}`
      debug('serviceMap', 'rewrite', `${serviceUrl} => ${newServiceUrl}`)

      serviceUrl = newServiceUrl;
    } else {
      debug('serviceMap', 'we don\'t map', serviceUrl)
      return res.error('Invalid Endpoint', 404)
    }
  }

  // Check if it's even a valid route.
  if(splitPath.length <= 2) {
    return res.error('Invalid Path')
  }

  // Build the request URL, why can't we just shift(3)?
  splitPath.shift()
  splitPath.shift()
  splitPath.shift()

  const requestPath = splitPath.join('/')
  const requestUrl  = `http://${serviceUrl}/${requestPath}`

  debug('request', `${method} ${requestUrl}`)
  request({
    method: method,
    uri: requestUrl,
    headers: {
      'User-Agent': 'v1.gateway',
      'X-Gateway-Endpoint': req.url,
      'X-Gateway-ID': os.hostname(),
      'X-Service': oldServiceUrl
    },
    body: req.body,
    resolveWithFullResponse: true,
    json: true
  })
  .then(response => {
    const data    = response.body
    const headers = response.headers
    const service = {
      id: headers['x-service-id'],
      name: oldServiceUrl
    }

    return res.success(data, service);
  })
  .catch(err => {
    // handle unreachable / dead? services.
    if(err.name === 'RequestError') {
      return res.error('Service unavailable', 503);
    }

    // TODO: Implement passing on other status codes.
    return res.error('Service returned not OK response', 503)
  })
}

module.exports = router;
