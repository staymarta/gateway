/**
 * (c) 2017 StayMarta
 *
 * @author StayMarta
 * @version 1.1
 **/

'use strict';

const express = require('express')
const bodyp   = require('body-parser')
const uuid    = require('uuid')
const debug   = require('./lib/logger.js')('staymarta:bootstrap')
const router  = require('./lib/router.js')
const os = require('os')

debug('init', 'modules loaded')

const ifaces = os.networkInterfaces();

Object.keys(ifaces).forEach(ifname => {
  ifaces[ifname].forEach(iface => {
    if ('IPv4' !== iface.family || iface.internal !== false) {
      // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
      return;
    }

    debug('net', ifname, iface.address);
  });
});

let app = express();

/**
 * Built In API helpers.
 **/
app.use((req, res, next) => {
  // Generate Request ID.
  const id = uuid.v4();
  req.id = id;

  /**
   * Return a standard error.
   *
   * @param {String} desc - description of the error.
   * @param {Number} code - error code
   * @param {Number} status - HTTP Status Code.
   * @returns {Null} null
   **/
  res.error = (desc, code, status = 503) => {
    if(code) status = code;

    console.log('error', desc, code, status)
    return res.status(status).send({
      error: {
        message: desc,
        code: code
      }
    })
  };

  /**
   * Return a standard success response
   *
   * @param {*}      data           data to send.
   * @param {Object} [service={}]   service metadata
   * @returns {Null} null
   **/
  res.success = (data, service = {}) => {
    return res.send({
      metadata: {
        server_time: Date.now(),
        service: service
      },
      data: data
    })
  }

  /**
   * Paginate data.
   *
   * @param {*} data - data to paginate / send.
   * @returns {null} null
   **/
  res.paginate = data => {
    return res.send({
      metadata: {
        pages: data.length,
        per_page: 1,
        length: data.length
      },
      data: data
    })
  };

  return next();
})

app.use(bodyp.json())
app.use(router)

app.listen(80, () => {
  debug('running on port 80')
});
