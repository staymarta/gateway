/**
 * (c) 2017 StayMarta
 *
 * @author StayMarta
 * @version 1.0
 **/

'use strict';

const express = require('express');
const bodyp   = require('body-parser');
const uuid    = require('uuid');
const debug   = require('./lib/logger.js')('staymarta:bootstrap')
const router  = require('./lib/router.js');

debug('init', 'modules loaded')

let app = express();

/**
 * Built In API helpers.
 **/

// Future update security.
if(app.requests) throw 'app.requests isn\'t empty'
app.requests = {};

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
  res.error = (desc, code, status = 501) => {
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
   * @param {*} data - data to send.
   * @returns {Null} null
   **/
  res.success = data => {
    return res.send({
      metadata: {
        server_time: Date.now()
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
