/**
 * Simple Router.
 *
 * @author StayMarta
 * @license BSD (See git repo for exact varient.)
 * @version 1.0
 **/

const debug          = require('debug')('staymarta:router')
const map            = require('../server.js')
const Communication  = require('./communication.js');

const communication  = new Communication()

/**
 * Service Router.
 *
 * @param {Object} req - ExpressJS request object.
 * @param {Object} req - ExpressJS response object.
 * @param {Function} next - callback
 *
 * @returns {*} next value.
 **/
let router = (req, res, next) => {
  let splitPath = req.path.split('/')

  if(!splitPath[2]|| splitPath.length <= 2) return res.error('Invalid Path')

  let version = splitPath[1];
  let service = splitPath[2];
  let method  = req.method.toLowerCase();

  debug('negotiator',
    `version:${version}`,
    `service:${service}`,
    `method:${method}`
  )

  let rmqString = `${version}.${service}.${method}`
  let rmqRecv   = `${version}.${service}.${method}.response`

  if(map.services.indexOf(service) == -1) return res.error(`Invalid route '${service}'`)

  // test communication setup.
  communication.test(rmqString);

  return res.send({
    debug: {
      method: method,
      version: version,
      service: service
    },
    rabbitmq: {
      send: rmqString,
      recv: rmqRecv
    }
  })

  return next();
}

module.exports = router;
