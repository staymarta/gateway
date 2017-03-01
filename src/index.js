/**
 * (c) 2017 StayMarta
 *
 * @author StayMarta
 * @version 1.0
 **/

'use strict';

//const express = require('express');
//const amqp    = require('amqp');
const debug   = require('debug')('staymarta:main');

const VAULT_TOKEN = process.env.VAULT_TOKEN;

// Secret management
const Secrets = require('./lib/secrets.js')
let secrets = new Secrets();

debug('vault', `connect with ${VAULT_TOKEN}`)
secrets.connect(VAULT_TOKEN)
secrets.get('invaild', 'hello')
  .done(data => {
    console.log('got', data);
  })
