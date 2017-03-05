/**
 * (c) 2017 StayMarta
 *
 * @author StayMarta
 * @version 1.0
 **/

'use strict';

console.log('STAYMARTA API GATEWAY INITIALIZING')

const express = require('express');
const bodyp   = require('body-parser');
const async   = require('async');
const path    = require('path');
const fs      = require('fs');
const debug   = require('./lib/logger.js')('staymarta:bootstrap')
const router  = require('./lib/router.js');

let app = express();

/**
 * Built In API helpers.
 **/
app.use((req, res, next) => {

  /**
   * Return a standard error.
   *
   * @param {String} desc - description of the error.
   * @param {Number} code - error code
   **/
  res.error = (desc, code) => {
    return res.send({
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
